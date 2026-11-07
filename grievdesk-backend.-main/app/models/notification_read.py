from datetime import datetime, timezone


class NotificationRead:
    """
    Per-person "I've read this". A broadcast notification (one row, shown to everyone) can't carry a
    single read flag, otherwise one resident opening it would mark it read for the whole society.
    """

    def __init__(self, doc):
        self._doc = doc
        self.id = doc.get("id")
        self._id = doc.get("_id")
        self.user_id = doc.get("user_id")
        self.notification_id = doc.get("notification_id")
        self.read_at = doc.get("read_at")

    @classmethod
    def from_doc(cls, doc):
        if doc is None:
            return None
        return cls(doc)

    def to_doc(self) -> dict:
        now = datetime.now(timezone.utc)
        return {
            "id": self.id,
            "user_id": self.user_id,
            "notification_id": self.notification_id,
            "read_at": self.read_at or now,
        }
