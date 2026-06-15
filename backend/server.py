from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# ---- DB ----
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24 * 7  # 7 days for convenience

app = FastAPI()
api_router = APIRouter(prefix="/api")
bearer_scheme = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


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
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


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


class AuthResponse(BaseModel):
    token: str
    user: UserOut


class SeatTier(BaseModel):
    key: str  # "vip" | "premium" | "standard"
    label: str
    price: float
    rows: List[int]  # row indexes that belong to this tier


class EventOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    tagline: str
    category: str
    venue: str
    city: str
    date: str  # ISO
    image_url: str
    description: str
    performer: str
    duration_min: int
    rows: int
    cols: int
    tiers: List[SeatTier]


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
        "image_url": "https://images.pexels.com/photos/26447525/pexels-photo-26447525.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "description": "Witness the convergence of classical mastery and electronic pulse. A 70-piece orchestra performs alongside cutting-edge visual mapping in a one-night-only spectacle.",
        "performer": "The Aurora Collective",
        "duration_min": 150,
        "rows": 10,
        "cols": 14,
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
        "image_url": "https://images.unsplash.com/photo-1562329265-95a6d7a83440?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNzl8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjB0aGVhdGVyJTIwc3RhZ2V8ZW58MHx8fHwxNzgxNTI3Njk5fDA&ixlib=rb-4.1.0&q=85",
        "description": "Director Mira Solano transforms Hamlet into a fever dream of light and shadow. Limited 12-night run.",
        "performer": "Solano Theatre Company",
        "duration_min": 180,
        "rows": 10,
        "cols": 14,
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
        "image_url": "https://images.pexels.com/photos/32471032/pexels-photo-32471032.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "description": "The undefeated Storm meet the unrelenting Vipers in a championship clash a decade in the making.",
        "performer": "Storm vs Vipers",
        "duration_min": 210,
        "rows": 10,
        "cols": 14,
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
        "image_url": "https://images.pexels.com/photos/3696396/pexels-photo-3696396.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "description": "Four headliners. One stage. A late-night hour of fearless comedy in an intimate underground room.",
        "performer": "Reggie Park & Friends",
        "duration_min": 90,
        "rows": 10,
        "cols": 14,
        "tiers": [
            {"key": "vip", "label": "Front Row", "price": 140, "rows": [0, 1]},
            {"key": "premium", "label": "Reserved", "price": 80, "rows": [2, 3, 4]},
            {"key": "standard", "label": "General", "price": 45, "rows": [5, 6, 7, 8, 9]},
        ],
    },
]


async def seed_events():
    for ev in SEED_EVENTS:
        await db.events.update_one({"id": ev["id"]}, {"$setOnInsert": ev}, upsert=True)


async def seed_admin():
    admin_email = "demo@stagepass.app"
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password("demo1234"),
            "name": "Demo User",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })


# ---- Routes: auth ----
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(body: RegisterIn):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    return {"token": token, "user": {"id": user_id, "email": email, "name": doc["name"]}}


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginIn):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["id"], email)
    return {"token": token, "user": {"id": user["id"], "email": email, "name": user["name"]}}


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user["name"]}


# ---- Routes: events ----
@api_router.get("/events", response_model=List[EventOut])
async def list_events(category: Optional[str] = None):
    q = {}
    if category and category != "all":
        q["category"] = category
    events = await db.events.find(q, {"_id": 0}).to_list(100)
    return events


@api_router.get("/events/{event_id}", response_model=EventOut)
async def get_event(event_id: str):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@api_router.get("/events/{event_id}/seats")
async def get_seats(event_id: str):
    """Returns taken seats for an event as list of {row, col}."""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    bookings = await db.bookings.find(
        {"event_id": event_id, "status": {"$ne": "cancelled"}},
        {"_id": 0, "seats": 1},
    ).to_list(10000)
    taken = []
    for b in bookings:
        for s in b.get("seats", []):
            taken.append({"row": s["row"], "col": s["col"]})
    return {"event_id": event_id, "taken": taken}


# ---- Routes: bookings ----
@api_router.post("/bookings", response_model=BookingOut)
async def create_booking(body: BookingIn, user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": body.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if not body.seats:
        raise HTTPException(status_code=400, detail="No seats selected")

    # Validate seat availability
    existing = await db.bookings.find(
        {"event_id": body.event_id, "status": {"$ne": "cancelled"}},
        {"_id": 0, "seats": 1},
    ).to_list(10000)
    taken_set = {(s["row"], s["col"]) for b in existing for s in b.get("seats", [])}
    for s in body.seats:
        if (s.row, s.col) in taken_set:
            raise HTTPException(status_code=409, detail=f"Seat R{s.row+1}-C{s.col+1} already taken")

    total = sum(s.price for s in body.seats)
    booking_id = str(uuid.uuid4())
    doc = {
        "id": booking_id,
        "event_id": body.event_id,
        "user_id": user["id"],
        "seats": [s.model_dump() for s in body.seats],
        "total": round(total, 2),
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "event_title": event["title"],
        "event_date": event["date"],
        "event_venue": event["venue"],
    }
    await db.bookings.insert_one(doc)
    return doc


@api_router.get("/bookings/me", response_model=List[BookingOut])
async def my_bookings(user: dict = Depends(get_current_user)):
    bookings = await db.bookings.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return bookings


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
    await db.bookings.create_index("user_id")
    await db.bookings.create_index("event_id")
    await seed_events()
    await seed_admin()
    logger.info("StagePass API started: seeded events & demo user.")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
