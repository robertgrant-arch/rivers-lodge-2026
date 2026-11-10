# Rivers Lodge & Hunt Club — Master Workspace Guide

**Canonical project root:** `/home/user/rivers-lodge-2026`
**This directory is the single source of truth** for Claude Desktop, terminal Claude, and IDE work.
**Quick operator reference:** see `OPERATOR.md`

---

## Standing session rule

**Before any code changes:** confirm both `CLAUDE.md` and `OPERATOR.md` are present and current.
Then proceed with engineering work.

---

## Repo purpose

Full-stack TypeScript web application for The Rivers Lodge & Hunt Club — a private estate
in La Cygne, Kansas. Serves as the public marketing site, member portal, and internal
operations platform for weddings, lodging, hunting/fishing, and membership management.

**Live deployment:** Render.com (auto-deploys from `main`)
**Deploy trigger:**
```bash
git commit --allow-empty -m "chore: trigger Render production deploy (...)" && git push origin main
```

---

## Architecture overview

React 19 SPA (Vite) + Express backend + tRPC API + Drizzle ORM + **PostgreSQL** (Render Postgres;
`pg` driver, `drizzle-orm/node-postgres`). Hosted on Render.
Login is handled in-app by `features/auth` (email + password, argon2 hashes, DB-backed sessions in
the `sessions` table, `rl_session` cookie). Some old comments and env vars still mention Clerk; the
current login code does not call Clerk.

**Vertical slice pattern:** every product area is a self-contained folder under `features/`.
Each slice owns its DB schema, tRPC router, and React pages. Cross-slice imports are only
allowed through each feature's `public.ts` barrel file — enforced by ESLint `plugin-boundaries`.

---

## Directory map

