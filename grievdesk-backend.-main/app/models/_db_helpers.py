"""
Shared MongoDB helper: auto-incrementing integer ID counter.
"""
from app.extensions import get_db


def next_id(collection_name: str) -> int:
    """Return the next auto-increment integer for the given collection."""
    db = get_db()
    result = db.counters.find_one_and_update(
        {"_id": collection_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return result["seq"]
