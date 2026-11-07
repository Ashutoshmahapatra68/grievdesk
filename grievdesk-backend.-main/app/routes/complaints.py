from flask import Blueprint, jsonify, request, send_file

from app.extensions import get_db
from app.utils.decorators import login_required, committee_or_secretary_required, current_user
from app.models.user import User, Role, ApprovalStatus
from app.models.complaint import Complaint, ComplaintStatus, ComplaintCategory, Severity
from app.models.ticket_event import TicketType, TicketAction
from app.services import speech
from app.services.tickets import add_event, timeline
from app.services.complaint_status import set_complaint_status
from app.services.translation import localize_groups
from app.utils.paging import parse_paging

complaints_bp = Blueprint("complaints", __name__, url_prefix="/api/complaints")


def _load_complaint(complaint_id):
    db = get_db()
    doc = db.complaints.find_one({"id": complaint_id})
    if doc is None:
        return None
    c = Complaint.from_doc(doc)
    c.user = User.from_doc(db.users.find_one({"id": c.user_id}))
    if c.assigned_to:
        c.assignee = User.from_doc(db.users.find_one({"id": c.assigned_to}))
    return c


def _report_counts(db) -> dict:
    """{original_complaint_id: number_of_duplicates_linked_to_it}"""
    pipeline = [
        {"$match": {"duplicate_of": {"$ne": None}}},
        {"$group": {"_id": "$duplicate_of", "count": {"$sum": 1}}},
    ]
    return {row["_id"]: row["count"] for row in db.complaints.aggregate(pipeline)}


def _with_reports(complaint, viewer, counts):
    row = complaint.to_public_dict(viewer)
    row["reports_count"] = (1 + counts.get(complaint.id, 0)) if complaint.duplicate_of is None else None
    return row


@complaints_bp.get("")
@login_required
def list_complaints():
    db = get_db()
    viewer = current_user()
    limit, offset, bad = parse_paging(default_limit=20, max_limit=100)
    if bad:
        return jsonify(bad[0]), bad[1]

    filt = {}
    status = request.args.get("status")
    category = request.args.get("category")
    severity = request.args.get("severity")
    if status:
        if status not in ComplaintStatus.ALL:
            return jsonify({"error": "invalid_status", "allowed": list(ComplaintStatus.ALL)}), 400
        filt["status"] = status
    if category:
        if category not in ComplaintCategory.ALL:
            return jsonify({"error": "invalid_category", "allowed": list(ComplaintCategory.ALL)}), 400
        filt["category"] = category
    if severity:
        if severity not in Severity.ALL:
            return jsonify({"error": "invalid_severity", "allowed": list(Severity.ALL)}), 400
        filt["severity"] = severity

    block = request.args.get("block")
    if block:
        # Get user IDs in that block
        user_ids_in_block = [u["id"] for u in db.users.find({"block_no": block}, {"id": 1})]
        if not viewer.is_staff():
            # residents: only non-anonymous OR their own
            filt["$or"] = [
                {"user_id": {"$in": user_ids_in_block}, "is_anonymous": False},
                {"user_id": viewer.id},
            ]
        else:
            filt["user_id"] = {"$in": user_ids_in_block}

    total = db.complaints.count_documents(filt)
    docs = list(db.complaints.find(filt).sort([("created_at", -1), ("id", -1)]).skip(offset).limit(limit))
    counts = _report_counts(db)

    rows = []
    for doc in docs:
        c = Complaint.from_doc(doc)
        c.user = User.from_doc(db.users.find_one({"id": c.user_id}))
        if c.assigned_to:
            c.assignee = User.from_doc(db.users.find_one({"id": c.assigned_to}))
        rows.append(_with_reports(c, viewer, counts))

    meta = localize_groups(viewer, (rows, ["translated_text", "resolution_notes"]))
    return jsonify({"complaints": rows, "total": total, "limit": limit, "offset": offset, **meta}), 200


@complaints_bp.get("/<int:complaint_id>")
@login_required
def get_complaint(complaint_id):
    db = get_db()
    viewer = current_user()
    complaint = _load_complaint(complaint_id)
    if complaint is None:
        return jsonify({"error": "complaint_not_found"}), 404
    counts = _report_counts(db)
    body = _with_reports(complaint, viewer, counts)
    body["timeline"] = timeline(TicketType.COMPLAINT, complaint.id)
    if complaint.duplicate_of is None:
        linked = list(db.complaints.find({"duplicate_of": complaint.id}).sort([("id", 1)]))
        body["linked_reports"] = [d["id"] for d in linked]
    meta = localize_groups(viewer, ([body], ["translated_text", "resolution_notes"]), (body["timeline"], ["note"]))
    return jsonify({**body, **meta}), 200


@complaints_bp.patch("/<int:complaint_id>/status")
@committee_or_secretary_required
def update_status(complaint_id):
    complaint = _load_complaint(complaint_id)
    if complaint is None:
        return jsonify({"error": "complaint_not_found"}), 404

    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    if new_status not in ComplaintStatus.ALL:
        return jsonify({"error": "invalid_status", "allowed": list(ComplaintStatus.ALL)}), 400
    if new_status == complaint.status:
        return jsonify({"message": "Status unchanged.", "complaint": complaint.to_public_dict(current_user())}), 200

    actor = current_user()
    resolution_notes = data.get("resolution_notes") if isinstance(data.get("resolution_notes"), str) else None
    changed = set_complaint_status(complaint, new_status, actor, resolution_notes=resolution_notes)
    return jsonify({
        "message": f"Status updated to {new_status}.",
        "complaint": changed[0].to_public_dict(actor),
        "linked_reports_updated": len(changed) - 1,
    }), 200


