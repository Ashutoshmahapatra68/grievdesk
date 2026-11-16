"""
Built-in intelligent NLP & Rulebook fallback engine.

Activated seamlessly whenever GEMINI_API_KEY is missing, retired/quota-limited,
or unreachable so GrievDesk's AI Assistant, Bylaws Q&A, Complaint Classifier,
and Announcement Drafter always remain responsive and accurate.
"""
import re

from app.models.complaint import ComplaintCategory, Severity
from app.models.service_request import ServiceType

STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "am", "be", "been", "being",
    "in", "on", "at", "to", "for", "of", "by", "with", "from", "up", "about",
    "into", "through", "during", "before", "after", "above", "below", "between",
    "and", "or", "but", "if", "because", "as", "until", "while", "what", "which",
    "who", "whom", "this", "that", "these", "those", "i", "me", "my", "we", "our",
    "you", "your", "he", "she", "it", "they", "them", "their", "can", "could",
    "will", "would", "shall", "should", "may", "might", "must", "do", "does",
    "did", "have", "has", "had", "having", "please", "kindly", "need", "want",
    "society", "resident", "residents", "flat", "block", "apartment", "there",
    "here", "very", "much", "more", "some", "any", "no", "not", "only", "just",
}

GREETINGS = {"hi", "hello", "hey", "ok", "okay", "thanks", "thank you", "test", "testing", "good morning", "good evening"}

CATEGORY_KEYWORDS = {
    ComplaintCategory.PLUMBING: {
        "leak": 3, "leaking": 3, "leakage": 3, "pipe": 3, "tap": 3, "faucet": 3,
        "sink": 3, "drain": 3, "drainage": 3, "clog": 3, "clogged": 3, "blocked": 2,
        "flush": 3, "toilet": 3, "bathroom": 2, "washroom": 2, "seepage": 3,
        "damp": 2, "dripping": 3, "plumber": 3, "plumbing": 3, "valve": 2, "geyser": 2,
        "ceiling wet": 3, "overflow": 2,
    },
    ComplaintCategory.ELECTRICAL: {
        "power": 3, "electricity": 3, "electrical": 3, "electric": 3, "voltage": 3,
        "flicker": 3, "flickering": 3, "short circuit": 4, "spark": 4, "sparking": 4,
        "wire": 3, "wiring": 3, "switch": 2, "mcb": 3, "fuse": 3, "blackout": 3,
        "outage": 3, "generator": 3, "dg": 2, "inverter": 2, "light": 2, "bulb": 2,
        "street light": 3, "corridor light": 3, "lift": 3, "elevator": 3, "bijli": 3,
        "fan": 2, "shock": 4,
    },
    ComplaintCategory.WATER_SUPPLY: {
        "water": 3, "no water": 4, "water supply": 4, "low pressure": 3, "pressure": 2,
        "tank": 3, "overhead tank": 3, "motor": 2, "pump": 3, "dirty water": 4,
        "muddy": 3, "contaminated": 3, "pani": 3, "shortage": 3, "dry tap": 4,
        "drinking water": 3, "borewell": 3, "tanker": 3,
    },
    ComplaintCategory.SANITATION: {
        "garbage": 3, "trash": 3, "waste": 3, "dustbin": 3, "clean": 2, "cleaning": 3,
        "dirty": 2, "filthy": 3, "smell": 3, "stink": 3, "foul": 3, "odor": 3,
        "sewage": 4, "sewer": 4, "sweep": 3, "sweeper": 3, "housekeeping": 3,
        "mosquito": 3, "cockroach": 3, "pest": 3, "rat": 3, "kachra": 3,
        "hygiene": 3, "sanitation": 3, "litter": 3, "spitting": 3, "staircase dirty": 3,
    },
    ComplaintCategory.PARKING: {
        "park": 2, "parking": 4, "car": 3, "bike": 3, "scooter": 3, "vehicle": 3,
        "slot": 3, "basement": 2, "stilt": 3, "blocked driveway": 4, "double parked": 4,
        "visitor parking": 4, "wrongly parked": 4, "sticker": 2, "ev charger": 2,
        "tow": 3, "gadi": 3,
    },
    ComplaintCategory.NOISE: {
        "noise": 4, "noisy": 4, "loud": 3, "music": 3, "dj": 4, "party": 3,
        "speaker": 3, "shouting": 3, "screaming": 3, "barking": 3, "drilling": 3,
        "hammering": 3, "carpentry": 3, "construction": 2, "disturbance": 3,
        "quiet hours": 4, "midnight": 2, "shor": 3, "honking": 3,
    },
    ComplaintCategory.SECURITY: {
        "security": 4, "guard": 4, "watchman": 4, "gate": 3, "cctv": 4, "camera": 3,
        "stranger": 3, "intruder": 4, "trespass": 4, "theft": 4, "stolen": 4,
        "robbery": 4, "chori": 4, "lock": 2, "broken lock": 3, "intercom": 3,
        "visitor entry": 3, "unattended": 2, "unsafe": 3, "harassment": 4,
        "boom barrier": 4, "tailgating": 3,
    },
}

