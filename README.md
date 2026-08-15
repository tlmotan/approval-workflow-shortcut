# Expense Claim Approval Workflow

A multi-stage expense claim approval engine. See [`CLAUDE.md`](./CLAUDE.md)
for the full spec and [`DOCS.md`](./DOCS.md) for the design writeup,
flowcharts, and known limitations.

## Requirements

- Node.js 20+

## Setup

```bash
npm install
cp .env.example .env     # sets DATABASE_URL=file:./dev.db
npx prisma migrate dev   # creates prisma/dev.db and applies migrations
npx prisma db seed       # seeds the 4 employees
npm run dev              # http://localhost:3000
```

Then open http://localhost:3000 — pick an actor from the "Submitting/Acting
as" dropdown in the top bar to submit or act on claims.

## Tests

```bash
npm run test
```

Runs the 7 required correctness scenarios (plus chain-boundary tests)
against a real SQLite test database, not a mocked Prisma client.

## Tech stack

Next.js (App Router) + TypeScript, Prisma + SQLite, Vitest, Tailwind CSS.
No authentication — an actor is chosen from a seeded employee dropdown, by
design (see `CLAUDE.md`).
