from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import shutil
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import (
    FastAPI,
    APIRouter,
    HTTPException,
    Depends,
    Request,
    UploadFile,
    File,
)
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING
from pymongo.errors import DuplicateKeyError
from pydantic import BaseModel, Field, EmailStr, ConfigDict

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
)

import email_service

# ---- DB ----
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24 * 7

STRIPE_API_KEY = os.environ['STRIPE_API_KEY']
APP_NAME = os.environ.get('APP_NAME', 'stagepass')

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024

HOLD_TTL_MINUTES = 15

app = FastAPI()
api_router = APIRouter(prefix="/api")
bearer_scheme = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---- Plans / Roles ----
PLANS = {
    "starter": {
        "key": "starter", "name": "Starter", "price": 0,
        "max_events": 1, "can_edit": False, "can_cancel": False,
        "max_rows": 10, "max_cols": 14,
        "featured": False, "analytics": False,
        "perks": [
            "Host 1 event",
            "Fixed 10×14 seat map",
            "View booking counts",
            "Community support",
        ],
    },
    "pro": {
        "key": "pro", "name": "Pro", "price": 29,
        "max_events": 5, "can_edit": True, "can_cancel": True,
        "max_rows": 15, "max_cols": 20,
        "featured": False, "analytics": True,
        "perks": [
            "Host up to 5 events",
            "Edit & cancel after publish",
            "Up to 15×20 seat map",
            "Basic analytics & attendee list",
            "Email support",
        ],
    },
    "platinum": {
        "key": "platinum", "name": "Platinum", "price": 99,
        "max_events": 999, "can_edit": True, "can_cancel": True,
        "max_rows": 25, "max_cols": 30,
        "featured": True, "analytics": True,
        "perks": [
            "Unlimited events",
            "Featured on homepage",
            "Up to 25×30 venue",
            "Full analytics + CSV export",
            "Priority support",
        ],
    },
}


def plan_for(user: dict) -> dict:
    return PLANS.get(user.get("plan") or "starter", PLANS["starter"])


# ---- Helpers ----
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> dict:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.setdefault("role", "customer")
        user.setdefault("plan", "starter")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def stripe_client(request: Request) -> StripeCheckout:
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


# ---- Models ----
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str = "customer"
    plan: str = "starter"


class AuthResponse(BaseModel):
    token: str
    user: UserOut


class SeatTier(BaseModel):
    key: str
    label: str
    price: float
    rows: List[int]


class EventBase(BaseModel):
    title: str = Field(min_length=2, max_length=80)
    tagline: str = Field(min_length=2, max_length=140)
    category: str
    venue: str
    city: str
    date: str
    image_url: str
    description: str = Field(min_length=10)
    performer: str
    duration_min: int = Field(ge=30, le=600)
    rows: int = Field(ge=4, le=25, default=10)
    cols: int = Field(ge=4, le=30, default=14)
    tiers: List[SeatTier]


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = None
    tagline: Optional[str] = None
    category: Optional[str] = None
    venue: Optional[str] = None
    city: Optional[str] = None
    date: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    performer: Optional[str] = None
    duration_min: Optional[int] = None
    status: Optional[str] = None


