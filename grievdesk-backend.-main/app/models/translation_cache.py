from datetime import datetime, timezone


class TranslationCache:
    """
    A remembered translation, so the same sentence is never translated twice for the same language.
    The permanent record (complaint, announcement, ...) always stays in English; this is only a
    disposable shortcut and can be emptied at any time without losing anything.
    Keyed by a hash of the English text.
    """

    def __init__(self, doc):
        self._doc = doc
        self.id = doc.get("id")
        self._id = doc.get("_id")
        self.source_hash = doc.get("source_hash")
        self.target_lang = doc.get("target_lang")
        self.translated_text = doc.get("translated_text")
        self.created_at = doc.get("created_at")

    @classmethod
    def from_doc(cls, doc):
        if doc is None:
            return None
        return cls(doc)

    def to_doc(self) -> dict:
        now = datetime.now(timezone.utc)
        return {
            "source_hash": self.source_hash,
            "target_lang": self.target_lang,
            "translated_text": self.translated_text,
            "created_at": self.created_at or now,
        }
