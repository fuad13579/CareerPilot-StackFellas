from datetime import datetime

from app.models.job_models import JobCard
from app.services import assistant_service
from app.utils.job_search_filters import build_job_search_filters, estimate_salary_floor


def _build_job(job_id: str, role: str, company: str) -> JobCard:
    return JobCard(
        job_id=job_id,
        role=role,
        company=company,
        location="Remote",
        deadline=None,
        salary="$100k",
        required_skills=["Python", "FastAPI"],
        description="Python and FastAPI required",
        job_url=f"https://example.com/{job_id}",
        source="Remotive",
        is_live=True,
        fetched_at=datetime.utcnow(),
    )


def _build_salary_job(job_id: str, salary: str | None) -> JobCard:
    return JobCard(
        job_id=job_id,
        role="Data Engineer",
        company="Salary Corp",
        location="New York, NY",
        deadline=None,
        salary=salary,
        required_skills=["Python"],
        description="Python required",
        job_url=f"https://example.com/{job_id}",
        source="Adzuna",
        is_live=True,
        fetched_at=datetime.utcnow(),
    )


def test_process_assistant_query_returns_job_results_for_natural_language_search(monkeypatch):
    monkeypatch.setattr(assistant_service, "add_to_conversation", lambda *args, **kwargs: None)
    monkeypatch.setattr(assistant_service, "get_conversation_history", lambda *args, **kwargs: [])
    monkeypatch.setattr(
        assistant_service,
        "get_cv_context",
        lambda cv_id, question: ([], "Python FastAPI React SQL"),
    )

    async def fake_fetch_live_jobs(query: str, location: str, limit: int):
        assert query == "python backend internships"
        assert location == "remote"
        assert limit == 5
        return "Remotive", [_build_job("job-1", "Backend Intern", "StackFellas")], None

    monkeypatch.setattr(assistant_service, "fetch_live_jobs", fake_fetch_live_jobs)

    response = assistant_service.process_assistant_query(
        cv_id="cv-1",
        session_id="session-1",
        question="Find me remote Python backend internships",
        anonymous_user_id="user-1",
    )

    assert response.intent == "job_search"
    assert response.job_search_query == "python backend internships"
    assert response.job_search_location == "remote"
    assert response.job_search_source == "Remotive"
    assert len(response.job_results) == 1
    assert response.job_results[0].role == "Backend Intern"
    assert response.job_results[0].fit_score is not None
    assert "I searched live jobs" in response.answer


def test_process_assistant_query_filters_jobs_below_salary_min(monkeypatch):
    monkeypatch.setattr(assistant_service, "add_to_conversation", lambda *args, **kwargs: None)
    monkeypatch.setattr(assistant_service, "get_conversation_history", lambda *args, **kwargs: [])
    monkeypatch.setattr(
        assistant_service,
        "get_cv_context",
        lambda cv_id, question: ([], "Python SQL"),
    )

    async def fake_fetch_live_jobs(query: str, location: str, limit: int):
        return "Adzuna", [
            _build_salary_job("job-low", "90,000 - 110,000"),
            _build_salary_job("job-high", "120,000 - 150,000"),
            _build_salary_job("job-missing", None),
        ], None

    monkeypatch.setattr(assistant_service, "fetch_live_jobs", fake_fetch_live_jobs)

    response = assistant_service.process_assistant_query(
        cv_id="cv-1",
        session_id="session-salary",
        question="Find data engineer jobs in New York with at least 120k salary",
        anonymous_user_id="user-1",
    )

    assert response.intent == "job_search"
    assert [job.job_id for job in response.job_results] == ["job-high"]


def test_process_assistant_query_keeps_standard_mode_for_cv_question(monkeypatch):
    monkeypatch.setattr(assistant_service, "add_to_conversation", lambda *args, **kwargs: None)
    monkeypatch.setattr(assistant_service, "get_conversation_history", lambda *args, **kwargs: [])
    monkeypatch.setattr(
        assistant_service,
        "get_cv_context",
        lambda cv_id, question: ([{"section": "skills", "text": "Python FastAPI", "score": 0.91}], "Python FastAPI"),
    )
    monkeypatch.setattr(
        assistant_service,
        "generate_ai_response",
        lambda **kwargs: ("Your strongest skills are Python and FastAPI.", "rule_based_fallback", True),
    )

    response = assistant_service.process_assistant_query(
        cv_id="cv-1",
        session_id="session-2",
        question="What are my strongest skills?",
        anonymous_user_id="user-1",
    )

    assert response.intent == "assistant"
    assert response.job_results == []
    assert response.sources[0].section == "skills"
    assert response.answer == "Your strongest skills are Python and FastAPI."


def test_build_job_search_filters_keeps_city_when_work_mode_is_hybrid():
    query, location, _ = build_job_search_filters(
        "Show me hybrid data engineer jobs in New York with at least 120k salary and 3 years experience"
    )

    assert location == "hybrid"
    assert "data" in query
    assert "engineer" in query
    assert "new" in query
    assert "york" in query
    assert "3 years experience" in query


def test_estimate_salary_floor_parses_common_ranges():
    assert estimate_salary_floor("120,000 - 150,000") == 120000
    assert estimate_salary_floor("$120k - $140k") == 120000
    assert estimate_salary_floor("Competitive") is None
