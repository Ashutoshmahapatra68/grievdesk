"""
Housekeeping jobs. Each one is safe to run twice (idempotent), so it doesn't matter if cron, the
in-process scheduler and a manual `flask jobs ...` all fire around the same time.
"""
import json
from datetime import datetime, timedelta, timezone

from flask import current_app

from app.extensions import get_db
from app.models.chat_message import ChatMessage
from app.models.complaint import Complaint, ComplaintStatus
from app.models.job_run import JobRun
from app.models.notification import NotificationType
from app.models.user import User, Role, ApprovalStatus
from app.models._db_helpers import next_id
from app.services.complaint_status import set_complaint_status
from app.services.tickets import notify


def _utcnow():
    return datetime.now(timezone.utc)


def run_chat_cleanup(now=None) -> dict:
    """
    Deletes chat TRANSCRIPTS older than CHAT_RETENTION_DAYS. It touches the chat_messages table and
    nothing else: complaints, service requests, dues, announcements, notifications and stored voice
    notes all live in their own tables/folder and are never affected.
    """
    now = now or _utcnow()
    days = current_app.config["CHAT_RETENTION_DAYS"]
    cutoff = now - timedelta(days=days)
    db = get_db()
    res = db.chat_messages.delete_many({"created_at": {"$lt": cutoff}})
    return {"deleted_chat_messages": res.deleted_count, "older_than_days": days}


def run_escalation(now=None) -> dict:
    """
    A complaint still "new" after ESCALATION_DAYS has had no response: mark it escalated, tell the person
    who raised it, and send every committee member/the Secretary ONE digest (not one message per complaint).
    Duplicates are skipped: they follow their original, which is what gets escalated.
    """
    now = now or _utcnow()
    days = current_app.config["ESCALATION_DAYS"]
    cutoff = now - timedelta(days=days)
    db = get_db()

    stale_docs = list(db.complaints.find({
        "status": ComplaintStatus.NEW,
        "duplicate_of": None,
        "created_at": {"$lte": cutoff},
    }).sort([("created_at", 1)]))

    if not stale_docs:
        return {"escalated": 0, "linked_reports_escalated": 0}

    stale = []
    for d in stale_docs:
        c = Complaint.from_doc(d)
        u = db.users.find_one({"id": c.user_id})
        c.user = User.from_doc(u)
        stale.append(c)

    linked, parts = 0, []
    for complaint in stale:
        changed = set_complaint_status(
            complaint, ComplaintStatus.ESCALATED, actor=None,
            event_note=f"Automatically escalated: no response for {days} days.",
        )
        extra = len(changed) - 1
        linked += extra
        parts.append(f"#{complaint.id} ({complaint.category or 'complaint'})" + (f" +{extra} linked" if extra else ""))

    digest = (
        f"{len(stale)} complaint{'s' if len(stale) != 1 else ''} had no response for {days}+ days "
        f"and {'were' if len(stale) != 1 else 'was'} escalated: " + ", ".join(parts) + "."
    )
    staff_docs = list(db.users.find({
        "role": {"$in": [Role.COMMITTEE, Role.SECRETARY]},
        "approval_status": ApprovalStatus.APPROVED,
    }))
    for member_doc in staff_docs:
        notify(member_doc["id"], NotificationType.TICKET_UPDATE, digest, None)

    return {"escalated": len(stale), "linked_reports_escalated": linked}


def run_job(name, fn, **kwargs):
    """Runs a job and records the outcome in job_runs. Re-raises on failure so callers can report it."""
    db = get_db()
    now = _utcnow()
    run_id = next_id("job_runs")
    run_doc = {
        "id": run_id,
        "job": name,
        "started_at": now,
        "finished_at": None,
        "ok": None,
        "summary": None,
    }
    db.job_runs.insert_one(run_doc)
    try:
        result = fn(**kwargs)
    except Exception as exc:
        db.job_runs.update_one(
            {"id": run_id},
            {"$set": {"ok": False, "finished_at": _utcnow(), "summary": f"{type(exc).__name__}: {exc}"}}
        )
        raise
    db.job_runs.update_one(
        {"id": run_id},
        {"$set": {"ok": True, "finished_at": _utcnow(), "summary": json.dumps(result)}}
    )
    return result


JOBS = {
    "chat_cleanup": run_chat_cleanup,
    "escalation": run_escalation,
}
