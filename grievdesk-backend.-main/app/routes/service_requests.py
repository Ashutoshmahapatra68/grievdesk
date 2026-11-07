from flask import Blueprint, jsonify, request

from app.extensions import get_db
from app.utils.decorators import login_required, committee_or_secretary_required, current_user
from app.models.user import User
from app.models.service_request import ServiceRequest, ServiceRequestStatus
from app.models.ticket_event import TicketType, TicketAction
from app.services.tickets import add_event, timeline, notify_owner_of_status
from app.services.translation import localize_groups
from datetime import datetime, timezone

service_requests_bp = Blueprint("service_requests", __name__, url_prefix="/api/service-requests")


def _enrich(row, db):
    if row and row.user_id:
        row.user = User.from_doc(db.users.find_one({"id": row.user_id}))
    return row


@service_requests_bp.get("")
@login_required
def list_service_requests():
    db = get_db()
    viewer = current_user()
    filt = {} if viewer.is_staff() else {"user_id": viewer.id}
    docs = list(db.service_requests.find(filt).sort([("created_at", -1), ("id", -1)]))
    rows = []
    for doc in docs:
        r = ServiceRequest.from_doc(doc)
        _enrich(r, db)
        rows.append(r.to_public_dict())
    meta = localize_groups(viewer, (rows, ["description"]))
    return jsonify({"service_requests": rows, **meta}), 200


@service_requests_bp.get("/<int:request_id>")
@login_required
def get_service_request(request_id):
    db = get_db()
    viewer = current_user()
    doc = db.service_requests.find_one({"id": request_id})
    row = ServiceRequest.from_doc(doc)
    if row is None or not (viewer.is_staff() or row.user_id == viewer.id):
        return jsonify({"error": "service_request_not_found"}), 404
    _enrich(row, db)
    body = row.to_public_dict()
    body["timeline"] = timeline(TicketType.SERVICE_REQUEST, row.id)
    meta = localize_groups(viewer, ([body], ["description"]), (body["timeline"], ["note"]))
    return jsonify({**body, **meta}), 200


@service_requests_bp.patch("/<int:request_id>/status")
@committee_or_secretary_required
def update_status(request_id):
    db = get_db()
    doc = db.service_requests.find_one({"id": request_id})
    row = ServiceRequest.from_doc(doc)
    if row is None:
        return jsonify({"error": "service_request_not_found"}), 404

    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    if new_status not in ServiceRequestStatus.ALL:
        return jsonify({"error": "invalid_status", "allowed": list(ServiceRequestStatus.ALL)}), 400
    if new_status == row.status:
        _enrich(row, db)
        return jsonify({"message": "Status unchanged.", "service_request": row.to_public_dict()}), 200

    actor = current_user()
    db.service_requests.update_one({"id": request_id}, {"$set": {"status": new_status}})
    row.status = new_status
    add_event(TicketType.SERVICE_REQUEST, row.id, TicketAction.STATUS_CHANGED, detail=new_status, actor=actor)
    notify_owner_of_status(TicketType.SERVICE_REQUEST, row, row.user_id, actor, new_status)
    _enrich(row, db)
    return jsonify({"message": "Status updated.", "service_request": row.to_public_dict()}), 200
