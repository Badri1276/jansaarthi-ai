"""Live multilingual Gemini smoke evaluation using synthetic scheme/profile data.

Run from the project root:
    backend/.venv/Scripts/python.exe backend/evaluate_gemini_languages.py

The results file contains only model, latency, and pass/fail metadata; it does not
store prompts, model responses, or API credentials.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
sys.path.insert(0, str(ROOT))

from main import ChatIn, EligibilityIn, check_eligibility, call_gemini, retrieve_schemes  # noqa: E402


CASES = [
    ("English", "I am a farmer. Explain PM-KISAN benefits and which eligibility checks still need verification."),
    ("हिन्दी", "मैं किसान हूँ। PM-KISAN के लाभ बताइए और कौन-सी पात्रता अभी जाँचनी बाकी है?"),
    ("తెలుగు", "నేను రైతును. PM-KISAN ప్రయోజనాలు మరియు ఇంకా ధృవీకరించాల్సిన అర్హతలను వివరించండి."),
]


def has_expected_script(language: str, text: str) -> bool:
    if language == "हिन्दी":
        return bool(re.search(r"[\u0900-\u097f]", text))
    if language == "తెలుగు":
        return bool(re.search(r"[\u0c00-\u0c7f]", text))
    return bool(re.search(r"[A-Za-z]", text)) and not re.search(r"[\u0900-\u097f\u0c00-\u0c7f]", text)


def main() -> int:
    model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    if not os.getenv("GEMINI_API_KEY", "").strip():
        print("SKIPPED: GEMINI_API_KEY is not configured; no external request was made.")
        print("Add your key to backend/.env and rerun. The key is never printed by this script.")
        return 2

    profile = {"age": 40, "occupation": "Farmer", "state": "Telangana", "annual_income": 180000}
    results = []
    for language, question in CASES:
        chat = ChatIn(message=question, language=language, profile=profile)
        relevant = retrieve_schemes(question, profile)
        engine = {s["id"]: check_eligibility(EligibilityIn(scheme_id=s["id"], profile=profile)) for s in relevant}
        started = time.perf_counter()
        generated, error = call_gemini(chat, relevant, engine)
        latency = round(time.perf_counter() - started, 3)
        structurally_valid = bool(generated and isinstance(generated.get("answer"), str) and isinstance(generated.get("recommendations"), list))
        language_ok = bool(generated and has_expected_script(language, generated["answer"]))
        recommended_ids = {x.get("scheme_id") for x in (generated or {}).get("recommendations", []) if isinstance(x, dict)}
        retrieval_ok = bool(relevant) and recommended_ids.issubset({x["id"] for x in relevant})
        passed = structurally_valid and language_ok and retrieval_ok
        results.append({"language": language, "model": model, "response_time_seconds": latency, "structured_json": structurally_valid, "language_script_check": language_ok, "retrieved_scheme_ids_only": retrieval_ok, "outcome": "passed" if passed else "failed", "error_code": error})
        print(f"{language}: {'PASS' if passed else 'FAIL'} | {latency:.3f}s | structured={structurally_valid} | language={language_ok} | error={error or 'none'}")

    report = {"created_at": datetime.now(timezone.utc).isoformat(), "provider": "gemini", "model": model, "synthetic_data": True, "results": results}
    report_path = ROOT / "gemini-language-evaluation.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Metadata report saved to {report_path.name}; no answers or credentials are stored.")
    return 0 if all(x["outcome"] == "passed" for x in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
