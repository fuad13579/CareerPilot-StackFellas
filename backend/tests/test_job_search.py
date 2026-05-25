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
        """Source is either 'Remotive' or 'Fallback Demo Data'."""
        response = client.post(
            "/api/jobs/search",
            json={"query": "Find remote Python backend jobs"},
        )
        data = response.json()
        assert data["source"] in ("Remotive", "Fallback Demo Data")

    def test_is_fallback_field_present(self, client: TestClient) -> None:
        """Response includes is_fallback boolean field."""
        response = client.post(
            "/api/jobs/search",
            json={"query": "Find remote Python backend jobs"},
        )
        data = response.json()
        assert "is_fallback" in data
        assert isinstance(data["is_fallback"], bool)

    def test_message_field_present(self, client: TestClient) -> None:
        """Response includes message field (status string)."""
        response = client.post(
            "/api/jobs/search",
            json={"query": "Find remote Python backend jobs"},
        )
        data = response.json()
        assert "message" in data
        assert isinstance(data["message"], (str, type(None)))

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

    def test_multiple_natural_language_queries(self, client: TestClient) -> None:
        """Test multiple natural language queries."""
        queries = [
            "Find remote Python backend jobs",
            "Find React frontend internships",
            "Find data analyst jobs",
            "Find machine learning internships",
        ]

        for query in queries:
            response = client.post(
                "/api/jobs/search",
                json={"query": query},
            )
            assert response.status_code == 200

            data = response.json()

            assert "jobs" in data
            assert "total_results" in data
            assert isinstance(data["jobs"], list)
            assert isinstance(data["total_results"], int)

    def test_total_results_is_integer(self, client: TestClient) -> None:
        """total_results is verified as an integer."""
        response = client.post(
            "/api/jobs/search",
            json={"query": "Find remote Python backend jobs"},
        )
        data = response.json()
        assert isinstance(data["total_results"], int)

    def test_job_card_has_all_required_fields(self, client: TestClient) -> None:
        """Each job card has all 10 required fields."""
        response = client.post(
            "/api/jobs/search",
            json={"query": "Find remote Python backend jobs"},
        )
        data = response.json()
        assert isinstance(data["jobs"], list)

        if data["jobs"]:
            job = data["jobs"][0]

            required_fields = [
                "job_id",
                "role",
                "company",
                "location",
                "deadline",
                "salary",
                "required_skills",
                "description",
                "job_url",
                "source",
            ]

            for field in required_fields:
                assert field in job

            assert isinstance(job["required_skills"], list)