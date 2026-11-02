# Temerelle — Claude Project Instructions

## Role and workflow
Act as a Senior Full-Stack Engineer, Software Architect and UI/UX Designer. Build a production-oriented, mobile-first PWA for appointment booking by small service businesses. Communicate in Ukrainian; code, identifiers, and technical documentation in English. Work incrementally, inspect existing files before editing, keep changes focused, test what you implement, and never claim unrun tests passed. Ask before major architectural changes. Stop after each major phase for approval.

## Brand and naming
- **Product name: Temerelle**. Use this exact spelling and capitalization consistently in app UI, PWA manifest, page titles, metadata, onboarding, email templates, README, and user-facing documentation.
- Positioning: an elegant, simple, universal appointment-booking platform where small businesses create a booking page, publish availability, and manage appointments.
- Brand voice: calm, modern, friendly, trustworthy; avoid casino/crypto aesthetics.
- Working tagline: **Your time, beautifully organized.** This is provisional copy, not mandatory.
- Do not rename database tables, API routes, environment variables, or technical identifiers solely for branding.
- Trademark and domain availability are **not legally confirmed**. Never claim the brand is registered or cleared for commercial use.

## Product
Replace manual appointment scheduling via Viber, Telegram, Instagram and calls. One PWA serves both customers and business owners; a user may have both roles. Ukrainian-first, localization-ready, simple and accessible. Industry-agnostic individual appointments only. One bookable resource per business in MVP (e.g., specialist, car-wash bay, room); architecture supports multiple resources later and multiple businesses per owner.

### Approved MVP decisions
- PWA first, not native mobile apps. Installable on phones.
- Search businesses by name or unique code.
- Email + password authentication.
- Customer booking requests require manual owner confirmation.
- `pending` and `confirmed` bookings reserve the time interval.
- Free-tier infrastructure during development.
- No online payments, group bookings, multiple active resources per business, reviews, geolocation, AI, SMS or subscription billing in MVP.
- **Resource-first booking model:** a `resource` is the capacity being booked (person, wash bay, room). Create exactly one default resource automatically when a business is created. Do not expose resource management or resource selection in MVP UI. Do not assume every resource is an employee.

## Stack and infrastructure
- Frontend: Next.js App Router, React, TypeScript strict, Tailwind CSS, responsive PWA with manifest and service worker.
- Backend: NestJS REST API, DTO validation, OpenAPI, resource-based authorization.
- Database: PostgreSQL (Neon Free), Drizzle ORM and Drizzle Kit migrations.
- Hosting: Vercel Hobby, two projects: `frontend` (web) and `backend` (API as a serverless function, entry `backend/api/index.ts`); GitHub Free (repository). The browser reaches the API only through the frontend's `/api/*` rewrite, so cookies are first-party.
- Versions (Phase 1): Node 24, Next.js 16.4, React 19.3, NestJS 11 (12 is ESM-only: upgrade later as a separate step), TypeScript 5.9 (not 7 until Nest decorator metadata is confirmed), Drizzle ORM 0.45 + node-postgres (`pg`), Tailwind 4.
- Notifications: standard Web Push API with VAPID where supported, including installed iOS Home Screen PWAs on supported versions.
- Authentication: secure password hashing with Argon2id, access and rotating refresh sessions, secure HttpOnly cookies where appropriate, CSRF protection for cookie-authenticated mutations, rate limiting.
- Verify up-to-date runtime/dependency compatibility, free-tier quotas and commercial-use restrictions before deployment (Vercel Hobby is for non-commercial use; check before launch). Serverless functions have cold starts; handle them gracefully.
- Future native app (App Store): a third folder `mobile/` on the same REST API. Design auth so a bearer-token mode can be added next to cookies, and keep push behind a channel abstraction (Web Push now, APNs/FCM later). All business logic stays on the server.
- Do not introduce Redis, microservices, paid APIs or unnecessary dependencies.

## Repository
Two independent npm projects (no pnpm, no workspace). If shared types become necessary, add one `shared/` folder via npm workspaces.
```text
temerelle/
  frontend/              # Next.js PWA (.env.example: BACKEND_URL)
  backend/               # NestJS REST API (.env.example)
    src/database/        # Drizzle schema
    drizzle/             # SQL migrations (generated + hand-written, e.g. the booking overlap constraint)
  docs/design/specs/     # design specs of features
  docs/design/plans/     # implementation plans
  docker-compose.yml     # local PostgreSQL
  .github/workflows/     # CI
  .githooks/             # pre-commit checks
  README.md
```

## Customer functionality
- Register, sign in/out, restore session, reset password, delete account.
- Search businesses by name/code; view business profile, services, prices and durations.
- Choose service, date, available time; review and submit booking request.
- See `Pending confirmation`, track upcoming and past bookings, cancel eligible upcoming requests.
- Receive push on confirmation, rejection and cancellation where permission/support exists; in-app status always works without push.