```
/home/user/rivers-lodge-2026/
│
├── CLAUDE.md              ← this file — master workspace guide
├── OPERATOR.md            ← quick operator cheat sheet
├── .claudeignore          ← files Claude skips (build output, secrets, etc.)
├── .claude/settings.json  ← Claude Code project permissions
│
├── _core/                 ← SERVER infrastructure (repo root, alias @core → _core/)
│   ├── server/app.ts      ← Express entry point (esbuild bundles it to dist/index.js)
│   ├── server/router.ts   ← Root tRPC router (mounts all feature routers)
│   ├── server/db.ts       ← Postgres pool + Drizzle client (getDb / getPortalDb)
│   ├── server/env.ts      ← Env var schema (add new vars here first)
│   ├── server/apply-sql-migrations.ts ← THE migration runner (see "Database migrations")
│   ├── server/startup-migration.ts    ← legacy idempotent DDL/seeding run at every boot
│   └── db/
│       ├── index.ts       ← full Drizzle schema barrel (used by drizzle.config.ts)
│       └── migrations/    ← NNNN_description.sql — applied at boot, once each
│
├── features/              ← ALL application code (vertical slices)
│   ├── _core/             ← CLIENT shell + thin server re-exports
│   │   ├── server/*.ts    ← re-export shims of _core/server (e.g. `export * from '@core/server/db'`)
│   │   └── client/
│   │       ├── App.tsx    ← Wouter router (ALL routes defined here)
│   │       ├── main.tsx   ← React DOM entry
│   │       └── index.css  ← Tailwind @theme, brand tokens, component classes
│   │
│   ├── _shared/           ← Shared UI: shadcn/ui primitives, hooks, tRPC client
│   │   ├── ui/            ← 50+ Radix-wrapped primitives (Button, Dialog, etc.)
│   │   ├── components/    ← Composite components (SEOHead, DashboardLayout, etc.)
│   │   ├── hooks/         ← useMobile, useScrollAnimation, etc.
│   │   └── lib/trpc.ts    ← Type-safe tRPC client + React Query hooks
│   │
│   ├── public-pages/      ← Shared public layout components
│   │   └── components/
│   │       ├── PublicNav.tsx      ← Site navigation (dropdowns, mobile, portal link)
│   │       ├── PublicFooter.tsx   ← Footer
│   │       └── PublicLayout.tsx   ← Wrapper for all public pages
│   │
│   ├── marketing/         ← / · /gallery · /contact · /privacy · /outdoors
│   ├── weddings/          ← /events · /weddings · /venues
│   ├── lodging/           ← /lodging  (/estate was removed in c90e6cd)
│   ├── membership/        ← /membership · /membership/benefits · /membership/faq
│   ├── hunt-fish/         ← /hunt · /fish
│   ├── about/             ← /about · /about/team · /about/property
│   ├── corporate/         ← /corporate
│   ├── food-and-wine/     ← /food-and-wine
│   ├── inquiries/         ← /inquiry-confirmed · InquiryForm · StickyInquiryCTA
│   ├── waivers/           ← /sign-waiver/:token · PDF generation
│   ├── auth/              ← /sign-in · email/password login, DB sessions
│   ├── portal/            ← /portal · /portal/my-bookings · /portal/properties
│   ├── booking-engine/    ← Availability engine (embedded in portal)
│   ├── trips/             ← Hunt/fish slot calendar
│   ├── admin/             ← /ops/* staff operations portal
│   ├── cms/               ← FAQ, testimonials, gallery (DB-backed)
│   ├── messages/          ← Member ↔ staff concierge messaging
│   ├── reports/           ← /ops/field-reports · /ops/newsletter
│   ├── updates/           ← Seasonal field updates
│   └── property-booking/  ← Self-service hunt property booking
│
├── client/
│   ├── index.html         ← Vite SPA entry point
│   └── public/
│       ├── img/           ← Photography assets (NEVER delete)
│       └── brand/         ← Logo variants (1.png–13.png)
│
├── server/                ← Legacy test stubs only (real server is in root _core/)
├── scripts/               ← Build/utility scripts
├── docs/                  ← Architecture documentation
│
├── package.json           ← pnpm workspace + scripts
├── vite.config.ts         ← Vite + path aliases (@core, @shared, @features)
├── drizzle.config.ts      ← ORM config
├── render.yaml            ← Render hosting service definition
├── tsconfig.json
└── eslint.config.js       ← plugin-boundaries enforces vertical slice rules
```

---

## Feature → route ownership

| Feature | Public routes | Auth required |
|---|---|---|
| `marketing` | `/` `/gallery` `/contact` `/privacy` | No |
| `weddings` | `/events` `/weddings` `/venues` | No |
| `lodging` | `/lodging` `/estate` | No |
| `membership` | `/membership` `/membership/benefits` `/membership/faq` | No |
| `hunt-fish` | `/hunt` `/fish` | No |
| `about` | `/about` `/about/team` `/about/property` | No |
| `corporate` | `/corporate` | No |
| `food-and-wine` | `/food-and-wine` | No |
| `inquiries` | `/inquiry-confirmed` | No |
| `waivers` | `/sign-waiver/:token` | No |
| `auth` | `/sign-in` `/sign-up` | No |
| `portal` | `/portal` `/portal/my-bookings` `/portal/properties` | Member |
| `admin` | `/ops/*` (15+ sub-routes) | Staff role |

---

## Styling & design system

**Tailwind CSS v4** — CSS-first config. No `tailwind.config.js`.
All theme customization lives in `features/_core/client/index.css`.

### Brand tokens (defined in `:root`)

| Token | Hex | Role |
|---|---|---|
| `--rl-night` / `--background` | `#2B2823` | Primary background |
| `--rl-sand` / `--foreground` | `#E0D3BD` | Primary text (on dark) |
| `--rl-clay` / `--gold` | `#9B4D19` | CTA / primary accent |
| `--rl-grass` / `--sage` | `#6B7250` | Membership / hunt-fish accent |
| `--rl-sage` | `#BABAAE` | Muted text |
| `--rl-river` | `#576276` | Secondary accent |
| `--surface` | `#363330` | Card / alternate section bg |
| `--surface-raised` | `#423F3B` | Elevated surface |
| `--border` | `#57544E` | Dividers |

