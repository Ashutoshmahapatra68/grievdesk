from flask import Blueprint, jsonify

from app.extensions import get_db
from app.utils.decorators import login_required, current_user
from app.models.user import User
from app.models.complaint import Complaint
from app.models.service_request import ServiceRequest
from app.models.ticket_event import TicketType
from app.services.tickets import timelines_for
from app.services.translation import localize_groups

my_tickets_bp = Blueprint("my_tickets", __name__, url_prefix="/api/my-tickets")


@my_tickets_bp.get("")
@login_required
def my_tickets():
    db = get_db()
    user = current_user()

    c_docs = list(db.complaints.find({"user_id": user.id}).sort([("created_at", -1), ("id", -1)]))
    complaints = []
    for doc in c_docs:
        c = Complaint.from_doc(doc)
        c.user = user
        if c.assigned_to:
            assignee = User.from_doc(db.users.find_one({"id": c.assigned_to}))
            c.assignee = assignee
        complaints.append(c)

    r_docs = list(db.service_requests.find({"user_id": user.id}).sort([("created_at", -1), ("id", -1)]))
    requests_ = []
    for doc in r_docs:
        r = ServiceRequest.from_doc(doc)
        r.user = user
        requests_.append(r)

    c_events = timelines_for(TicketType.COMPLAINT, [c.id for c in complaints])
    s_events = timelines_for(TicketType.SERVICE_REQUEST, [r.id for r in requests_])

    complaint_rows = [dict(c.to_public_dict(user), timeline=c_events[c.id]) for c in complaints]
    request_rows = [dict(r.to_public_dict(), timeline=s_events[r.id]) for r in requests_]
    events = [e for row in complaint_rows + request_rows for e in row["timeline"]]
    meta = localize_groups(
        user,
        (complaint_rows, ["translated_text", "resolution_notes"]),
        (request_rows, ["description"]),
        (events, ["note"]),
    )
    return jsonify({"complaints": complaint_rows, "service_requests": request_rows, **meta}), 200
