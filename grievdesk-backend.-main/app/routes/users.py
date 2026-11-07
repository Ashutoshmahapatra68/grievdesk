import re
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

from app.extensions import get_db
from app.utils.decorators import (
    login_required, committee_or_secretary_required, secretary_required, current_user,
)
from app.models.user import User, Role, ApprovalStatus
from app.models.notification import NotificationType
from app.services.tickets import notify

users_bp = Blueprint("users", __name__, url_prefix="/api/users")

PHONE_RE = re.compile(r"^\+?[0-9][0-9 \-]{5,18}[0-9]$")
LANG_RE = re.compile(r"^[a-z]{2,3}$")
EDITABLE = {"name", "phone", "preferred_language", "share_phone", "flat_no", "block_no",
            "current_password", "new_password", "confirm_reapproval"}
LOCKED = {"gmail", "role", "approval_status", "id", "password_hash"}


def _target(user_id):
    db = get_db()
    return User.from_doc(db.users.find_one({"id": user_id}))


def _not_found():
    return jsonify({"error": "user_not_found"}), 404


def _bad(field, message, status=400):
    return jsonify({"error": "invalid_field", "field": field, "message": message}), status


@users_bp.get("/me")
@login_required
def get_me():
    return jsonify({"user": current_user().to_profile_dict()}), 200


@users_bp.put("/me")
@login_required
def update_me():
    db = get_db()
    user = current_user()
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not data:
        return jsonify({"error": "missing_fields", "message": "Send the fields you want to change."}), 400

    locked = sorted(set(data) & LOCKED)
    if locked:
        return jsonify({"error": "field_not_editable", "fields": locked}), 400
    unknown = sorted(set(data) - EDITABLE)
    if unknown:
        return jsonify({"error": "unknown_fields", "fields": unknown, "allowed": sorted(EDITABLE - {"confirm_reapproval"})}), 400

    changes = {}
    if "name" in data:
        v = data["name"]
        if not isinstance(v, str) or not (1 <= len(v.strip()) <= 120):
            return _bad("name", "Name must be 1-120 characters.")
        changes["name"] = v.strip()
    if "phone" in data:
        v = data["phone"]
        if not isinstance(v, str) or not PHONE_RE.match(v.strip()):
            return _bad("phone", "Enter a valid phone number (digits, optional leading +).")
        changes["phone"] = v.strip()
    if "preferred_language" in data:
        v = data["preferred_language"]
        if not isinstance(v, str) or not LANG_RE.match(v.strip().lower()):
            return _bad("preferred_language", "Use a language code such as en, hi or or.")
        changes["preferred_language"] = v.strip().lower()
    if "share_phone" in data:
        if not isinstance(data["share_phone"], bool):
            return _bad("share_phone", "share_phone must be true or false.")
        changes["share_phone"] = data["share_phone"]

    for field in ("flat_no", "block_no"):
        if field in data:
            v = data[field]
            if not isinstance(v, str) or not (1 <= len(v.strip()) <= 20):
                return _bad(field, f"{field} must be 1-20 characters.")
            changes[field] = v.strip()

    moving = any(f in changes and changes[f] != getattr(user, f) for f in ("flat_no", "block_no"))
    reapproval = moving and user.role != Role.SECRETARY
    if reapproval and data.get("confirm_reapproval") is not True:
        return jsonify({
            "error": "reapproval_required",
            "message": "Changing your flat or block needs the Secretary's approval again, and you will be "
                       "logged out until it is given. Send confirm_reapproval: true to continue.",
        }), 400

    if "new_password" in data:
        if not data.get("current_password") or not user.check_password(str(data["current_password"])):
            return jsonify({"error": "wrong_password", "message": "Your current password is incorrect."}), 403
        new = data["new_password"]
        if not isinstance(new, str) or len(new) < 8:
            return _bad("new_password", "The new password must be at least 8 characters.")
        if new == data["current_password"]:
            return _bad("new_password", "The new password must be different from the current one.")
        user.set_password(new)
        changes["password_hash"] = user.password_hash

    if reapproval:
        changes["approval_status"] = ApprovalStatus.PENDING

    changes["updated_at"] = datetime.now(timezone.utc)
    db.users.update_one({"id": user.id}, {"$set": changes})
    for k, v in changes.items():
        if hasattr(user, k):
            setattr(user, k, v)

    message = "Profile updated."
    if reapproval:
        message = "Profile updated. You have been logged out pending re-approval of your new flat/block."
    return jsonify({"message": message, "user": user.to_profile_dict(), "logged_out": reapproval}), 200


@users_bp.get("/pending")
@secretary_required
def pending_registrations():
    db = get_db()
    docs = list(db.users.find({"approval_status": ApprovalStatus.PENDING}).sort([("block_no", 1), ("flat_no", 1), ("name", 1)]))
    viewer = current_user()
    return jsonify({"users": [User.from_doc(d).to_directory_dict(viewer) for d in docs]}), 200


