from __future__ import annotations

import json
import os
import re
import secrets
import sqlite3
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from hashlib import sha256

from fastapi import FastAPI, File, Form, HTTPException, Request as APIRequest, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))

try:
    from .gemini_provider import generate_json as generate_gemini_json
except ImportError:
    from gemini_provider import generate_json as generate_gemini_json

DB_PATH = Path(os.environ.get("JANSAARTHI_DB", Path(__file__).with_name("jansaarthi.db")))
MAX_UPLOAD = 8 * 1024 * 1024
ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png"}
APP_ENV = os.getenv("APP_ENV", "development")
SESSION_COOKIE = "jansaarthi_session"
SESSION_DAYS = 30


def get_profile_cipher() -> Fernet:
    key = os.getenv("PROFILE_ENCRYPTION_KEY")
    key_file = Path(__file__).with_name(".profile.key")
    if not key:
        if APP_ENV == "production":
            raise RuntimeError("PROFILE_ENCRYPTION_KEY must be configured in production")
        if key_file.exists():
            key = key_file.read_text(encoding="ascii").strip()
        else:
            key = Fernet.generate_key().decode("ascii")
            key_file.write_text(key, encoding="ascii")
    return Fernet(key.encode("ascii"))


PROFILE_CIPHER = get_profile_cipher()

# Each record is reviewed against its official source on last_verified_at.
SCHEMES: list[dict[str, Any]] = [
    {
        "id": "pm-kisan", "category": "Agriculture", "name": "PM-KISAN Samman Nidhi",
        "department": "Ministry of Agriculture & Farmers Welfare",
        "description": "Income support for eligible landholding farmer families across India.",
        "benefits": "₹6,000 per year per eligible farmer family in three instalments, subject to exclusions.",
        "eligibility_rules": {"summary": "Landholding farmer family with cultivable land; exclusions apply", "requires_landholding": True, "official_check": True, "criteria": ["Farmer family owns cultivable land recorded in State/UT land records", "No member falls under the scheme's exclusion categories", "State/UT verification is required"]},
        "required_documents": ["Land ownership records", "Bank account details", "Identity document (as required by official portal)"],
        "application_url": "https://pmkisan.gov.in/", "official_source_url": "https://pmkisan.gov.in/",
        "last_verified_at": "2026-11-22", "source_status": "Verified from official scheme portal; applicants should confirm current rules and status there.",
        "keywords": ["farmer", "agriculture", "kisan", "pm kisan", "cultivable land", "farmer family"],
    },
    {
        "id": "ab-pmjay-senior", "category": "Health", "name": "Ayushman Bharat PM-JAY for senior citizens (70+)",
        "department": "National Health Authority, Ministry of Health and Family Welfare",
        "description": "Health cover for all senior citizens aged 70 and above, irrespective of income.",
        "benefits": "Health cover up to ₹5 lakh per year for eligible senior citizens.",
        "eligibility_rules": {"summary": "Age 70 or above, regardless of income", "minimum_age": 70, "official_check": True, "criteria": ["Senior citizen is aged 70 or above", "Age is determined using the identity record accepted by the official enrolment process", "Official enrolment and e-KYC are required"]},
        "required_documents": ["Age proof as required by official enrolment", "Identity document for e-KYC"],
        "application_url": "https://beneficiary.nha.gov.in/", "official_source_url": "https://nha.gov.in/PM-JAY",
        "last_verified_at": "2026-11-22", "source_status": "Age and benefit summary verified against National Health Authority information; enrollment rules must be checked at the official portal.",
        "keywords": ["ayushman", "pmjay", "pm jay", "health", "healthcare", "hospital", "senior", "70", "medical"],
    },
    {
        "id": "pmmvy", "category": "Women & Child Development", "name": "Pradhan Mantri Matru Vandana Yojana (PMMVY)",
        "department": "Ministry of Women and Child Development",
        "description": "Maternity benefit for eligible pregnant and lactating women from socially and economically disadvantaged groups.",
        "benefits": "₹5,000 for the first living child; ₹6,000 for the second child if the second child is a girl, subject to scheme conditions.",
        "eligibility_rules": {"summary": "Eligible pregnant/lactating women, with qualifying category and child-order rules", "minimum_age": 18, "maximum_age": 55, "requires_maternity_status": True, "eligible_categories": ["SC", "ST", "Disability", "BPL", "PMJAY", "e-Shram", "PM-KISAN", "MGNREGA", "Income below ₹8 lakh", "AWW/AWH/ASHA", "NFSA ration card"], "official_check": True, "criteria": ["Applicant is pregnant or lactating and is in the scheme age range (the exact lower age is 18 years 7 months)", "Applicant belongs to at least one eligible social/economic category listed by the Ministry", "Benefit is for first living child; second-child benefit applies when the second child is a girl", "Required registration and health-care milestones must be completed"]},
        "required_documents": ["MCP/RCHI card and pregnancy/child health details (as applicable)", "Proof of one eligible category (see Ministry list)", "Bank/post office account proof; Aadhaar requirements are handled only by the official portal", "Child birth and immunisation details for applicable instalments"],
        "application_url": "https://pmmvy.wcd.gov.in/", "official_source_url": "https://www.wcd.gov.in/public/women/pradhan-mantri-matru-vandana-yojna",
        "last_verified_at": "2026-11-22", "source_status": "Benefits, category list and document guidance checked against the Ministry page; individual state implementation and time limits may vary. Aadhaar is not collected by JanSaarthi.",
        "keywords": ["maternity", "pregnancy", "pregnant", "lactating", "mother", "woman", "childbirth", "pmmvy", "matru vandana"],
    },
    {
        "id": "pmjdy", "category": "Financial Services", "name": "Pradhan Mantri Jan-Dhan Yojana (PMJDY)",
        "department": "Department of Financial Services, Ministry of Finance",
        "description": "Financial inclusion mission offering access to a basic savings account and linked financial services.",
        "benefits": "Basic savings bank account with no minimum balance requirement; other linked benefits depend on account and programme conditions.",
        "eligibility_rules": {"summary": "People without an existing bank account can enquire about opening a basic account", "requires_no_existing_bank_account": True, "official_check": True, "criteria": ["A basic savings bank deposit account can be opened by a person not already holding another account", "Bank completes applicable KYC and account-opening checks", "Insurance, overdraft and pension features have separate conditions and are not guaranteed"]},
        "required_documents": ["Identity/address documents accepted by the bank (see official KYC guidance)", "No document needs to be uploaded to JanSaarthi; do not enter account numbers or credentials"],
        "application_url": "https://www.pmjdy.gov.in/", "official_source_url": "https://www.pmjdy.gov.in/scheme-detail.aspx",
        "last_verified_at": "2026-11-22", "source_status": "Basic account and eligibility summary checked against the Department of Financial Services portal; product features and KYC must be confirmed with a bank.",
        "keywords": ["jan dhan", "jan-dhan", "pmjdy", "bank account", "financial inclusion", "basic savings", "dbt"],
    },
]

