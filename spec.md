# JANSAARTHI AI — MASTER DEVELOPMENT SPECIFICATION

## 1. PRODUCT VISION

Build a fully functional, responsive, AI-powered web application that helps Indian citizens discover government welfare schemes, understand eligibility, identify required documents and access official application links.

The application must be functional, not a static UI prototype.

Core principle: Convert complicated government information into simple, personalized and actionable guidance.

## 2. CORE MODULES

### Module A — Citizen Profile
- Full name (optional).
- State and district.
- Age.
- Annual household income.
- Occupation.
- Family category.
- Language preference.
- Profile editing.
- Persist profile locally or in the database.

### Module B — AI Scheme Discovery
- Conversational interface.
- Accept natural-language questions.
- Understand Telugu, Hindi and English.
- Retrieve relevant schemes from a structured scheme database.
- Return personalized recommendations.
- Explain why a scheme matches the user's profile.
- Display official source and application links.
- Never invent scheme information.

### Module C — Eligibility Assessment
For each scheme, display:
- Eligibility status: Likely eligible / Not eligible / Needs verification.
- Applicable criteria.
- Criteria satisfied.
- Criteria not satisfied.
- Missing information.
- Reasoning in simple language.
- Official verification link.

Use deterministic rules for eligibility wherever criteria are available. Use the LLM to explain results, not invent eligibility rules.

### Module D — Document Intelligence
- Upload PDF, JPG and PNG.
- Extract text using OCR.
- Identify document type.
- Display extracted information.
- Compare uploaded documents against scheme requirements.
- Generate missing-document checklist.
- Never claim a document is officially verified.

### Module E — Application Roadmap
- Step-by-step application guide.
- Required documents.
- Official application website.
- Application preparation checklist.
- Save shortlisted schemes.
- Track user-marked application progress.

### Module F — Voice Assistant
- Browser microphone input where supported.
- Speech-to-text.
- Text-to-speech.
- Language selection.
- Telugu, Hindi and English support.
- Provide text fallback if browser speech APIs are unavailable.

## 3. UI/UX REQUIREMENTS

Design language:
- Modern, trustworthy, accessible government-tech product.
- White background with navy and blue primary colors.
- Green for positive eligibility status.
- Responsive mobile-first layout.
- Clean typography.
- Rounded cards.
- Subtle shadows.
- Clear visual hierarchy.

Main navigation:
1. Dashboard
2. Discover Schemes
3. Eligibility Checker
4. Document Assistant
5. My Applications
6. AI Assistant
7. Profile

Dashboard:
- Personalized welcome.
- Profile completion indicator.
- Recommended schemes.
- Quick eligibility checker.
- Saved schemes.
- Application progress.

Scheme cards:
- Scheme name.
- Government department.
- Target beneficiaries.
- Benefit summary.
- Eligibility indicator.
- Required documents.
- Official source link.
- View details action.

## 4. RECOMMENDED TECHNOLOGY STACK

Frontend:
- React
- Vite
- TypeScript
- Tailwind CSS
- Lucide React
- React Router

Backend:
- Python
- FastAPI
- Pydantic
- SQLAlchemy

Database:
- SQLite for rapid MVP development.
- PostgreSQL/Supabase as an optional production upgrade.

AI:
- Existing configured LLM provider.
- Environment-based API configuration.
- Structured JSON outputs.
- Retrieval augmented generation (RAG) if time permits.

Document processing:
- PyMuPDF for PDF text extraction.
- OCR for image-based documents.

Voice:
- Browser Web Speech API where supported.

Deployment:
- Vercel for frontend.
- Render or another working Python hosting provider for backend.

Do not change the existing working technology stack unnecessarily.

## 5. DATABASE SCHEMA

Citizen:
- id
- name
- age
- state
- district
- occupation
- annual_income
- family_category
- preferred_language

Scheme:
- id
- name
- department
- description
- benefits
- eligibility_rules
- required_documents
- application_url
- official_source_url
- last_verified_at

SavedScheme:
- id
- citizen_id
- scheme_id
- application_status
- created_at

Document:
- id
- citizen_id
- document_type
- filename
- extracted_text
- upload_timestamp

## 6. API ENDPOINTS

GET /api/health
GET /api/schemes
GET /api/schemes/{scheme_id}
POST /api/profile
GET /api/profile/{citizen_id}
POST /api/eligibility/check
POST /api/assistant/chat
POST /api/documents/upload
GET /api/saved-schemes/{citizen_id}
POST /api/saved-schemes
PATCH /api/applications/{application_id}

Return consistent JSON responses and meaningful HTTP status codes.

## 7. AI ASSISTANT SYSTEM BEHAVIOUR

You are JanSaarthi AI, a responsible Indian government scheme information assistant.

Rules:
- Respond in the user's preferred language.
- Use retrieved government scheme information.
- Explain technical government terminology simply.
- Ask for missing information only when necessary.
- Cite the scheme's official source.
- Never fabricate eligibility criteria, benefits, deadlines or application URLs.
- Clearly distinguish likely eligibility from officially confirmed eligibility.
- Do not guarantee scheme approval.
- Never request Aadhaar numbers, OTPs, passwords or bank credentials.
- Do not retain sensitive uploaded documents unnecessarily.

## 8. SECURITY AND PRIVACY

- Validate all inputs.
- Restrict upload file types and sizes.
- Do not expose API keys in frontend code.
- Use environment variables.
- Add CORS restrictions.
- Never log sensitive document contents.
- Do not store uploaded documents permanently unless explicitly required.
- Provide clear user consent before document processing.

## 9. MVP ACCEPTANCE TESTS

Test 1: A farmer enters their profile and discovers relevant agricultural schemes.

Test 2: A citizen enters annual household income and checks eligibility.

Test 3: The AI explains why a particular scheme matches or does not match.

Test 4: A user uploads a sample document and receives extracted information.

Test 5: A Telugu-speaking user asks a question and receives a Telugu response.

Test 6: A user saves a scheme and views it on the dashboard.

Test 7: Official links open correctly.

Test 8: Invalid inputs and failed AI requests display understandable errors.

## 10. IMPLEMENTATION PRIORITIES

P0 — Absolutely required:
- Working responsive frontend.
- Scheme database with sourced information.
- Citizen profile.
- Scheme discovery.
- Deterministic eligibility assessment.
- AI explanation.
- Official source links.
- Working backend integration.

P1 — Important:
- Multilingual AI.
- Saved schemes.
- Application checklist.
- Document extraction.

P2 — Only if time permits:
- Voice interaction.
- Advanced OCR.
- Analytics dashboard.
- RAG architecture.
- Authentication.

## 11. DEVELOPMENT RULES

1. Inspect the existing project before changing anything.
2. Preserve working features and existing integrations.
3. Never overwrite working configuration files unnecessarily.
4. Build and test incrementally.
5. Use real backend APIs rather than hardcoded frontend responses.
6. Use a small verified dataset rather than fabricated government schemes.
7. Handle loading, empty, error and success states.
8. Run frontend and backend tests.
9. Verify all important workflows before deployment.
10. Do not claim a feature is implemented unless it has been tested.

## FINAL DELIVERABLE

A deployed, mobile-responsive JanSaarthi AI web application with a working dashboard, AI-powered scheme discovery, transparent eligibility assessment, document assistance, multilingual interactions and official government source references.