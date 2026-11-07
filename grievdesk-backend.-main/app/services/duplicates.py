from datetime import datetime, timedelta, timezone

from flask import current_app

from app.extensions import get_db
from app.models.complaint import Complaint, ComplaintCategory, ComplaintStatus
from app.models.user import User


def find_duplicate_root(reporter, category, now=None):
    """
    Is this new complaint about something already reported? Rule from the design:
    same category + same block, an open (not resolved) original, reported within the time window.
    Only ORIGINALS match (never a duplicate), so every duplicate points at one root, never a chain.
    "Other" is too generic to compare, so it never matches.
    Returns the original Complaint object, or None.
    """
    if not category or category == ComplaintCategory.OTHER:
        return None
    now = now or datetime.now(timezone.utc)
    since = now - timedelta(hours=current_app.config["DUPLICATE_WINDOW_HOURS"])

    db = get_db()
    # Find all original complaints of this category not yet resolved
    candidate_docs = list(db.complaints.find({
        "duplicate_of": None,
        "status": {"$ne": ComplaintStatus.RESOLVED},
        "category": category,
        "created_at": {"$gte": since},
    }).sort([("created_at", 1), ("id", 1)]))

    for doc in candidate_docs:
        complaint = Complaint.from_doc(doc)
        # Load the complaint's user to check block_no
        user_doc = db.users.find_one({"id": complaint.user_id})
        if user_doc and user_doc.get("block_no") == reporter.block_no:
            complaint.user = User.from_doc(user_doc)
            return complaint

    return None
