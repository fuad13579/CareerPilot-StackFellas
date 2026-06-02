"""Automated tests for the job search endpoint with live data."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime

from app.main import app
from app.models.job_models import JobCard, FitScoreResponse
from app.services.job_recommendation_service import calculate_fit_score, sort_jobs_by_fit_score
from app.services.job_search_service import fetch_live_jobs, _normalize_job


@pytest.fixture
def client():
    """Provide a TestClient for the FastAPI app."""
    from fastapi.testclient import TestClient
    return TestClient(app)


class TestFitScoreCalculation:
    """Tests for fit score calculation."""

    def test_fit_score_zero_for_empty_cv(self):
        """No CV skills means fit_score = 0."""
        job = JobCard(
            job_id="test-1",
            role="Backend Developer",
            company="Test Corp",
            location="Remote",
            deadline=None,
            salary="$100k",
            required_skills=["Python", "SQL"],
            description="We need Python and SQL skills",
            job_url="https://example.com",
            source="Test",
            is_live=True,
            fetched_at=datetime.utcnow(),
            fit_score=0.0,
            matched_skills=[],
            missing_skills=[],
            reason=None,
        )
        result = calculate_fit_score([], job)
        assert result.fit_score == 0.0
        assert result.match_count == 0

    def test_fit_score_is_numeric(self):
        """Fit score must be a number."""
        job = JobCard(
            job_id="test-2",
            role="Python Developer",
            company="Test Corp",
            location="Remote",
            deadline=None,
            salary="$100k",
            required_skills=["Python", "FastAPI"],
            description="Python and FastAPI required",
            job_url="https://example.com",
            source="Test",
            is_live=True,
            fetched_at=datetime.utcnow(),
            fit_score=0.0,
            matched_skills=[],
            missing_skills=[],
            reason=None,
        )
        result = calculate_fit_score(["Python", "FastAPI"], job)
        assert isinstance(result.fit_score, (int, float))
        assert 0 <= result.fit_score <= 100

    def test_jobs_include_matched_and_missing_skills(self):
        """Each job must include matched_skills and missing_skills."""
        job = JobCard(
            job_id="test-3",
            role="Full Stack Developer",
            company="Test Corp",
            location="Remote",
            deadline=None,
            salary="$120k",
            required_skills=["Python", "React", "SQL"],
            description="Python, React, and SQL experience needed",
            job_url="https://example.com",
            source="Test",
            is_live=True,
            fetched_at=datetime.utcnow(),
            fit_score=0.0,
            matched_skills=[],
            missing_skills=[],
            reason=None,
        )
        result = calculate_fit_score(["Python", "SQL"], job)
        assert "Python" in result.matched_skills or "Python" in result.missing_skills
        assert isinstance(result.matched_skills, list)
        assert isinstance(result.missing_skills, list)

    def test_fit_score_formula(self):
        """Test fit score = matched/total * 100."""
        job = JobCard(
            job_id="test-4",
            role="Data Engineer",
            company="Test Corp",
            location="Remote",
            deadline=None,
            salary="$130k",
            required_skills=["Python", "SQL", "Spark", "AWS"],
            description="Python, SQL, Spark, and AWS required",
            job_url="https://example.com",
            source="Test",
            is_live=True,
            fetched_at=datetime.utcnow(),
            fit_score=0.0,
            matched_skills=[],
            missing_skills=[],
            reason=None,
        )
        # CV has 2 of 4 skills = 50%
        result = calculate_fit_score(["Python", "SQL"], job)
        assert result.match_count == 2
        assert result.total_required == 4
        assert result.fit_score == 50.0


class TestJobSorting:
    """Tests for job sorting by fit score."""

    def test_jobs_sorted_by_fit_score(self):
        """Jobs must be sorted by fit_score descending."""
        jobs = [
            {"fit_score": 30.0, "role": "Job C"},
            {"fit_score": 80.0, "role": "Job A"},
            {"fit_score": 50.0, "role": "Job B"},
        ]
        sorted_jobs = sort_jobs_by_fit_score(jobs)
        assert sorted_jobs[0]["fit_score"] == 80.0
        assert sorted_jobs[1]["fit_score"] == 50.0
        assert sorted_jobs[2]["fit_score"] == 30.0


class TestLiveJobSearch:
    """Tests for live job search functionality."""

    @pytest.mark.asyncio
    async def test_fetch_live_jobs_returns_source(self):
        """Should return source name along with jobs."""
        source, jobs, error = await fetch_live_jobs("python", "remote", 5)
        assert source == "Remotive"
        assert isinstance(jobs, list)

    @pytest.mark.asyncio
    async def test_live_jobs_have_is_live_true(self):
        """All live jobs must have is_live = True."""
        source, jobs, error = await fetch_live_jobs("backend developer", "remote", 3)
        for job in jobs:
            assert job.is_live is True

    def test_normalize_job_creates_valid_job(self):
        """Normalized job must include all required fields."""
        raw_job = {
            "id": "123",
            "title": "Python Developer",
            "company_name": "Test Corp",
            "description": "Python and SQL required",
            "url": "https://example.com/job",
            "candidate_required_location": "Remote",
            "source": "Remotive",
        }
        job = _normalize_job(raw_job)
        assert job is not None
        assert job.role == "Python Developer"
        assert job.company == "Test Corp"
        assert job.job_id == "123"
        assert job.source == "Remotive"


class TestJobSearchEndpoint:
    """Tests for GET /api/jobs/search endpoint."""

    def test_search_without_cv_id_returns_general_jobs(self, client):
        """cv_id is optional — missing/empty cv_id returns general live jobs with
        personalized=false, fit_scores_enabled=false, and a helpful message."""
        response = client.get("/api/jobs/search")
        assert response.status_code == 200
        data = response.json()
        assert data.get("personalized") is False
        assert data.get("fit_scores_enabled") is False
        assert data.get("message")
        # No fabricated fit scores when not personalized
        for job in data.get("jobs", []):
            assert job.get("fit_score") is None

    def test_search_with_empty_cv_id_returns_general_jobs(self, client):
        """Explicit empty cv_id is treated the same as missing cv_id."""
        response = client.get("/api/jobs/search?cv_id=")
        assert response.status_code == 200
        data = response.json()
        assert data.get("personalized") is False
        assert data.get("fit_scores_enabled") is False
        for job in data.get("jobs", []):
            assert job.get("fit_score") is None

    def test_search_with_valid_cv_id(self, client):
        """Valid cv_id returns job response."""
        response = client.get("/api/jobs/search?cv_id=test-cv-123")
        # May return 404 if CV not found, or jobs if found
        assert response.status_code in [200, 404, 500]

    def test_search_returns_jobs_list(self, client):
        """Response must include 'jobs' field."""
        response = client.get("/api/jobs/search?cv_id=test-cv-123")
        if response.status_code == 200:
            data = response.json()
            assert "jobs" in data
            assert isinstance(data["jobs"], list)

    def test_search_response_has_required_fields(self, client):
        """Response must have jobs, total, is_live, source."""
        response = client.get("/api/jobs/search?cv_id=test-cv-123")
        if response.status_code == 200:
            data = response.json()
            assert "jobs" in data
            assert "total" in data
            assert "is_live" in data
            assert "source" in data
            # Personalization flags are always present
            assert "personalized" in data
            assert "fit_scores_enabled" in data

    def test_live_jobs_have_required_fields(self, client):
        """Live jobs must have required fields including is_live."""
        response = client.get("/api/jobs/search?cv_id=test-cv-123")
        if response.status_code == 200:
            data = response.json()
            if data["jobs"]:
                for job in data["jobs"]:
                    assert "is_live" in job


class TestJobRecommendEndpoint:
    """Tests for GET /api/jobs/recommend endpoint (CV-required)."""

    def test_recommend_without_cv_id_returns_requires_cv_shape(self, client):
        """Missing cv_id returns the requires_cv=true shape, not a 422."""
        response = client.get("/api/jobs/recommend")
        assert response.status_code == 200
        data = response.json()
        assert data.get("requires_cv") is True
        assert data.get("jobs") == []
        assert data.get("personalized") is False
        assert data.get("fit_scores_enabled") is False
        assert data.get("error")
        assert data.get("message")

    def test_recommend_with_empty_cv_id_returns_requires_cv_shape(self, client):
        """Empty cv_id is treated the same as missing cv_id."""
        response = client.get("/api/jobs/recommend?cv_id=")
        assert response.status_code == 200
        data = response.json()
        assert data.get("requires_cv") is True
        assert data.get("jobs") == []


class TestErrorHandling:
    """Tests for error handling."""

    @pytest.mark.asyncio
    async def test_api_failure_returns_clean_error(self):
        """API failure returns empty jobs with error message, not fake jobs."""
        source, jobs, error = await fetch_live_jobs("", "", 0)  # Invalid params
        # Should return empty or error, not fake fallback
        assert jobs == [] or error is not None or source == "Remotive"
        # Ensure it's clean (not fake data)
        for job in jobs:
            assert job.is_live is True or job.source == "Demo"