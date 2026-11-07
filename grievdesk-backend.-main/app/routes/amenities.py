import re
from datetime import date, datetime, time, timedelta, timezone

from flask import Blueprint, jsonify, request, current_app

from app.extensions import get_db
from app.utils import timeutil
from app.utils.decorators import login_required, committee_or_secretary_required, current_user
from app.models.amenity import Amenity, AmenityBooking, BookingStatus
from app.models.notification import NotificationType
from app.models._db_helpers import next_id
from app.services.tickets import notify

amenities_bp = Blueprint("amenities", __name__, url_prefix="/api/amenities")
bookings_bp = Blueprint("bookings", __name__, url_prefix="/api/amenity-bookings")

TIME_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")


def _err(error, message, status=400, **extra):
    return jsonify({"error": error, "message": message, **extra}), status


def _parse_date(value):
    try:
        return date.fromisoformat(value) if isinstance(value, str) and len(value) == 10 else None
    except ValueError:
        return None


def _parse_time(value):
    m = TIME_RE.match(value) if isinstance(value, str) else None
    return time(int(m.group(1)), int(m.group(2))) if m else None


def _as_dt(d: date, t: time, tz):
    return datetime.combine(d, t, tzinfo=tz)


def _enrich_booking(booking, db):
    if booking and booking.user_id:
        from app.models.user import User
        booking._user = User.from_doc(db.users.find_one({"id": booking.user_id}))
    if booking and booking.amenity_id:
        booking._amenity = Amenity.from_doc(db.amenities.find_one({"id": booking.amenity_id}))
    return booking


@amenities_bp.get("")
@login_required
def list_amenities():
    db = get_db()
    docs = list(db.amenities.find().sort([("name", 1)]))
    return jsonify({"amenities": [Amenity.from_doc(d).to_dict() for d in docs]}), 200


@amenities_bp.post("")
@committee_or_secretary_required
def create_amenity():
    db = get_db()
    data = request.get_json(silent=True) or {}
    name, description = data.get("name"), data.get("description")
    if not isinstance(name, str) or not (1 <= len(name.strip()) <= 100):
        return _err("invalid_name", "Name must be 1-100 characters.")
    if description is not None and (not isinstance(description, str) or len(description) > 300):
        return _err("invalid_description", "Description must be text of at most 300 characters.")
    name = name.strip()
    if db.amenities.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}):
        return _err("amenity_exists", f"There is already an amenity called '{name}'.", 409)

    amenity_id = next_id("amenities")
    amenity = Amenity({"id": amenity_id, "name": name, "description": (description or "").strip() or None})
    db.amenities.insert_one(amenity.to_doc())
    return jsonify({"message": "Amenity created.", "amenity": amenity.to_dict()}), 201


@amenities_bp.get("/<int:amenity_id>/availability")
@login_required
def availability(amenity_id):
    db = get_db()
    amenity = Amenity.from_doc(db.amenities.find_one({"id": amenity_id}))
    if amenity is None:
        return _err("amenity_not_found", "No such amenity.", 404)
    day = _parse_date(request.args.get("date"))
    if day is None:
        return _err("invalid_date", "Use ?date=YYYY-MM-DD.")

    viewer = current_user()
    docs = list(db.amenity_bookings.find(
        {"amenity_id": amenity_id, "date": day.isoformat(), "status": BookingStatus.BOOKED}
    ).sort([("start_time", 1)]))

    slots = []
    for doc in docs:
        b = AmenityBooking.from_doc(doc)
        slot = {"start_time": b.start_time, "end_time": b.end_time, "mine": b.user_id == viewer.id}
        if viewer.is_staff():
            from app.models.user import User
            u = User.from_doc(db.users.find_one({"id": b.user_id}))
            slot["booked_by"] = u.name if u else None
        slots.append(slot)
    return jsonify({"amenity": amenity.to_dict(), "date": day.isoformat(), "booked": slots}), 200