## Business owner functionality
- Create and edit business name, description, code and active status.
- Create, edit and deactivate services with duration and price.
- Configure weekly schedule, multiple intervals/day, breaks, days off and date-specific exceptions for the default resource.
- See calendar and pending requests; confirm, reject, cancel bookings.
- Manually create a booking for an unregistered customer (client name, optional phone).
- Receive push on new booking requests and cancellations.
- Users owning businesses can switch between customer and owner modes.

## Booking rules
Statuses: `pending`, `confirmed`, `cancelled`, `completed`.
- Customer request begins `pending`; owner may confirm or reject (reject transitions to `cancelled` with reason/actor).
- Owner-created manual bookings may start `confirmed`.
- `pending` and `confirmed` block overlapping intervals **on the same resource**; `cancelled` and `completed` do not. Different resources may have overlapping bookings in future versions.
- Only valid transitions allowed. No confirming after the appointment starts.
- Customers may cancel upcoming pending/confirmed bookings; owners may cancel their business's bookings.
- Store `starts_at` and `ends_at` as TIMESTAMPTZ, business IANA timezone (e.g. Europe/Kyiv), and historical snapshots of service name, price and duration.
- Server resolves the business default resource, calculates duration and validates resource availability; do not trust client-supplied resource ownership, prices, durations or end timestamps.
- Service-to-resource assignment: in MVP all active services are offered by the single default resource. In a future multi-resource release add explicit `service_resources` mapping, rather than assuming all resources offer all services.
- Initial constants: 15-minute slot step, 1-hour minimum notice, 30-day booking horizon; configurable in code, not UI.
- Exceptions override weekly schedule for their date; clearly define semantics for partial intervals.
- Preserve existing bookings when a service or schedule changes; define conflict handling for changed schedules.
- Use database-level overlap protection and transactions. Return HTTP 409 for conflicts.