class EventOut(EventBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    organizer_id: Optional[str] = None
    organizer_name: Optional[str] = None
    status: str = "published"
    featured: bool = False
    created_at: Optional[str] = None


class BookingSeat(BaseModel):
    row: int
    col: int
    tier: str
    price: float


class BookingIn(BaseModel):
    event_id: str
    seats: List[BookingSeat]


class BookingOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    event_id: str
    user_id: str
    seats: List[BookingSeat]
    total: float
    status: str
    created_at: str
    event_title: Optional[str] = None
    event_date: Optional[str] = None
    event_venue: Optional[str] = None


class CheckoutBookingIn(BaseModel):
    event_id: str
    seats: List[BookingSeat]
    origin_url: str


class CheckoutPlanIn(BaseModel):
    plan: str
    origin_url: str


class CheckoutOut(BaseModel):
    url: str
    session_id: str


# ---- Seed data ----
SEED_EVENTS = [
    {
        "id": "evt-neon-symphony",
        "title": "Neon Symphony",
        "tagline": "An electric orchestral experience under the stars",
        "category": "concert",
        "venue": "Aurora Arena",
        "city": "Los Angeles",
        "date": "2026-04-18T20:00:00",
        "image_url": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80",
        "description": "Witness the convergence of classical mastery and electronic pulse. A 70-piece orchestra performs alongside cutting-edge visual mapping in a one-night-only spectacle.",
        "performer": "The Aurora Collective",
        "duration_min": 150,
        "rows": 10, "cols": 14, "featured": True,
        "tiers": [
            {"key": "vip", "label": "VIP Front", "price": 280, "rows": [0, 1]},
            {"key": "premium", "label": "Premium", "price": 160, "rows": [2, 3, 4]},
            {"key": "standard", "label": "Standard", "price": 80, "rows": [5, 6, 7, 8, 9]},
        ],
    },
    {
        "id": "evt-velvet-curtain",
        "title": "The Velvet Curtain",
        "tagline": "A reimagined Shakespeare for the modern stage",
        "category": "theater",
        "venue": "Lumen Theatre",
        "city": "New York",
        "date": "2026-05-02T19:30:00",
        "image_url": "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1200&q=80",
        "description": "Director Mira Solano transforms Hamlet into a fever dream of light and shadow. Limited 12-night run.",
        "performer": "Solano Theatre Company",
        "duration_min": 180, "rows": 10, "cols": 14, "featured": True,
        "tiers": [
            {"key": "vip", "label": "Royal Box", "price": 320, "rows": [0, 1]},
            {"key": "premium", "label": "Orchestra", "price": 180, "rows": [2, 3, 4]},
            {"key": "standard", "label": "Mezzanine", "price": 95, "rows": [5, 6, 7, 8, 9]},
        ],
    },
    {
        "id": "evt-titans-final",
        "title": "Titans Championship Finals",
        "tagline": "Two titans. One trophy. Zero mercy.",
        "category": "sports",
        "venue": "Helios Stadium",
        "city": "Chicago",
        "date": "2026-06-14T18:00:00",
        "image_url": "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80",
        "description": "The undefeated Storm meet the unrelenting Vipers in a championship clash a decade in the making.",
        "performer": "Storm vs Vipers",
        "duration_min": 210, "rows": 10, "cols": 14, "featured": True,
        "tiers": [
            {"key": "vip", "label": "Courtside", "price": 450, "rows": [0, 1]},
            {"key": "premium", "label": "Lower Bowl", "price": 210, "rows": [2, 3, 4]},
            {"key": "standard", "label": "Upper Deck", "price": 110, "rows": [5, 6, 7, 8, 9]},
        ],
    },
    {
        "id": "evt-midnight-laughs",
        "title": "Midnight Laughs",
        "tagline": "Stand-up that doesn't sit down",
        "category": "comedy",
        "venue": "The Vault",
        "city": "Austin",
        "date": "2026-03-22T22:00:00",
        "image_url": "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1200&q=80",
        "description": "Four headliners. One stage. A late-night hour of fearless comedy in an intimate underground room.",
        "performer": "Reggie Park & Friends",
        "duration_min": 90, "rows": 10, "cols": 14, "featured": True,
        "tiers": [
            {"key": "vip", "label": "Front Row", "price": 140, "rows": [0, 1]},
            {"key": "premium", "label": "Reserved", "price": 80, "rows": [2, 3, 4]},
            {"key": "standard", "label": "General", "price": 45, "rows": [5, 6, 7, 8, 9]},
        ],
    },
]


async def seed_events():
    admin = await db.users.find_one({"role": "admin"}, {"_id": 0, "id": 1, "name": 1})
    organizer_id = admin["id"] if admin else None
    organizer_name = admin["name"] if admin else "StagePass"
    for ev in SEED_EVENTS:
        on_insert = {"id": ev["id"], "created_at": datetime.now(timezone.utc).isoformat()}
        on_set = {
            **{k: v for k, v in ev.items() if k != "id"},
            "organizer_id": organizer_id,
            "organizer_name": organizer_name,
            "status": "published",
        }
        await db.events.update_one(
            {"id": ev["id"]},
            {"$set": on_set, "$setOnInsert": on_insert},
            upsert=True,
        )


async def seed_users():
    if not await db.users.find_one({"email": "admin@stagepass.app"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": "admin@stagepass.app",
            "password_hash": hash_password("admin1234"),
            "name": "Admin", "role": "admin", "plan": "platinum",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    if not await db.users.find_one({"email": "demo@stagepass.app"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": "demo@stagepass.app",
            "password_hash": hash_password("demo1234"),
            "name": "Demo User", "role": "customer", "plan": "starter",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })


# ---- Auth routes ----
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(body: RegisterIn):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id, "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name.strip(),
        "role": "customer", "plan": "starter",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    return {"token": token, "user": {"id": user_id, "email": email, "name": doc["name"], "role": "customer", "plan": "starter"}}


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginIn):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["id"], email)
    return {"token": token, "user": {
        "id": user["id"], "email": email, "name": user["name"],
        "role": user.get("role", "customer"), "plan": user.get("plan", "starter"),
    }}


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user["name"],
            "role": user.get("role", "customer"), "plan": user.get("plan", "starter")}


