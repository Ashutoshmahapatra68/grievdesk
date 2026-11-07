from datetime import datetime, timezone


class ServiceType:
    PLUMBER = "plumber"
    ELECTRICIAN = "electrician"
    AC_MECHANIC = "ac_mechanic"
    LAUNDRY = "laundry"
    VEHICLE_SERVICE = "vehicle_service"
    ALL = (PLUMBER, ELECTRICIAN, AC_MECHANIC, LAUNDRY, VEHICLE_SERVICE)
    LABELS = {
        PLUMBER: "plumber",
        ELECTRICIAN: "electrician",
        AC_MECHANIC: "AC mechanic",
        LAUNDRY: "laundry",
        VEHICLE_SERVICE: "vehicle servicing",
    }


class ServiceRequestStatus:
    NEW = "new"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    ALL = (NEW, IN_PROGRESS, RESOLVED)


class ServiceRequest:
    def __init__(self, doc):
        self._doc = doc
        self.id = doc.get("id")
        self._id = doc.get("_id")
        self.user_id = doc.get("user_id")
        self.service_type = doc.get("service_type")
        self.raw_text = doc.get("raw_text", "")
        self.translated_text = doc.get("translated_text", "")
        self.preferred_time = doc.get("preferred_time")
        self.status = doc.get("status", ServiceRequestStatus.NEW)
        self.created_at = doc.get("created_at")
        self._user = None

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

    def to_public_dict(self) -> dict:
        return {
            "id": self.id,
            "requested_by": self._user.name if self._user else None,
            "flat_no": self._user.flat_no if self._user else None,
            "block_no": self._user.block_no if self._user else None,
            "service_type": self.service_type,
            "description": self.translated_text,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_doc(self) -> dict:
        now = datetime.now(timezone.utc)
        return {
            "id": self.id,
            "user_id": self.user_id,
            "service_type": self.service_type,
            "raw_text": self.raw_text,
            "translated_text": self.translated_text,
            "preferred_time": self.preferred_time,
            "status": self.status,
            "created_at": self.created_at or now,
        }
