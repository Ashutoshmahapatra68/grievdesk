import uuid
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, g, current_app
from flask_jwt_extended import get_jwt_identity

from app.extensions import get_db
from app.utils.decorators import login_required, current_user
from app.models.user import User, Role, ApprovalStatus
from app.models.chat_message import ChatMessage, SelectedType
from app.models.complaint import Complaint, ComplaintStatus
from app.models.service_request import ServiceRequest, ServiceType
from app.models.announcement import Announcement
from app.models.notification import NotificationType
from app.models._db_helpers import next_id
from app.services import gemini
from app.services.gemini import GeminiNotConfigured, GeminiCallFailed
from app.services.rules import ask_rulebook
from app.services.reminders import queue_dues_reminder
from app.services.duplicates import find_duplicate_root
from app.services.translation import localize_texts, localize_groups
from app.services import speech
from app.services.speech import (
    InvalidAudio, SpeechNotConfigured, SpeechCallFailed, NoSpeechDetected,
)

chat_bp = Blueprint("chat", __name__, url_prefix="/api/chat")

COMMITTEE_ACTIONS = ("announcement", "dues_reminder")


class ChatInputError(Exception):
    """Bad input or missing permission — nothing is saved, not even the transcript line."""
    def __init__(self, payload: dict, status: int):
        super().__init__(payload.get("error"))
        self.payload = payload
        self.status = status


def _as_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    return str(value or "").strip().lower() in ("true", "1", "yes", "on")


def _result(reply: str, status: int, **extra) -> dict:
    return {"reply": reply, "status": status, "extra": extra}


def _handle_complaint(user, text, data):
    db = get_db()
    result = gemini.classify_complaint(translated_text=text)
    if result.get("error") == "not_understood":
        return _result(
            "I didn't understand that as a complaint. Could you describe the problem more clearly?",
            200, understood=False,
        )

    audio = g.get("audio")
    original = find_duplicate_root(user, result["category"])
    now = datetime.now(timezone.utc)
    complaint_id = next_id("complaints")
    complaint = Complaint({
        "id": complaint_id,
        "user_id": user.id,
        "raw_text": text,
        "translated_text": result["english_text"],
        "original_language": "und" if audio else result["detected_language"],
        "category": result["category"],
        "severity": result["severity"],
        "is_anonymous": _as_bool(data.get("anonymous")),
        "duplicate_of": original.id if original else None,
        "status": original.status if original else ComplaintStatus.NEW,
        "audio_url": None,
        "assigned_to": None,
        "resolution_notes": None,
        "created_at": now,
        "updated_at": now,
    })
    complaint.user = user
    db.complaints.insert_one(complaint.to_doc())

    if audio:
        audio_url = speech.save_audio(audio)
        g.saved_audio = audio_url
        db.complaints.update_one({"id": complaint_id}, {"$set": {"audio_url": audio_url}})
        complaint.audio_url = audio_url

    reply = (
        f"Logged your complaint under {result['category']}, "
        f"marked {result['severity']} priority. Summary: {result['formal_summary']}"
    )
    if original:
        reply += (f" A similar {result['category']} complaint (#{original.id}) is already open for your block, so yours has been "
                  "linked to it. The committee will see how many residents are affected.")
    if complaint.is_anonymous:
        reply += " Your name and flat are hidden from other residents; only the committee can see who raised it."
    return _result(reply, 201, understood=True, complaint=complaint.to_public_dict(user),
                   duplicate_of=original.id if original else None)


def _handle_service(user, text, data):
    db = get_db()
    result = gemini.structure_service_request(translated_text=text)
    if result.get("error") == "not_understood":
        return _result(
            "I didn't understand that as a service request. Which service do you need: "
            "plumber, electrician, AC mechanic, laundry, or vehicle servicing?",
            200, understood=False,
        )

    now = datetime.now(timezone.utc)
    request_id = next_id("service_requests")
    request_row = ServiceRequest({
        "id": request_id,
        "user_id": user.id,
        "service_type": result["service_type"],
        "raw_text": text,
        "translated_text": result["description"],
        "preferred_time": None,
        "status": "new",
        "created_at": now,
    })
    request_row.user = user
    db.service_requests.insert_one(request_row.to_doc())

    label = ServiceType.LABELS[result["service_type"]]
    reply = f"Logged your {label} request: {result['description']} You can track it under My Tickets."
    return _result(reply, 201, understood=True, service_request=request_row.to_public_dict())


def _handle_rules(user, text, data):
    outcome = ask_rulebook(text)
    return _result(outcome["reply"], 200, understood=outcome["status"] == "answered", rules_status=outcome["status"])