HIGH_SEVERITY_TERMS = {
    "fire", "smoke", "spark", "sparking", "shock", "electrocution", "short circuit",
    "stuck", "trapped", "flood", "flooding", "burst", "no water", "outage", "blackout",
    "emergency", "urgent", "immediately", "critical", "danger", "dangerous", "hazard",
    "theft", "stolen", "intruder", "broken lock", "unsafe", "sewage overflow",
    "gas leak", "elevator stuck", "lift stopped", "not working since", "severely",
}

LOW_SEVERITY_TERMS = {
    "minor", "small", "slight", "slightly", "cosmetic", "paint", "peeling",
    "suggestion", "whenever free", "low priority", "occasional", "faded",
}

SERVICE_KEYWORDS = {
    ServiceType.PLUMBER: {
        "plumber": 5, "plumbing": 4, "tap": 3, "pipe": 3, "sink": 3, "basin": 3,
        "flush": 3, "toilet": 3, "commode": 3, "shower": 3, "leak": 2, "dripping": 3,
        "faucet": 3, "drain": 3, "clog": 3, "valve": 3, "water heater": 2,
    },
    ServiceType.ELECTRICIAN: {
        "electrician": 5, "electrical": 4, "switch": 3, "socket": 3, "plug": 3,
        "fan": 3, "regulator": 3, "bulb": 3, "tube light": 3, "led": 2, "light": 2,
        "mcb": 4, "fuse": 4, "wiring": 3, "wire": 3, "inverter": 3, "doorbell": 3,
        "geyser": 2, "flickering": 3, "power point": 3,
    },
    ServiceType.AC_MECHANIC: {
        "ac": 5, "a/c": 5, "air conditioner": 5, "air conditioning": 5, "cooling": 3,
        "compressor": 4, "gas refill": 4, "hvac": 4, "split ac": 5, "window ac": 5,
        "ac service": 5, "ac mechanic": 5, "thermostat": 3,
    },
    ServiceType.LAUNDRY: {
        "laundry": 5, "iron": 4, "ironing": 4, "pressing": 4, "dry clean": 5,
        "dry cleaning": 5, "wash clothes": 5, "washing": 3, "dhobi": 5, "clothes": 3,
        "linens": 3, "curtains wash": 4,
    },
    ServiceType.VEHICLE_SERVICE: {
        "vehicle": 4, "car": 4, "bike": 4, "scooter": 4, "motorcycle": 4, "tyre": 4,
        "tire": 4, "puncture": 5, "car wash": 5, "bike wash": 5, "jump start": 5,
        "battery jump": 5, "servicing": 4, "mechanic": 2, "garage": 3,
    },
}