@complaints_bp.patch("/<int:complaint_id>/assign")
@committee_or_secretary_required
def assign(complaint_id):
    db = get_db()
    complaint = _load_complaint(complaint_id)
    if complaint is None:
        return jsonify({"error": "complaint_not_found"}), 404

    data = request.get_json(silent=True) or {}
    if "assigned_to" not in data:
        return jsonify({"error": "missing_fields", "fields": ["assigned_to"]}), 400

    actor = current_user()
    assignee_id = data["assigned_to"]
    if assignee_id is None:
        db.complaints.update_one({"id": complaint_id}, {"$set": {"assigned_to": None}})
        complaint.assigned_to = None
        complaint.assignee = None
        add_event(TicketType.COMPLAINT, complaint.id, TicketAction.UNASSIGNED, actor=actor)
    else:
        assignee_doc = db.users.find_one({"id": assignee_id}) if isinstance(assignee_id, int) and not isinstance(assignee_id, bool) else None
        assignee = User.from_doc(assignee_doc) if assignee_doc else None
        if assignee is None or assignee.approval_status != ApprovalStatus.APPROVED or assignee.role not in (Role.COMMITTEE, Role.SECRETARY):
            return jsonify({
                "error": "invalid_assignee",
                "message": "Tickets can only be assigned to the Secretary or a committee member.",
            }), 400
        db.complaints.update_one({"id": complaint_id}, {"$set": {"assigned_to": assignee.id}})
        complaint.assigned_to = assignee.id
        complaint.assignee = assignee
        add_event(TicketType.COMPLAINT, complaint.id, TicketAction.ASSIGNED, detail=assignee.name, actor=actor)

    return jsonify({"message": "Assignment updated.", "complaint": complaint.to_public_dict(actor)}), 200


@complaints_bp.patch("/<int:complaint_id>/duplicate")
@committee_or_secretary_required
def set_duplicate(complaint_id):
    db = get_db()
    complaint = _load_complaint(complaint_id)
    if complaint is None:
        return jsonify({"error": "complaint_not_found"}), 404

    data = request.get_json(silent=True) or {}
    if "duplicate_of" not in data:
        return jsonify({"error": "missing_fields", "fields": ["duplicate_of"]}), 400

    actor = current_user()
    target_id = data["duplicate_of"]

    if target_id is None:
        if complaint.duplicate_of is None:
            return jsonify({"message": "Not linked to anything.", "complaint": complaint.to_public_dict(actor)}), 200
        old = complaint.duplicate_of
        db.complaints.update_one({"id": complaint_id}, {"$set": {"duplicate_of": None}})
        complaint.duplicate_of = None
        add_event(TicketType.COMPLAINT, complaint.id, TicketAction.UNLINKED, detail=f"#{old}", actor=actor)
        return jsonify({"message": "Unlinked.", "complaint": complaint.to_public_dict(actor)}), 200

    if not isinstance(target_id, int) or isinstance(target_id, bool):
        return jsonify({"error": "invalid_duplicate_of", "message": "Send a complaint id or null."}), 400
    if target_id == complaint.id:
        return jsonify({"error": "invalid_duplicate_of", "message": "A complaint can't be a duplicate of itself."}), 400

    target = _load_complaint(target_id)
    if target is None:
        return jsonify({"error": "complaint_not_found", "message": f"No complaint #{target_id}."}), 404
    if target.duplicate_of is not None:
        return jsonify({
            "error": "target_is_duplicate",
            "message": f"#{target_id} is itself a duplicate. Link to the original, #{target.duplicate_of}.",
            "original": target.duplicate_of,
        }), 400

    # Redirect existing duplicates of this complaint to the new original
    db.complaints.update_many({"duplicate_of": complaint.id}, {"$set": {"duplicate_of": target.id}})
    db.complaints.update_one({"id": complaint_id}, {"$set": {"duplicate_of": target.id}})
    complaint.duplicate_of = target.id
    add_event(TicketType.COMPLAINT, complaint.id, TicketAction.LINKED, detail=f"#{target.id}", actor=actor)
    return jsonify({"message": f"Linked as a duplicate of #{target.id}.", "complaint": complaint.to_public_dict(actor)}), 200


@complaints_bp.get("/<int:complaint_id>/audio")
@login_required
def get_complaint_audio(complaint_id):
    db = get_db()
    viewer = current_user()
    doc = db.complaints.find_one({"id": complaint_id})
    complaint = Complaint.from_doc(doc)
    if complaint is None or not complaint.audio_url:
        return jsonify({"error": "audio_not_found"}), 404

    if not (viewer.id == complaint.user_id or viewer.is_staff()):
        return jsonify({"error": "forbidden", "message": "You can't listen to this recording."}), 403

    path = speech.audio_path(complaint.audio_url)
    if path is None:
        return jsonify({"error": "audio_not_found"}), 404
    return send_file(path, mimetype=speech.AUDIO_TYPES.get("." + path.rsplit(".", 1)[-1], "application/octet-stream"))
