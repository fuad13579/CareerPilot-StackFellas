"""Tests for database persistence features."""
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestHealthEndpoint:
    """Test that the health endpoint still works."""

    def test_health_check_returns_200(self):
        """Test health endpoint returns 200 status."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_contains_success_status(self):
        """Test health response contains success/healthy status."""
        response = client.get("/health")
        data = response.json()
        assert "status" in data
        assert data["status"] == "success"


class TestApplicationTrackerPersistence:
    """Test job application tracker persistence."""

    def test_create_application_returns_200_or_201(self):
        """Test creating an application returns success status."""
        response = client.post(
            "/api/tracker/applications",
            json={
                "job_id": "test-job-001",
                "role": "Backend Developer",
                "company": "Test Company",
                "location": "Remote",
                "status": "Applied",
                "fit_score": 85,
                "job_url": "https://example.com/job",
                "notes": "Testing tracker database persistence",
            },
        )
        assert response.status_code in (200, 201)

    def test_get_applications_returns_200(self):
        """Test getting all applications returns 200 status."""
        response = client.get("/api/tracker/applications")
        assert response.status_code == 200

    def test_created_application_in_response(self):
        """Test created application appears in GET response."""
        create_response = client.post(
            "/api/tracker/applications",
            json={
                "job_id": "test-job-002",
                "role": "Frontend Developer",
                "company": "Frontend Corp",
                "location": "New York",
                "status": "Saved",
                "fit_score": 70,
            },
        )
        assert create_response.status_code in (200, 201)
        created_data = create_response.json()

        get_response = client.get("/api/tracker/applications")
        assert get_response.status_code == 200
        applications = get_response.json()
        assert isinstance(applications, list)
        assert any(app["role"] == "Frontend Developer" for app in applications)
        assert any(app["company"] == "Frontend Corp" for app in applications)

    def test_application_role_and_company_match(self):
        """Test created application has correct role and company."""
        response = client.post(
            "/api/tracker/applications",
            json={
                "job_id": "test-job-003",
                "role": "Full Stack Engineer",
                "company": "Stack Company",
                "status": "Applied",
            },
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["role"] == "Full Stack Engineer"
        assert data["company"] == "Stack Company"

    def test_application_status_match(self):
        """Test created application has correct status."""
        response = client.post(
            "/api/tracker/applications",
            json={
                "job_id": "test-job-004",
                "role": "DevOps Engineer",
                "company": "Cloud Corp",
                "status": "Interviewing",
            },
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["status"] == "Interviewing"


class TestTrackerStatusUpdate:
    """Test application status update."""

    def test_update_status_returns_200(self):
        """Test updating application status returns 200."""
        create_response = client.post(
            "/api/tracker/applications",
            json={
                "job_id": "test-job-005",
                "role": "Data Scientist",
                "company": "Data Inc",
                "status": "Applied",
            },
        )
        assert create_response.status_code in (200, 201)
        created = create_response.json()

        update_response = client.patch(
            f"/api/tracker/applications/{created['id']}/status",
            json={"status": "Interviewing"},
        )
        assert update_response.status_code == 200

    def test_updated_status_is_interviewing(self):
        """Test updated status is the new value."""
        create_response = client.post(
            "/api/tracker/applications",
            json={
                "job_id": "test-job-006",
                "role": "ML Engineer",
                "company": "ML Corp",
                "status": "Applied",
            },
        )
        assert create_response.status_code in (200, 201)
        created = create_response.json()

        update_response = client.patch(
            f"/api/tracker/applications/{created['id']}/status",
            json={"status": "Interviewing"},
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["status"] == "Interviewing"

    def test_get_applications_confirms_updated_status(self):
        """Test GET confirms updated status."""
        create_response = client.post(
            "/api/tracker/applications",
            json={
                "job_id": "test-job-007",
                "role": "Backend Engineer",
                "company": "Backend Inc",
                "status": "Applied",
            },
        )
        assert create_response.status_code in (200, 201)
        created = create_response.json()

        client.patch(
            f"/api/tracker/applications/{created['id']}/status",
            json={"status": "Rejected"},
        )

        get_response = client.get("/api/tracker/applications")
        applications = get_response.json()
        updated_app = next(
            (app for app in applications if app["id"] == created["id"]), None
        )
        assert updated_app is not None
        assert updated_app["status"] == "Rejected"


class TestTodoPersistence:
    """Test todo item persistence."""

    def test_create_todo_returns_200_or_201(self):
        """Test creating a todo returns success status."""
        response = client.post(
            "/api/todos",
            json={
                "title": "Apply to 3 backend jobs",
                "description": "Use CareerPilot job search results",
                "due_date": "2026-06-01",
            },
        )
        assert response.status_code in (200, 201)

    def test_get_todos_returns_200(self):
        """Test getting all todos returns 200 status."""
        response = client.get("/api/todos")
        assert response.status_code == 200

    def test_created_todo_in_response(self):
        """Test created todo appears in GET response."""
        client.post(
            "/api/todos",
            json={
                "title": "Review job application",
                "description": "Follow up on Backend Engineer position",
            },
        )

        response = client.get("/api/todos")
        assert response.status_code == 200
        todos = response.json()
        assert isinstance(todos, list)
        assert any(todo["title"] == "Review job application" for todo in todos)

    def test_todo_title_matches(self):
        """Test created todo has correct title."""
        response = client.post(
            "/api/todos",
            json={
                "title": "Prepare for interview",
                "description": "Review algorithms and system design",
            },
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["title"] == "Prepare for interview"

    def test_todo_description_matches(self):
        """Test created todo has correct description."""
        response = client.post(
            "/api/todos",
            json={
                "title": "Update CV",
                "description": "Add recent project experience",
            },
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["description"] == "Add recent project experience"


class TestCalendarEventPersistence:
    """Test calendar event persistence."""

    def test_create_event_returns_200_or_201(self):
        """Test creating a calendar event returns success status."""
        response = client.post(
            "/api/calendar/events",
            json={
                "title": "Backend Developer application deadline",
                "description": "Submit application before deadline",
                "event_date": "2026-06-01",
                "related_application_id": None,
            },
        )
        assert response.status_code in (200, 201)

    def test_get_events_returns_200(self):
        """Test getting all calendar events returns 200 status."""
        response = client.get("/api/calendar/events")
        assert response.status_code == 200

    def test_created_event_in_response(self):
        """Test created event appears in GET response."""
        client.post(
            "/api/calendar/events",
            json={
                "title": "Technical interview",
                "description": "Coding assessment",
                "event_date": "2026-06-15",
            },
        )

        response = client.get("/api/calendar/events")
        assert response.status_code == 200
        events = response.json()
        assert isinstance(events, list)
        assert any(event["title"] == "Technical interview" for event in events)

    def test_event_title_matches(self):
        """Test created calendar event has correct title."""
        response = client.post(
            "/api/calendar/events",
            json={
                "title": "HR screening call",
                "description": "Phone interview with recruiter",
                "event_date": "2026-06-20",
            },
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["title"] == "HR screening call"

    def test_event_date_matches(self):
        """Test created calendar event has correct date."""
        response = client.post(
            "/api/calendar/events",
            json={
                "title": "Onsite interview",
                "event_date": "2026-07-01",
            },
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["event_date"] == "2026-07-01"


class TestDatabaseFileExists:
    """Test that the database file is created."""

    def test_database_file_exists(self):
        """Test the SQLite database file exists after backend startup."""
        db_path = Path("app/storage/careerpilot.db")
        assert db_path.exists()


class TestAssistantSessionPersistence:
    """Test assistant session persistence if endpoint works with test data."""

    def test_assistant_query_with_test_data(self):
        """Test assistant endpoint can be called with test CV ID and session."""
        response = client.post(
            "/api/assistant/query",
            json={
                "cv_id": "test-cv-id",
                "session_id": "test-session-db",
                "question": "What are my strongest skills?",
            },
        )
        # A 200 response means the endpoint accepts the request
        # The response might be a "no CV found" type message but that's OK
        assert response.status_code == 200

    def test_assistant_response_contains_answer(self):
        """Test assistant response contains an answer field."""
        response = client.post(
            "/api/assistant/query",
            json={
                "cv_id": "test-cv-id",
                "session_id": "test-session-db-2",
                "question": "Tell me about my experience",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