### Fonts (Google Fonts — loaded in `client/index.html`)

| Family | Weights | Usage |
|---|---|---|
| Montserrat | 400, 500, 600 | H1, H3, eyebrows, buttons, labels |
| Crimson Text | 400, 400 italic | H2, body, pull quotes |

**Typography hierarchy:**
- H1 / H3 → Montserrat, uppercase, `letter-spacing: 0.08em`
- H2 → Crimson Text, italic
- Body → Crimson Text
- Eyebrows / buttons → Montserrat, uppercase, tracked

### Tailwind utilities (defined in `index.css`)
`.eyebrow` `.btn-primary` `.btn-outline` `.btn-ghost` `.link-arrow`
`.section` `.gold-rule` `.fade-up` `.body-copy` `.pull-quote`
`.text-warm` `.text-muted-brand` `.bg-surface` `.bg-surface-raised`

---

## Coding conventions

### Vertical slice law
```
✅  import { HuntFishAvailabilityCalendar } from 'features/trips/client/public'
✅  import { trpc } from '@shared/lib/trpc'
❌  import something from 'features/trips/client/components/HuntFishCalendar'
❌  import something from 'features/booking-engine/server/router'
```

### File naming
- Components: `PascalCase.tsx`
- Utilities/hooks: `camelCase.ts`
- Routes: kebab-case URLs (`/membership/benefits`)

### Import aliases (vite.config.ts)
```typescript
@core     → _core            (server: _core/server, _core/db)
@shared   → features/_shared
@features → features
```

### New feature checklist
1. Create `features/<name>/` folder
2. Add `schema.ts` (if DB), `types.ts`, `public.ts`
3. Add `server/router.ts` and mount in `_core/server/router.ts`
   (DB changes: add a new `_core/db/migrations/NNNN_*.sql` file — see "Database migrations")
4. Add page components to `client/pages/`
5. Register routes in `features/_core/client/App.tsx`

### Safe image placeholder pattern
```tsx
<div className="relative aspect-[4/3] overflow-hidden">
  <div className="absolute inset-0 bg-[#2B2823] flex items-center justify-center" aria-hidden="true">
    <span className="text-[10px] tracking-[0.18em] uppercase font-sans text-white/30 select-none">
      Label
    </span>
  </div>
  <img
    src={src}
    alt={alt}
    className="absolute inset-0 w-full h-full object-cover"
    loading="lazy"
    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
  />
</div>
```

---

## Commands

```bash
pnpm dev        # local dev (Vite + Express watch mode)
pnpm build      # production build
pnpm test       # Vitest unit tests
pnpm lint       # ESLint — run before every PR
pnpm check      # typecheck (tsc --noEmit)
```