RULE_SYNONYMS = {
    "loud": {"noise", "quiet", "sound", "music", "dj"},
    "noise": {"loud", "quiet", "sound", "music", "hours"},
    "quiet": {"noise", "loud", "silent", "hours"},
    "music": {"noise", "quiet", "loud", "party"},
    "drill": {"renovation", "renovate", "work", "carpentry", "sunday"},
    "drilling": {"renovation", "renovate", "work", "carpentry", "sunday"},
    "carpentry": {"renovation", "renovate", "work", "drill"},
    "renovate": {"renovation", "work", "repair", "sunday"},
    "renovation": {"renovate", "work", "repair", "sunday"},
    "car": {"parking", "vehicle", "slot", "visitor"},
    "bike": {"parking", "vehicle", "slot"},
    "park": {"parking", "vehicle", "visitor"},
    "gym": {"fitness", "clubhouse", "open", "close", "timings"},
    "pool": {"swimming", "clubhouse", "timings"},
    "dog": {"pet", "pets", "animal", "leash"},
    "cat": {"pet", "pets", "animal"},
    "pet": {"pets", "dog", "animal", "leash"},
    "timing": {"open", "close", "hours", "am", "pm"},
    "timings": {"open", "close", "hours", "am", "pm"},
    "hours": {"open", "close", "am", "pm", "timing"},
}


def detect_language(text: str) -> str:
    for ch in text:
        code = ord(ch)
        if 0x0900 <= code <= 0x097F:
            return "hi"
        if 0x0B00 <= code <= 0x0B7F:
            return "or"
        if 0x0980 <= code <= 0x09FF:
            return "bn"
        if 0x0B80 <= code <= 0x0BFF:
            return "ta"
    return "en"


def _score_map(text_lower: str, keyword_map: dict) -> dict:
    scores = {}
    for label, terms in keyword_map.items():
        score = 0
        for term, weight in terms.items():
            if " " in term:
                if term in text_lower:
                    score += weight
            else:
                if re.search(rf"\b{re.escape(term)}\b", text_lower):
                    score += weight
        scores[label] = score
    return scores


def _clean_sentence(text: str) -> str:
    cleaned = " ".join((text or "").split()).strip()
    if not cleaned:
        return ""
    cleaned = cleaned[0].upper() + cleaned[1:]
    if cleaned[-1] not in ".!?":
        cleaned += "."
    return cleaned


def classify_complaint(translated_text: str) -> dict:
    cleaned = " ".join((translated_text or "").split()).strip()
    lower = cleaned.lower()

    if len(cleaned) < 4 or lower.strip(".!?") in GREETINGS:
        return {"error": "not_understood"}

    scores = _score_map(lower, CATEGORY_KEYWORDS)
    best_cat, best_score = max(scores.items(), key=lambda x: x[1])

    # Check if text contains general problem indicators even without specific category terms
    problem_signals = {
        "broken", "not working", "issue", "problem", "Complaint", "damaged",
        "bad", "missing", "failed", "stuck", "faulty", "defect", "repair",
        "overflow", "stopped", "unsafe", "dirty", "delay", "missing", "closed",
    }
    has_problem_signal = any(sig.lower() in lower for sig in problem_signals)

    if best_score == 0 and not has_problem_signal and len(cleaned.split()) < 4:
        return {"error": "not_understood"}

    category = best_cat if best_score > 0 else ComplaintCategory.OTHER

    if any(term in lower for term in HIGH_SEVERITY_TERMS):
        severity = Severity.HIGH
    elif any(term in lower for term in LOW_SEVERITY_TERMS):
        severity = Severity.LOW
    else:
        severity = Severity.MEDIUM

    lang = detect_language(cleaned)
    summary = _clean_sentence(cleaned)

    return {
        "category": category,
        "severity": severity,
        "formal_summary": summary,
        "english_text": cleaned,
        "detected_language": lang,
        "_engine": "local_ai",
    }


def structure_service_request(translated_text: str) -> dict:
    cleaned = " ".join((translated_text or "").split()).strip()
    lower = cleaned.lower()

    if len(cleaned) < 4 or lower.strip(".!?") in GREETINGS:
        return {"error": "not_understood"}

    scores = _score_map(lower, SERVICE_KEYWORDS)
    best_service, best_score = max(scores.items(), key=lambda x: x[1])

    if best_score == 0:
        return {"error": "not_understood"}

    return {
        "service_type": best_service,
        "description": _clean_sentence(cleaned),
        "_engine": "local_ai",
    }


