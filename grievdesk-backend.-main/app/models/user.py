from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash


class Role:
    RESIDENT = "resident"
    COMMITTEE = "committee"
    SECRETARY = "secretary"
    ALL = (RESIDENT, COMMITTEE, SECRETARY)


class ApprovalStatus:
    PENDING = "pending"
    APPROVED = "approved"
    ALL = (PENDING, APPROVED)


class User:
    def __init__(self, doc):
        self._doc = doc
        self.id = doc.get("id")           # integer auto-increment id
        self._id = doc.get("_id")         # ObjectId
        self.name = doc.get("name")
        self.phone = doc.get("phone")
        self.gmail = doc.get("gmail")
        self.password_hash = doc.get("password_hash")
        self.flat_no = doc.get("flat_no")
        self.block_no = doc.get("block_no")
        self.preferred_language = doc.get("preferred_language", "en")
        self.role = doc.get("role", Role.RESIDENT)
        self.approval_status = doc.get("approval_status", ApprovalStatus.PENDING)
        self.share_phone = doc.get("share_phone", False)
        self.created_at = doc.get("created_at")
        self.updated_at = doc.get("updated_at")

    @classmethod
    def from_doc(cls, doc):
        if doc is None:
            return None
        return cls(doc)

    # ---- Password helpers ----
    def set_password(self, raw_password: str) -> None:
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password_hash(self.password_hash, raw_password)

    # ---- Role helpers ----
    def is_secretary(self) -> bool:
        return self.role == Role.SECRETARY

    def is_committee_or_above(self) -> bool:
        return self.role in (Role.COMMITTEE, Role.SECRETARY)

    def is_staff(self) -> bool:
        return self.role in (Role.COMMITTEE, Role.SECRETARY)

    def to_directory_dict(self, viewer) -> dict:
        staff_view = viewer is not None and viewer.is_staff()
        row = {
            "id": self.id,
            "name": self.name,
            "flat_no": self.flat_no,
            "block_no": self.block_no,
            "role": self.role,
            "phone": self.phone if (self.share_phone or staff_view) else None,
        }
        if staff_view or (viewer is not None and viewer.id == self.id):
            row["gmail"] = self.gmail
            row["preferred_language"] = self.preferred_language
            row["approval_status"] = self.approval_status
        return row

    def to_profile_dict(self) -> dict:
        return {
            "id": self.id, "name": self.name, "phone": self.phone, "gmail": self.gmail,
            "flat_no": self.flat_no, "block_no": self.block_no,
            "preferred_language": self.preferred_language, "share_phone": self.share_phone,
            "role": self.role, "approval_status": self.approval_status,
        }

    def to_public_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone if self.share_phone else None,
            "gmail": self.gmail,
            "flat_no": self.flat_no,
            "block_no": self.block_no,
            "preferred_language": self.preferred_language,
            "role": self.role,
            "approval_status": self.approval_status,
        }

    def to_doc(self) -> dict:
        """Serialize to a MongoDB document dict (for insert)."""
        now = datetime.now(timezone.utc)
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "gmail": self.gmail,
            "password_hash": self.password_hash,
            "flat_no": self.flat_no,
            "block_no": self.block_no,
            "preferred_language": self.preferred_language,
            "role": self.role,
            "approval_status": self.approval_status,
            "share_phone": self.share_phone,
            "created_at": self.created_at or now,
            "updated_at": self.updated_at or now,
        }
