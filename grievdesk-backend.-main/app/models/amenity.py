from datetime import datetime, timezone


class BookingStatus:
    BOOKED = "booked"
    CANCELLED = "cancelled"   # cancelled bookings are kept (history) but never block a slot
    ALL = (BOOKED, CANCELLED)


class Amenity:
    def __init__(self, doc):
        self._doc = doc
        self.id = doc.get("id")
        self._id = doc.get("_id")
        self.name = doc.get("name", "")
        self.description = doc.get("description")

    @classmethod
    def from_doc(cls, doc):
        if doc is None:
            return None
        return cls(doc)

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name, "description": self.description}

    def to_doc(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
        }


class AmenityBooking:
    def __init__(self, doc):
        self._doc = doc
        self.id = doc.get("id")
        self._id = doc.get("_id")
        self.amenity_id = doc.get("amenity_id")
        self.user_id = doc.get("user_id")
        # date stored as "YYYY-MM-DD" string
        self.date = doc.get("date")
        # times stored as "HH:MM" strings
        self.start_time = doc.get("start_time")
        self.end_time = doc.get("end_time")
        self.status = doc.get("status", BookingStatus.BOOKED)
        self.created_at = doc.get("created_at")
        self._amenity = None
        self._user = None

    @classmethod
    def from_doc(cls, doc):
        if doc is None:
            return None
        return cls(doc)

    @property
    def amenity(self):
        return self._amenity

    @amenity.setter
    def amenity(self, value):
        self._amenity = value

    @property
    def user(self):
        return self._user

    @user.setter
    def user(self, value):
        self._user = value

    def to_dict(self, viewer=None) -> dict:
        """Residents see their own bookings; committee/secretary also see who booked."""
        staff = viewer is not None and viewer.role in ("committee", "secretary")
        # Normalize date/time for output
        date_str = self.date
        if hasattr(date_str, "isoformat"):
            date_str = date_str.isoformat()
        start_str = self.start_time
        end_str = self.end_time
        # If stored as time objects (shouldn't be, but be safe)
        if hasattr(start_str, "strftime"):
            start_str = start_str.strftime("%H:%M")
        if hasattr(end_str, "strftime"):
            end_str = end_str.strftime("%H:%M")
        row = {
            "id": self.id,
            "amenity_id": self.amenity_id,
            "amenity": self._amenity.name if self._amenity else None,
            "date": date_str,
            "start_time": start_str,
            "end_time": end_str,
            "status": self.status,
        }
        if staff and self._user:
            row["booked_by"] = self._user.name
            row["flat_no"] = self._user.flat_no
            row["block_no"] = self._user.block_no
        return row

    def to_doc(self) -> dict:
        now = datetime.now(timezone.utc)
        date_str = self.date
        if hasattr(date_str, "isoformat"):
            date_str = date_str.isoformat()
        start_str = self.start_time
        end_str = self.end_time
        if hasattr(start_str, "strftime"):
            start_str = start_str.strftime("%H:%M")
        if hasattr(end_str, "strftime"):
            end_str = end_str.strftime("%H:%M")
        return {
            "id": self.id,
            "amenity_id": self.amenity_id,
            "user_id": self.user_id,
            "date": date_str,
            "start_time": start_str,
            "end_time": end_str,
            "status": self.status,
            "created_at": self.created_at or now,
        }
