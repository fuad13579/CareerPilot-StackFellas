"""Automated tests for the job search endpoint."""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    """Provide a TestClient for the FastAPI app."""
    return TestClient(app)


class TestJobSearchEndpoint:
    """Tests for POST /api/jobs/search."""

    def test_search_returns_200(self, client: TestClient) -> None:
        """Smoke test: endpoint responds with 200 OK."""
        response = client.post(
            "/api/jobs/search",
            json={"query": "Find remote Python backend jobs"},
        )
        assert response.status_code == 200

    def test_response_has_expected_fields(self, client: TestClient) -> None:
        """Response body contains query, source, total_results, and jobs."""
        response = client.post(
            "/api/jobs/search",
            json={"query": "Find remote Python backend jobs"},
        )
        data = response.json()
        assert "query" in data
        assert "source" in data
        assert "total_results" in data
        assert "jobs" in data

    def test_jobs_is_a_list(self, client: TestClient) -> None:
        """The jobs field is a list."""
        response = client.post(
            "/api/jobs/search",
            json={"query": "Find remote Python backend jobs"},
        )
        data = response.json()
        assert isinstance(data["jobs"], list)

    def test_jobs_have_required_fields(self, client: TestClient) -> None:
        """Each job card has role, company, and source."""
        response = client.post(
            "/api/jobs/search",
            json={"query": "Find remote Python backend jobs"},
        )
        data = response.json()
        for job in data["jobs"]:
            assert "role" in job
            assert "company" in job
            assert "source" in job

    def test_empty_query_returns_422(self, client: TestClient) -> None:
        """An empty string query is rejected with 422."""
        response = client.post(
            "/api/jobs/search",
            json={"query": ""},
        )
        assert response.status_code == 422

    def test_missing_query_returns_422(self, client: TestClient) -> None:
        """A request without a query body returns 422."""
        response = client.post(
            "/api/jobs/search",
            json={},
        )
        assert response.status_code == 422

    def test_query_field_is_required(self, client: TestClient) -> None:
        """The query field is required."""
        response = client.post(
            "/api/jobs/search",
            json={"not_query": "some jobs"},
        )
        assert response.status_code == 422

    def test_source_is_remotive_or_fallback(self, client: TestClient) -> None:
        """Source is either 'Remotive' or 'Demo Fallback'."""
        response = client.post(
            "/api/jobs/search",
            json={"query": "Find remote Python backend jobs"},
        )
        data = response.json()
        assert data["source"] in ("Remotive", "Demo Fallback")

    def test_returned_job_count_matches_total_results(
        self, client: TestClient
    ) -> None:
        """total_results equals the length of the jobs list."""
        response = client.post(
            "/api/jobs/search",
            json={"query": "Find remote Python backend jobs"},
        )
        data = response.json()
        assert data["total_results"] == len(data["jobs"])

    def test_query_is_echoed_in_response(self, client: TestClient) -> None:
        """The original query string is echoed back in the response."""
        query = "Find remote Python backend jobs"
        response = client.post(
            "/api/jobs/search",
            json={"query": query},
        )
        data = response.json()
        assert data["query"] == query

    def test_remote_jobs_query_returns_results(self, client: TestClient) -> None:
        """A query for remote jobs actually returns job listings."""
        response = client.post(
            "/api/jobs/search",
            json={"query": "remote Python backend jobs"},
        )
        data = response.json()
        assert data["total_results"] > 0
        assert len(data["jobs"]) > 0