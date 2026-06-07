# CareerPilot Evaluation Suite

This document gives judges and reviewers a simple evaluation grid for the main CareerPilot flows. Fill in the `Actual Output` and `Pass / Fail` columns during local testing or live demo verification.

## Test Cases

| Test Name | Input | Expected Output | Actual Output | Pass / Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| CV Upload and Processing | Upload a valid PDF or DOCX CV on `/upload` | Upload succeeds, returns `cv_id`, extracted skills, and RAG status. Parsed CV data becomes available to later flows. | `<fill after test>` | `<pass/fail>` | Verify the backend also writes processed text/sections and reports `rag_index_built` truthfully. |
| Live Job Search | Search from `/jobs` with a query like `remote python backend internship` | Returned job cards come from live APIs, include source labels, and are not hardcoded fixtures. Results should reflect live-source availability and cache state. | `<fill after test>` | `<pass/fail>` | If Adzuna is not configured, Arbeitnow and Remotive should still provide live results. |
| Fit Score Generation | Upload a CV, then view a returned job card from the jobs page | The job card shows a computed fit score plus matched and missing skills derived from the CV and job content. | `<fill after test>` | `<pass/fail>` | This is programmatic scoring, not an LLM-only output. |
| AI Assistant RAG-Grounded Answer | Ask the assistant a question such as `What backend skills am I missing for these roles?` after CV upload | Response references the uploaded CV context, uses retrieved chunks, and surfaces provider/fallback mode accurately. | `<fill after test>` | `<pass/fail>` | Confirm the answer does not invent experience absent from the CV. |
| Cover Letter Generation | Open a job context and generate a cover letter | The generated draft references the selected job and the uploaded CV rather than a generic template. | `<fill after test>` | `<pass/fail>` | Check that the draft mentions relevant CV skills or experience. |
| Tracker / Kanban Update | Save a job to tracker and move it between stages | The application appears in tracker, status changes persist, and the board still reflects the updated state after reload. | `<fill after test>` | `<pass/fail>` | Confirm stages and persistence work for the active anonymous user profile. |

## Suggested Manual Inputs

Use these sample prompts during evaluation:

- Job search query: `hybrid data analyst jobs in New York at least 100k`
- Assistant prompt: `Am I ready for a senior Python backend role?`
- Assistant prompt: `Build me a 3-month roadmap based on my CV`
- Cover letter context: a selected live job from the jobs page

## Automation Reference

The repository also includes backend automated tests under `backend/tests/`, including coverage for:

- CV upload validation
- job search behavior
- assistant job-search mode
- query parsing
- RAG behavior and status
- skills fit behavior

Run them with:

```bash
cd backend
pytest -q
```
