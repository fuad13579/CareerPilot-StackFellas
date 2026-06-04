# Evaluation Suite

This document maps CareerPilot's AI features to the Codesprint 2026 evaluation
criteria. It documents the test cases we use to prove the system actually
works end-to-end: a real CV is uploaded, parsed, indexed, and then used as
grounding context for the AI assistant, the cover-letter writer, and the
fit-score engine. Every case below has a clear input, expected behaviour,
actual outcome, and pass/fail verdict.

The suite is split into three layers:

1. **Automated API tests** - run with `pytest` inside `backend/tests/`. These
   guard the request/response contract and the deterministic scoring layer.
2. **Manual end-to-end cases** - reproduced in a running dev stack. These
   exercise the LLM provider chain (GitHub Models -> OpenRouter ->
   rule-based fallback) which cannot be fully asserted in CI without paid
   API keys.
3. **Adversarial / guard-rail cases** - inputs that the system must refuse or
   degrade gracefully on. The brief explicitly forbids "hardcoded AI
   responses" and "faked live agent functionality", so we test the failure
   paths too.

## 1. Pillar 3 benchmark queries (the brief's headline requirement)

The brief requires the assistant to handle four query families. Each is
covered by a documented case below. For every case the input is shown
verbatim, the expected behaviour is the contract we promise the user, and
the actual behaviour is what `POST /api/assistant/query` returns in the
running stack.

### Case 1.1 - Readiness verdict

- **Input CV excerpt** (seeded by `test_anonymous_user_persistence.py`):
  "Senior Python developer, 6 years experience, FastAPI, PostgreSQL,
  Docker, AWS, CI/CD with GitHub Actions, led a team of 3."
- **User query:** "Am I ready for a Senior Python Developer role at a
  fintech startup?"
- **Expected behaviour:**
  - Response is grounded in the parsed CV sections (`experience`,
    `skills`).
  - Includes an explicit verdict (`ready`, `nearly ready`, or `not
    ready`) with a confidence cue.
  - References at least one concrete skill from the CV.
  - When an LLM provider is configured, the response carries
    `provider: "github_models"` (or `"openrouter"`) and
    `fallback_used: false`.
- **Actual behaviour (live):** with `GITHUB_MODELS_TOKEN` set, the
  assistant returns a paragraph that names FastAPI and PostgreSQL, gives
  a "nearly ready - add observability and fintech domain experience"
  verdict, and the response payload reports `provider: "github_models"`.
  Without a token, the same query hits
  `fallback_response_service.py` and the response is prefixed with
  `BUILTIN_NOTICE`; `fallback_used` is `true`. The frontend surfaces
  this as an amber "Built-in CV analysis" chip on the message
  (see `frontend/src/components/assistant-experience.tsx`).
- **Verdict:** PASS for both paths. The contract holds, and the user can
  always tell which engine answered.

### Case 1.2 - Skill-gap analysis

- **Input CV excerpt:** "Junior data analyst, 1 year, Excel, SQL, Tableau,
  some Python."
- **User query:** "What skills am I missing for a Google Data Analyst
  internship?"
- **Expected behaviour:**
  - Names 2-4 concrete missing skills (e.g. `A/B testing`, `BigQuery`,
    `statistics`, `Python pandas`).
  - Ties each gap to a justification, not a generic list.
  - Does **not** hallucinate skills the user already has in the CV.
- **Actual behaviour (live):** the LLM-grounded response lists
  "statistics fundamentals, A/B testing, BigQuery, pandas" and confirms
  SQL/Tableau are already present. The rule-based fallback returns a
  similar but more templated gap list driven by the job-skill extractor
  in `job_skill_extraction_service.py`.
- **Verdict:** PASS.

### Case 1.3 - 3-month roadmap

- **Input CV excerpt:** "Career switcher from marketing. 6 months self-
  taught Python. Built a few Flask apps. No CS degree."
- **User query:** "Build me a 3-month roadmap to become job-ready for a
  junior backend role."
- **Expected behaviour:**
  - Response is structured as month-by-month milestones.
  - Each milestone includes a verifiable artefact (a project, a course, a
    PR).
  - Total length is bounded to ~12 weeks.
  - Recommends concrete resources, not generic "learn more about
    databases".
- **Actual behaviour (live):** with the LLM, the response is
  "Month 1: finish SQL + build a CRUD API in FastAPI..." through
  "Month 3: ship a portfolio project and apply". Fallback response uses a
  canned roadmap that is shorter but still month-by-month.
- **Verdict:** PASS.

### Case 1.4 - Cover-letter draft

- **Input CV excerpt:** "Backend engineer, 3 years, Go and Python, AWS,
  Terraform, on-call experience."
- **User query:** "Draft a cover letter for the Acme Corp Senior Backend
  Engineer posting I just opened."
- **Expected behaviour:**
  - Calls `POST /api/cover-letter/generate` with the active CV id and the
    active job id (no need to re-paste the posting).
  - The generated letter is 250-400 words, addresses the company by name,
    and references at least 2 user skills that match the job posting.
  - The letter is personalised: it would not be valid for a different
    candidate with the same job.
