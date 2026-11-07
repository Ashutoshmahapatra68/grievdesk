import re

from flask import Blueprint, jsonify, request

from app.extensions import get_db
from app.utils.decorators import login_required, current_user
from app.models.user import User
from app.models.announcement import Announcement
from app.models.complaint import Complaint
from app.models.service_request import ServiceRequest
from app.services.rules import latest_rulebook
from app.services.translation import localize_groups, to_english

search_bp = Blueprint("search", __name__, url_prefix="/api/search")


def _snippet(paragraph: str, terms, width: int = 300) -> str:
    text = " ".join(paragraph.split())
    if len(text) <= width:
        return text
    lowered = text.lower()
    hits = [lowered.find(t.lower()) for t in terms if t.lower() in lowered]
    start = max(0, (min(hits) if hits else 0) - width // 3)
    piece = text[start:start + width].strip()
    return ("..." if start else "") + piece + ("..." if start + width < len(text) else "")


@search_bp.get("")
@login_required
def search():
    db = get_db()
    viewer = current_user()
    q = " ".join((request.args.get("q") or "").split())
    if not (2 <= len(q) <= 100):
        return jsonify({"error": "invalid_query", "message": "Type between 2 and 100 characters."}), 400
    try:
        limit = int(request.args.get("limit", 10))
        if not 1 <= limit <= 50:
            raise ValueError
    except ValueError:
        return jsonify({"error": "invalid_paging", "message": "limit must be a whole number from 1 to 50."}), 400

    terms = [q]
    english = None
    if viewer.preferred_language != "en" or any(ord(ch) > 127 for ch in q):
        english = to_english(q)
        if english and english.lower() != q.lower():
            terms.append(english)
        else:
            english = None

    # Build regex for case-insensitive contains any term
    def _regex_filter(field, terms_list):
        return {field: {"$regex": "|".join(re.escape(t) for t in terms_list), "$options": "i"}}

    # Complaints
    c_filt = _regex_filter("translated_text", terms)
    c_docs = list(db.complaints.find(c_filt).sort([("created_at", -1), ("id", -1)]).limit(limit))
    complaint_rows = []
    for doc in c_docs:
        c = Complaint.from_doc(doc)
        u = User.from_doc(db.users.find_one({"id": c.user_id}))
        c.user = u
        complaint_rows.append(c.to_public_dict(viewer))
    c_total = db.complaints.count_documents(c_filt)

    # Service requests
    s_filt = _regex_filter("translated_text", terms)
    if not viewer.is_staff():
        s_filt["user_id"] = viewer.id
    s_docs = list(db.service_requests.find(s_filt).sort([("created_at", -1), ("id", -1)]).limit(limit))
    request_rows = []
    for doc in s_docs:
        r = ServiceRequest.from_doc(doc)
        u = User.from_doc(db.users.find_one({"id": r.user_id}))
        r.user = u
        request_rows.append(r.to_public_dict())
    s_total = db.service_requests.count_documents(s_filt)

    # Announcements
    a_filt = {"$or": [
        _regex_filter("title", terms),
        _regex_filter("message", terms),
    ]}
    a_docs = list(db.announcements.find(a_filt).sort([("created_at", -1), ("id", -1)]).limit(limit))
    announcement_rows = []
    for doc in a_docs:
        ann = Announcement.from_doc(doc)
        u = User.from_doc(db.users.find_one({"id": ann.posted_by}))
        ann.author = u
        announcement_rows.append(ann.to_public_dict())
    a_total = db.announcements.count_documents(a_filt)

    # Rules
    rule_rows = []
    rulebook = latest_rulebook()
    if rulebook:
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n|\r\n\s*\r\n", rulebook.content_text) if p.strip()]
        if len(paragraphs) <= 1:
            paragraphs = [p.strip() for p in rulebook.content_text.splitlines() if p.strip()]
        for index, paragraph in enumerate(paragraphs, start=1):
            if any(t.lower() in paragraph.lower() for t in terms):
                rule_rows.append({"section": index, "snippet": _snippet(paragraph, terms)})
                if len(rule_rows) >= limit:
                    break

    meta = localize_groups(
        viewer,
        (complaint_rows, ["translated_text"]), (request_rows, ["description"]),
        (announcement_rows, ["title", "message"]), (rule_rows, ["snippet"]),
    )
    return jsonify({
        "query": q,
        "query_english": english,
        "results": {
            "complaints": complaint_rows, "service_requests": request_rows,
            "announcements": announcement_rows, "rules": rule_rows,
        },
        "totals": {
            "complaints": c_total, "service_requests": s_total, "announcements": a_total,
        },
        **meta,
    }), 200
