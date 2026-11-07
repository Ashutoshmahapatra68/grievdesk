import re
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from flask import Blueprint, request, jsonify

from app.extensions import get_db
from app.utils.decorators import login_required, committee_or_secretary_required, current_user
from app.models.user import User, ApprovalStatus
from app.models.due import Due, PaidStatus
from app.models.notification import NotificationType
from app.models._db_helpers import next_id
from app.services.gemini import GeminiNotConfigured, GeminiCallFailed
from app.services.reminders import queue_dues_reminder, DEFAULT_NOTE
from app.services.tickets import notify

dues_bp = Blueprint("dues", __name__, url_prefix="/api/dues")

MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def _total_unpaid(rows) -> str:
    return str(sum((d.amount for d in rows if d.paid_status == PaidStatus.UNPAID), Decimal("0")))


@dues_bp.get("/me")
@login_required
def my_dues():
    db = get_db()
    user = current_user()
    docs = list(db.dues.find({"user_id": user.id}).sort([("month", -1)]))
    rows = [Due.from_doc(d) for d in docs]
    return jsonify({
        "dues": [d.to_dict() for d in rows],
        "total_unpaid": _total_unpaid(rows),
        "unpaid_count": sum(1 for d in rows if d.paid_status == PaidStatus.UNPAID),
    }), 200


@dues_bp.get("")
@committee_or_secretary_required
def list_dues():
    db = get_db()
    filt = {}

    status = request.args.get("status")
    if status:
        if status not in PaidStatus.ALL:
            return jsonify({"error": "invalid_status", "allowed": list(PaidStatus.ALL)}), 400
        filt["paid_status"] = status

    month = request.args.get("month")
    if month:
        if not MONTH_RE.match(month):
            return jsonify({"error": "invalid_month", "message": "Use YYYY-MM."}), 400
        filt["month"] = month

    # For flat_no/block_no filters we need to join — get user ids first
    flat_no = request.args.get("flat_no")
    block_no = request.args.get("block_no")
    if flat_no or block_no:
        user_filt = {}
        if flat_no:
            user_filt["flat_no"] = flat_no
        if block_no:
            user_filt["block_no"] = block_no
        user_ids = [u["id"] for u in db.users.find(user_filt, {"id": 1})]
        filt["user_id"] = {"$in": user_ids}

    docs = list(db.dues.find(filt).sort([("month", -1)]))
    rows = [Due.from_doc(d) for d in docs]
    # Enrich with user info for to_dict
    user_cache = {}
    for d in rows:
        if d.user_id not in user_cache:
            u = db.users.find_one({"id": d.user_id})
            user_cache[d.user_id] = User.from_doc(u) if u else None
        d.user = user_cache[d.user_id]

    return jsonify({"dues": [d.to_dict() for d in rows], "total_unpaid": _total_unpaid(rows), "count": len(rows)}), 200


@dues_bp.post("")
@committee_or_secretary_required
def create_due():
    db = get_db()
    data = request.get_json(silent=True) or {}

    month = data.get("month")
    if not isinstance(month, str) or not MONTH_RE.match(month):
        return jsonify({"error": "invalid_month", "message": "Use YYYY-MM, e.g. 2026-09."}), 400

    try:
        amount = Decimal(str(data.get("amount")))
        if amount <= 0 or not amount.is_finite():
            raise InvalidOperation
    except (InvalidOperation, ValueError):
        return jsonify({"error": "invalid_amount", "message": "amount must be a positive number."}), 400

    try:
        due_date = date.fromisoformat(str(data.get("due_date")))
    except ValueError:
        return jsonify({"error": "invalid_due_date", "message": "Use YYYY-MM-DD."}), 400

    if data.get("user_id") is not None:
        uid = data["user_id"]
        resident_doc = db.users.find_one({"id": uid}) if isinstance(uid, int) and not isinstance(uid, bool) else None
        residents = [User.from_doc(resident_doc)] if resident_doc else []
    else:
        flat_no, block_no = data.get("flat_no"), data.get("block_no")
        if not flat_no or not block_no:
            return jsonify({"error": "missing_fields", "message": "Send user_id, or flat_no and block_no."}), 400
        residents = [User.from_doc(d) for d in db.users.find(
            {"flat_no": flat_no, "block_no": block_no, "approval_status": ApprovalStatus.APPROVED}
        )]

    if not residents:
        return jsonify({"error": "resident_not_found"}), 404
    if len(residents) > 1:
        return jsonify({
            "error": "ambiguous_flat",
            "message": "More than one resident lives in that flat — resend with user_id.",
            "candidates": [{"user_id": r.id, "name": r.name} for r in residents],
        }), 400
    resident = residents[0]

    if db.dues.find_one({"user_id": resident.id, "month": month}):
        return jsonify({"error": "due_already_exists", "message": f"A due for {month} already exists for this resident."}), 409

    now = datetime.now(timezone.utc)
    due_id = next_id("dues")
    due = Due({
        "id": due_id, "user_id": resident.id, "month": month,
        "amount": str(amount), "due_date": due_date.isoformat(),
        "paid_status": PaidStatus.UNPAID, "paid_at": None, "note": None,
        "created_at": now,
    })
    due.user = resident
    db.dues.insert_one(due.to_doc())
    return jsonify({"message": "Due created.", "due": due.to_dict()}), 201


@dues_bp.patch("/<int:due_id>/mark-paid")
@committee_or_secretary_required
def mark_paid(due_id):
    db = get_db()
    doc = db.dues.find_one({"id": due_id})
    if not doc:
        return jsonify({"error": "due_not_found"}), 404
    due = Due.from_doc(doc)
    if due.paid_status == PaidStatus.PAID:
        return jsonify({"message": "Already marked as paid.", "due": due.to_dict()}), 200

    now = datetime.now(timezone.utc)
    db.dues.update_one({"id": due_id}, {"$set": {"paid_status": PaidStatus.PAID, "paid_at": now}})
    due.paid_status = PaidStatus.PAID
    due.paid_at = now

    actor = current_user()
    notify(due.user_id, NotificationType.DUES_UPDATE,
           f"Your maintenance due for {due.month} has been marked as paid. Thank you!", actor)
    return jsonify({"message": "Marked as paid.", "due": due.to_dict()}), 200


@dues_bp.patch("/<int:due_id>/mark-unpaid")
@committee_or_secretary_required
def mark_unpaid(due_id):
    db = get_db()
    doc = db.dues.find_one({"id": due_id})
    if not doc:
        return jsonify({"error": "due_not_found"}), 404
    due = Due.from_doc(doc)
    if due.paid_status == PaidStatus.UNPAID:
        return jsonify({"message": "Already unpaid.", "due": due.to_dict()}), 200

    db.dues.update_one({"id": due_id}, {"$set": {"paid_status": PaidStatus.UNPAID, "paid_at": None}})
    due.paid_status = PaidStatus.UNPAID
    due.paid_at = None
    return jsonify({"message": "Marked as unpaid.", "due": due.to_dict()}), 200


@dues_bp.delete("/<int:due_id>")
@committee_or_secretary_required
def delete_due(due_id):
    db = get_db()
    doc = db.dues.find_one({"id": due_id})
    if not doc:
        return jsonify({"error": "due_not_found"}), 404
    db.dues.delete_one({"id": due_id})
    return jsonify({"message": "Due deleted."}), 200
