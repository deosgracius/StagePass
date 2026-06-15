# StagePass — Event Booking with 3D Seat Selection

## Original Problem Statement
> an event booking webpage that has seat selection, beautiful UI, and UX, and 3D designed

## User Choices
- **Event focus:** Mixed (concerts, theater, sports, comedy)
- **Booking scope:** Full booking with backend persistence
- **Auth:** Simple email/password JWT
- **3D:** Subtle 3D hero + interactive tilted seat map
- **Visual style:** Dark cinematic + luxury + vibrant neon
- **Host system:** Hybrid (admin manages all + any user can host events; perks unlocked by paid plans)
- **Payments:** Stripe Checkout (test mode)
- **Email:** STUBBED — provider not selected by user. Hooks live in `email_service.py`.

## Personas
- **Customer** (browse + book)
- **Organizer** (auto-promoted after first event)
- **Admin** (`admin@stagepass.app`)

## Plans (Stripe-backed, test mode)
| Plan | Price | Events | Edit/Cancel | Max Venue | Analytics | Featured |
|------|-------|--------|-------------|-----------|-----------|----------|
| Starter | $0 | 1 | ❌ | 10×14 | ❌ | ❌ |
| Pro | $29 | 5 | ✅ | 15×20 | Basic | ❌ |
| Platinum | $99 | ∞ | ✅ | 25×30 | Full + CSV | ✅ |

## Architecture
- **Backend:** FastAPI + Motor, JWT (bcrypt), Stripe via emergentintegrations, CORS, prefix `/api`
- **Frontend:** React 19 + React Router 7 + Tailwind + Framer Motion + Lucide + Sonner
- **3D:** CSS-only 3D transforms (R3F removed due to visual-edits incompatibility)
- **Atomic seat lock:** `seat_holds` collection with unique compound index on (event_id, row, col); 15 min TTL; released on payment cancel/expire and replaced by `bookings` row on payment success.

## Implemented
### v1 — Core
- Auth (register, login, /me with JWT Bearer + bcrypt)
- Events list/detail/seat-availability/category-filter/featured
- Bookings (create + my list + booking detail)
- 7 pages: Landing, Events, EventDetail, SeatSelection, Checkout, Login, Register, Dashboard

### v2 — Hybrid host + plans + real photos
- Roles (customer/organizer/admin) + plans (starter/pro/platinum)
- `/api/plans`, `/api/auth/upgrade`
- Organizer CRUD: POST/GET/PATCH/DELETE `/api/organize/events`, stats endpoint
- Admin endpoints (`/admin/events`, `/admin/users`, feature toggle)
- New pages: Organize, OrganizeNew, OrganizeUpgrade, Admin
- Plan-gated venue sizes, edit/cancel rights, analytics, featured slot
- Replaced AI-looking seed images with verified real Unsplash photos

### v3 — Payments + uploads + edit form + atomic locks
- Stripe Checkout for plan upgrade (`POST /api/payments/checkout/plan`)
- Stripe Checkout for ticket purchase (`POST /api/payments/checkout/booking`)
- Payment status polling (`GET /api/payments/status/{session_id}`) + Stripe webhook (`/api/webhook/stripe`)
- `payment_transactions` collection (idempotent via `processed` flag)
- Atomic seat hold via unique compound index; releases on cancel/expire
- File upload endpoint (`POST /api/uploads/image` accepts PNG/JPG/WEBP up to 5MB) + serve route
- `ImageUploader` component with URL paste + file upload modes
- EventEdit page (PATCH + DELETE for organizers)
- Edit/Pay flow now uses Stripe; previous mock upgrade kept only for free downgrade
- `email_service.py` stub with `send_booking_confirmation` + `send_plan_upgrade_confirmation` (wire your provider here)

## Backlog / Roadmap
**P0**
- Wire real email provider (Resend / agent of choice) into `email_service.py`
- Move file uploads to Emergent object storage when `EMERGENT_LLM_KEY` is available (currently on local disk under `/app/backend/uploads/`)

**P1**
- Replace native datetime input with shadcn calendar
- Split server.py into auth/events/payments/uploads routers (~1000 lines)
- Custom tier add/remove in OrganizeNew (currently 3 fixed tiers with auto row split)
- Refund flow for cancelled events
- Organizer payouts dashboard

**P2**
- Real R3F venue scene via portals
- Suggested-seats by budget; group split & shareable links
- Promo codes, affiliate program

## Test Credentials
See `/app/memory/test_credentials.md`.
- Admin: `admin@stagepass.app` / `admin1234`
- Demo customer: `demo@stagepass.app` / `demo1234`
- Stripe test card: `4242 4242 4242 4242`, any future date, any CVC

## Wiring Email (when ready)
Replace function bodies in `/app/backend/email_service.py`:
```python
def send_booking_confirmation(to_email, user_name, booking):
    # your provider / agent here
    ...
def send_plan_upgrade_confirmation(to_email, user_name, plan_name, price):
    # your provider / agent here
    ...
```
The HTML templates are already built in the file (`_ticket_email_html`, `_plan_email_html`).
