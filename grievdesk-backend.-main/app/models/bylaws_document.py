from datetime import datetime, timezone


class BylawsDocument:
    """
    The society rulebook, stored as one versioned block of plain text and pasted
    whole into the Rules Q&A prompt (no chunking/embeddings — rulebooks are short).
    Every upload creates a new version; Q&A always uses the highest version.
    """

    def __init__(self, doc):
        self._doc = doc
        self.id = doc.get("id")
        self._id = doc.get("_id")
        self.content_text = doc.get("content_text", "")
        self.version = doc.get("version")
        self.uploaded_by = doc.get("uploaded_by")
        self.uploaded_at = doc.get("uploaded_at")

    @classmethod
    def from_doc(cls, doc):
        if doc is None:
            return None
        return cls(doc)

    def to_doc(self) -> dict:
        now = datetime.now(timezone.utc)
        return {
            "id": self.id,
            "content_text": self.content_text,
            "version": self.version,
            "uploaded_by": self.uploaded_by,
            "uploaded_at": self.uploaded_at or now,
        }
