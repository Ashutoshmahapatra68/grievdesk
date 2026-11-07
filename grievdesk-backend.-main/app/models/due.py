from datetime import datetime, timezone
from decimal import Decimal


class PaidStatus:
    PAID = "paid"
    UNPAID = "unpaid"
    ALL = (PAID, UNPAID)


class Due:
    def __init__(self, doc):
        self._doc = doc
        self.id = doc.get("id")
        self._id = doc.get("_id")
        self.user_id = doc.get("user_id")
        self.month = doc.get("month")
        # Store amount as string in Mongo, convert to Decimal for math
        _amount = doc.get("amount", "0")
        self.amount = Decimal(str(_amount))
        self.due_date = doc.get("due_date")  # stored as date string "YYYY-MM-DD"
        self.paid_status = doc.get("paid_status", PaidStatus.UNPAID)
        self.paid_at = doc.get("paid_at")
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

    def to_dict(self) -> dict:
        due_date = self.due_date
        if hasattr(due_date, "isoformat"):
            due_date = due_date.isoformat()
        paid_at = self.paid_at
        if hasattr(paid_at, "isoformat"):
            paid_at = paid_at.isoformat()
        created_at = self.created_at
        if hasattr(created_at, "isoformat"):
            created_at = created_at.isoformat()
        return {
            "id": self.id,
            "user_id": self.user_id,
            "resident": self._user.name if self._user else None,
            "flat_no": self._user.flat_no if self._user else None,
            "block_no": self._user.block_no if self._user else None,
            "month": self.month,
            "amount": str(self.amount),
            "due_date": due_date,
            "paid_status": self.paid_status,
            "paid_at": paid_at,
        }

    def to_doc(self) -> dict:
        now = datetime.now(timezone.utc)
        due_date = self.due_date
        if hasattr(due_date, "isoformat"):
            due_date = due_date.isoformat()
        paid_at = self.paid_at
        if hasattr(paid_at, "isoformat"):
            paid_at = paid_at.isoformat()
        return {
            "id": self.id,
            "user_id": self.user_id,
            "month": self.month,
            "amount": str(self.amount),
            "due_date": due_date,
            "paid_status": self.paid_status,
            "paid_at": paid_at,
            "created_at": self.created_at or now,
        }
