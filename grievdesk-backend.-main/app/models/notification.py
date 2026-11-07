from datetime import datetime, timezone


class NotificationType:
    ANNOUNCEMENT = "announcement"
    DUE_REMINDER = "due_reminder"
    ROLE_CHANGE = "role_change"
    TICKET_UPDATE = "ticket_update"
    DUE_UPDATE = "due_update"
    BOOKING_UPDATE = "booking_update"
    ALL = (ANNOUNCEMENT, DUE_REMINDER, ROLE_CHANGE, TICKET_UPDATE, DUE_UPDATE, BOOKING_UPDATE)


class Notification:
    """target_user_id NULL = broadcast to every resident; otherwise only that user sees it."""

    def __init__(self, doc):
        self._doc = doc
        self.id = doc.get("id")
        self._id = doc.get("_id")
        self.type = doc.get("type")
        self.message = doc.get("message", "")
        self.target_user_id = doc.get("target_user_id")
        self.created_by = doc.get("created_by")
        self.created_at = doc.get("created_at")

    @classmethod
    def from_doc(cls, doc):
        if doc is None:
            return None
        return cls(doc)

    def to_dict(self, read: bool = False) -> dict:
        return {
            "id": self.id,
            "type": self.type,
            "message": self.message,
            "is_broadcast": self.target_user_id is None,
            "read_status": read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_doc(self) -> dict:
        now = datetime.now(timezone.utc)
        return {
            "id": self.id,
            "type": self.type,
            "message": self.message,
            "target_user_id": self.target_user_id,
            "created_by": self.created_by,
            "created_at": self.created_at or now,
        }
