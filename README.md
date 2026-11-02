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

## Local dev

Needs Node 24 and Docker (for the local PostgreSQL).

```bash
git config core.hooksPath .githooks            # once: pre-commit checks (prettier, no gap-*, no long dash in UI text)
docker compose up -d                           # PostgreSQL 17 on localhost:5432

cp backend/.env.example backend/.env
# DATABASE_URL=postgresql://temerelle:temerelle@localhost:5432/temerelle
cp frontend/.env.example frontend/.env.local

cd backend && npm install && npm run db:migrate && npm run start:dev    # http://localhost:3001/api/v1/health
cd frontend && npm install && npm run dev                                # http://localhost:3000
```

## Database migrations

```bash
cd backend
npm run db:generate          # after editing src/database/schema.ts: writes drizzle/NNNN_*.sql
npm run db:migrate           # applies pending migrations (uses DATABASE_URL_UNPOOLED if set)
```

Constraints Drizzle can't express (the booking overlap `EXCLUDE` constraint) are hand-written migrations: `npx drizzle-kit generate --custom --name=<name>`.

## Checks

Each project: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`. CI runs them on every push ([ci.yml](.github/workflows/ci.yml)), plus the migrations against a fresh PostgreSQL.