app = FastAPI(title="JanSaarthi AI API", version="1.0.0")
origins = [x.strip() for x in os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["GET", "POST", "PATCH"], allow_headers=["Content-Type", "X-Requested-With"])


@app.middleware("http")
async def require_csrf_header(request: APIRequest, call_next):
    if request.method in {"POST", "PATCH", "PUT", "DELETE"} and request.headers.get("x-requested-with") != "JanSaarthi-Web":
        return __import__("starlette.responses", fromlist=["JSONResponse"]).JSONResponse({"detail": "Missing request validation header"}, status_code=403)
    return await call_next(request)


def connect() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def init_db() -> None:
    with connect() as con:
        con.executescript("""
            CREATE TABLE IF NOT EXISTS citizens (id TEXT PRIMARY KEY, profile_json TEXT NOT NULL, updated_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS saved_schemes (id INTEGER PRIMARY KEY AUTOINCREMENT, citizen_id TEXT NOT NULL, scheme_id TEXT NOT NULL, application_status TEXT NOT NULL DEFAULT 'saved', created_at TEXT NOT NULL, UNIQUE(citizen_id, scheme_id));
            CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, citizen_id TEXT NOT NULL, expires_at TEXT NOT NULL);
        """)


@app.on_event("startup")
def startup() -> None:
    init_db()


class ProfileIn(BaseModel):
    citizen_id: str = Field(default="local", min_length=1, max_length=80)
    name: str = Field(default="", max_length=120)
    age: int | None = Field(default=None, ge=0, le=120)
    state: str = Field(default="", max_length=100)
    district: str = Field(default="", max_length=100)
    occupation: str = Field(default="", max_length=100)
    annual_income: int | None = Field(default=None, ge=0, le=100_000_000)
    family_category: str = Field(default="", max_length=80)
    preferred_language: str = Field(default="English", max_length=40)
    maternity_status: str = Field(default="", max_length=40)
    children_count: int | None = Field(default=None, ge=0, le=20)
    second_child_is_girl: bool | None = None
    eligibility_categories: list[str] = Field(default_factory=list, max_length=12)
    has_existing_bank_account: bool | None = None


