from datetime import datetime, timezone


class JobRun:
    """One row per run of a scheduled job, so 'did the weekly cleanup actually run?' has an answer."""

    def __init__(self, doc):
        self._doc = doc
        self.id = doc.get("id")
        self._id = doc.get("_id")
        self.job = doc.get("job")
        self.started_at = doc.get("started_at")
        self.finished_at = doc.get("finished_at")
        self.ok = doc.get("ok")
        self.summary = doc.get("summary")

    @classmethod
    def from_doc(cls, doc):
        if doc is None:
            return None
        return cls(doc)

    def to_doc(self) -> dict:
        now = datetime.now(timezone.utc)
        return {
            "id": self.id,
            "job": self.job,
            "started_at": self.started_at or now,
            "finished_at": self.finished_at,
            "ok": self.ok,
            "summary": self.summary,
        }