@users_bp.get("/directory")
@login_required
def directory():
    db = get_db()
    viewer = current_user()
    status = request.args.get("status", ApprovalStatus.APPROVED)
    if status not in ApprovalStatus.ALL:
        return jsonify({"error": "invalid_status", "allowed": list(ApprovalStatus.ALL)}), 400
    if status != ApprovalStatus.APPROVED and not viewer.is_staff():
        return jsonify({"error": "forbidden"}), 403

    docs = list(db.users.find({"approval_status": status}).sort([("block_no", 1), ("flat_no", 1), ("name", 1)]))
    return jsonify({"users": [User.from_doc(d).to_directory_dict(viewer) for d in docs]}), 200


@users_bp.patch("/<int:user_id>/approve")
@secretary_required
def approve_user(user_id):
    db = get_db()
    user = _target(user_id)
    if user is None:
        return _not_found()
    if user.approval_status == ApprovalStatus.APPROVED:
        return jsonify({"message": "Already approved.", "user": user.to_public_dict()}), 200

    db.users.update_one({"id": user_id}, {"$set": {"approval_status": ApprovalStatus.APPROVED, "updated_at": datetime.now(timezone.utc)}})
    user.approval_status = ApprovalStatus.APPROVED
    return jsonify({"message": "Resident approved.", "user": user.to_public_dict()}), 200


@users_bp.patch("/<int:user_id>/promote-to-committee")
@committee_or_secretary_required
def promote_to_committee(user_id):
    db = get_db()
    actor = current_user()
    target = _target(user_id)
    if target is None:
        return _not_found()
    if target.approval_status != ApprovalStatus.APPROVED:
        return jsonify({"error": "not_approved", "message": "Approve this registration before promoting."}), 400
    if target.role != Role.RESIDENT:
        return jsonify({"error": "already_staff", "message": f"This user is already {target.role}.", "role": target.role}), 409

    db.users.update_one({"id": user_id}, {"$set": {"role": Role.COMMITTEE, "updated_at": datetime.now(timezone.utc)}})
    target.role = Role.COMMITTEE
    notify(target.id, NotificationType.ROLE_CHANGE,
           f"You have been made a committee member by {actor.name}. The committee tools are now available to you.", actor)
    return jsonify({"message": f"{target.name} is now a committee member.", "user": target.to_public_dict()}), 200


@users_bp.patch("/<int:user_id>/demote")
@secretary_required
def demote_from_committee(user_id):
    db = get_db()
    actor = current_user()
    target = _target(user_id)
    if target is None:
        return _not_found()
    if target.role != Role.COMMITTEE:
        return jsonify({
            "error": "not_committee",
            "message": "Only committee members can be demoted. To change the Secretary, use transfer-secretary.",
            "role": target.role,
        }), 409

    db.users.update_one({"id": user_id}, {"$set": {"role": Role.RESIDENT, "updated_at": datetime.now(timezone.utc)}})
    target.role = Role.RESIDENT
    notify(target.id, NotificationType.ROLE_CHANGE,
           f"You are no longer a committee member (changed by {actor.name}). You are now a resident.", actor)
    return jsonify({"message": f"{target.name} is now a resident.", "user": target.to_public_dict()}), 200


@users_bp.patch("/<int:user_id>/transfer-secretary")
@secretary_required
def transfer_secretary(user_id):
    db = get_db()
    actor = current_user()
    data = request.get_json(silent=True) or {}
    if data.get("confirm") is not True:
        return jsonify({"error": "confirmation_required", "message": 'Send {"confirm": true} to confirm this transfer.'}), 400

    target = _target(user_id)
    if target is None:
        return _not_found()
    if target.id == actor.id:
        return jsonify({"error": "already_secretary", "message": "You already hold the Secretary role."}), 400
    if target.approval_status != ApprovalStatus.APPROVED:
        return jsonify({"error": "not_approved", "message": "The new Secretary must be an approved member."}), 400

    now = datetime.now(timezone.utc)
    db.users.update_one({"id": actor.id}, {"$set": {"role": Role.COMMITTEE, "updated_at": now}})
    db.users.update_one({"id": target.id}, {"$set": {"role": Role.SECRETARY, "updated_at": now}})
    actor.role = Role.COMMITTEE
    target.role = Role.SECRETARY

    notify(target.id, NotificationType.ROLE_CHANGE,
           f"{actor.name} has transferred the Secretary role to you. You are now the Secretary.", actor)
    notify(actor.id, NotificationType.ROLE_CHANGE,
           f"You transferred the Secretary role to {target.name}. You are now a committee member.", actor)

    return jsonify({
        "message": f"{target.name} is now the Secretary. You are now a committee member.",
        "new_secretary": target.to_public_dict(),
        "you": actor.to_public_dict(),
    }), 200
