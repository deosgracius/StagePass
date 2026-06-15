# StagePass — Event Booking with 3D Seat Selection

## Original Problem Statement
> an event booking webpage that has seat selection, beautiful UI, and UX, and 3D designed

## User Choices
- **Event focus:** Mixed (concerts, theater, sports, comedy)
- **Booking scope:** Full booking with backend persistence
- **Auth:** Simple email/password JWT
- **3D:** Subtle 3D hero + interactive tilted seat map
- **Visual style:** Dark cinematic + luxury + vibrant neon
- **Host system (added):** Hybrid — admin manages all + customers can host their own events with limited authority until they buy plans

## Personas
- **Customer** (browse + book) — default `role: customer`, `plan: starter`
- **Organizer** (auto-promoted after first event creation)
- **Admin** — manages everything via `/admin`

## Plans (mock upgrade — no real payment yet)
| Plan | Price | Events | Edit/Cancel | Max Venue | Analytics | Featured |
|------|-------|--------|-------------|-----------|-----------|----------|
| Starter | $0 | 1 | ❌ | 10×14 | ❌ | ❌ |
| Pro | $29/mo | 5 | ✅ | 15×20 | Basic | ❌ |
| Platinum | $99/mo | ∞ | ✅ | 25×30 | Full + CSV | ✅ |

## Architecture
- **Backend:** FastAPI + Motor (async MongoDB), JWT (bcrypt) Bearer auth, CORS, prefix `/api`
- **Frontend:** React 19 + React Router 7 + Tailwind + Framer Motion + Lucide + Sonner
- **3D approach:** CSS-only 3D transforms (R3F removed due to visual-edits incompatibility)

## Implemented (2026-02)
### v1
- Auth: register, login, /me (JWT Bearer, bcrypt, demo + admin seeded)
- Events: list, filter by category/featured, detail
- Seat availability endpoint, bookings (create + my list, 409 on conflicts)
- Landing, Events list, Event detail, Seat selection (tilted 3D grid), Checkout (perforated ticket), Login, Register, Dashboard
- Glassmorphism + Cabinet Grotesk / Outfit / JetBrains Mono

### v2 — Hybrid host system + real photos
- Roles (customer / organizer / admin) and plans (starter / pro / platinum)
- `/api/plans`, `/api/auth/upgrade`
- Organizer CRUD: `POST /api/organize/events`, `GET /api/organize/events`, `PATCH`, `DELETE`, `GET .../stats`
- Admin: `/api/admin/events`, `/api/admin/users`, feature toggle
- Pages: `/organize` (host dashboard), `/organize/new` (event form), `/organize/upgrade` (3 plans), `/admin` (Events + Users tabs)
- Conditional Navbar links (Host shown when logged in, Admin only for admin role)
- Replaced AI-looking seed images with verified real Unsplash photos
- Auto-role-promotion: customer → organizer on first event creation
- Plan-gated venue sizes, edit/cancel rights, analytics, featured slot

## Backlog / Roadmap
**P0**
- Stripe payment for plan upgrade + ticket purchase
- Atomic seat reservation (Mongo transaction or 2-step lock)

**P1**
- Email confirmation (Resend / SendGrid) + QR ticket PDFs
- Google social login (Emergent-managed)
- File upload for event covers (object storage)
- Edit event form (currently only create + status change via PATCH)

**P2**
- Suggested-seats by budget; group split & shareable links
- Promo codes, affiliate program
- Real R3F venue scene via portals (avoid visual-edits prop injection)
- Organizer payouts dashboard

## Test Credentials
See `/app/memory/test_credentials.md`.
- Admin: `admin@stagepass.app` / `admin1234`
- Demo customer: `demo@stagepass.app` / `demo1234`