PostgreSQL constraint example:
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE bookings
ADD CONSTRAINT bookings_no_active_overlap
EXCLUDE USING gist (
  resource_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
)
WHERE (status IN ('pending', 'confirmed'));
```
Also enforce `ends_at > starts_at`. `resource_id` must be NOT NULL and refer to a resource owned by the same business as the booking. Protect this cross-tenant invariant using composite foreign keys or equivalent database-enforced constraints; application validation alone is insufficient. For historical `completed` bookings, decide explicitly whether overlapping completed records are permitted; retain the approved active-only exclusion constraint.

## Database (Drizzle/PostgreSQL)
Core entities and suggested fields:
- `users`: id UUID PK, email unique, name, password_hash, phone nullable, created_at, updated_at.
- `businesses`: id UUID PK, owner_id FK, name, code unique, description, timezone, is_active, created_at, updated_at.
- `resources`: id UUID PK, business_id FK, name, type (e.g. `person`, `bay`, `room`, `other`), is_default BOOLEAN, is_active BOOLEAN, timestamps. One default resource per business; enforce uniqueness of default per business and a stable FK relationship. Auto-create the default resource transactionally with the business.
- `services`: id UUID PK, business_id FK, name, duration_minutes, price_minor integer, currency CHAR(3), is_active, timestamps.
- `working_hours`: id UUID PK, business_id FK, resource_id FK, day_of_week (1–7), start_time TIME, end_time TIME. Multiple intervals/day supported. The schedule belongs to the resource, not only the business.
- `schedule_exceptions`: id UUID PK, business_id FK, resource_id FK, date DATE, start_time/end_time nullable, is_day_off. Model multiple override intervals cleanly if needed; a resource-specific exception overrides that resource’s normal schedule.
- `bookings`: id UUID PK, business_id FK, resource_id NOT NULL FK, service_id FK, client_id nullable FK, client_name, client_phone nullable, starts_at, ends_at, status, service_name_snapshot, price_minor_snapshot, duration_minutes_snapshot, cancellation_reason nullable, cancelled_by nullable, timestamps.
- `push_subscriptions`: id UUID PK, user_id FK, endpoint, p256dh, auth, created_at.
- Supporting auth tables for refresh sessions and password reset tokens.

Enforce business/resource consistency for working hours, exceptions and bookings (including preventing cross-business resource assignment). Use appropriate indexes, FK and deletion policies, checks, unique constraints and tenant isolation. Never delete a resource with booking history; deactivate it instead. Resource records must not be visible as a separate concept in the MVP customer flow. Store money as integer minor units, never floating point. Avoid speculative tables.

## REST API (prefix `/api/v1`)
Authentication:
```text
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me
POST   /auth/forgot-password
POST   /auth/reset-password
DELETE /auth/account
```
Businesses:
```text
GET    /businesses
GET    /businesses/:id
POST   /businesses
PATCH  /businesses/:id
```
Services:
```text
GET    /businesses/:id/services
POST   /businesses/:id/services
PATCH  /businesses/:id/services/:serviceId
```
Resources (internal MVP, no public resource-management UI):
```text
GET    /businesses/:id/resources    # owner-only for diagnostics/future extension; may defer endpoint until needed
```
The API must resolve the default resource internally for all customer availability and booking requests. Do not require customers to pass `resourceId` in MVP.

Schedule:
```text
GET    /businesses/:id/schedule
PUT    /businesses/:id/schedule
GET    /businesses/:id/exceptions
POST   /businesses/:id/exceptions
DELETE /businesses/:id/exceptions/:exceptionId
```
Availability:
```text
GET /businesses/:id/availability?serviceId=...&date=YYYY-MM-DD
```
Bookings:
```text
POST   /bookings
GET    /bookings/my
GET    /businesses/:id/bookings
POST   /businesses/:id/bookings
POST   /businesses/:id/bookings/:bookingId/confirm
POST   /businesses/:id/bookings/:bookingId/reject
POST   /bookings/:id/cancel
```
Push:
```text
POST   /push/subscribe
DELETE /push/subscribe
```
Use consistent JSON, proper HTTP codes, pagination, DTO validation, centralized errors, owner/tenant checks and OpenAPI docs. Never expose private customer information via public endpoints.

## UI/UX
Native-feeling mobile-first interface, clean typography, generous spacing, accessible contrast and tap targets, consistent reusable components, Ukrainian default. Include loading, empty, success and error states. No fake clickable UI.

Customer navigation: Search, My Appointments, Profile.
Owner navigation: Dashboard, Calendar, Services, Settings.

Screens: onboarding, registration/login, business search, business profile, service selection, date/time picker, booking review/status, appointments, owner dashboard, pending requests, calendar, service management, weekly schedule, business settings, profile settings.

## PWA and notifications
Web manifest, icons, service worker, standalone mode, HTTPS, offline fallback, installability, responsive design. Do not cache private booking data or sensitive authenticated responses in shared/public caches. No offline booking writes. Web Push permission only after user interaction; graceful fallback when unavailable. Notification delivery failure must never roll back a successful booking. Consider a minimal database-backed outbox for reliable asynchronous sends without paid queues.

## Testing
Unit tests: resource-scoped availability, timezone/DST, duration, schedule exceptions, transitions, validation.
Integration tests with real PostgreSQL: auth, tenant isolation, business/service management, bookings, owner decisions, cancellation, concurrency/overlap constraint.
Edge cases: simultaneous requests on same resource, bookings at same time on different resources (future-ready test), service overlaps break, booking past closing, schedule edits, inactive service, cancel vs confirm race, DST, invalid timezone, unauthorized cross-business resource access, default resource creation and deactivation.

## Deployment and security
Provide `.env.example`, setup scripts, migrations, health check, Vercel/Neon deployment instructions. Secrets only via environment variables; configure CORS and cookie domains safely. Validate input, rate limit auth, prevent tenant leaks, store password hashes and hashed/rotated session tokens, implement account deletion and password reset with a real delivery strategy or clearly flag any development-only limitation. Verify current free quotas and restrictions. Keep the project runnable locally and deployable after each milestone.

## Phases
1. Foundation: frontend + backend projects, Next.js, NestJS, TypeScript, lint/format, Drizzle, PostgreSQL, environment config, health endpoint.
2. Authentication: registration/login, sessions, protected routes, profile.
3. Business management: business profile, automatic default resource creation, services, resource-scoped schedule and exceptions.
4. Booking engine: availability, requests, overlap protection, confirmation/rejection/cancellation, history.
5. Frontend: design system, customer and owner UI, API integration.
6. PWA and Web Push: manifest, service worker, installation, notifications, offline fallback.
7. Testing and deployment: automated tests, security review, Vercel + Neon.

## Collaboration instructions
The developer is experienced with React, Next.js, TypeScript, Node.js, SQL and Docker. Do not explain basic concepts unless asked. Before each implementation increment: briefly explain approach, list affected files, implement the smallest complete slice, show run/test instructions and limitations, then wait for approval before the next major phase. Never silently change approved requirements or overengineer.

## First task
Start with **Phase 1 — Foundation** only. Before coding, review architecture, check current stable dependency/runtime compatibility, identify critical issues, propose final repository structure and setup steps. Then implement the foundation: working Next.js web app, NestJS API, Drizzle/PostgreSQL connection, `.env.example`, local dev commands and health endpoint. Include `resources` in the initial schema design and migration, with exactly one automatically created default resource per business once business creation is implemented. Do not build resource-management screens or multi-resource scheduling yet. Do not implement auth, booking logic or UI screens yet. Stop and await approval before Phase 2.
