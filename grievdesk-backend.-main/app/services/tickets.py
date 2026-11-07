"""Shared helpers for anything that changes a ticket (complaint / service request)."""
from datetime import datetime, timezone

from app.extensions import get_db
from app.models.notification import Notification, NotificationType
from app.models.ticket_event import TicketEvent, TicketType
from app.models._db_helpers import next_id

STATUS_LABELS = {
    "new": "New",
    "in_progress": "In progress",
    "resolved": "Resolved",
    "escalated": "Escalated",
}


def add_event(ticket_type, ticket_id, action, detail=None, note=None, actor=None):
    db = get_db()
    now = datetime.now(timezone.utc)
    event_id = next_id("ticket_events")
    doc = {
        "id": event_id,
        "ticket_type": ticket_type,
        "ticket_id": ticket_id,
        "action": action,
        "detail": detail,
        "note": note,
        "actor_id": actor.id if actor else None,
        "created_at": now,
    }
    db.ticket_events.insert_one(doc)


def _load_event(doc):
    """Load a TicketEvent and populate actor name."""
    if doc is None:
        return None
    db = get_db()
    event = TicketEvent.from_doc(doc)
    if event.actor_id is not None:
        from app.models.user import User
        actor_doc = db.users.find_one({"id": event.actor_id})
        event.actor = User.from_doc(actor_doc)
    return event


def timeline(ticket_type, ticket_id):
    db = get_db()
    rows = list(db.ticket_events.find(
        {"ticket_type": ticket_type, "ticket_id": ticket_id}
    ).sort([("created_at", 1), ("id", 1)]))
    return [_load_event(r).to_dict() for r in rows]


def notify(user_id, notification_type, message, created_by):
    """A private notification — only `user_id` will ever see it."""
    db = get_db()
    now = datetime.now(timezone.utc)
    note_id = next_id("notifications")
    doc = {
        "id": note_id,
        "type": notification_type,
        "message": message,
        "target_user_id": user_id,
        "created_by": created_by.id if created_by is not None else None,
        "created_at": now,
    }
    db.notifications.insert_one(doc)


def notify_owner_of_status(ticket_type, ticket, owner_id, actor, new_status, note=None):
    """Tell the person who raised the ticket that its status changed (not when they changed it themselves).
    actor=None means the system did it (e.g. automatic escalation)."""
    if actor is not None and owner_id == actor.id:
        return
    kind = "complaint" if ticket_type == TicketType.COMPLAINT else "service request"
    message = f"Update on your {kind} #{ticket.id}: status is now {STATUS_LABELS.get(new_status, new_status)}."
    if note:
        message += f" {'Note from the committee' if actor is not None else 'Note'}: {note}"
    notify(owner_id, NotificationType.TICKET_UPDATE, message, actor)


def timelines_for(ticket_type, ticket_ids):
    """{ticket_id: [events...]} for many tickets in a single query."""
    result = {tid: [] for tid in ticket_ids}
    if not ticket_ids:
        return result
    db = get_db()
    rows = list(db.ticket_events.find(
        {"ticket_type": ticket_type, "ticket_id": {"$in": ticket_ids}}
    ).sort([("created_at", 1), ("id", 1)]))
    for doc in rows:
        event = _load_event(doc)
        result[event.ticket_id].append(event.to_dict())
    return result
