from datetime import datetime, timezone

from app.extensions import get_db
from app.models.complaint import Complaint, ComplaintStatus
from app.models.ticket_event import TicketType, TicketAction
from app.services.tickets import add_event, notify_owner_of_status


def _load_complaint(doc):
    """Load a complaint with its user populated."""
    if doc is None:
        return None
    from app.models.user import User
    db = get_db()
    c = Complaint.from_doc(doc)
    c.user = User.from_doc(db.users.find_one({"id": c.user_id}))
    if c.assigned_to is not None:
        c.assignee = User.from_doc(db.users.find_one({"id": c.assigned_to}))
    return c


def set_complaint_status(complaint, new_status, actor, resolution_notes=None, event_note=None):
    """
    The ONE way a complaint's status changes (committee action or automatic escalation).

    Reports linked to this complaint as duplicates follow it, so the 5 residents who reported the same leak all
    see it move to "resolved" without anyone updating 5 tickets. Each owner gets their own private notification.
    actor=None means the system made the change. Returns every complaint that changed (this one first).
    """
    db = get_db()
    now = datetime.now(timezone.utc)
    changed = []

    def apply(target, note):
        target.status = new_status
        if resolution_notes:
            target.resolution_notes = resolution_notes
        # Update in MongoDB
        update_fields = {"status": new_status, "updated_at": now}
        if resolution_notes:
            update_fields["resolution_notes"] = resolution_notes
        db.complaints.update_one({"id": target.id}, {"$set": update_fields})
        add_event(TicketType.COMPLAINT, target.id, TicketAction.STATUS_CHANGED, detail=new_status, note=note, actor=actor)
        notify_owner_of_status(TicketType.COMPLAINT, target, target.user_id, actor, new_status, resolution_notes or event_note)
        changed.append(target)

    apply(complaint, event_note or resolution_notes)

    # Follow duplicates
    follower_docs = list(db.complaints.find({"duplicate_of": complaint.id}))
    for doc in follower_docs:
        follower = _load_complaint(doc)
        if follower.status != new_status:
            apply(follower, f"Follows complaint #{complaint.id}")

    return changed
