"""Tests for tiered host feature: plans, organizer flows, plan limits, admin endpoints."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://seat-select-3d-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _hdr(t):
    return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}


def _event_payload(rows=10, cols=14, title=None):
    return {
        "title": title or f"TEST_{uuid.uuid4().hex[:6]}",
        "tagline": "A test event for plan-limit checks",
        "category": "concert",
        "venue": "Test Hall",
        "city": "Testville",
        "date": "2026-09-01T20:00:00",
        "image_url": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80",
        "description": "Created by automated tests. Safe to remove.",
        "performer": "TEST Performer",
        "duration_min": 90,
        "rows": rows,
        "cols": cols,
        "tiers": [
            {"key": "vip", "label": "VIP", "price": 200, "rows": [0, 1]},
            {"key": "premium", "label": "Premium", "price": 100, "rows": [2, 3]},
            {"key": "standard", "label": "Standard", "price": 50, "rows": list(range(4, rows))},
        ],
    }


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json={"email": "admin@stagepass.app", "password": "admin1234"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture
def fresh_user(s):
    """Register a brand-new starter customer for each test that needs isolation."""
    email = f"test_{uuid.uuid4().hex[:8]}@stagepass.app"
    r = s.post(f"{API}/auth/register",
               json={"email": email, "password": "secret123", "name": "TEST Host"})
    assert r.status_code == 200, r.text
    return {"email": email, "token": r.json()["token"], "id": r.json()["user"]["id"]}


# ---- Plans & roles ----
class TestPlansAndAuth:
    def test_admin_login_role_plan(self, s):
        r = s.post(f"{API}/auth/login", json={"email": "admin@stagepass.app", "password": "admin1234"})
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["role"] == "admin"
        assert u["plan"] == "platinum"

    def test_demo_login_role_plan(self, s):
        r = s.post(f"{API}/auth/login", json={"email": "demo@stagepass.app", "password": "demo1234"})
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["role"] == "customer"
        assert u["plan"] == "starter"

    def test_plans_endpoint(self, s):
        r = s.get(f"{API}/plans")
        assert r.status_code == 200
        plans = r.json()
        keys = {p["key"]: p for p in plans}
        assert {"starter", "pro", "platinum"}.issubset(keys.keys())
        assert keys["starter"]["price"] == 0 and keys["starter"]["max_events"] == 1
        assert keys["pro"]["price"] == 29 and keys["pro"]["max_events"] == 5
        assert keys["platinum"]["price"] == 99
        assert keys["pro"]["can_edit"] is True
        assert keys["starter"]["can_edit"] is False


# ---- Plan limits on organizer flow ----
class TestStarterLimits:
    def test_first_event_promotes_to_organizer(self, s, fresh_user):
        r = s.post(f"{API}/organize/events", headers=_hdr(fresh_user["token"]),
                   json=_event_payload(rows=10, cols=14))
        assert r.status_code == 200, r.text
        # role should be promoted
        me = s.get(f"{API}/auth/me", headers=_hdr(fresh_user["token"]))
        assert me.status_code == 200
        assert me.json()["role"] == "organizer"
        assert me.json()["plan"] == "starter"

    def test_second_event_blocked(self, s, fresh_user):
        ok = s.post(f"{API}/organize/events", headers=_hdr(fresh_user["token"]),
                    json=_event_payload())
        assert ok.status_code == 200
        second = s.post(f"{API}/organize/events", headers=_hdr(fresh_user["token"]),
                        json=_event_payload())
        assert second.status_code == 403
        assert "limit" in second.json()["detail"].lower()

    def test_starter_cannot_edit(self, s, fresh_user):
        ok = s.post(f"{API}/organize/events", headers=_hdr(fresh_user["token"]),
                    json=_event_payload())
        eid = ok.json()["id"]
        r = s.patch(f"{API}/organize/events/{eid}", headers=_hdr(fresh_user["token"]),
                    json={"title": "Updated title"})
        assert r.status_code == 403

    def test_starter_cannot_delete(self, s, fresh_user):
        ok = s.post(f"{API}/organize/events", headers=_hdr(fresh_user["token"]),
                    json=_event_payload())
        eid = ok.json()["id"]
        r = s.delete(f"{API}/organize/events/{eid}", headers=_hdr(fresh_user["token"]))
        assert r.status_code == 403

    def test_starter_too_big_venue_rejected(self, s, fresh_user):
        # starter max_rows 10, max_cols 14 -> try 12,16
        r = s.post(f"{API}/organize/events", headers=_hdr(fresh_user["token"]),
                   json=_event_payload(rows=12, cols=16))
        # Pydantic accepts rows up to 25, so 403 is from plan check
        assert r.status_code == 403


# ---- Upgrade & Pro flow ----
class TestUpgradeAndPro:
    def test_upgrade_to_pro_then_edit(self, s, fresh_user):
        # Create first event (still starter)
        first = s.post(f"{API}/organize/events", headers=_hdr(fresh_user["token"]),
                       json=_event_payload())
        assert first.status_code == 200
        eid = first.json()["id"]

        # Upgrade
        up = s.post(f"{API}/auth/upgrade", headers=_hdr(fresh_user["token"]),
                    json={"plan": "pro"})
        assert up.status_code == 200
        assert up.json()["plan"] == "pro"
        assert up.json()["role"] == "organizer"

        # Now PATCH should succeed
        patched = s.patch(f"{API}/organize/events/{eid}", headers=_hdr(fresh_user["token"]),
                          json={"title": "Updated TEST title"})
        assert patched.status_code == 200, patched.text
        assert patched.json()["title"] == "Updated TEST title"

        # Pro can create up to 5 total -> create 4 more (already have 1)
        for _ in range(4):
            r = s.post(f"{API}/organize/events", headers=_hdr(fresh_user["token"]),
                       json=_event_payload())
            assert r.status_code == 200, r.text
        # 6th should fail
        sixth = s.post(f"{API}/organize/events", headers=_hdr(fresh_user["token"]),
                       json=_event_payload())
        assert sixth.status_code == 403

        # Delete should now work
        d = s.delete(f"{API}/organize/events/{eid}", headers=_hdr(fresh_user["token"]))
        assert d.status_code == 200

    def test_pro_venue_size_limits(self, s, fresh_user):
        s.post(f"{API}/auth/upgrade", headers=_hdr(fresh_user["token"]), json={"plan": "pro"})
        # pro: max_rows 15, max_cols 20 — try 20x25 (exceeds)
        r = s.post(f"{API}/organize/events", headers=_hdr(fresh_user["token"]),
                   json=_event_payload(rows=20, cols=25))
        assert r.status_code == 403

    def test_platinum_can_create_large(self, s, fresh_user):
        s.post(f"{API}/auth/upgrade", headers=_hdr(fresh_user["token"]), json={"plan": "platinum"})
        r = s.post(f"{API}/organize/events", headers=_hdr(fresh_user["token"]),
                   json=_event_payload(rows=20, cols=25))
        assert r.status_code == 200, r.text


# ---- My events isolation & stats ----
class TestOrganizerListingAndStats:
    def test_list_my_events_only(self, s, fresh_user):
        before = s.get(f"{API}/organize/events", headers=_hdr(fresh_user["token"]))
        assert before.status_code == 200 and before.json() == []
        s.post(f"{API}/organize/events", headers=_hdr(fresh_user["token"]),
               json=_event_payload(title="TEST_mine"))
        after = s.get(f"{API}/organize/events", headers=_hdr(fresh_user["token"]))
        assert after.status_code == 200
        evs = after.json()
        assert len(evs) == 1
        assert evs[0]["organizer_id"] == fresh_user["id"]

    def test_stats_starter_no_attendees(self, s, fresh_user):
        created = s.post(f"{API}/organize/events", headers=_hdr(fresh_user["token"]),
                         json=_event_payload())
        eid = created.json()["id"]
        r = s.get(f"{API}/organize/events/{eid}/stats", headers=_hdr(fresh_user["token"]))
        assert r.status_code == 200
        body = r.json()
        assert "occupancy_pct" in body and "booking_count" in body and "revenue" in body
        assert "attendees" not in body  # starter -> no analytics

    def test_stats_pro_has_attendees(self, s, fresh_user):
        s.post(f"{API}/auth/upgrade", headers=_hdr(fresh_user["token"]), json={"plan": "pro"})
        created = s.post(f"{API}/organize/events", headers=_hdr(fresh_user["token"]),
                        json=_event_payload())
        eid = created.json()["id"]
        r = s.get(f"{API}/organize/events/{eid}/stats", headers=_hdr(fresh_user["token"]))
        assert r.status_code == 200
        assert "attendees" in r.json()


# ---- Admin endpoints ----
class TestAdmin:
    def test_admin_users(self, s, admin_token):
        r = s.get(f"{API}/admin/users", headers=_hdr(admin_token))
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list) and len(users) >= 2
        for u in users:
            assert "event_count" in u
            assert "password_hash" not in u

    def test_admin_events_lists_all(self, s, admin_token):
        r = s.get(f"{API}/admin/events", headers=_hdr(admin_token))
        assert r.status_code == 200
        assert len(r.json()) >= 4  # seeded

    def test_admin_endpoints_forbidden_for_non_admin(self, s, fresh_user):
        r = s.get(f"{API}/admin/events", headers=_hdr(fresh_user["token"]))
        assert r.status_code == 403
        r2 = s.get(f"{API}/admin/users", headers=_hdr(fresh_user["token"]))
        assert r2.status_code == 403

    def test_admin_toggle_feature(self, s, admin_token):
        # Use a seeded event
        eid = "evt-midnight-laughs"
        r = s.patch(f"{API}/admin/events/{eid}/feature", headers=_hdr(admin_token),
                    params={"featured": "false"})
        assert r.status_code == 200 and r.json()["featured"] is False
        r2 = s.patch(f"{API}/admin/events/{eid}/feature", headers=_hdr(admin_token),
                     params={"featured": "true"})
        assert r2.status_code == 200 and r2.json()["featured"] is True

    def test_cancelled_event_filtered_and_booking_blocked(self, s, admin_token):
        # admin creates then cancels event, then verify it's filtered + booking blocked
        created = s.post(f"{API}/organize/events", headers=_hdr(admin_token),
                         json=_event_payload(title="TEST_cancel_me"))
        assert created.status_code == 200
        eid = created.json()["id"]
        d = s.delete(f"{API}/organize/events/{eid}", headers=_hdr(admin_token))
        assert d.status_code == 200
        # public listing should not include it
        pub = s.get(f"{API}/events").json()
        assert all(e["id"] != eid for e in pub)
        # booking on cancelled event -> 400
        login = s.post(f"{API}/auth/login",
                       json={"email": "demo@stagepass.app", "password": "demo1234"}).json()
        b = s.post(f"{API}/bookings", headers=_hdr(login["token"]),
                   json={"event_id": eid, "seats": [{"row": 0, "col": 0, "tier": "vip", "price": 100}]})
        assert b.status_code == 400