- **Actual behaviour (live):** the cover-letter service
  (`cover_letter_service.py`) joins the parsed CV with the job posting
  pulled from the in-memory job pool, and the LLM produces a tailored
  letter. Fallback returns a structured template with the same skill
  joins but with a generic opening paragraph.
- **Verdict:** PASS.

### Case 1.5 - Conversational memory (multi-turn)

- **Turn 1 query:** "Summarise my backend experience in 3 bullets."
- **Turn 1 expected:** three bullets grounded in `experience` section.
- **Turn 2 query (same session):** "Turn bullet 2 into a STAR-format
  interview answer."
- **Turn 2 expected:**
  - Recognises "bullet 2" as the prior turn's output, not a fresh prompt.
  - Expands that specific bullet into Situation / Task / Action / Result.
  - Does **not** re-summarise the CV.
- **Actual behaviour:** `assistant_service.py` threads the last 6 turns
  into the prompt. Turn 2 references the second bullet by index and
  expands it correctly.
- **Verdict:** PASS.

## 2. Automated API test coverage

Run from `backend/`:

```
pytest -q
```

### 2.1 CV upload and validation (`test_cv_upload_validation.py`)

| # | Test function | What it proves | Verdict |
|---|---|---|---|
| 2.1.1 | `test_rejects_unsupported_file_types` | Only PDF and DOCX are accepted; uploads with `.exe`, `.png`, etc. are 415. | PASS |
| 2.1.2 | `test_rejects_mime_type_mismatch` | Extension and MIME must agree (no `.pdf` masquerading a JPEG). | PASS |
| 2.1.3 | `test_rejects_empty_pdf` | Zero-byte uploads are 400 with a clear message. | PASS |
| 2.1.4 | `test_rejects_non_cv_content` | Random prose is rejected by the CV-likeness heuristic - guards against fake "upload" demos. | PASS |
| 2.1.5 | `test_accepts_valid_cv_pdf` | A real CV PDF parses into sections (`experience`, `skills`, `education`). | PASS |
| 2.1.6 | `test_accepts_valid_cv_docx` | DOCX path uses the same extraction pipeline. | PASS |
| 2.1.7 | `test_rejects_oversized_file` | >5 MB uploads are 413, preventing memory abuse. | PASS |
| 2.1.8 | `test_validate_cv_likeness_requires_two_keywords` | Unit test for the CV-likeness heuristic - needs at least 2 of {experience, education, skills, project, work}. | PASS |
| 2.1.9 | `test_validate_cv_likeness_accepts_cv_like_text` | Unit test for the positive case of the same heuristic. | PASS |

### 2.2 Anonymous-user persistence (`test_anonymous_user_persistence.py`)

| # | Test function | What it proves | Verdict |
|---|---|---|---|
| 2.2.1 | `test_cv_upload_requires_anonymous_user_id` | First-time upload auto-creates a stable anonymous id stored in a cookie. | PASS |
| 2.2.2 | `test_cv_upload_persists_anonymous_user_id` | A second request with the same cookie reattaches to the original CV row - not a new one. | PASS |
| 2.2.3 | `test_jobs_search_rejects_foreign_cv` | A job-search request that names a CV id the user does not own is 403. Prevents IDOR. | PASS |

### 2.3 Skills-fit scoring (`test_skills_fit.py`)

| # | Test function | What it proves | Verdict |
|---|---|---|---|
| 2.3.1 | `test_skills_fit_full_match` | 100% overlap returns `fit_score: 1.0` and `matched_skills` equal to the user set. | PASS |
| 2.3.2 | `test_skills_fit_partial_match` | Partial overlap returns the correct ratio and the missing-skills list. | PASS |
| 2.3.3 | `test_skills_fit_no_match` | Zero overlap returns `fit_score: 0.0` and an empty `matched_skills`. | PASS |
| 2.3.4 | `test_skills_fit_empty_user_skills` | Graceful 400 with a helpful message. | PASS |
| 2.3.5 | `test_skills_fit_empty_job_skills` | Same on the job side. | PASS |
| 2.3.6 | `test_skills_fit_user_has_more_skills` | Extra skills on the user side are reported as `extra_skills`, not penalised. | PASS |
| 2.3.7 | `test_skills_fit_case_insensitive` | "Python" and "python" match. | PASS |
| 2.3.8 | `test_skills_fit_invalid_request_missing_fields` | Pydantic 422 with a field-level error. | PASS |
| 2.3.9 | `test_skills_fit_invalid_request_empty_body` | Same, for the empty-body case. | PASS |
| 2.3.10 | `test_skills_fit_response_structure` | Response always contains `fit_score`, `matched_skills`, `missing_skills`, `extra_skills`. | PASS |

## 3. Manual end-to-end cases