class EligibilityIn(BaseModel):
    scheme_id: str
    profile: dict[str, Any] = Field(default_factory=dict)


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    language: str = Field(default="English", pattern="^(English|हिन्दी|తెలుగు)$")
    profile: dict[str, Any] = Field(default_factory=dict)


class SaveIn(BaseModel):
    citizen_id: str = Field(default="local", min_length=1, max_length=80)
    scheme_id: str
    remove: bool = False


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def current_citizen(request: APIRequest) -> str:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(401, "A browser session is required")
    token_hash = sha256(token.encode()).hexdigest()
    with connect() as con:
        row = con.execute("SELECT citizen_id, expires_at FROM sessions WHERE token_hash=?", (token_hash,)).fetchone()
    if not row or datetime.fromisoformat(row["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(401, "Session expired; reload the application")
    return row["citizen_id"]


@app.get("/api/session")
def create_session(response: Response, request: APIRequest) -> dict[str, str]:
    token = request.cookies.get(SESSION_COOKIE)
    try:
        citizen_id = current_citizen(request) if token else ""
    except HTTPException:
        citizen_id = ""
    if not citizen_id:
        token = secrets.token_urlsafe(32)
        citizen_id = secrets.token_urlsafe(18)
        expires = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
        with connect() as con:
            con.execute("INSERT INTO sessions(token_hash,citizen_id,expires_at) VALUES(?,?,?)", (sha256(token.encode()).hexdigest(), citizen_id, expires.isoformat()))
        response.set_cookie(SESSION_COOKIE, token, httponly=True, secure=APP_ENV == "production", samesite="none" if APP_ENV == "production" else "lax", max_age=SESSION_DAYS * 24 * 3600, path="/")
    return {"status": "ok"}


@app.get("/api/schemes")
def list_schemes() -> list[dict[str, Any]]:
    return SCHEMES


@app.get("/api/schemes/{scheme_id}")
def get_scheme(scheme_id: str) -> dict[str, Any]:
    scheme = next((item for item in SCHEMES if item["id"] == scheme_id), None)
    if not scheme:
        raise HTTPException(404, "Scheme not found")
    return scheme


@app.post("/api/profile")
def save_profile(profile: ProfileIn, request: APIRequest) -> dict[str, Any]:
    citizen_id = current_citizen(request)
    data = profile.model_dump()
    data["citizen_id"] = citizen_id
    encrypted = PROFILE_CIPHER.encrypt(json.dumps(data).encode("utf-8")).decode("ascii")
    with connect() as con:
        con.execute("INSERT INTO citizens(id,profile_json,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET profile_json=excluded.profile_json,updated_at=excluded.updated_at", (citizen_id, encrypted, datetime.now(timezone.utc).isoformat()))
    return {"profile": data, "saved": True}


@app.get("/api/profile/{citizen_id}")
def read_profile(citizen_id: str, request: APIRequest) -> dict[str, Any]:
    citizen_id = current_citizen(request)
    with connect() as con:
        row = con.execute("SELECT profile_json FROM citizens WHERE id=?", (citizen_id,)).fetchone()
    if not row:
        return ProfileIn(citizen_id=citizen_id).model_dump()
    try:
        return json.loads(PROFILE_CIPHER.decrypt(row["profile_json"].encode("ascii")).decode("utf-8"))
    except (InvalidToken, ValueError):
        # Older MVP rows were plain text. Return defaults without revealing the legacy record.
        return ProfileIn(citizen_id=citizen_id).model_dump()


@app.get("/api/saved-schemes/{citizen_id}")
def list_saved(citizen_id: str, request: APIRequest) -> list[dict[str, Any]]:
    citizen_id = current_citizen(request)
    with connect() as con:
        rows = con.execute("SELECT id,citizen_id,scheme_id,application_status,created_at FROM saved_schemes WHERE citizen_id=? ORDER BY created_at DESC", (citizen_id,)).fetchall()
    return [dict(row) for row in rows]


@app.post("/api/saved-schemes")
def save_scheme(payload: SaveIn, request: APIRequest) -> dict[str, Any]:
    citizen_id = current_citizen(request)
    if not any(s["id"] == payload.scheme_id for s in SCHEMES):
        raise HTTPException(404, "Scheme not found")
    with connect() as con:
        if payload.remove:
            con.execute("DELETE FROM saved_schemes WHERE citizen_id=? AND scheme_id=?", (citizen_id, payload.scheme_id))
            return {"saved": False}
        con.execute("INSERT OR IGNORE INTO saved_schemes(citizen_id,scheme_id,created_at) VALUES(?,?,?)", (citizen_id, payload.scheme_id, datetime.now(timezone.utc).isoformat()))
        row = con.execute("SELECT * FROM saved_schemes WHERE citizen_id=? AND scheme_id=?", (citizen_id, payload.scheme_id)).fetchone()
    return {"saved": True, "item": dict(row)}


@app.patch("/api/applications/{application_id}")
def update_application(application_id: int, request: APIRequest, status: str = "saved") -> dict[str, Any]:
    if status not in {"saved", "in_progress", "submitted", "completed"}:
        raise HTTPException(422, "Unsupported application status")
    with connect() as con:
        cur = con.execute("UPDATE saved_schemes SET application_status=? WHERE id=? AND citizen_id=?", (status, application_id, current_citizen(request)))
    if not cur.rowcount:
        raise HTTPException(404, "Application not found")
    return {"application_id": application_id, "application_status": status}


@app.post("/api/eligibility/check")
def check_eligibility(payload: EligibilityIn) -> dict[str, Any]:
    scheme = next((item for item in SCHEMES if item["id"] == payload.scheme_id), None)
    if not scheme:
        raise HTTPException(404, "Scheme not found")
    p, rules = payload.profile, scheme["eligibility_rules"]
    missing: list[str] = []
    satisfied: list[str] = []
    failed: list[str] = []
    if "minimum_age" in rules:
        if p.get("age") is None: missing.append("age")
        elif int(p["age"]) < rules["minimum_age"]: failed.append(f"Age must be at least {rules['minimum_age']} years")
        elif rules.get("maximum_age") and int(p["age"]) > rules["maximum_age"]: failed.append(f"Age must be no more than {rules['maximum_age']} years")
        else: satisfied.append(f"Age is within the broad {rules['minimum_age']}–{rules.get('maximum_age', 'and above')} year range")
    if rules.get("requires_landholding"):
        if p.get("occupation") == "Farmer":
            satisfied.append("Profile occupation is farmer")
        missing.append("eligible landholding status")
        missing.append("scheme exclusions and official beneficiary verification")
    if rules.get("requires_maternity_status"):
        if p.get("maternity_status") in {"Pregnant", "Lactating"}: satisfied.append("Profile indicates pregnant or lactating")
        elif p.get("maternity_status"): failed.append("Profile does not indicate pregnant or lactating")
        else: missing.append("pregnancy/lactation status")
        categories = set(p.get("eligibility_categories") or [])
        accepted = set(rules.get("eligible_categories", []))
        if categories & accepted: satisfied.append("At least one listed social/economic category was selected")
        elif categories: failed.append("Selected category is not in the listed PMMVY categories")
        else: missing.append("one eligible social/economic category")
        children = p.get("children_count")
        if children is None: missing.append("child order and living-child details")
        elif children == 0: satisfied.append("First-child benefit may apply; official records must confirm")
        elif children == 1:
            if p.get("second_child_is_girl") is True: satisfied.append("Second child is marked as a girl")
            elif p.get("second_child_is_girl") is False: failed.append("Second-child benefit is specified for a girl child")
            else: missing.append("whether the second child is a girl")
        else: failed.append("The listed PMMVY benefit applies to the first child or the second child when a girl")
        if p.get("age") == 18: missing.append("exact age in months; minimum age is 18 years and 7 months")
        missing.append("official registration and health-care milestones")
    if rules.get("requires_no_existing_bank_account"):
        if p.get("has_existing_bank_account") is False: satisfied.append("Profile indicates no existing bank account")
        elif p.get("has_existing_bank_account") is True: failed.append("PMJDY basic account opening is for persons without an existing account")
        else: missing.append("whether you already hold a bank account")
        missing.append("bank KYC and account-opening checks")
    if failed: status = "Not eligible"
    elif missing: status = "Needs verification"
    else: status = "Likely eligible"
    return {"scheme_id": scheme["id"], "status": status, "applicable_criteria": rules.get("criteria", [rules["summary"]]), "criteria_satisfied": satisfied, "criteria_not_satisfied": failed, "missing_information": list(dict.fromkeys(missing)), "reason": ("One or more listed criteria do not match the information provided." if failed else "Some key details or official checks are still needed." if missing else "The details you provided match the criteria checked here; the department must confirm eligibility."), "official_check_required": True, "official_verification_url": scheme["official_source_url"]}


INTENT_TERMS = {
    "pm-kisan": ["किसान", "खेती", "खेतीबाड़ी", "రైతు", "వ్యవసాయం", "పంట"],
    "ab-pmjay-senior": ["आयुष्मान", "अस्पताल", "स्वास्थ्य", "बुजुर्ग", "ఆరోగ్యం", "ఆసుపత్రి", "వృద్ధులు"],
    "pmmvy": ["गर्भवती", "मातृत्व", "गर्भ", "मां", "महिला", "గర్భిణి", "ప్రసూతి", "తల్లి", "మహిళ"],
    "pmjdy": ["जन धन", "बैंक खाता", "खाता", "बैंक", "బ్యాంకు", "ఖాతా"],
}


def retrieve_schemes(message: str, profile: dict[str, Any]) -> list[dict[str, Any]]:
    lowered = message.lower()
    stopwords = {"i", "am", "a", "an", "the", "and", "for", "is", "in", "on", "to", "of", "my", "with", "what", "how", "me", "you", "please", "benefit", "benefits", "scheme", "schemes", "help", "eligible", "eligibility", "explain", "tell", "about", "which", "still", "need", "needs", "check", "checking", "pm"}
    tokens = set(re.findall(r"[a-z0-9]+", lowered)) - stopwords
    ranked = []
    for scheme in SCHEMES:
        corpus = " ".join([scheme["name"], scheme["description"], *scheme.get("keywords", [])]).lower()
        score = len(tokens & set(re.findall(r"[a-z0-9]+", corpus)))
        score += sum(2 for term in INTENT_TERMS.get(scheme["id"], []) if term in lowered)
        if scheme["id"] == "ab-pmjay-senior" and profile.get("age") and profile["age"] >= 65: score += 1
        if scheme["id"] == "pm-kisan" and profile.get("occupation") == "Farmer": score += 1
        ranked.append((score, scheme))
    ranked.sort(key=lambda item: item[0], reverse=True)
    return [scheme for score, scheme in ranked[:3] if score > 0]


def fallback_answer(language: str, relevant: list[dict[str, Any]]) -> str:
    if not relevant:
        return {
            "हिन्दी": "मुझे इस संदेश के लिए हमारे सीमित योजना-संग्रह में मेल नहीं मिला। कृपया योजना का नाम या अपनी ज़रूरत (किसान सहायता, मातृत्व, स्वास्थ्य या बैंक खाता) बताएं। पूरी जानकारी के लिए आधिकारिक सरकारी पोर्टल देखें।",
            "తెలుగు": "మీ ప్రశ్నకు మా పరిమిత పథకాల జాబితాలో సరిపోలిక దొరకలేదు. పథకం పేరు లేదా మీ అవసరాన్ని (రైతు సహాయం, ప్రసూతి, ఆరోగ్యం లేదా బ్యాంకు ఖాతా) చెప్పండి. పూర్తి వివరాలకు అధికారిక ప్రభుత్వ వెబ్‌సైట్‌ను చూడండి.",
        }.get(language, "I couldn't find a match in this small catalog. Tell me a scheme name or whether you need farmer support, maternity benefits, health cover or a basic bank account. Please verify details on an official government portal.")
    scheme = relevant[0]
    label = scheme["name"]
    if language == "हिन्दी":
        summaries = {
            "pm-kisan": f"PM-KISAN में पात्र भूमिधारक किसान परिवारों को सालाना ₹6,000 तीन किस्तों में दिए जाते हैं। खेती योग्य भूमि के रिकॉर्ड और अपवर्जन नियमों की सरकारी जाँच बाकी है।",
            "ab-pmjay-senior": f"70 वर्ष या उससे अधिक आयु के वरिष्ठ नागरिक आय की परवाह किए बिना आयुष्मान भारत PM-JAY के तहत पात्र हो सकते हैं। नामांकन और सरकारी सत्यापन ज़रूरी है।",
            "pmmvy": f"PMMVY पात्र गर्भवती और स्तनपान कराने वाली महिलाओं के लिए मातृत्व सहायता देता है। राशि और पात्रता पहले बच्चे/दूसरी बच्ची तथा श्रेणी के नियमों पर निर्भर हैं।",
            "pmjdy": f"PMJDY उन लोगों के लिए बुनियादी बैंक खाता उपलब्ध कराता है जिनका पहले से बैंक खाता नहीं है। खाता खोलने और KYC की पुष्टि बैंक करेगा।",
        }
        return summaries.get(scheme["id"], f"{label} के बारे में जानकारी नीचे आधिकारिक स्रोत में देखें। पात्रता की पुष्टि संबंधित विभाग करेगा।")
    if language == "తెలుగు":
        summaries = {
            "pm-kisan": "PM-KISAN కింద అర్హత కలిగిన భూమి ఉన్న రైతు కుటుంబాలకు సంవత్సరానికి ₹6,000 మూడు విడతల్లో అందుతుంది. భూమి రికార్డులు, మినహాయింపులపై ప్రభుత్వ ధృవీకరణ అవసరం.",
            "ab-pmjay-senior": "70 ఏళ్లు లేదా అంతకంటే ఎక్కువ వయస్సు ఉన్నవారు ఆదాయంతో సంబంధం లేకుండా ఆయుష్మాన్ భారత్ PM-JAYకు అర్హులు కావచ్చు. నమోదు మరియు ప్రభుత్వ ధృవీకరణ అవసరం.",
            "pmmvy": "PMMVY అర్హత గల గర్భిణీ మరియు పాలిచ్చే మహిళలకు ప్రసూతి ప్రయోజనం అందిస్తుంది. మొత్తం, అర్హత మొదటి/రెండవ బిడ్డ మరియు వర్గ నియమాలపై ఆధారపడతాయి.",
            "pmjdy": "PMJDYలో ఇప్పటికే బ్యాంకు ఖాతా లేని వ్యక్తులు ప్రాథమిక బ్యాంకు ఖాతా కోసం దరఖాస్తు చేసుకోవచ్చు. KYC మరియు ఖాతా ప్రారంభాన్ని బ్యాంకు నిర్ధారిస్తుంది.",
        }
        return summaries.get(scheme["id"], f"{label} వివరాలకు అధికారిక మూలాన్ని చూడండి. తుది అర్హతను సంబంధిత శాఖ నిర్ధారిస్తుంది.")
    return f"{scheme['name']}: {scheme['description']} {scheme['benefits']} Eligibility needs the checks listed on the official source. I cannot confirm approval."


AI_REQUESTS: dict[str, list[float]] = {}
AI_REQUESTS_LOCK = threading.Lock()
AI_RATE_LIMIT = 12
AI_RATE_WINDOW_SECONDS = 60


def enforce_ai_rate_limit(citizen_id: str) -> None:
    now = time.monotonic()
    with AI_REQUESTS_LOCK:
        recent = [stamp for stamp in AI_REQUESTS.get(citizen_id, []) if now - stamp < AI_RATE_WINDOW_SECONDS]
        if len(recent) >= AI_RATE_LIMIT:
            raise HTTPException(429, "Assistant request limit reached. Please wait a minute and try again.")
        recent.append(now)
        AI_REQUESTS[citizen_id] = recent


def call_gemini(payload: ChatIn, relevant: list[dict[str, Any]], eligibility: dict[str, dict[str, Any]]) -> tuple[dict[str, Any] | None, str | None]:
    if not relevant:
        return None, "no_retrieved_scheme_context"
    context = []
    for scheme in relevant:
        context.append({
            "id": scheme["id"], "name": scheme["name"], "department": scheme["department"],
            "description": scheme["description"], "benefits": scheme["benefits"],
            "eligibility_rules": scheme["eligibility_rules"], "required_documents": scheme["required_documents"],
            "official_source_url": scheme["official_source_url"], "deterministic_eligibility_result": eligibility[scheme["id"]],
        })
    safe_profile = {k: payload.profile.get(k) for k in ("age", "state", "occupation", "annual_income", "family_category", "maternity_status", "children_count", "eligibility_categories", "has_existing_bank_account") if payload.profile.get(k) is not None}
    system = (
        "You are JanSaarthi AI, an Indian government-scheme information assistant. "
        "Reply only in the requested language (English, Telugu or Hindi). Use only the supplied official scheme records. "
        "The deterministic_eligibility_result is authoritative: never change its status, invent criteria, or override satisfied, failed or missing checks. "
        "Explain the supplied engine result in simple language, mention uncertainty, and do not guarantee approval. "
        "Never request, repeat or expose Aadhaar, OTP, password, bank-account number or credentials. "
        "Return JSON matching the requested schema. Recommend only supplied scheme IDs."
    )
    user_payload = {"language": payload.language, "question": redact_sensitive(payload.message), "profile": safe_profile, "retrieved_schemes": context}
    try:
        timeout = min(max(float(os.getenv("GEMINI_TIMEOUT_SECONDS", "20")), 3.0), 45.0)
    except ValueError:
        timeout = 20.0
    return generate_gemini_json(system_instruction=system, user_payload=user_payload, timeout=timeout)


@app.post("/api/assistant/chat")
def assistant_chat(payload: ChatIn, request: APIRequest) -> dict[str, Any]:
    citizen_id = current_citizen(request)
    enforce_ai_rate_limit(citizen_id)
    relevant = retrieve_schemes(payload.message, payload.profile)
    engine_results = {s["id"]: check_eligibility(EligibilityIn(scheme_id=s["id"], profile=payload.profile)) for s in relevant}
    generated, provider_error = call_gemini(payload, relevant, engine_results)
    answer = generated["answer"] if generated else fallback_answer(payload.language, relevant)
    generated_recommendations = {item.get("scheme_id"): item for item in (generated or {}).get("recommendations", []) if isinstance(item, dict)}
    recommendations = []
    for scheme in relevant:
        engine = engine_results[scheme["id"]]
        model_explanation = generated_recommendations.get(scheme["id"], {}).get("eligibility_reasoning")
        recommendations.append({
            "scheme_id": scheme["id"], "scheme_name": scheme["name"],
            "eligibility_assessment": engine["status"],
            "reasoning": model_explanation if generated and isinstance(model_explanation, str) else engine["reason"],
            "criteria_satisfied": engine["criteria_satisfied"],
            "criteria_not_satisfied": engine["criteria_not_satisfied"],
            "missing_criteria": engine["missing_information"],
            "required_documents": scheme["required_documents"],
            "official_source": scheme["official_source_url"],
            "application_url": scheme["application_url"],
        })
    return {
        "answer": answer, "language": payload.language, "provider": "gemini",
        "provider_available": bool(generated), "provider_error": provider_error,
        "recommendations": recommendations,
        "missing_information": list(dict.fromkeys(item for result in engine_results.values() for item in result["missing_information"])),
        "schemes": relevant,
    }


OCR_ENGINE = None


def recognize_image(image_bytes: bytes) -> str:
    global OCR_ENGINE
    try:
        from io import BytesIO
        import numpy as np
        from PIL import Image
        from rapidocr import RapidOCR
        if OCR_ENGINE is None:
            OCR_ENGINE = RapidOCR()
        image = np.asarray(Image.open(BytesIO(image_bytes)).convert("RGB"))
        result = OCR_ENGINE(image)
        return "\n".join(result.txts or [])
    except Exception as exc:
        raise HTTPException(503, "OCR could not process this image. Please try a clear JPG/PNG or a text PDF.") from exc


def redact_sensitive(text: str) -> str:
    text = re.sub(r"(?i)\b(?:OTP|one.?time password)\s*(?:is|:|-)??\s*\d{4,8}\b", "[REDACTED OTP]", text)
    text = re.sub(r"(?<!\d)(?:\d[\s-]?){11}\d(?!\d)", "[REDACTED ID NUMBER]", text)
    text = re.sub(r"(?i)(?:account|a/c|bank account)\s*(?:no\.?|number)?\s*[:#-]?\s*[0-9x*]{8,18}", "[REDACTED BANK ACCOUNT]", text)
    return text[:20000]


def identify_document(text: str, filename: str) -> set[str]:
    value = (text + " " + filename).lower()
    types: set[str] = set()
    patterns = {
        "identity_proof": r"aadhaar|aadhar|uidai|voter.?id|passport|driving.?licen[cs]e|identity proof|पहचान पत्र",
        "land_record": r"land record|record of rights|pattadar|patta|survey number|khatauni|jamabandi|భూమి పట్టా|खसरा",
        "income_proof": r"income certificate|annual income|family income|आय प्रमाण|ఆదాయ ధృవీకరణ",
        "bank_proof": r"passbook|bank statement|account holder|ifsc|బ్యాంకు పాస్.?బుక్|बैंक पासबुक",
        "ration_card": r"ration card|nfsa|राष्ट्रीय खाद्य|రేషన్ కార్డు",
        "job_card": r"mgnrega|nrega|job card|జాబ్ కార్డు",
        "health_card": r"ayushman|pmjay|health card|आयुष्मान कार्ड",
        "maternity_health_record": r"mcp card|rchi|antenatal|anc|pregnancy|गर्भावस्था|मातृ",
        "birth_record": r"birth certificate|जन्म प्रमाण|జనన ధృవీకరణ",
        "immunisation_record": r"immuni[sz]ation|vaccination|टीकाकरण|టీకా",
        "caste_proof": r"caste certificate|scheduled caste|scheduled tribe|जाति प्रमाण|కుల ధృవీకరణ",
        "disability_proof": r"disability certificate|divyang|दिव्यांग|వైకల్య ధృవీకరణ",
    }
    for doc_type, pattern in patterns.items():
        if re.search(pattern, value): types.add(doc_type)
    return types


@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...), citizen_id: str = Form("local"), scheme_id: str = Form(""), request: APIRequest = None) -> dict[str, Any]:
    if request is not None: current_citizen(request)
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, "Only PDF, JPG and PNG files are accepted")
    content = await file.read(MAX_UPLOAD + 1)
    if len(content) > MAX_UPLOAD:
        raise HTTPException(413, "File exceeds the 8 MB limit")
    filename = Path(file.filename or "document").name[:200]
    if file.content_type == "application/pdf":
        try:
            import fitz
            with fitz.open(stream=content, filetype="pdf") as doc:
                if len(doc) > 20: raise HTTPException(413, "PDF is limited to 20 pages")
                extracted = "\n".join(page.get_text() for page in doc)[:20000]
                if not extracted.strip():
                    for page in doc[:5]:
                        pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
                        extracted += "\n" + recognize_image(pix.tobytes("png"))
        except HTTPException:
            raise
        except Exception:
            extracted = ""
    else:
        extracted = recognize_image(content)
    detected = identify_document(extracted, filename)
    scheme = next((item for item in SCHEMES if item["id"] == scheme_id), None)
    checklist = []
    if scheme:
        type_map = {"Land ownership records": "land_record", "Bank account details": "bank_proof", "Identity document (as required by official portal)": "identity_proof", "Age proof as required by official enrolment": "identity_proof", "Identity document for e-KYC": "identity_proof", "MCP/RCHI card and pregnancy/child health details (as applicable)": "maternity_health_record", "Proof of one eligible category (see Ministry list)": "any_eligible_proof", "Bank/post office account proof; Aadhaar requirements are handled only by the official portal": "bank_proof", "Child birth and immunisation details for applicable instalments": "birth_record", "Identity/address documents accepted by the bank (see official KYC guidance)": "identity_proof"}
        proof_types = {"income_proof", "caste_proof", "disability_proof", "ration_card", "job_card", "health_card"}
        checklist = []
        for label in scheme["required_documents"]:
            doc_type = type_map.get(label, "unknown")
            present = bool(proof_types & detected) if doc_type == "any_eligible_proof" else doc_type in detected
            checklist.append({"document": label, "document_type": doc_type, "present_in_this_upload": present, "status": "Possible supporting document detected; verify it meets official requirements" if present else "Not detected in this upload; may be provided separately"})
    names = {"identity_proof": "Identity document (unconfirmed)", "land_record": "Land record (unconfirmed)", "income_proof": "Income proof (unconfirmed)", "bank_proof": "Bank document (unconfirmed)", "ration_card": "Ration card (unconfirmed)", "job_card": "Employment job card (unconfirmed)", "health_card": "Health scheme card (unconfirmed)", "maternity_health_record": "Maternity health record (unconfirmed)", "birth_record": "Birth record (unconfirmed)", "immunisation_record": "Immunisation record (unconfirmed)", "caste_proof": "Caste proof (unconfirmed)", "disability_proof": "Disability proof (unconfirmed)"}
    return {"filename": filename, "document_type": [names[t] for t in sorted(detected)] or ["Document type not identified"], "detected_types": sorted(detected), "extracted_text": redact_sensitive(extracted), "scheme_id": scheme_id or None, "required_documents": scheme["required_documents"] if scheme else [], "document_checklist": checklist, "missing_documents": [item["document"] for item in checklist if not item["present_in_this_upload"]], "stored": False, "officially_verified": False, "message": "Extraction and type detection are assistive only. A missing item may be in another upload. This document has not been officially verified."}
