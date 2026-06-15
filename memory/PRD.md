# StagePass — Event Booking with 3D Seat Selection

## Original Problem Statement
> an event booking webpage that has seat selection, beautiful UI, and UX, and 3D designed

## User Choices
- **Event focus:** Mixed (concerts, theater, sports, comedy)
- **Booking scope:** Full booking with backend persistence
- **Auth:** Simple email/password JWT
- **3D:** Subtle 3D hero + interactive tilted seat map
- **Visual style:** Dark cinematic + luxury + vibrant neon

## Architecture
- **Backend:** FastAPI + Motor (async MongoDB), JWT (bcrypt), CORS, prefix `/api`
- **Frontend:** React 19 + React Router 7 + TailwindCSS + Framer Motion + Lucide + Sonner toasts
- **3D approach:** CSS-only 3D transforms (R3F removed due to incompatibility with Emergent visual-edits attribute injection)

## Personas
- Concert / theater / sports / comedy goers who want a beautiful, fast booking experience with clear seat-by-seat selection.

## Core Requirements (static)
1. Browse events by category
2. View detailed event info, tiers, pricing
3. Pick seats with visual map (3 tiers, taken/available/selected states)
4. Authenticate (register/login) to confirm a booking
5. View past bookings ("My Tickets")
6. Distinctive cinematic neon aesthetic

## Implemented (2026-02)
- ✅ Auth: register, login, /me (JWT Bearer, bcrypt, demo user seeded)
- ✅ Events CRUD-read: list, filter by category, detail (4 events seeded)
- ✅ Seat availability endpoint
- ✅ Bookings: create (with seat-conflict check), list mine
- ✅ Landing page (cinematic hero + floating neon tickets + orbital rings + marquee + featured events + value props + closing CTA)
- ✅ Events listing with category filters
- ✅ Event detail (split layout, info blocks, tier cards, sticky CTA)
- ✅ Seat selection (tilted 3D grid, neon tiers, side summary, instant total)
- ✅ Checkout confirmation page with perforated ticket card
- ✅ Login / Register pages
- ✅ Dashboard with booking history
- ✅ Glassmorphism + grain + custom scrollbar + Cabinet Grotesk / Outfit / JetBrains Mono

## Backlog / Roadmap
**P0**
- Stripe payment integration (real checkout)
- Atomic seat reservation (transaction-based lock to remove race condition)

**P1**
- Admin panel for venue/event CRUD
- Email confirmation (Resend / SendGrid) + QR-code ticket PDFs
- Google social login (Emergent-managed)
- Search bar + sorting + city filter

**P2**
- Seat heat-map / suggested seats by budget
- Group-buy splitting & shareable links
- Affiliate / promo codes
- Real R3F venue scene (resolved against the visual-edits injector via portals)

## Auth / Test Credentials
See `/app/memory/test_credentials.md`. Demo: `demo@stagepass.app / demo1234`.
