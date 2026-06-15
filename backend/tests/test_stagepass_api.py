"""StagePass backend API tests covering events, auth, and bookings flows."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://seat-select-3d-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

SEED_EVENT_IDS = {"evt-neon-symphony", "evt-velvet-curtain", "evt-titans-final", "evt-midnight-laughs"}


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def demo_token(session):
    r = session.post(f"{API}/auth/login", json={"email": "demo@stagepass.app", "password": "demo1234"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}


# ---- Events ----
class TestEvents:
    def test_list_events_returns_seeded(self, session):
        r = session.get(f"{API}/events")
        assert r.status_code == 200
        data = r.json()
        ids = {e["id"] for e in data}
        assert SEED_EVENT_IDS.issubset(ids), f"Missing seeded events: {SEED_EVENT_IDS - ids}"
        for e in data:
            assert e["rows"] == 10 and e["cols"] == 14
            assert len(e["tiers"]) == 3

    def test_event_detail(self, session):
        r = session.get(f"{API}/events/evt-neon-symphony")
        assert r.status_code == 200
        e = r.json()
        assert e["title"] == "Neon Symphony"
        assert e["category"] == "concert"

    def test_event_detail_not_found(self, session):
        r = session.get(f"{API}/events/does-not-exist")
        assert r.status_code == 404

    def test_event_seats_structure(self, session):
        r = session.get(f"{API}/events/evt-neon-symphony/seats")
        assert r.status_code == 200
        data = r.json()
        assert data["event_id"] == "evt-neon-symphony"
        assert "taken" in data and isinstance(data["taken"], list)

    def test_category_filter(self, session):
        r = session.get(f"{API}/events", params={"category": "comedy"})
        assert r.status_code == 200
        data = r.json()
        assert all(e["category"] == "comedy" for e in data)
        assert any(e["id"] == "evt-midnight-laughs" for e in data)


# ---- Auth ----
class TestAuth:
    def test_login_demo(self, session):
        r = session.post(f"{API}/auth/login", json={"email": "demo@stagepass.app", "password": "demo1234"})
        assert r.status_code == 200
        body = r.json()
        assert "token" in body and isinstance(body["token"], str) and len(body["token"]) > 10
        assert body["user"]["email"] == "demo@stagepass.app"
        assert "id" in body["user"]

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": "demo@stagepass.app", "password": "wrong"})
        assert r.status_code == 401

    def test_register_and_me(self, session):
        unique = f"test_{uuid.uuid4().hex[:8]}@stagepass.app"
        r = session.post(f"{API}/auth/register", json={"email": unique, "password": "secret123", "name": "TEST User"})
        assert r.status_code == 200, r.text
        body = r.json()
        token = body["token"]
        assert body["user"]["email"] == unique

        # /me
        me = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["email"] == unique

        # duplicate
        dup = session.post(f"{API}/auth/register", json={"email": unique, "password": "secret123", "name": "Dup"})
        assert dup.status_code == 400

    def test_me_requires_auth(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---- Bookings ----
class TestBookings:
    def test_create_booking_requires_auth(self, session):
        r = session.post(f"{API}/bookings", json={"event_id": "evt-midnight-laughs", "seats": []})
        assert r.status_code == 401

    def test_create_booking_and_seats_reflect(self, session, auth_headers):
        event_id = "evt-midnight-laughs"

        # Get already-taken seats
        taken_resp = session.get(f"{API}/events/{event_id}/seats")
        taken = {(s["row"], s["col"]) for s in taken_resp.json()["taken"]}

        # Find a free seat
        chosen = None
        for row in range(10):
            for col in range(14):
                if (row, col) not in taken:
                    chosen = (row, col)
                    break
            if chosen:
                break
        assert chosen is not None, "No free seat to test"

        seat = {"row": chosen[0], "col": chosen[1], "tier": "standard", "price": 45}
        r = session.post(f"{API}/bookings", headers=auth_headers, json={"event_id": event_id, "seats": [seat]})
        assert r.status_code == 200, r.text
        booking = r.json()
        assert booking["status"] == "confirmed"
        assert booking["total"] == 45
        assert booking["event_title"] == "Midnight Laughs"
        assert "id" in booking

        # Verify seats endpoint reflects newly taken
        after = session.get(f"{API}/events/{event_id}/seats").json()["taken"]
        assert any(s["row"] == chosen[0] and s["col"] == chosen[1] for s in after)

        # Verify duplicate booking conflict
        dup = session.post(f"{API}/bookings", headers=auth_headers, json={"event_id": event_id, "seats": [seat]})
        assert dup.status_code == 409

    def test_my_bookings(self, session, auth_headers):
        r = session.get(f"{API}/bookings/me", headers=auth_headers)
        assert r.status_code == 200
        bookings = r.json()
        assert isinstance(bookings, list)
        # at least one from previous test
        assert len(bookings) >= 1

    def test_booking_empty_seats(self, session, auth_headers):
        r = session.post(f"{API}/bookings", headers=auth_headers, json={"event_id": "evt-neon-symphony", "seats": []})
        assert r.status_code == 400

    def test_booking_invalid_event(self, session, auth_headers):
        r = session.post(f"{API}/bookings", headers=auth_headers,
                         json={"event_id": "nope", "seats": [{"row": 0, "col": 0, "tier": "vip", "price": 100}]})
        assert r.status_code == 404
