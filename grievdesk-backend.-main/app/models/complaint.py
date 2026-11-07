from datetime import datetime, timezone


class ComplaintCategory:
    PLUMBING = "Plumbing"
    ELECTRICAL = "Electrical"
    WATER_SUPPLY = "Water Supply"
    SANITATION = "Sanitation"
    PARKING = "Parking"
    NOISE = "Noise"
    SECURITY = "Security"
    OTHER = "Other"
    ALL = (PLUMBING, ELECTRICAL, WATER_SUPPLY, SANITATION, PARKING, NOISE, SECURITY, OTHER)


class Severity:
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    ALL = (LOW, MEDIUM, HIGH)


class ComplaintStatus:
    NEW = "new"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    ESCALATED = "escalated"
    ALL = (NEW, IN_PROGRESS, RESOLVED, ESCALATED)


class Complaint:
    def __init__(self, doc):
        self._doc = doc
        self.id = doc.get("id")
        self._id = doc.get("_id")
        self.user_id = doc.get("user_id")
        self.raw_text = doc.get("raw_text", "")
        self.original_language = doc.get("original_language", "en")
        self.translated_text = doc.get("translated_text", "")
        self.audio_url = doc.get("audio_url")
        self.category = doc.get("category")
        self.severity = doc.get("severity")
        self.status = doc.get("status", ComplaintStatus.NEW)
        self.is_anonymous = doc.get("is_anonymous", False)
        self.duplicate_of = doc.get("duplicate_of")
        self.assigned_to = doc.get("assigned_to")
        self.resolution_notes = doc.get("resolution_notes")
        self.created_at = doc.get("created_at")
        self.updated_at = doc.get("updated_at")
        # Embedded related data (populated on demand)
        self._user = None
        self._assignee = None

    @classmethod
    def from_doc(cls, doc):
        if doc is None:
            return None
        return cls(doc)

    @property
    def user(self):
        return self._user

    @user.setter
    def user(self, value):
        self._user = value

    @property
    def assignee(self):
        return self._assignee

    @assignee.setter
    def assignee(self, value):
        self._assignee = value

    def to_public_dict(self, viewer=None) -> dict:
        is_staff = viewer is not None and viewer.role in ("committee", "secretary")
        is_owner = viewer is not None and viewer.id == self.user_id
        reveal = (not self.is_anonymous) or is_staff or is_owner
        return {
            "id": self.id,
            "flat_no": self._user.flat_no if (reveal and self._user) else None,
            "block_no": self._user.block_no if (reveal and self._user) else None,
            "submitted_by": self._user.name if (is_staff and self._user) else None,
            "is_anonymous": self.is_anonymous,
            "category": self.category,
            "severity": self.severity,
            "status": self.status,
            "translated_text": self.translated_text,
            "duplicate_of": self.duplicate_of,
            "assigned_to": self._assignee.name if self._assignee else None,
            "resolution_notes": self.resolution_notes,
            "audio_available": bool(self.audio_url) and (is_staff or is_owner),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_doc(self) -> dict:
        now = datetime.now(timezone.utc)
        return {
            "id": self.id,
            "user_id": self.user_id,
            "raw_text": self.raw_text,
            "original_language": self.original_language,
            "translated_text": self.translated_text,
            "audio_url": self.audio_url,
            "category": self.category,
            "severity": self.severity,
            "status": self.status,
            "is_anonymous": self.is_anonymous,
            "duplicate_of": self.duplicate_of,
            "assigned_to": self.assigned_to,
            "resolution_notes": self.resolution_notes,
            "created_at": self.created_at or now,
            "updated_at": self.updated_at or now,
        }