def _handle_committee_action(user, text, data):
    if user.role not in (Role.COMMITTEE, Role.SECRETARY):
        raise ChatInputError(
            {"error": "forbidden", "message": "Only the Secretary or committee members can use committee actions."},
            403,
        )

    action = data.get("action")
    if action not in COMMITTEE_ACTIONS:
        raise ChatInputError({"error": "invalid_action", "allowed": list(COMMITTEE_ACTIONS)}, 400)

    if action == "announcement":
        return _announcement(user, text, data)
    return _dues_reminder(user, text, data)


def _announcement(user, text, data):
    db = get_db()

    # If client passed already approved/edited title and message
    approved_title = (data.get("title") or "").strip()
    approved_message = (data.get("message") or "").strip()

    if approved_title and approved_message:
        drafted = {"title": approved_title, "message": approved_message}
    else:
        tone = (data.get("tone") or "").strip()
        augmented_text = f"{text} (Tone/Style: {tone})" if tone else text
        drafted = gemini.draft_announcement(augmented_text)
        if drafted.get("error") == "not_understood":
            return _result(
                "I didn't understand that as an announcement. Tell me what residents should be told "
                "(for example: water tank cleaning on Friday 9:30 to 2, supply will be off).",
                200, understood=False,
            )

    # Return draft preview if requested without saving yet
    if data.get("preview") or data.get("draft_only"):
        return _result(
            f"Drafted announcement: \"{drafted['title']}\"",
            200,
            understood=True,
            draft={"title": drafted["title"], "message": drafted["message"]},
        )

    pinned = _as_bool(data.get("pin"))
    now = datetime.now(timezone.utc)
    ann_id = next_id("announcements")
    announcement = Announcement({
        "id": ann_id, "title": drafted["title"], "message": drafted["message"],
        "is_pinned": pinned, "posted_by": user.id, "created_at": now,
    })
    announcement.author = user
    db.announcements.insert_one(announcement.to_doc())

    # Broadcast notification
    note_id = next_id("notifications")
    db.notifications.insert_one({
        "id": note_id, "type": NotificationType.ANNOUNCEMENT, "message": drafted["title"],
        "target_user_id": None, "created_by": user.id, "created_at": now,
    })
    reply = f"Posted{' and pinned' if pinned else ''} the announcement \"{drafted['title']}\" for all residents."
    return _result(reply, 201, understood=True, announcement=announcement.to_public_dict())


def _dues_reminder(user, text, data):
    db = get_db()
    flat_no = (data.get("flat_no") or "").strip()
    block_no = (data.get("block_no") or "").strip()
    if not flat_no or not block_no:
        raise ChatInputError({"error": "missing_fields", "fields": ["flat_no", "block_no"]}, 400)

    resident_docs = list(db.users.find({"flat_no": flat_no, "block_no": block_no, "approval_status": ApprovalStatus.APPROVED}))
    residents = [User.from_doc(d) for d in resident_docs]
    if not residents:
        raise ChatInputError({"error": "flat_not_found", "message": f"No approved resident found for flat {flat_no}, block {block_no}."}, 404)

    sent_to = []
    for resident in residents:
        message = queue_dues_reminder(user, resident, text)
        if message:
            sent_to.append({"name": resident.name, "reminder": message})

    if not sent_to:
        raise ChatInputError({"error": "no_unpaid_dues", "message": f"Flat {flat_no} has no unpaid dues on record."}, 404)

    names = ", ".join(r["name"] for r in sent_to)
    reply = f"Sent a dues reminder to flat {flat_no} ({names}). Only they can see it."
    return _result(reply, 201, understood=True, reminders=sent_to)


HANDLERS = {
    SelectedType.COMPLAINT: _handle_complaint,
    SelectedType.SERVICE: _handle_service,
    SelectedType.RULES: _handle_rules,
    SelectedType.COMMITTEE_ACTION: _handle_committee_action,
}