@api_router.get("/plans")
async def list_plans():
    return list(PLANS.values())


# ---- Events (public) ----
@api_router.get("/events", response_model=List[EventOut])
async def list_events(category: Optional[str] = None, featured: Optional[bool] = None):
    q = {"status": {"$ne": "cancelled"}}
    if category and category != "all":
        q["category"] = category
    if featured is True:
        q["featured"] = True
    events = await db.events.find(q, {"_id": 0}).to_list(200)
    for e in events:
        e.setdefault("status", "published")
        e.setdefault("featured", False)
    return events


@api_router.get("/events/{event_id}", response_model=EventOut)
async def get_event(event_id: str):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.setdefault("status", "published")
    event.setdefault("featured", False)
    return event


async def _compute_taken(event_id: str) -> List[dict]:
    """Return all seats currently taken: confirmed bookings + active holds."""
    bookings = await db.bookings.find(
        {"event_id": event_id, "status": {"$ne": "cancelled"}},
        {"_id": 0, "seats": 1},
    ).to_list(10000)
    taken = []
    for b in bookings:
        for s in b.get("seats", []):
            taken.append({"row": s["row"], "col": s["col"]})
    # Active holds (not yet expired)
    now_iso = datetime.now(timezone.utc).isoformat()
    holds = await db.seat_holds.find(
        {"event_id": event_id, "expires_at": {"$gt": now_iso}},
        {"_id": 0, "row": 1, "col": 1},
    ).to_list(10000)
    for h in holds:
        taken.append({"row": h["row"], "col": h["col"]})
    return taken


@api_router.get("/events/{event_id}/seats")
async def get_seats(event_id: str):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    taken = await _compute_taken(event_id)
    return {"event_id": event_id, "taken": taken}


# ---- Organizer (event CRUD) ----
def _validate_event_payload(body: EventBase, plan: dict):
    if body.category not in {"concert", "theater", "sports", "comedy"}:
        raise HTTPException(status_code=400, detail="Invalid category")
    if body.rows > plan["max_rows"] or body.cols > plan["max_cols"]:
        raise HTTPException(
            status_code=403,
            detail=f"Plan limit: max venue size is {plan['max_rows']}×{plan['max_cols']}. Upgrade for larger.",
        )
    if not body.tiers:
        raise HTTPException(status_code=400, detail="At least one tier required")
    all_rows = []
    for t in body.tiers:
        if t.price < 0:
            raise HTTPException(status_code=400, detail="Tier price cannot be negative")
        for r in t.rows:
            if r < 0 or r >= body.rows:
                raise HTTPException(status_code=400, detail=f"Tier row {r} outside venue")
            if r in all_rows:
                raise HTTPException(status_code=400, detail=f"Row {r} assigned to multiple tiers")
            all_rows.append(r)


