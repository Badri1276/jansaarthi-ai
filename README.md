# JanSaarthi AI

A responsive citizen-facing scheme discovery app with a FastAPI backend and a small SQLite database. Scheme guidance is linked to official government portals. The assistant retrieves relevant catalog entries and uses Google Gemini for multilingual explanations when configured; deterministic eligibility results remain authoritative.

## Run locally

Requirements: Node.js 20+ and Python 3.10+.

```powershell
# Terminal 1: API
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000 --env-file .env

# Terminal 2: frontend (from project root)
npm install
npm run dev
```

Open http://localhost:5173. FastAPI docs are at http://localhost:8000/docs. Set `CORS_ORIGINS` to the frontend origin(s) and `JANSAARTHI_DB` to choose the SQLite file path in a deployment.

## Session-protected API requests (PowerShell)

`GET /api/session` is the session bootstrap endpoint. It returns `{"status":"ok"}` and sets the HttpOnly `jansaarthi_session` cookie. A valid cookie is required by profile, saved-scheme, application, document, and assistant endpoints. Every `POST`, `PATCH`, `PUT`, or `DELETE` also requires the custom `X-Requested-With: JanSaarthi-Web` header. There is no separate generated CSRF token.

Run the following in PowerShell while the API is running on port 8000. `-WebSession` retains the bootstrap cookie and sends it with the chat request:

```powershell
$base = 'http://127.0.0.1:8000'
$webSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Establish a browser-equivalent session. Do not print the cookie value.
$bootstrap = Invoke-RestMethod -Uri "$base/api/session" -Method Get -WebSession $webSession
$sessionCookie = $webSession.Cookies.GetCookies([uri]$base)['jansaarthi_session']
"bootstrap=$($bootstrap.status); cookie_received=$([bool]$sessionCookie); httponly=$($sessionCookie.HttpOnly)"

# Send a chat request with both the cookie and the required request-validation header.
$headers = @{ 'X-Requested-With' = 'JanSaarthi-Web' }
$body = @{
    message = 'I am a farmer. Explain PM-KISAN benefits and remaining eligibility checks.'
    language = 'English'
    profile = @{ age = 40; occupation = 'Farmer'; state = 'Telangana'; annual_income = 180000 }
} | ConvertTo-Json -Depth 8

$chat = Invoke-RestMethod -Uri "$base/api/assistant/chat" `
    -Method Post -WebSession $webSession -Headers $headers `
    -ContentType 'application/json' -Body $body

"provider=$($chat.provider); provider_available=$($chat.provider_available); provider_error=$($chat.provider_error); recommendations=$($chat.recommendations.Count)"
$chat.recommendations | Select-Object scheme_name, eligibility_assessment, official_source
```

Expected locally: bootstrap is `ok`, a cookie is received with `HttpOnly=True`, and chat returns a sourced recommendation. If `GEMINI_API_KEY` is not configured, chat still returns HTTP 200 using the existing fallback with `provider_available=False` and `provider_error=missing_api_key`.

Negative checks: a write without the custom header returns HTTP 403 `Missing request validation header`; a write with the header but no session cookie returns HTTP 401 `A browser session is required`. In production, use the HTTPS API URL because the session cookie is `Secure` and `SameSite=None`.

## Current scope and privacy

- Browser sessions are isolated with HttpOnly cookies; profiles are encrypted at rest using a local development key or `PROFILE_ENCRYPTION_KEY`. Saved schemes are session-scoped.
- Uploaded files are limited to PDF/JPG/PNG, 8 MB and 20 PDF pages. They are processed in memory only; PDF text uses PyMuPDF and image/scanned PDF OCR uses RapidOCR. Sensitive number-like strings are redacted from returned OCR text.
- The catalog includes four schemes with source URLs, verification dates and explicit source caveats. It remains a starter set; verify current rules on official portals.
- The eligibility checker only assesses the limited criteria represented in the dataset and labels incomplete cases “Needs verification.” It is not a government determination.
- The assistant supports Google Gemini only. Without `GEMINI_API_KEY`, it uses the existing hand-authored multilingual fallback and returns `provider_available: false`.
- For deployment set `APP_ENV=production`, `PROFILE_ENCRYPTION_KEY` to a generated Fernet key, and `CORS_ORIGINS` to the exact frontend origin. Do not use real citizen data in a public demo without a complete account/consent and retention policy.

## Provider setup

Create a local `backend/.env` from `backend/.env.example`, or set these in your hosting dashboard. Never commit credentials. The key is read by the backend only and is never sent to the frontend:

```text
AI_PROVIDER=gemini
GEMINI_API_KEY=<your Google AI Studio API key>
GEMINI_MODEL=gemini-3.8-flash
GEMINI_TIMEOUT_SECONDS=20
```

`AI_PROVIDER` defaults to `gemini`. The current default model is `gemini-3.8-flash`; set `GEMINI_MODEL` to another supported Gemini Flash model if needed. `GEMINI_TIMEOUT_SECONDS` is optional. Restart Uvicorn after changing `.env`. Legacy `LLM_*` values may remain in your existing file but are ignored by the Gemini-only integration. On provider error or quota exhaustion, the API returns a sanitized error code and uses the multilingual fallback. Recommendations, eligibility status, missing criteria, documents, and source URLs are assembled from the local catalog and deterministic engine.

## API

`GET /api/health`, `GET /api/schemes`, `GET /api/schemes/{scheme_id}`, profile read/write, eligibility, assistant chat, document upload, saved scheme list/create/remove, and application status update are implemented in `backend/main.py`.
