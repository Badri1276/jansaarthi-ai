"""Small Gemini Developer API adapter. Credentials are read only at request time."""

from __future__ import annotations

import json
import os
import re
import socket
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "answer": {"type": "string"},
        "recommendations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "scheme_id": {"type": "string"},
                    "eligibility_reasoning": {"type": "string"},
                },
                "required": ["scheme_id", "eligibility_reasoning"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["answer", "recommendations"],
    "additionalProperties": False,
}


def _open_with_503_retry(request: Request, timeout: float):
    """Retry one transient service-unavailable response; never retry timeouts or quota errors."""
    for attempt in range(2):
        try:
            return urlopen(request, timeout=timeout)
        except HTTPError as exc:
            if exc.code != 503 or attempt:
                raise
            exc.close()
            time.sleep(0.5)
    raise RuntimeError("unreachable retry state")


def generate_json(*, system_instruction: str, user_payload: dict, timeout: float = 20.0) -> tuple[dict | None, str | None]:
    """Call Gemini generateContent and return a sanitized error code on failure."""
    provider = os.getenv("AI_PROVIDER", "gemini").strip().lower()
    if provider != "gemini":
        return None, "unsupported_provider"

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None, "missing_api_key"

    model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()
    if not re.fullmatch(r"gemini-[a-zA-Z0-9.-]*flash[a-zA-Z0-9.-]*", model, flags=re.IGNORECASE):
        return None, "invalid_model_configuration"

    body = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": json.dumps(user_payload, ensure_ascii=False)}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1800,
            "responseMimeType": "application/json",
            "responseJsonSchema": RESPONSE_SCHEMA,
        },
    }
    request = Request(
        GEMINI_API.format(model=model),
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with _open_with_503_retry(request, timeout=timeout) as response:
            payload = json.loads(response.read(1_000_000))
        parts = payload["candidates"][0]["content"]["parts"]
        text = next((part.get("text") for part in parts if isinstance(part.get("text"), str)), None)
        if not text:
            return None, "empty_provider_response"
        generated = json.loads(text)
        if not isinstance(generated.get("answer"), str) or not isinstance(generated.get("recommendations"), list):
            return None, "invalid_structured_response"
        return generated, None
    except HTTPError as exc:
        # Inspect provider text only in memory to classify errors; never return it to callers.
        try:
            error_text = exc.read(16_384).decode("utf-8", errors="ignore").lower()
        except Exception:
            error_text = ""
        finally:
            exc.close()
        if exc.code in (400, 401, 403) and ("api key" in error_text or exc.code in (401, 403)):
            return None, "invalid_api_key_or_permissions"
        if exc.code == 429:
            return None, "quota_or_rate_limit"
        if exc.code == 404:
            return None, "model_unavailable"
        if exc.code == 503:
            return None, "provider_http_503"
        if exc.code >= 500:
            return None, "provider_http_5xx"
        return None, "provider_request_rejected"
    except (TimeoutError, socket.timeout):
        return None, "provider_timeout"
    except URLError as exc:
        # Keep diagnostics useful while never returning OS/provider error text.
        reason = exc.reason
        if isinstance(reason, (TimeoutError, socket.timeout)):
            return None, "provider_timeout"
        if isinstance(reason, socket.gaierror):
            return None, "provider_dns_error"
        if isinstance(reason, ConnectionRefusedError):
            return None, "provider_connection_refused"
        if isinstance(reason, OSError):
            if reason.errno == socket.EAI_AGAIN:
                return None, "provider_dns_error"
            if reason.errno in (10060, 110):
                return None, "provider_timeout"
            if reason.errno in (10061, 111):
                return None, "provider_connection_refused"
        if isinstance(reason, str):
            lower_reason = reason.lower()
            if "timed out" in lower_reason or "timeout" in lower_reason:
                return None, "provider_timeout"
            if "getaddrinfo" in lower_reason or "name or service" in lower_reason:
                return None, "provider_dns_error"
            if "connection refused" in lower_reason:
                return None, "provider_connection_refused"
        return None, "provider_network_error"
    except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError):
        return None, "invalid_structured_response"