⚠️ Don't use `pnpm db:push` against production. Despite the name it runs `drizzle-kit generate &&
drizzle-kit migrate`: it writes new auto-generated SQL into `_core/db/migrations/` (which the boot
migrator would then apply) and uses drizzle's own journal, not `_migrations_applied`. Write
migrations by hand instead (below). For a local scratch DB, `npx drizzle-kit push` is fine.

DB integration tests (`_core/server/root-properties.test.ts`,
`features/property-booking/server/router.test.ts`) insert real rows, so they only run when
`TEST_DATABASE_URL` points at a disposable database. They are skipped otherwise.

---

## Database migrations (how they actually run)

**Single source of truth: `_core/server/apply-sql-migrations.ts`, at server boot.** Sequence on
every Render deploy:

1. `pnpm build`: `prebuild` only writes `_core/generated/version.ts`. The build then bundles the
   server and copies `_core/db/` → `dist/db/` (`scripts/copy-db-migrations.mjs`). **The build
   never touches the database.**
2. `pnpm start` → `dist/index.js` → `runStartupMigration()` (legacy idempotent DDL/seeding)
   → `applySqlMigrations()` → `server.listen()`.
3. `applySqlMigrations()` reads `dist/db/migrations/*.sql` in filename order. It skips every file
   already recorded in the `_migrations_applied` table and applies each new one in **its own
   transaction**, recording it in the same transaction.
4. On any failure (bad SQL, DB unreachable, migrations folder missing in production) the process
   **exits non-zero before listening**. Render's health check (`/api/health`) then fails, the
   previous version keeps serving, and the new code never runs against a half-migrated schema.
   Look for `[apply-sql-migrations]` in the Render logs.

Rules for new migrations:
- Next number after the highest in `_core/db/migrations/` (e.g. `0037_add_x.sql`). Files are
  applied once and **never edited after they ship**. Fix forward with a new file.
- Make them additive and repeat-safe (`IF NOT EXISTS`, guarded `DO $$ … $$` blocks).
- No `CREATE INDEX CONCURRENTLY` (each file runs inside a transaction).
- `pnpm dev` deliberately does **not** apply migrations, so a feature branch run locally with a
  production `DATABASE_URL` can't push unmerged schema changes. To test one, run the production
  bundle against a local Postgres: `pnpm build && NODE_ENV=production PORT=5099
  DATABASE_URL=postgresql://…/scratch node dist/index.js`.
- There used to be a build-time runner (`scripts/run-migrations.mjs` in `prebuild`). It never
  applied anything, because it passed SQL via `input` with `stdio: 'inherit'`, so psql got no
  input and reported success. It was removed.

---

## Git & deployment workflow

```bash
# 1. Feature branch — never commit straight to main
git checkout -b claude/<feature-name>

# 2. Stage specific files, commit, push
git add features/path/to/file.tsx
git commit -m "feat: describe the change"
git push -u origin claude/<feature-name>

# 3. Open PR → squash merge (GitHub MCP tools or GitHub UI)

# 4. Pull and trigger Render deploy
git checkout main && git pull origin main
git commit --allow-empty -m "chore: trigger Render production deploy (<feature> — PR #N)"
git push origin main
```

### Hard rules
- Never push directly to `main`
- Never `git push --force`
- Always run `pnpm lint` before opening a PR
- Never delete files from `client/public/img/` — clear `src=""` instead
- Never invent copy, prices, or details not provided by the client
- Never change the wordmark / logo
- Render is case-sensitive — URL-encode spaces in image paths (`%20`)

---

## Environment variables

Managed in the Render dashboard. Schema validated in `_core/server/env.ts`.
Add new vars there first, then set values in Render.

Key vars:
- `DATABASE_URL` — PostgreSQL connection string (Render Postgres)
- `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` — auth
- `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID` — Umami
- `VITE_APP_TITLE` — "The Rivers Lodge & Hunt Club"

---

## PR history

| PR | Description |
|---|---|
| #26 | Nav restructure — 6-item nav with 4 dropdowns, 5 scaffolded pages |
| #27 | Homepage simplification — hero + 3 teasers |
| #28 | Brand standards — Montserrat + Crimson Text, RL color palette tokens site-wide |
| #29 | Remove images from /lodging and /gallery (source files preserved) |

---

## Start here next

| Task | File |
|---|---|
| Homepage | `features/marketing/client/pages/Home.tsx` |
| Membership tiers | `features/membership/client/pages/Membership.tsx` |
| Membership FAQ | `features/membership/client/pages/MembershipFaq.tsx` |
| Weddings/Events | `features/weddings/client/pages/WeddingsLanding.tsx` |
| Lodging properties | `features/lodging/client/pages/Lodging.tsx` (FALLBACK_LODGING at top) |
| Nav / footer | `features/public-pages/components/PublicNav.tsx` |
| Brand tokens / fonts | `features/_core/client/index.css` |
| Add a new route | `features/_core/client/App.tsx` |
| Deployment config | `render.yaml` |
| Photography | `client/public/img/` |