@api_router.post("/organize/events", response_model=EventOut)
async def create_my_event(body: EventCreate, user: dict = Depends(get_current_user)):
    plan = plan_for(user)
    count = await db.events.count_documents({"organizer_id": user["id"], "status": {"$ne": "cancelled"}})
    if count >= plan["max_events"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail=f"Plan limit: {plan['name']} allows {plan['max_events']} active event(s). Upgrade to host more.")
    _validate_event_payload(body, plan if user.get("role") != "admin" else PLANS["platinum"])
    event_id = "evt-" + uuid.uuid4().hex[:10]
    doc = {
        "id": event_id, **body.model_dump(),
        "organizer_id": user["id"], "organizer_name": user["name"],
        "status": "published",
        "featured": plan["featured"] or user.get("role") == "admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.events.insert_one(doc)
    if user.get("role") == "customer":
        await db.users.update_one({"id": user["id"]}, {"$set": {"role": "organizer"}})
    return doc


@api_router.get("/organize/events", response_model=List[EventOut])
async def list_my_events(user: dict = Depends(get_current_user)):
    events = await db.events.find({"organizer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    for e in events:
        e.setdefault("status", "published")
        e.setdefault("featured", False)
    return events


@api_router.get("/organize/events/{event_id}/stats")
async def event_stats(event_id: str, user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.get("organizer_id") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not your event")
    plan = plan_for(user)
    bookings = await db.bookings.find({"event_id": event_id, "status": {"$ne": "cancelled"}}, {"_id": 0}).to_list(10000)
    total_seats = event["rows"] * event["cols"]
    booked = sum(len(b.get("seats", [])) for b in bookings)
    revenue = sum(b.get("total", 0) for b in bookings)
    result = {
        "event_id": event_id, "total_seats": total_seats, "seats_booked": booked,
        "occupancy_pct": round(100 * booked / total_seats, 1) if total_seats else 0,
        "revenue": round(revenue, 2), "booking_count": len(bookings),
    }
    if plan["analytics"] or user.get("role") == "admin":
        attendee_ids = list({b["user_id"] for b in bookings})
        attendees = await db.users.find({"id": {"$in": attendee_ids}}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(1000)
        result["attendees"] = attendees
    return result


@api_router.patch("/organize/events/{event_id}", response_model=EventOut)
async def update_my_event(event_id: str, body: EventUpdate, user: dict = Depends(get_current_user)):
    plan = plan_for(user)
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.get("organizer_id") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not your event")
    if not plan["can_edit"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail=f"Plan limit: {plan['name']} cannot edit events. Upgrade to Pro.")
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if "status" in updates and updates["status"] not in {"published", "cancelled"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    await db.events.update_one({"id": event_id}, {"$set": updates})
    fresh = await db.events.find_one({"id": event_id}, {"_id": 0})
    fresh.setdefault("status", "published")
    fresh.setdefault("featured", False)
    return fresh


@api_router.delete("/organize/events/{event_id}")
async def delete_my_event(event_id: str, user: dict = Depends(get_current_user)):
    plan = plan_for(user)
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.get("organizer_id") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not your event")
    if not plan["can_cancel"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail=f"Plan limit: {plan['name']} cannot cancel events. Upgrade to Pro.")
    await db.events.update_one({"id": event_id}, {"$set": {"status": "cancelled"}})
    return {"ok": True}


# ---- Bookings ----
@api_router.get("/bookings/me", response_model=List[BookingOut])
async def my_bookings(user: dict = Depends(get_current_user)):
    bookings = await db.bookings.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return bookings


@api_router.get("/bookings/{booking_id}", response_model=BookingOut)
async def get_booking(booking_id: str, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return booking


# ---- Atomic seat hold helpers ----
async def _place_holds(event_id: str, seats: List[BookingSeat], user_id: str, session_id: str) -> List[str]:
    """Atomically create holds for each requested seat. Returns list of hold IDs.
    Raises 409 if any seat is already taken/held. Cleans up partial inserts on failure.
    """
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=HOLD_TTL_MINUTES)).isoformat()
    inserted_ids: List[str] = []
    try:
        for s in seats:
            hold_id = str(uuid.uuid4())
            await db.seat_holds.insert_one({
                "id": hold_id, "event_id": event_id,
                "row": s.row, "col": s.col, "tier": s.tier, "price": s.price,
                "user_id": user_id, "session_id": session_id,
                "expires_at": expires_at,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            inserted_ids.append(hold_id)
        # Also check confirmed bookings (holds index doesn't know about them)
        booked = await db.bookings.find(
            {"event_id": event_id, "status": {"$ne": "cancelled"}},
            {"_id": 0, "seats": 1},
        ).to_list(10000)
        booked_set = {(s["row"], s["col"]) for b in booked for s in b.get("seats", [])}
        for s in seats:
            if (s.row, s.col) in booked_set:
                raise DuplicateKeyError("Seat already booked")
    except DuplicateKeyError as e:
        if inserted_ids:
            await db.seat_holds.delete_many({"id": {"$in": inserted_ids}})
        raise HTTPException(status_code=409, detail="One or more seats are no longer available") from e
    return inserted_ids


# ---- Payments: plan upgrade ----
@api_router.post("/payments/checkout/plan", response_model=CheckoutOut)
async def checkout_plan(body: CheckoutPlanIn, request: Request, user: dict = Depends(get_current_user)):
    if body.plan not in PLANS:
        raise HTTPException(status_code=400, detail="Unknown plan")
    if PLANS[body.plan]["price"] == 0:
        raise HTTPException(status_code=400, detail="Free plan does not require payment")
    if user.get("plan") == body.plan:
        raise HTTPException(status_code=400, detail="Already on this plan")

    amount = float(PLANS[body.plan]["price"])
    success_url = f"{body.origin_url}/payment-return?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{body.origin_url}/organize/upgrade"
    metadata = {"kind": "plan", "user_id": user["id"], "plan": body.plan}

    sc = stripe_client(request)
    session = await sc.create_checkout_session(CheckoutSessionRequest(
        amount=amount, currency="usd",
        success_url=success_url, cancel_url=cancel_url,
        metadata=metadata,
    ))

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user["id"], "user_email": user["email"],
        "kind": "plan", "plan": body.plan,
        "amount": amount, "currency": "usd",
        "payment_status": "initiated", "status": "open",
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.session_id}


# ---- Payments: booking (ticket purchase) ----
@api_router.post("/payments/checkout/booking", response_model=CheckoutOut)
async def checkout_booking(body: CheckoutBookingIn, request: Request, user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": body.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Event was cancelled")
    if not body.seats:
        raise HTTPException(status_code=400, detail="No seats selected")

    # Compute amount server-side from tier prices (don't trust frontend)
    tier_prices = {t["key"]: t["price"] for t in event["tiers"]}
    total = 0.0
    server_seats = []
    for s in body.seats:
        price = tier_prices.get(s.tier)
        if price is None:
            raise HTTPException(status_code=400, detail=f"Invalid tier: {s.tier}")
        server_seats.append({"row": s.row, "col": s.col, "tier": s.tier, "price": price})
        total += price
    if total <= 0:
        # Free events — book directly without Stripe
        return await _free_book(event, server_seats, user)

    # Pre-flight session id (use a placeholder; we attach the real one after Stripe create)
    provisional_session = "pending-" + uuid.uuid4().hex
    typed_seats = [BookingSeat(**s) for s in server_seats]
    hold_ids = await _place_holds(body.event_id, typed_seats, user["id"], provisional_session)

    success_url = f"{body.origin_url}/payment-return?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{body.origin_url}/events/{body.event_id}/seats"
    metadata = {
        "kind": "booking",
        "user_id": user["id"], "event_id": body.event_id,
        "hold_ids": ",".join(hold_ids),
    }

    sc = stripe_client(request)
    try:
        session = await sc.create_checkout_session(CheckoutSessionRequest(
            amount=float(total), currency="usd",
            success_url=success_url, cancel_url=cancel_url,
            metadata=metadata,
        ))
    except Exception as e:
        # Stripe failure → release holds
        await db.seat_holds.delete_many({"id": {"$in": hold_ids}})
        raise HTTPException(status_code=500, detail=f"Stripe error: {e}") from e

    await db.seat_holds.update_many(
        {"id": {"$in": hold_ids}},
        {"$set": {"session_id": session.session_id}},
    )

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user["id"], "user_email": user["email"],
        "kind": "booking", "event_id": body.event_id,
        "amount": float(total), "currency": "usd",
        "payment_status": "initiated", "status": "open",
        "metadata": metadata,
        "seats": server_seats,
        "hold_ids": hold_ids,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"url": session.url, "session_id": session.session_id}


async def _free_book(event: dict, seats: List[dict], user: dict) -> CheckoutOut:
    """Bypass Stripe for $0 events — create booking immediately."""
    booking_id = str(uuid.uuid4())
    booking = {
        "id": booking_id, "event_id": event["id"], "user_id": user["id"],
        "seats": seats, "total": 0.0, "status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "event_title": event["title"], "event_date": event["date"], "event_venue": event["venue"],
    }
    await db.bookings.insert_one(booking)
    email_service.send_booking_confirmation(user["email"], user["name"], booking)
    return {"url": f"/checkout/{booking_id}", "session_id": "free-" + booking_id}


# ---- Payments: status polling ----
@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Already processed?
    if tx.get("payment_status") == "paid" and tx.get("processed"):
        return {
            "payment_status": "paid", "status": tx.get("status", "complete"),
            "kind": tx["kind"],
            "booking_id": tx.get("booking_id"),
            "plan": tx.get("plan"),
        }

    sc = stripe_client(request)
    s = await sc.get_checkout_status(session_id)

    update = {"payment_status": s.payment_status, "status": s.status}
    booking_id = None

    if s.payment_status == "paid" and not tx.get("processed"):
        if tx["kind"] == "plan":
            plan_key = tx["plan"]
            new_role = "organizer" if (await db.users.find_one({"id": tx["user_id"]})).get("role") == "customer" else None
            patch = {"plan": plan_key}
            if new_role:
                patch["role"] = new_role
            await db.users.update_one({"id": tx["user_id"]}, {"$set": patch})
            email_service.send_plan_upgrade_confirmation(
                tx["user_email"], user["name"], PLANS[plan_key]["name"], PLANS[plan_key]["price"]
            )
        elif tx["kind"] == "booking":
            booking_id = await _finalize_booking_from_tx(tx)
            update["booking_id"] = booking_id

        update["processed"] = True
        update["processed_at"] = datetime.now(timezone.utc).isoformat()

    elif s.status == "expired" or s.payment_status in {"unpaid", "no_payment_required"}:
        # Release holds if this is a booking
        if tx["kind"] == "booking":
            await db.seat_holds.delete_many({"id": {"$in": tx.get("hold_ids", [])}})

    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})

    return {
        "payment_status": update.get("payment_status"),
        "status": update.get("status"),
        "kind": tx["kind"],
        "booking_id": booking_id or tx.get("booking_id"),
        "plan": tx.get("plan"),
    }


async def _finalize_booking_from_tx(tx: dict) -> str:
    event = await db.events.find_one({"id": tx["event_id"]}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    user = await db.users.find_one({"id": tx["user_id"]}, {"_id": 0})
    booking_id = str(uuid.uuid4())
    booking = {
        "id": booking_id, "event_id": tx["event_id"], "user_id": tx["user_id"],
        "seats": tx["seats"], "total": round(float(tx["amount"]), 2),
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "event_title": event["title"], "event_date": event["date"], "event_venue": event["venue"],
    }
    await db.bookings.insert_one(booking)
    # Release holds (booking now permanent)
    await db.seat_holds.delete_many({"id": {"$in": tx.get("hold_ids", [])}})
    await db.payment_transactions.update_one({"id": tx["id"]}, {"$set": {"booking_id": booking_id}})
    if user:
        email_service.send_booking_confirmation(user["email"], user["name"], booking)
    return booking_id


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature")
    sc = stripe_client(request)
    try:
        evt = await sc.handle_webhook(body, sig)
    except Exception as e:
        logger.warning(f"Webhook verification failed: {e}")
        return {"ok": False}
    if evt.payment_status == "paid":
        tx = await db.payment_transactions.find_one({"session_id": evt.session_id})
        if tx and not tx.get("processed"):
            if tx["kind"] == "plan":
                plan_key = tx["plan"]
                u = await db.users.find_one({"id": tx["user_id"]})
                if u:
                    patch = {"plan": plan_key}
                    if u.get("role") == "customer":
                        patch["role"] = "organizer"
                    await db.users.update_one({"id": tx["user_id"]}, {"$set": patch})
            elif tx["kind"] == "booking":
                await _finalize_booking_from_tx(tx)
            await db.payment_transactions.update_one(
                {"id": tx["id"]},
                {"$set": {"processed": True, "payment_status": "paid", "processed_at": datetime.now(timezone.utc).isoformat()}},
            )
    return {"ok": True}


# ---- File uploads ----
@api_router.post("/uploads/image")
async def upload_image(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported type: {file.content_type}")
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "png"
    if ext not in {"jpg", "jpeg", "png", "webp", "gif"}:
        ext = "png"
    safe_name = f"{uuid.uuid4().hex}.{ext}"
    dest = UPLOAD_DIR / safe_name
    size = 0
    with dest.open("wb") as f:
        while chunk := await file.read(1024 * 64):
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                f.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="File too large (max 5MB)")
            f.write(chunk)
    public_url = f"/api/uploads/{safe_name}"
    await db.uploads.insert_one({
        "id": str(uuid.uuid4()), "filename": safe_name,
        "user_id": user["id"], "size": size,
        "content_type": file.content_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": public_url, "size": size}


@api_router.get("/uploads/{filename}")
async def serve_upload(filename: str):
    safe = filename.replace("..", "").replace("/", "")
    path = UPLOAD_DIR / safe
    if not path.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path)


# ---- Admin ----
@api_router.get("/admin/events", response_model=List[EventOut])
async def admin_list_events(user: dict = Depends(require_admin)):
    events = await db.events.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for e in events:
        e.setdefault("status", "published")
        e.setdefault("featured", False)
    return events


@api_router.get("/admin/users")
async def admin_list_users(user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    counts = {}
    pipeline = [{"$group": {"_id": "$organizer_id", "n": {"$sum": 1}}}]
    async for row in db.events.aggregate(pipeline):
        counts[row["_id"]] = row["n"]
    for u in users:
        u.setdefault("role", "customer")
        u.setdefault("plan", "starter")
        u["event_count"] = counts.get(u["id"], 0)
    return users


@api_router.patch("/admin/events/{event_id}/feature")
async def admin_set_featured(event_id: str, featured: bool, user: dict = Depends(require_admin)):
    res = await db.events.update_one({"id": event_id}, {"$set": {"featured": featured}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"ok": True, "featured": featured}


@api_router.get("/")
async def root():
    return {"message": "StagePass API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.events.create_index("id", unique=True)
    await db.events.create_index("organizer_id")
    await db.bookings.create_index("user_id")
    await db.bookings.create_index("event_id")
    await db.payment_transactions.create_index("session_id", unique=True)
    await db.payment_transactions.create_index("user_id")
    # Atomic seat lock: prevent two active holds at the same seat.
    await db.seat_holds.create_index(
        [("event_id", ASCENDING), ("row", ASCENDING), ("col", ASCENDING)],
        unique=True,
        name="uniq_event_row_col",
    )
    # Auto-expire holds via TTL on expires_at (ISO string -> use background sweep).
    # MongoDB TTL needs a Date type, not ISO string, so we do a quick sweep here:
    await _sweep_expired_holds()
    await seed_users()
    await seed_events()
    logger.info("StagePass API started: indexes + seeds done.")


async def _sweep_expired_holds():
    now_iso = datetime.now(timezone.utc).isoformat()
    res = await db.seat_holds.delete_many({"expires_at": {"$lt": now_iso}})
    if res.deleted_count:
        logger.info(f"Swept {res.deleted_count} expired seat holds")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ---- Serve the built React frontend (production) ----------------------------
# Registered after the /api router so API routes always take precedence; any
# unknown non-/api GET path falls back to index.html for client-side routing.
from starlette.responses import PlainTextResponse as _PlainTextResponse

_FRONTEND_DIR = Path(os.environ.get("FRONTEND_BUILD_DIR", str(Path(__file__).parent / "frontend_build")))
if _FRONTEND_DIR.is_dir():

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        if full_path.startswith("api"):
            return _PlainTextResponse("Not Found", status_code=404)
        candidate = _FRONTEND_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(_FRONTEND_DIR / "index.html"))

    logger.info("Serving frontend build from %s", _FRONTEND_DIR)
