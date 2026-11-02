# Temerelle

*Your time, beautifully organized.*

An appointment-booking PWA for small service businesses: a business publishes its services and availability, customers find it by name or code and request a time, the owner confirms.

**Stack:** Next.js 16 App Router · NestJS 11 · PostgreSQL (Neon) + Drizzle ORM · Tailwind CSS 4 · Vercel

Product rules and decisions are in [CLAUDE.md](CLAUDE.md).

> The name "Temerelle" is a working brand: trademark and domain availability are not confirmed.

## Structure

```
temerelle/
├── frontend/   # Next.js PWA, Vercel project (rewrites /api/* to the backend)
└── backend/    # NestJS API, Vercel serverless project (entry: backend/api/index.ts)
    └── drizzle/   # SQL migrations
```

All API routes live under `/api/v1`. OpenAPI docs: `/api/v1/docs` (JSON: `/api/v1/docs-json`).

## Deployment (how we work)

Everything runs on Vercel: push to `main` on GitHub and both projects deploy (`temerelle` from `frontend/`, `temerelle-api` from `backend/`). Check changes on https://temerelle.vercel.app.

Environment variables (Vercel → project → Settings → Environment Variables):

| Project | Variable | Value |
|---|---|---|
| `temerelle-api` | `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | set by the Neon integration |
| `temerelle-api` | `FRONTEND_URL` | `https://temerelle.vercel.app` |
| `temerelle-api` | `JWT_SECRET` | random, 32+ characters: `openssl rand -base64 48` |
| `temerelle` | `BACKEND_URL` | `https://temerelle-api.vercel.app` |

The API refuses to start without the required ones and lists what is missing.

## Database migrations

```bash
cd backend
npm run db:generate          # after editing src/database/schema.ts: writes drizzle/NNNN_*.sql
npm run db:migrate           # applies pending migrations to DATABASE_URL_UNPOOLED (or DATABASE_URL) from backend/.env
```

With the Neon URL in `backend/.env`, `db:migrate` changes the **production** database. Apply migrations before pushing code that needs them.

Constraints Drizzle can't express (the booking overlap `EXCLUDE` constraint) are hand-written migrations: `npx drizzle-kit generate --custom --name=<name>`.

## Auth

Email + password (Argon2id). A 15-minute JWT access token and a 30-day refresh token, both in `httpOnly` cookies; every refresh rotates the refresh token, and a rotated token used again revokes all of the user's sessions. The API also accepts `Authorization: Bearer <access token>` for a future native app. Mutations are accepted only from `FRONTEND_URL` (CSRF origin check). Sign-in, sign-up and password reset are rate limited in PostgreSQL.

> **Development-only limitation:** password reset emails are not sent yet. The reset link is written to the API log (`[DEV ONLY]`, Vercel → `temerelle-api` → Logs). See [TODO.md](TODO.md).

## Checks

```bash
cd backend && npm run lint && npx tsc --noEmit && npm test && npm run build
cd backend && npm run test:int        # integration tests: real PostgreSQL (docker compose up -d, database temerelle_test)
cd frontend && npm run lint && npx tsc --noEmit && npm test && npm run build
```

CI ([ci.yml](.github/workflows/ci.yml)) runs them on demand: GitHub → Actions → CI → Run workflow.
