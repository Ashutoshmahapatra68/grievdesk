from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

from app.extensions import get_db
from app.utils.decorators import login_required, committee_or_secretary_required, current_user
from app.models.announcement import Announcement
from app.services.translation import localize_groups
from app.utils.paging import parse_paging

announcements_bp = Blueprint("announcements", __name__, url_prefix="/api/announcements")


def _get(announcement_id):
    db = get_db()
    return Announcement.from_doc(db.announcements.find_one({"id": announcement_id}))


def _populate_author(ann):
    db = get_db()
    from app.models.user import User
    if ann and ann.posted_by:
        ann.author = User.from_doc(db.users.find_one({"id": ann.posted_by}))
    return ann


@announcements_bp.get("")
@login_required
def list_announcements():
    limit, offset, bad = parse_paging(default_limit=20, max_limit=100)
    if bad:
        return jsonify(bad[0]), bad[1]

    db = get_db()
    from app.models.user import User

    def _enrich(docs):
        rows = []
        for doc in docs:
            ann = Announcement.from_doc(doc)
            if ann.posted_by:
                ann.author = User.from_doc(db.users.find_one({"id": ann.posted_by}))
            rows.append(ann.to_public_dict())
        return rows

    sort = [("created_at", -1), ("id", -1)]
    pinned = _enrich(list(db.announcements.find({"is_pinned": True}).sort(sort)))
    general_total = db.announcements.count_documents({"is_pinned": False})
    general = _enrich(list(db.announcements.find({"is_pinned": False}).sort(sort).skip(offset).limit(limit)))

    meta = localize_groups(current_user(), (pinned, ["title", "message"]), (general, ["title", "message"]))
    return jsonify({"pinned": pinned, "general": general, "general_total": general_total,
                    "limit": limit, "offset": offset, **meta}), 200


@announcements_bp.patch("/<int:announcement_id>/pin")
@committee_or_secretary_required
def pin(announcement_id):
    row = _get(announcement_id)
    if row is None:
        return jsonify({"error": "announcement_not_found"}), 404
    pinned = (request.get_json(silent=True) or {}).get("pinned")
    if not isinstance(pinned, bool):
        return jsonify({"error": "invalid_pinned", "message": 'Send {"pinned": true} or {"pinned": false}.'}), 400
    db = get_db()
    db.announcements.update_one({"id": announcement_id}, {"$set": {"is_pinned": pinned}})
    row.is_pinned = pinned
    _populate_author(row)
    return jsonify({"message": "Pinned." if pinned else "Unpinned.", "announcement": row.to_public_dict()}), 200


@announcements_bp.patch("/<int:announcement_id>")
@committee_or_secretary_required
def edit(announcement_id):
    row = _get(announcement_id)
    if row is None:
        return jsonify({"error": "announcement_not_found"}), 404

    data = request.get_json(silent=True) or {}
    if not ({"title", "message"} & set(data)):
        return jsonify({"error": "missing_fields", "message": "Send title and/or message."}), 400

    updates = {}
    if "title" in data:
        title = data["title"]
        if not isinstance(title, str) or not (1 <= len(title.strip()) <= 200):
            return jsonify({"error": "invalid_title", "message": "Title must be 1-200 characters."}), 400
        updates["title"] = title.strip()
    if "message" in data:
        message = data["message"]
        if not isinstance(message, str) or not message.strip():
            return jsonify({"error": "invalid_message", "message": "Message can't be empty."}), 400
        updates["message"] = message.strip()

    db = get_db()
    db.announcements.update_one({"id": announcement_id}, {"$set": updates})
    for k, v in updates.items():
        setattr(row, k, v)
    _populate_author(row)
    return jsonify({"message": "Announcement updated.", "announcement": row.to_public_dict()}), 200


@announcements_bp.delete("/<int:announcement_id>")
@committee_or_secretary_required
def delete(announcement_id):
    row = _get(announcement_id)
    if row is None:
        return jsonify({"error": "announcement_not_found"}), 404
    db = get_db()
    db.announcements.delete_one({"id": announcement_id})
    return jsonify({"message": "Announcement deleted."}), 200
