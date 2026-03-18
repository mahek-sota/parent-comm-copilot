"""
Backend API tests.

Uses MockLLMClient injected via FastAPI dependency override so tests
never touch the real Gemini API.
"""
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Make sure the backend package root is on sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app
from routers.generate import get_llm_client
from services.mock_llm_client import MockLLMClient


# ── Dependency override fixture ───────────────────────────────────────────────

@pytest.fixture(autouse=True)
def use_mock_llm():
    """Replace GeminiClient with MockLLMClient for every test."""
    mock = MockLLMClient()
    app.dependency_overrides[get_llm_client] = lambda: mock
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


# ── GET /children ─────────────────────────────────────────────────────────────

def test_get_children_returns_list(client):
    response = client.get("/children")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 10


def test_get_children_have_required_fields(client):
    response = client.get("/children")
    first = response.json()[0]
    assert "child_id" in first
    assert "name" in first
    assert "classroom_id" in first
    assert "parent_email" in first


# ── GET /classrooms ───────────────────────────────────────────────────────────

def test_get_classrooms_returns_list(client):
    response = client.get("/classrooms")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3


def test_get_classrooms_have_required_fields(client):
    response = client.get("/classrooms")
    first = response.json()[0]
    assert "classroom_id" in first
    assert "name" in first
    assert "age_group" in first


# ── GET /events ───────────────────────────────────────────────────────────────

def test_get_events_returns_all_types(client):
    response = client.get("/events")
    assert response.status_code == 200
    data = response.json()
    event_types = {e["event_type"] for e in data}
    assert "incident" in event_types
    assert "daily_update" in event_types
    assert "behavior_note" in event_types
    assert "reminder" in event_types


def test_get_events_incident_has_injury_fields(client):
    response = client.get("/events")
    incident = next(e for e in response.json() if e["event_type"] == "incident")
    assert incident["requires_injury_field"] is True
    assert incident["requires_action_field"] is True


def test_get_events_daily_update_no_injury_fields(client):
    response = client.get("/events")
    update = next(e for e in response.json() if e["event_type"] == "daily_update")
    assert update["requires_injury_field"] is False


# ── POST /generate-message ────────────────────────────────────────────────────

def test_generate_message_happy_path(client):
    payload = {
        "child_id": "1",
        "event_type": "incident",
        "notes": "Minor fall during playtime.",
        "injury_description": "scrape on left knee",
        "action_taken": "cleaned and bandaged",
        "time_of_event": "10:42 AM",
        "tone": "friendly",
    }
    response = client.post("/generate-message", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["child_name"] == "Emma Johnson"
    assert "generated_message" in data
    assert len(data["generated_message"]) > 20
    assert data["tone"] == "friendly"
    assert "parent_email" in data
    assert "classroom" in data


def test_generate_message_daily_update(client):
    payload = {
        "child_id": "3",
        "event_type": "daily_update",
        "notes": "Had a great day, ate well, napped for 90 minutes.",
        "time_of_event": "3:00 PM",
        "tone": "professional",
    }
    response = client.post("/generate-message", json=payload)
    assert response.status_code == 200
    assert response.json()["tone"] == "professional"


def test_generate_message_brief_tone(client):
    payload = {
        "child_id": "2",
        "event_type": "behavior_note",
        "notes": "Showed great sharing behavior at snack time.",
        "time_of_event": "11:15 AM",
        "tone": "brief",
    }
    response = client.post("/generate-message", json=payload)
    assert response.status_code == 200


def test_generate_message_unknown_child_returns_404(client):
    payload = {
        "child_id": "9999",
        "event_type": "incident",
        "notes": "test",
        "time_of_event": "9:00 AM",
        "tone": "friendly",
    }
    response = client.post("/generate-message", json=payload)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_generate_message_invalid_event_type_returns_422(client):
    payload = {
        "child_id": "1",
        "event_type": "not_a_real_event",
        "notes": "test",
        "time_of_event": "9:00 AM",
        "tone": "friendly",
    }
    response = client.post("/generate-message", json=payload)
    assert response.status_code == 422


def test_generate_message_invalid_tone_returns_422(client):
    payload = {
        "child_id": "1",
        "event_type": "incident",
        "notes": "test",
        "time_of_event": "9:00 AM",
        "tone": "sarcastic",
    }
    response = client.post("/generate-message", json=payload)
    assert response.status_code == 422


def test_generate_message_missing_required_fields_returns_422(client):
    # Missing time_of_event
    payload = {
        "child_id": "1",
        "event_type": "incident",
        "notes": "test",
        "tone": "friendly",
    }
    response = client.post("/generate-message", json=payload)
    assert response.status_code == 422


def test_generate_message_llm_failure_returns_fallback(client):
    """When LLM raises, endpoint must return fallback message (not 500)."""

    class BrokenLLMClient:
        def generate_message(self, context: dict) -> str:
            raise ConnectionError("Simulated Gemini timeout")

    app.dependency_overrides[get_llm_client] = lambda: BrokenLLMClient()
    payload = {
        "child_id": "1",
        "event_type": "incident",
        "notes": "test",
        "time_of_event": "10:00 AM",
        "tone": "friendly",
    }
    response = client.post("/generate-message", json=payload)
    app.dependency_overrides[get_llm_client] = lambda: MockLLMClient()

    assert response.status_code == 200
    data = response.json()
    assert "generated_message" in data
    assert len(data["generated_message"]) > 10


# ── Health check ──────────────────────────────────────────────────────────────

def test_health_check(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
