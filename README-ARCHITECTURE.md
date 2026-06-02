# Rivers Lodge — Architecture Guide

## The Shape of the Codebase

This is a full-stack TypeScript application (React + tRPC + Drizzle + PostgreSQL) deployed on Render. The frontend is a Vite/React SPA; the backend is an Express server exposing a single tRPC router. Everything is organized as **vertical feature slices** — each feature owns its schema, server logic, and client UI in one folder.

## Directory Layout

```
rivers-lodge-2026/
├── _core/                  # App-wide infrastructure — no business logic
│   ├── server/             # app.ts, trpc.ts, context.ts, db.ts, env.ts, router.ts
│   └── db/                 # schema.ts (barrel), relations.ts, migrations/
├── _shared/                # Reusable UI + utilities — no feature logic
│   ├── ui/                 # shadcn/ui primitives
│   ├── components/         # SEOHead, DashboardLayout, etc.
│   ├── hooks/              # useMobile, useScrollAnimation
│   └── lib/                # trpc client, utils
├── features/               # One folder per vertical feature slice
│   ├── auth/               # Login, session, users table
│   ├── cms/                # Content management
│   ├── membership/         # Applications, member records
│   ├── booking-engine/     # Availability, resources, bookings
│   ├── property-booking/   # Hunt property self-booking
│   ├── trips/              # Hunt/fish trip slots
│   ├── inquiries/          # Public inquiry forms
│   ├── messages/           # Member-to-staff concierge
│   ├── waivers/            # Waiver signing flow
│   ├── reports/            # Field reports, newsletters
│   ├── updates/            # Seasonal updates
│   ├── portal/             # Member-facing dashboard
│   ├── member-portal/      # Member portal pages
│   ├── admin/              # Staff / ops portal
│   ├── weddings/           # Wedding pages
│   ├── hunt-fish/          # Hunt & fish pages
│   ├── lodging/            # Lodging & estate pages
│   ├── corporate/          # Corporate events pages
│   ├── marketing/          # Home, Gallery, Contact
│   └── public-pages/       # Public-facing page components
└── server/                 # Legacy location (migrated; only test stubs remain)
```

## The Vertical-Slice Rule

**Features depend only on:**
1. `_core/*` — infrastructure (trpc, db, env)
2. `_shared/*` — shared UI primitives
3. Other features' `public.ts` barrel — the explicit cross-feature contract

**Features NEVER import from another feature's internals:**
```ts
// ✅ Correct — via public barrel
import { useAuth, User } from "@features/auth/public";

// ❌ Wrong — reaching into internals
import { validateSession } from "@features/auth/server/cookies";
```

This is enforced by eslint-plugin-boundaries (see lint script).

## Feature Folder Structure

Every feature follows this shape:

```
features/<name>/
├── schema.ts        # Drizzle tables this feature OWNS (one source of truth)
├── types.ts         # TypeScript types re-exported from schema
├── public.ts        # PUBLIC BARREL — the only file other features may import
├── server/
│   ├── router.ts    # tRPC procedures
│   ├── dal.ts       # Data-access helpers (optional)
│   └── *.test.ts    # Tests travel with their code
└── client/
    ├── pages/       # Route-level components (lazy-loaded in App.tsx)
    └── components/  # Feature-specific UI
```

Client-only features (marketing pages) omit `schema.ts`, `types.ts`, and `server/`.

## Adding a New Feature

1. Create `features/<name>/` with the structure above.
2. Define your Drizzle table in `features/<name>/schema.ts`.
3. Re-export it from `_core/db/schema.ts`: `export * from "@features/<name>/schema";`
4. Add relations to `_core/db/relations.ts`.
5. Create your tRPC router in `server/router.ts`.
6. Mount it in `_core/server/router.ts`: `<name>: <name>Router`.
7. Export the minimum surface in `public.ts`.
8. Add lazy route to `_core/client/App.tsx`.

## Adding a New Shared Primitive

Shared UI goes in `_shared/`:
- UI component (shadcn wrapper, etc.) → `_shared/components/<Name>.tsx`
- Hook used by 2+ features → `_shared/hooks/use<Name>.ts`
- Utility function → `_shared/lib/<name>.ts`

Rule: `_shared/` must never import from `features/` or `_core/server/`.

## DB Schema Ownership

Each Drizzle table is owned by exactly one feature. The `_core/db/schema.ts` file is a pure re-export barrel — it never defines tables directly.

To find which feature owns a table: `grep -r "pgTable(\"<tableName>\"" features/`

## Cross-Feature Data Access

When feature A needs data from feature B:
1. Feature B exports the table ref (not the query) from its `public.ts`.
2. Feature A imports the table ref and writes its own query.
3. Business logic stays in the owning feature; only data shape crosses the boundary.

## Why This Structure?

- **Cohesion**: All code for a feature is in one place — schema, server, client, tests.
- **Boundaries**: You can't accidentally reach into another feature's internals.
- **Incremental**: New features start empty; old ones migrate at their own pace.
- **Deployability**: Each feature's server code is tree-shaken by esbuild; unused features add zero bundle weight.
- **Onboarding**: A new developer can read one feature folder and understand the full lifecycle — DB → server → client — without cross-referencing 5 directories.
