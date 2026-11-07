from datetime import datetime, timezone


class TicketType:
    COMPLAINT = "complaint"
    SERVICE_REQUEST = "service_request"


class TicketAction:
    STATUS_CHANGED = "status_changed"
    ASSIGNED = "assigned"
    UNASSIGNED = "unassigned"
    LINKED = "linked"        # marked as a duplicate of another complaint
    UNLINKED = "unlinked"


class TicketEvent:
    """
    One row per change on a complaint/service request. This is what the "status timeline"
    in My Tickets is built from (and what the escalation job will write to as the system).
    actor_id is NULL for automatic changes made by the system.
    """

    def __init__(self, doc):
        self._doc = doc
        self.id = doc.get("id")
        self._id = doc.get("_id")
        self.ticket_type = doc.get("ticket_type")
        self.ticket_id = doc.get("ticket_id")
        self.action = doc.get("action")
        self.detail = doc.get("detail")
        self.note = doc.get("note")
        self.actor_id = doc.get("actor_id")
        self.created_at = doc.get("created_at")
        self._actor = None

    @classmethod
    def from_doc(cls, doc):
        if doc is None:
            return None
        return cls(doc)

    @property
    def actor(self):
        return self._actor

    @actor.setter
    def actor(self, value):
        self._actor = value

    def to_dict(self) -> dict:
        return {
            "action": self.action,
            "detail": self.detail,
            "note": self.note,
            "by": self._actor.name if self._actor else "system",
            "at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_doc(self) -> dict:
        now = datetime.now(timezone.utc)
        return {
            "id": self.id,
            "ticket_type": self.ticket_type,
            "ticket_id": self.ticket_id,
            "action": self.action,
            "detail": self.detail,
            "note": self.note,
            "actor_id": self.actor_id,
            "created_at": self.created_at or now,
        }