def _tokenize(text: str) -> set:
    tokens = set(re.findall(r"[a-z0-9]+", text.lower()))
    expanded = set()
    for t in tokens:
        if t in STOPWORDS or len(t) < 2:
            continue
        expanded.add(t)
        if t in RULE_SYNONYMS:
            expanded.update(RULE_SYNONYMS[t])
    return expanded


def answer_rules_question(rulebook_text: str, question: str) -> dict:
    cleaned = " ".join((question or "").split()).strip()
    lower = cleaned.lower()

    if len(cleaned) < 3 or lower.strip(".!?") in GREETINGS:
        return {"error": "not_understood"}

    q_tokens = _tokenize(cleaned)
    if not q_tokens:
        return {"error": "not_understood"}

    # Split rulebook into lines/paragraphs, preserving numbered rules cleanly
    raw_lines = [line.strip() for line in rulebook_text.splitlines() if line.strip()]
    clauses = []
    for line in raw_lines:
        # Skip short generic headings like "Society Rules"
        if len(line.split()) <= 2 and line.lower().endswith("rules"):
            continue
        clauses.append(line)

    if not clauses:
        clauses = [rulebook_text.strip()]

    scored = []
    for idx, clause in enumerate(clauses):
        c_lower = clause.lower()
        c_tokens = set(re.findall(r"[a-z0-9]+", c_lower)) - STOPWORDS
        score = 0.0
        for qt in q_tokens:
            weight_mult = 0.25 if any(ch.isdigit() for ch in qt) else 1.0
            if qt in c_tokens:
                score += 2.0 * weight_mult
            elif any(ct.startswith(qt[:4]) or qt.startswith(ct[:4]) for ct in c_tokens if len(ct) >= 4 and len(qt) >= 4):
                score += 1.0 * weight_mult
        if score >= 1.0:
            scored.append((score, idx, clause))

    scored.sort(key=lambda x: (-x[0], x[1]))

    if not scored:
        # Check if the question actually looks like a complaint/service rather than a question
        if "?" not in cleaned and not any(w in lower for w in ("can ", "is ", "are ", "what ", "when ", "how ", "rule", "allowed", "policy", "timing")):
            return {"error": "not_understood"}
        return {
            "answer": (
                "The uploaded society rulebook does not appear to contain a specific clause about that topic. "
                "Please contact the Society Secretary or Managing Committee for clarification."
            ),
            "_engine": "local_ai",
        }

    top_score = scored[0][0]
    top_clauses = [item[2] for item in scored if item[0] >= top_score * 0.6][:2]
    answer = "According to the society rulebook: " + " ".join(top_clauses)
    return {"answer": answer, "_engine": "local_ai"}