These are the flows a judge should be able to reproduce by following
`docs/demo-runbook.md`. Each is verified in a dev stack started with
`node start-dev.js`.

| # | Flow | Where to verify | Verdict |
|---|---|---|---|
| 3.1 | Upload CV PDF -> see parsed sections appear in dashboard. | `GET /api/cv/sections` after upload. | PASS |
| 3.2 | Job search returns at least 5 results from Arbeitnow/Remotive. | `GET /api/jobs/search?q=python`. | PASS |
| 3.3 | Fit score renders on the job card. | UI: jobs page, click a card, see the score gauge. | PASS |
| 3.4 | Assistant query with `GITHUB_MODELS_TOKEN` set -> green "AI - GitHub Models" chip. | UI: assistant panel, latest message. | PASS |
| 3.5 | Assistant query without any LLM token -> amber "Built-in CV analysis" chip. | UI: same panel after clearing `.env`. | PASS |
| 3.6 | Cover letter generator returns a tailored letter. | `POST /api/cover-letter/generate` with `cv_id` + `job_id`. | PASS |
| 3.7 | Tracker drag-and-drop persists across reload. | UI: kanban board, refresh page, state remains. | PASS |

## 4. Adversarial / guard-rail cases

The brief forbids faked responses. These cases prove the system fails
honestly when it should.

| # | Input | Expected | Actual | Verdict |
|---|---|---|---|---|
| 4.1 | Upload a 2 MB random binary renamed to `.pdf`. | 415, no DB row, no partial parse. | 415, no row. | PASS |
| 4.2 | `POST /api/assistant/query` with no CV uploaded yet. | 400 with a hint to upload a CV first. | 400, hint returned. | PASS |
| 4.3 | `POST /api/assistant/query` with a 10k-token query. | 413 or truncation with a notice. | 413. | PASS |
| 4.4 | Set `GITHUB_MODELS_TOKEN=invalid`. | Provider probe returns `not_configured`; UI shows fallback chip. | Amber chip shown, query still answered. | PASS |
| 4.5 | Hit `GET /api/health/providers`. | JSON listing each provider's `ready` / `not_configured` state. | Returned, including diagnostic `error` field. | PASS |

## 5. How to re-run the suite

```powershell
# Terminal 1 - backend
cd backend
.venv\Scripts\Activate.ps1
pytest -q

# Terminal 2 - manual repros
cd ..
node start-dev.js
# then open http://localhost:3000 and follow docs/demo-runbook.md
```

The automated cases run in <30 s on a laptop. The manual cases are the
ones judges are most likely to exercise live, so they are the most
scripted in `docs/demo-runbook.md`.

## 6. What you actually get per provider tier

This is the contract judges and friends will see in
`GET /api/health/providers` and in the response payload
(`provider` + `fallback_used` fields, surfaced as a chip in the UI).
The two engines are **not** the same - "AI" means a real LLM call;
"Built-in CV analysis" means the local rule-based RAG pipeline.

| Tier | Triggered when | Engine | UI chip | Output style |
| --- | --- | --- | --- | --- |
| **AI - GitHub Models** | `GITHUB_MODELS_TOKEN` is set and the call succeeds | OpenAI gpt-4o via GitHub Models | green "AI - GitHub Models" | Free-form natural-language answer, follows the user's wording, can do arbitrary multi-step reasoning. |
| **AI - OpenRouter** | GitHub Models not set, or its call failed; `OPENROUTER_API_KEY` is set and the call succeeds | The OpenRouter-routed free model (default `openrouter/auto:free`) | green "AI - OpenRouter" | Same as above, different upstream. |
| **Built-in CV analysis** | Neither token is set, or every LLM call failed | Local intent-routed pipeline over the parsed CV sections (`fallback_response_service.py`) | amber "Built-in CV analysis" | Templated but CV-grounded. Seven specialised handlers cover readiness, skill gap, roadmap, skills, experience, projects, and general summary. The cover letter also has its own fallback. Always prefixed with the `BUILTIN_NOTICE` footer. |

**Important:** the Built-in tier is **not** an LLM answer. It is a
deterministic retrieval pipeline that selects a handler from the user's
question, pulls the relevant CV sections, and formats them with a
template. It is real, it is grounded in the user's CV, and it is the
honest fallback the brief requires (no faked responses, no hardcoded
text). But it is not the same as a generated assistant answer.

**To get a real AI-generated answer on a judge's machine**, the judge
must export a key before running the app. Two options, both free:

- `GITHUB_MODELS_TOKEN=<github_pat_with_models:read_scope>` - opens
  gpt-4o, the recommended tier.
- `OPENROUTER_API_KEY=<openrouter_key>` - opens the free routing tier.

Either goes in `backend/.env` (gitignored). The provider chain
auto-detects whichever is set; the chip in the UI will turn green and
read "AI - GitHub Models" or "AI - OpenRouter". The judge running
`node start-dev.js` from a clean clone with no `.env` will see the
amber "Built-in CV analysis" chip and the local RAG pipeline - that is
by design.
