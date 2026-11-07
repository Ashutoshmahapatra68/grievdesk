from datetime import datetime, timezone


class Announcement:
    def __init__(self, doc):
        self._doc = doc
        self.id = doc.get("id")
        self._id = doc.get("_id")
        self.title = doc.get("title", "")
        self.message = doc.get("message", "")
        self.is_pinned = doc.get("is_pinned", False)
        self.posted_by = doc.get("posted_by")
        self.created_at = doc.get("created_at")
        self._author = None

    @classmethod
    def from_doc(cls, doc):
        if doc is None:
            return None
        return cls(doc)

    @property
    def author(self):
        return self._author

    @author.setter
    def author(self, value):
        self._author = value

    def to_public_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "is_pinned": self.is_pinned,
            "posted_by": self._author.name if self._author else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_doc(self) -> dict:
        now = datetime.now(timezone.utc)
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "is_pinned": self.is_pinned,
            "posted_by": self.posted_by,
            "created_at": self.created_at or now,
        }