@bookings_bp.post("")
@login_required
def create_booking():
    db = get_db()
    data = request.get_json(silent=True) or {}
    viewer = current_user()
    cfg = current_app.config

    amenity_id = data.get("amenity_id")
    amenity = Amenity.from_doc(db.amenities.find_one({"id": amenity_id})) if isinstance(amenity_id, int) and not isinstance(amenity_id, bool) else None
    if amenity is None:
        return _err("amenity_not_found", "Choose an amenity from the list.", 404)

    day = _parse_date(data.get("date"))
    start_str, end_str = data.get("start_time"), data.get("end_time")
    start, end = _parse_time(start_str), _parse_time(end_str)
    if day is None:
        return _err("invalid_date", "Use YYYY-MM-DD.")
    if start is None or end is None:
        return _err("invalid_time", "Use 24-hour HH:MM, e.g. 18:30.")
    if start >= end:
        return _err("invalid_time_range", "The end time must be after the start time (bookings stay within one day).")

    tz = timeutil.society_tz()
    now = timeutil.society_now()
    max_hours = cfg["MAX_BOOKING_HOURS"]
    if (_as_dt(day, end, tz) - _as_dt(day, start, tz)) > timedelta(hours=max_hours):
        return _err("booking_too_long", f"A booking can be at most {max_hours} hours.", max_hours=max_hours)
    if _as_dt(day, start, tz) <= now:
        return _err("in_the_past", "That time has already started or passed.")
    if day > now.date() + timedelta(days=cfg["MAX_BOOKING_DAYS_AHEAD"]):
        return _err("too_far_ahead", f"You can book at most {cfg['MAX_BOOKING_DAYS_AHEAD']} days ahead.")

    start_s, end_s = start_str, end_str
    # Clash check
    clash_doc = db.amenity_bookings.find_one({
        "amenity_id": amenity.id,
        "date": day.isoformat(),
        "status": BookingStatus.BOOKED,
        "start_time": {"$lt": end_s},
        "end_time": {"$gt": start_s},
    })
    if clash_doc:
        clash = AmenityBooking.from_doc(clash_doc)
        return _err("slot_taken", f"{amenity.name} is already booked from {clash.start_time} to {clash.end_time} on that day.",
                    409, conflict={"start_time": clash.start_time, "end_time": clash.end_time})

    booking_id = next_id("amenity_bookings")
    booking = AmenityBooking({
        "id": booking_id, "amenity_id": amenity.id, "user_id": viewer.id,
        "date": day.isoformat(), "start_time": start_s, "end_time": end_s,
        "status": BookingStatus.BOOKED, "created_at": datetime.now(timezone.utc),
    })
    booking._amenity = amenity
    booking._user = viewer
    db.amenity_bookings.insert_one(booking.to_doc())
    return jsonify({"message": f"{amenity.name} booked.", "booking": booking.to_dict(viewer)}), 201


@bookings_bp.get("/me")
@login_required
def my_bookings():
    db = get_db()
    viewer = current_user()
    docs = list(db.amenity_bookings.find({"user_id": viewer.id}).sort([("date", -1), ("start_time", -1)]))
    rows = []
    for doc in docs:
        b = AmenityBooking.from_doc(doc)
        _enrich_booking(b, db)
        rows.append(b.to_dict(viewer))
    return jsonify({"bookings": rows}), 200


@bookings_bp.get("")
@committee_or_secretary_required
def all_bookings():
    db = get_db()
    viewer = current_user()
    filt = {}
    if request.args.get("date"):
        day = _parse_date(request.args["date"])
        if day is None:
            return _err("invalid_date", "Use ?date=YYYY-MM-DD.")
        filt["date"] = day.isoformat()
    if request.args.get("amenity_id", "").isdigit():
        filt["amenity_id"] = int(request.args["amenity_id"])
    if request.args.get("status"):
        if request.args["status"] not in BookingStatus.ALL:
            return _err("invalid_status", "Use booked or cancelled.")
        filt["status"] = request.args["status"]

    docs = list(db.amenity_bookings.find(filt).sort([("date", -1), ("start_time", 1)]))
    rows = []
    for doc in docs:
        b = AmenityBooking.from_doc(doc)
        _enrich_booking(b, db)
        rows.append(b.to_dict(viewer))
    return jsonify({"bookings": rows}), 200


@bookings_bp.delete("/<int:booking_id>")
@login_required
def cancel_booking(booking_id):
    db = get_db()
    viewer = current_user()
    doc = db.amenity_bookings.find_one({"id": booking_id})
    booking = AmenityBooking.from_doc(doc)
    if booking is None or not (viewer.is_staff() or booking.user_id == viewer.id):
        return _err("booking_not_found", "No such booking.", 404)

    if booking.status == BookingStatus.CANCELLED:
        _enrich_booking(booking, db)
        return jsonify({"message": "Already cancelled.", "booking": booking.to_dict(viewer)}), 200

    tz = timeutil.society_tz()
    end_dt = datetime.combine(date.fromisoformat(booking.date), time.fromisoformat(booking.end_time), tzinfo=tz)
    if end_dt <= timeutil.society_now():
        return _err("booking_in_past", "That booking is already over.", 409)

    db.amenity_bookings.update_one({"id": booking_id}, {"$set": {"status": BookingStatus.CANCELLED}})
    booking.status = BookingStatus.CANCELLED
    _enrich_booking(booking, db)

    if booking.user_id != viewer.id:
        amenity_name = booking._amenity.name if booking._amenity else "amenity"
        notify(booking.user_id, NotificationType.BOOKING_UPDATE,
               f"Your booking of {amenity_name} on {booking.date} "
               f"({booking.start_time}-{booking.end_time}) was cancelled by {viewer.name}.",
               viewer)
    return jsonify({"message": "Booking cancelled.", "booking": booking.to_dict(viewer)}), 200
