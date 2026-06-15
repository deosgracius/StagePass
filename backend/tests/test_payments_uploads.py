"""Backend tests for StagePass payments, uploads, edit-event, atomic holds."""
import os
import io
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None
if not BASE_URL:
    # fall back to frontend/.env
    from pathlib import Path
    for line in Path('/app/frontend/.env').read_text().splitlines():
        if line.startswith('REACT_APP_BACKEND_URL='):
            BASE_URL = line.split('=', 1)[1].strip().rstrip('/')

API = f"{BASE_URL}/api"
ORIGIN = BASE_URL


@pytest.fixture(scope="module")
def demo_token():
    r = requests.post(f"{API}/auth/login", json={"email": "demo@stagepass.app", "password": "demo1234"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@stagepass.app", "password": "admin1234"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---- payments: plan ----
class TestCheckoutPlan:
    def test_starter_rejected(self, demo_token):
        r = requests.post(f"{API}/payments/checkout/plan", json={"plan": "starter", "origin_url": ORIGIN}, headers=auth(demo_token))
        assert r.status_code == 400

    def test_unknown_plan(self, demo_token):
        r = requests.post(f"{API}/payments/checkout/plan", json={"plan": "garbage", "origin_url": ORIGIN}, headers=auth(demo_token))
        assert r.status_code == 400

    def test_already_on_plan(self, admin_token):
        r = requests.post(f"{API}/payments/checkout/plan", json={"plan": "platinum", "origin_url": ORIGIN}, headers=auth(admin_token))
        assert r.status_code == 400

    def test_pro_checkout_session(self, demo_token):
        r = requests.post(f"{API}/payments/checkout/plan", json={"plan": "pro", "origin_url": ORIGIN}, headers=auth(demo_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert "url" in d and "session_id" in d
        assert "stripe.com" in d["url"]
        pytest.plan_session_id = d["session_id"]

    def test_status_owner_ok(self, demo_token):
        sid = getattr(pytest, "plan_session_id", None)
        if not sid:
            pytest.skip("no plan session")
        r = requests.get(f"{API}/payments/status/{sid}", headers=auth(demo_token))
        assert r.status_code == 200
        d = r.json()
        assert d["kind"] == "plan"
        assert "payment_status" in d

    def test_status_non_owner_403(self, admin_token):
        sid = getattr(pytest, "plan_session_id", None)
        if not sid:
            pytest.skip("no plan session")
        r = requests.get(f"{API}/payments/status/{sid}", headers=auth(admin_token))
        assert r.status_code == 403

    def test_status_unknown_404(self, demo_token):
        r = requests.get(f"{API}/payments/status/cs_nope_123", headers=auth(demo_token))
        assert r.status_code == 404


# ---- payments: booking + atomic holds ----
class TestCheckoutBooking:
    SEATS = [{"row": 5, "col": 3, "tier": "standard", "price": 80},
             {"row": 5, "col": 4, "tier": "standard", "price": 80}]

    def test_booking_creates_session_and_holds(self, demo_token):
        r = requests.post(f"{API}/payments/checkout/booking",
                          json={"event_id": "evt-neon-symphony", "seats": self.SEATS, "origin_url": ORIGIN},
                          headers=auth(demo_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert "stripe.com" in d["url"]
        pytest.booking_session_id = d["session_id"]

    def test_seats_now_taken(self):
        r = requests.get(f"{API}/events/evt-neon-symphony/seats")
        assert r.status_code == 200
        taken = {(s["row"], s["col"]) for s in r.json()["taken"]}
        assert (5, 3) in taken and (5, 4) in taken

    def test_duplicate_seat_returns_409(self, demo_token):
        r = requests.post(f"{API}/payments/checkout/booking",
                          json={"event_id": "evt-neon-symphony", "seats": self.SEATS, "origin_url": ORIGIN},
                          headers=auth(demo_token))
        assert r.status_code == 409


# ---- uploads ----
PNG_1x1 = bytes.fromhex("89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C6360000000020001E221BC330000000049454E44AE426082")


class TestUploads:
    def test_upload_png_ok(self, demo_token):
        files = {"file": ("t.png", io.BytesIO(PNG_1x1), "image/png")}
        r = requests.post(f"{API}/uploads/image", files=files, headers=auth(demo_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["url"].startswith("/api/uploads/")
        pytest.upload_url = d["url"]

    def test_upload_serves_no_auth(self):
        u = getattr(pytest, "upload_url", None)
        if not u:
            pytest.skip()
        r = requests.get(f"{BASE_URL}{u}")
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("image/")

    def test_reject_non_image(self, demo_token):
        files = {"file": ("x.txt", io.BytesIO(b"hi"), "text/plain")}
        r = requests.post(f"{API}/uploads/image", files=files, headers=auth(demo_token))
        assert r.status_code == 400

    def test_reject_too_large(self, demo_token):
        big = b"\x89PNG" + b"\x00" * (6 * 1024 * 1024)
        files = {"file": ("big.png", io.BytesIO(big), "image/png")}
        r = requests.post(f"{API}/uploads/image", files=files, headers=auth(demo_token))
        assert r.status_code == 413

    def test_path_traversal_404(self):
        r = requests.get(f"{BASE_URL}/api/uploads/..%2Fetc%2Fpasswd")
        assert r.status_code == 404
        r2 = requests.get(f"{BASE_URL}/api/uploads/missing.png")
        assert r2.status_code == 404


# ---- edit event ----
class TestEditEvent:
    def test_admin_edits_seed_event(self, admin_token):
        r = requests.patch(f"{API}/organize/events/evt-midnight-laughs",
                           json={"tagline": "TEST_edited tagline"}, headers=auth(admin_token))
        assert r.status_code == 200, r.text
        assert r.json()["tagline"] == "TEST_edited tagline"

    def test_starter_cannot_edit(self, demo_token):
        # demo is starter; even if not owner, expect 403
        r = requests.patch(f"{API}/organize/events/evt-midnight-laughs",
                           json={"tagline": "nope"}, headers=auth(demo_token))
        assert r.status_code == 403

    def test_unauth(self):
        r = requests.patch(f"{API}/organize/events/evt-midnight-laughs", json={"tagline": "x"})
        assert r.status_code == 401