@chat_bp.post("/message")
@login_required
def send_message():
    db = get_db()
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = request.form.to_dict()
    audio_file = request.files.get("audio")

    selected_type = data.get("selected_type")
    text = data.get("text")
    session_id = data.get("session_id") or str(uuid.uuid4())

    if selected_type not in SelectedType.ALL:
        return jsonify({"error": "invalid_selected_type", "allowed": list(SelectedType.ALL)}), 400

    has_text = isinstance(text, str) and bool(text.strip())
    if audio_file and has_text:
        return jsonify({"error": "text_and_audio", "message": "Send either text or a voice note, not both."}), 400
    if not audio_file and not has_text:
        return jsonify({"error": "missing_input", "message": "Send text, or a voice note in the `audio` field."}), 400

    user_id = int(get_jwt_identity())
    user = User.from_doc(db.users.find_one({"id": user_id}))
    if user is None:
        return jsonify({"error": "user_not_found"}), 401

    if selected_type == SelectedType.COMMITTEE_ACTION and user.role not in (Role.COMMITTEE, Role.SECRETARY):
        return jsonify({"error": "forbidden", "message": "Only the Secretary or committee members can use committee actions."}), 403

    g.audio = None
    g.saved_audio = None
    voice = audio_file is not None

    now = datetime.now(timezone.utc)

    def _save_msg(role, content):
        msg_id = next_id("chat_messages")
        db.chat_messages.insert_one({
            "id": msg_id, "user_id": user_id, "session_id": session_id,
            "selected_type": selected_type, "role": role,
            "content_text": content, "audio_url": None, "created_at": now,
        })

    try:
        if voice:
            g.audio = speech.read_audio_upload(audio_file)
            text = speech.translate_audio_to_english(g.audio)
        else:
            text = text.strip()

        _save_msg("user", text)
        outcome = HANDLERS[selected_type](user, text, data)
        reply = outcome["reply"]
        if voice:
            reply = f'I heard: "{text}"\n{reply}'
        _save_msg("assistant", reply)

    except InvalidAudio as exc:
        return jsonify(exc.payload), exc.status
    except ChatInputError as exc:
        return jsonify(exc.payload), exc.status
    except NoSpeechDetected:
        return jsonify({"error": "no_speech_detected", "message": "I couldn't hear any speech in that recording. Please try again."}), 422
    except SpeechNotConfigured as exc:
        return jsonify({"error": "speech_not_configured", "message": str(exc)}), 503
    except SpeechCallFailed as exc:
        return jsonify({"error": "speech_failed", "message": "The speech-to-text call failed.", "detail": str(exc)}), 502
    except GeminiNotConfigured:
        return jsonify({"error": "ai_not_configured", "message": "GEMINI_API_KEY is missing from .env."}), 503
    except GeminiCallFailed as exc:
        return jsonify({
            "error": "ai_call_failed",
            "message": "The Gemini API call failed. Check your API key, the GEMINI_MODEL name, and your quota.",
            "detail": str(exc),
        }), 502
    except Exception:
        if g.get("saved_audio"):
            speech.delete_audio(g.saved_audio)
        current_app.logger.exception("chat message failed")
        return jsonify({"error": "server_error"}), 500

    extra = dict(outcome["extra"])
    extra["input_mode"] = "voice" if voice else "text"
    if voice:
        extra["transcript"] = text

    try:
        local, meta = localize_texts([reply], user.preferred_language)
    except Exception:
        current_app.logger.exception("reply translation failed")
        local, meta = [None], {"language": user.preferred_language, "translation": "unavailable"}
    extra.update(meta)
    if meta["language"] != "en":
        extra["reply_local"] = local[0]
    return jsonify({"reply": reply, "session_id": session_id, **extra}), outcome["status"]


def _retention_cutoff():
    return datetime.now(timezone.utc) - timedelta(days=current_app.config["CHAT_RETENTION_DAYS"])


@chat_bp.get("/recents")
@login_required
def recents():
    db = get_db()
    user_id = int(get_jwt_identity())
    cutoff = _retention_cutoff()
    rows = list(db.chat_messages.find(
        {"user_id": user_id, "created_at": {"$gte": cutoff}}
    ).sort([("created_at", 1), ("id", 1)]))

    threads = {}
    for doc in rows:
        m = ChatMessage.from_doc(doc)
        t = threads.setdefault(m.session_id, {
            "session_id": m.session_id, "selected_type": m.selected_type, "title": None, "message_count": 0,
        })
        t["message_count"] += 1
        t["last_message_at"] = m.created_at.isoformat() if m.created_at else None
        if t["title"] is None and m.role == "user":
            t["title"] = m.content_text if len(m.content_text) <= 60 else m.content_text[:57].rstrip() + "..."
    ordered = sorted(threads.values(), key=lambda t: t["last_message_at"] or "", reverse=True)
    return jsonify({"threads": ordered}), 200


@chat_bp.get("/recents/<session_id>")
@login_required
def recent_thread(session_id):
    db = get_db()
    user_id = int(get_jwt_identity())
    cutoff = _retention_cutoff()
    rows = list(db.chat_messages.find(
        {"user_id": user_id, "session_id": session_id, "created_at": {"$gte": cutoff}}
    ).sort([("created_at", 1), ("id", 1)]))

    if not rows:
        return jsonify({"error": "thread_not_found"}), 404

    messages = []
    for doc in rows:
        m = ChatMessage.from_doc(doc)
        messages.append({
            "selected_type": m.selected_type, "role": m.role, "content_text": m.content_text,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })
    meta = localize_groups(current_user(), ([m for m in messages if m["role"] == "assistant"], ["content_text"]))
    return jsonify({"session_id": session_id, "messages": messages, **meta}), 200
