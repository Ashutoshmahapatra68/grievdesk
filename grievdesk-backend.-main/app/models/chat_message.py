from datetime import datetime, timezone


class ChatMessage:
    """
    Raw AI conversation transcript — disposable by design. This collection gets purged weekly.
    The result of a conversation (a Complaint, ServiceRequest, etc.) lives permanently in its own
    collection and is never affected by that cleanup.
    """

    def __init__(self, doc):
        self._doc = doc
        self.id = doc.get("id")
        self._id = doc.get("_id")
        self.user_id = doc.get("user_id")
        self.session_id = doc.get("session_id")
        self.selected_type = doc.get("selected_type")
        self.role = doc.get("role")
        self.content_text = doc.get("content_text", "")
        self.audio_url = doc.get("audio_url")
        self.created_at = doc.get("created_at")

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
            "session_id": self.session_id,
            "selected_type": self.selected_type,
            "role": self.role,
            "content_text": self.content_text,
            "audio_url": self.audio_url,
            "created_at": self.created_at or now,
        }


class SelectedType:
    COMPLAINT = "complaint"
    SERVICE = "service"
    RULES = "rules"
    COMMITTEE_ACTION = "committee_action"
    ALL = (COMPLAINT, SERVICE, RULES, COMMITTEE_ACTION)
