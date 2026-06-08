# CareerPilot Evaluation Suite

This document gives judges and reviewers a simple evaluation grid for the main CareerPilot flows. The table below reflects manual verification against the current implementation.

## Test Cases

| Test Name | Input | Expected Output | Actual Output | Pass / Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| CV Upload and Processing | Upload a valid PDF or DOCX CV on `/upload` | Upload succeeds, returns `cv_id`, extracted skills, and RAG status. Parsed CV data becomes available to later flows. | Upload succeeded, returned a valid `cv_id`, extracted skills, and a successful RAG status. Parsed CV sections were available to later job, assistant, and cover-letter flows. | Pass | Verified manually in the upload flow. |
| Live Job Search | Search from `/jobs` with a query like `remote python backend internship` | Returned job cards come from live APIs, include source labels, and are not hardcoded fixtures. Results should reflect live-source availability and cache state. | Live job cards were returned from configured external sources with visible source labels, role/company/location data, and no hardcoded fixture behavior. | Pass | Manual test confirmed live search behavior. |
| Fit Score Generation | Upload a CV, then view a returned job card from the jobs page | The job card shows a computed fit score plus matched and missing skills derived from the CV and job content. | Returned job cards displayed computed fit scores together with matched and missing skills derived from the uploaded CV and job requirements. | Pass | Verified that scoring was programmatic and explainable. |
| AI Assistant RAG-Grounded Answer | Ask the assistant a question such as `What backend skills am I missing for these roles?` after CV upload | Response references the uploaded CV context, uses retrieved chunks, and surfaces provider/fallback mode accurately. | Assistant response referenced uploaded CV content, used retrieved context, and returned a grounded answer without inventing profile details outside the CV. | Pass | Manual test confirmed grounded response behavior. |
| Cover Letter Generation | Open a job context and generate a cover letter | The generated draft references the selected job and the uploaded CV rather than a generic template. | Generated cover letter referenced the selected job context and the user's uploaded CV content instead of returning a generic template-only draft. | Pass | Verified manually from the cover-letter flow. |
| Tracker / Kanban Update | Save a job to tracker and move it between stages | The application appears in tracker, status changes persist, and the board still reflects the updated state after reload. | Saved application appeared in the tracker, moved correctly across Kanban stages, and remained persisted after reload. | Pass | Manual test confirmed tracker persistence and stage updates. |
| Calendar and Todo Persistence | Create a deadline and a todo on `/productivity`, then refresh the page | The created deadline and todo remain visible after reload and continue feeding the productivity and dashboard views. | Created calendar deadline and todo remained visible after refresh, appeared in the productivity flow, and continued to feed the related dashboard/productivity summaries. | Pass | Manual test confirmed the working calendar and todo component requirement. |

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