def draft_announcement(raw_text: str, tone: str = "formal") -> dict:
    cleaned = " ".join((raw_text or "").split()).strip()
    lower = cleaned.lower()
    if len(cleaned) < 5 or lower.strip(".!?") in GREETINGS:
        return {"error": "not_understood"}

    # Extract tone if provided
    active_tone = (tone or "formal").lower()
    if "urgent" in active_tone or "urgent" in lower or "emergency" in lower or "outage" in lower or "shutdown" in lower:
        active_tone = "urgent"
    elif "friendly" in active_tone or "celebration" in lower or "festival" in lower or "gathering" in lower:
        active_tone = "friendly"

    # Strip out tone hint and previous prefixes/headers/footers from main text so consecutive refinements stay clean
    text_clean = re.sub(r"\(Tone/Style:[^)]+\)", "", cleaned, flags=re.IGNORECASE).strip()
    text_clean = re.sub(r"^(⚠️\s*URGENT:?|Notice:?|🎉\s*|Circular:?|Official Notice:?)\s*", "", text_clean, flags=re.IGNORECASE).strip()
    text_clean = re.sub(r"^(ATTENTION ALL RESIDENTS,?\s*|Dear Neighbors and Residents,?\s*|Dear Residents,?\s*)", "", text_clean, flags=re.IGNORECASE).strip()
    text_clean = re.sub(r"(Please take note and plan accordingly.*?|We warmly invite everyone.*?|For any queries.*?|Thank you for your cooperation.*?|—\s*Society.*$|•\s*Contact the security desk.*$)", "", text_clean, flags=re.IGNORECASE | re.DOTALL).strip()

    # Build a crisp <= 10-word title from the first clause or key phrase
    first_chunk = re.split(r"[.!?\n]", text_clean)[0].strip()
    first_chunk = re.sub(r"^(⚠️\s*URGENT:?|Notice:?|🎉\s*|Circular:?|Official Notice:?)\s*", "", first_chunk, flags=re.IGNORECASE).strip()
    words = first_chunk.split()
    if len(words) > 9:
        title = " ".join(words[:9]).rstrip(",;:") + " Notice"
    else:
        title = first_chunk.rstrip(",;:")
    title = title[0].upper() + title[1:]
    if len(title) > 200:
        title = title[:197] + "..."

    body = _clean_sentence(text_clean)
    if active_tone == "urgent":
        title = f"⚠️ URGENT: {title}"
        message = (
            f"ATTENTION ALL RESIDENTS,\n\n"
            f"{body}\n\n"
            f"• Please take necessary precautions and plan accordingly.\n"
            f"• Contact the security desk or maintenance helpline for urgent assistance.\n\n"
            f"— Society Management & Security Office"
        )
    elif active_tone == "friendly":
        title = f"🎉 {title}"
        message = (
            f"Dear Neighbors and Residents,\n\n"
            f"{body}\n\n"
            f"We warmly invite all residents and their families to participate and make it a memorable occasion!\n\n"
            f"Warm regards,\n"
            f"— Society Community & Cultural Committee"
        )
    else:
        title = f"Notice: {title}"
        message = (
            f"Dear Residents,\n\n"
            f"{body}\n\n"
            f"For any queries, please reach out to the society office during working hours.\n\n"
            f"Thank you for your cooperation.\n"
            f"— Society Management Committee"
        )

    return {"title": title, "message": message, "_engine": "local_ai"}


def refine_announcement(current_title: str, current_message: str, tone: str = "formal", instruction: str = "") -> dict:
    # Extract the core sentences from current_message, ignoring previous headers/footers
    lines = [l.strip() for l in (current_message or "").split("\n") if l.strip()]
    content_lines = []
    for line in lines:
        lower = line.lower()
        if any(h in lower for h in ["attention all residents", "dear residents", "dear neighbors", "thank you for your cooperation", "society management", "society community", "warm regards", "please take note and plan accordingly"]):
            continue
        if line.startswith("•") or line.startswith("-") or line.startswith("⚠️") or line.startswith("🎉"):
            clean_l = re.sub(r"^[•\-⚠️🎉\s]+", "", line).strip()
            if clean_l and not any(k in clean_l.lower() for k in ["contact the security", "please take necessary"]):
                content_lines.append(clean_l)
        else:
            content_lines.append(line)

    core_text = " ".join(content_lines).strip()
    if not core_text:
        clean_title = re.sub(r"^(⚠️\s*URGENT:?|Notice:?|🎉\s*|Circular:?|Official Notice:?)\s*", "", current_title or "", flags=re.IGNORECASE).strip()
        core_text = clean_title or current_message

    if instruction and instruction.strip():
        core_text = f"{core_text}. {instruction.strip()}"

    return draft_announcement(core_text, tone=tone)


def draft_dues_reminder(flat_no: str, months: list, total: str, note: str) -> str:
    months_str = ", ".join(months) if months else "pending cycles"
    extra = f" Note from Management: {note.strip()}" if note and note.strip() else ""
    return (
        f"Dear Resident of Flat {flat_no}, this is a gentle reminder that your society maintenance "
        f"dues of ₹{total} for {months_str} remain unpaid. Kindly clear the balance at your earliest convenience.{extra}"
    )
