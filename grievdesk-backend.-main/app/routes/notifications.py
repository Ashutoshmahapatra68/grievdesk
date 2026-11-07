from flask import Blueprint, jsonify, request

from app.extensions import get_db
from app.utils.decorators import login_required, current_user
from app.models.notification import Notification, NotificationType
from app.models.notification_read import NotificationRead
from app.models._db_helpers import next_id
from app.services.translation import localize_groups
from app.utils.paging import parse_paging
from datetime import datetime, timezone

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


def _visible_to(db, user_id):
    """Notifications visible to this user: broadcasts (target_user_id=None) + their private ones."""
    return list(db.notifications.find(
        {"$or": [{"target_user_id": None}, {"target_user_id": user_id}]}
    ))


def _read_ids(db, user_id) -> set:
    return {r["notification_id"] for r in db.notification_reads.find({"user_id": user_id})}


@notifications_bp.get("/me")
@login_required
def my_notifications():
    db = get_db()
    user = current_user()
    limit, offset, bad = parse_paging(default_limit=30, max_limit=100)
    if bad:
        return jsonify(bad[0]), bad[1]

    all_visible = _visible_to(db, user.id)
    total = len(all_visible)
    read = _read_ids(db, user.id)

    # Sort by created_at desc, id desc then paginate
    all_visible.sort(key=lambda d: (d.get("created_at") or datetime.min.replace(tzinfo=timezone.utc), d.get("id", 0)), reverse=True)
    page_docs = all_visible[offset:offset + limit]

    items = [Notification.from_doc(d).to_dict(read=d["id"] in read) for d in page_docs]
    unread_count = sum(1 for d in all_visible if d["id"] not in read)
    meta = localize_groups(user, (items, ["message"]))
    return jsonify({"notifications": items, "unread_count": unread_count, "total": total,
                    "limit": limit, "offset": offset, **meta}), 200


@notifications_bp.patch("/<int:notification_id>/read")
@login_required
def mark_read(notification_id):
    db = get_db()
    user = current_user()
    visible_ids = {d["id"] for d in _visible_to(db, user.id)}
    if notification_id not in visible_ids:
        return jsonify({"error": "notification_not_found"}), 404

    read = _read_ids(db, user.id)
    if notification_id not in read:
        read_id = next_id("notification_reads")
        db.notification_reads.insert_one({
            "id": read_id, "user_id": user.id, "notification_id": notification_id,
            "read_at": datetime.now(timezone.utc),
        })
    return jsonify({"message": "Marked as read."}), 200


@notifications_bp.post("/read-all")
@login_required
def mark_all_read():
    db = get_db()
    user = current_user()
    all_visible = _visible_to(db, user.id)
    already = _read_ids(db, user.id)
    fresh = [d["id"] for d in all_visible if d["id"] not in already]
    now = datetime.now(timezone.utc)
    for nid in fresh:
        read_id = next_id("notification_reads")
        db.notification_reads.insert_one({
            "id": read_id, "user_id": user.id, "notification_id": nid, "read_at": now,
        })
    return jsonify({"message": "All marked as read.", "marked": len(fresh)}), 200
