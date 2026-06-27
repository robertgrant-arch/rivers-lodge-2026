# Rivers Lodge & Hunt Club — Claude Working Guide

**Project root:** `/home/user/rivers-lodge-2026`
**Live site:** The Rivers Lodge & Hunt Club — La Cygne, Kansas
**Hosting:** Render.com (Node, Oregon region)
**Deploy trigger:** `git commit --allow-empty -m "chore: trigger Render production deploy (...)" && git push origin main`

---

## How this repo is organized

Full-stack TypeScript SPA. One repo, one server, one client bundle.

```
/home/user/rivers-lodge-2026/
├── features/           ← ALL application code lives here (vertical slices)
│   ├── _core/          ← Infrastructure: tRPC factory, DB client, Express app
│   ├── _shared/        ← Shared UI primitives (shadcn/ui, hooks, utils)
│   └── <name>/         ← One folder per product area (see Feature Map below)
├── client/
│   ├── index.html      ← Vite SPA entry point
│   └── public/
│       ├── img/        ← Photography assets (do NOT delete)
│       └── brand/      ← Logo variants (1.png–13.png)
├── server/             ← Legacy test stubs only (real server code in _core)
├── scripts/            ← Build/utility scripts
├── docs/               ← Architecture docs
├── drizzle.config.ts   ← ORM config
├── render.yaml         ← Render hosting config
├── vite.config.ts      ← Vite + alias config
└── package.json        ← pnpm workspace
```

### Framework and stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Wouter (routing) + Tailwind CSS v4 |
| Backend | Express 4 + tRPC 11 (type-safe API) |
| Database | MySQL via Drizzle ORM |
| Auth | Clerk v5 (OAuth + sessions) |
| Bundler | Vite 7 (client) + esbuild (server) |
| Testing | Vitest + Testing Library |
| Hosting | Render.com |

### Styling system

- **Tailwind CSS v4** — CSS-first config, no `tailwind.config.js`
- Theme defined in `features/_core/client/index.css` via `@theme inline { ... }` block
- **Brand tokens** (all defined in `:root`):
  - `--rl-night: #2B2823` — warm near-black (primary background)
  - `--rl-grass: #6B7250` — olive green (membership / hunt-fish accent)
  - `--rl-sand: #E0D3BD` — warm cream (primary text on dark)
  - `--rl-river: #576276` — slate blue (secondary accent)
  - `--rl-sage: #BABAAE` — muted sage gray (muted text)
  - `--rl-clay: #9B4D19` — rust/orange (CTA / primary accent)
- **Legacy aliases** (still in use): `--gold` = Clay, `--sage` = Grass, `--blush` = Clay
- **Fonts**: Montserrat (sans, headings/eyebrows/buttons) + Crimson Text (serif, body/H2)
- **Typography hierarchy**: H1/H3 → Montserrat uppercase; H2 → Crimson Text italic; body → Crimson Text
- **Import paths** (vite aliases): `@core`, `@shared`, `@features`, `@shared/components/...`, `@shared/lib/trpc`

---

## Feature Map

Each feature slice owns its route(s), data schema, server procedures, and client UI.

### Public marketing site

| Feature | Routes | Key files |
|---|---|---|
| `marketing` | `/`, `/gallery`, `/contact`, `/privacy`, `/outdoors` | `client/pages/Home.tsx`, `Gallery.tsx`, `Contact.tsx` |
| `weddings` | `/events`, `/weddings`, `/venues` | `client/pages/WeddingsLanding.tsx`, `Weddings.tsx`, `Venues.tsx` |
| `lodging` | `/lodging`, `/estate` | `client/pages/Lodging.tsx`, `Estate.tsx` |
| `membership` | `/membership`, `/membership/benefits`, `/membership/faq` | `client/pages/Membership.tsx`, `MembershipBenefits.tsx`, `MembershipFaq.tsx` |
| `hunt-fish` | `/hunt`, `/fish` | `client/pages/Hunt.tsx`, `Fish.tsx` |
| `about` | `/about`, `/about/team`, `/about/property` | `client/pages/About.tsx`, `AboutTeam.tsx`, `AboutProperty.tsx` |
| `corporate` | `/corporate` | `client/pages/Corporate.tsx` |
| `food-and-wine` | `/food-and-wine` | `client/pages/FoodAndWine.tsx` |
| `public-pages` | (layout only) | `components/PublicNav.tsx`, `PublicFooter.tsx`, `PublicLayout.tsx` |

### Inquiry & conversion

| Feature | Routes | Key files |
|---|---|---|
| `inquiries` | `/inquiry-confirmed` | `client/components/InquiryForm.tsx`, `StickyInquiryCTA.tsx`; `server/router.ts` |
| `waivers` | `/sign-waiver/:token` | `client/pages/SignWaiver.tsx`; `server/waiverPdf.ts` |

### Authenticated member experience

| Feature | Routes | Key files |
|---|---|---|
| `auth` | `/sign-in`, `/sign-up` | `client/LoginButton.tsx`; `server/router.ts`, `session.ts` |
| `portal` | `/portal`, `/portal/my-bookings`, `/portal/properties`, `/portal/properties/:id` | `client/pages/MemberPortal.tsx`, `MyBookings.tsx`, `PropertyBrowser.tsx` |
| `booking-engine` | (embedded in portal) | `client/components/AvailabilityCalendar.tsx`; `server/availability/engine.ts` |
| `trips` | (embedded in hunt/fish pages) | `client/components/HuntFishAvailabilityCalendar.tsx` |

### Staff operations portal (`/ops/*`)

| Feature | Routes | Key files |
|---|---|---|
| `admin` | `/ops`, `/ops/calendar`, `/ops/weddings`, `/ops/corporate`, `/ops/hunt-fish`, `/ops/bookings`, `/ops/customers`, `/ops/employees`, `/ops/membership`, `/ops/reports`, `/ops/leads`, `/ops/testimonials`, `/ops/properties`, `/ops/notifications` | `client/pages/Portal*.tsx` |
| `reports` | `/ops/field-reports`, `/ops/newsletter` | `client/pages/PortalFieldReports.tsx`, `PortalNewsletter.tsx` |
| `waivers` | `/ops/waivers` | `client/pages/PortalWaivers.tsx` |
| `portal` | `/ops/availability` | `client/pages/PortalAvailability.tsx` |

### Infrastructure / data

| Feature | Purpose |
|---|---|
| `_core` | Express app, tRPC factory, DB client, env validation, S3, notifications |
| `_shared` | shadcn/ui primitives, hooks, tRPC client, utilities |
| `cms` | FAQ, testimonials, gallery — DB-backed CMS via tRPC |
| `messages` | Member ↔ staff concierge messaging |
| `membership` | Membership tiers, applications, management |
| `updates` | Seasonal field updates and newsletters |
| `property-booking` | Self-service hunt property booking |

---

## Architecture rules

### Vertical slice law
Every feature is self-contained. Cross-feature imports are **only** allowed through the feature's `public.ts` barrel file. The ESLint `plugin-boundaries` enforces this at lint-time.

```
✅ import { HuntFishAvailabilityCalendar } from 'features/trips/client/public'
✅ import { trpc } from '@shared/lib/trpc'
❌ import something from 'features/booking-engine/server/router'  ← never
❌ import something from 'features/trips/client/components/Calendar'  ← bypass public.ts
```

### Canonical feature structure
```
features/<name>/
├── schema.ts          ← Drizzle table definitions (DB features only)
├── types.ts           ← Shared types
├── public.ts          ← Only file other features may import from
├── server/
│   ├── router.ts      ← tRPC procedures
│   └── dal.ts         ← Data-access helpers
└── client/
    ├── pages/         ← Route-level components (lazy-loaded in App.tsx)
    ├── components/    ← Feature-private UI
    └── public.ts      ← Client-side barrel (optional)
```

Client-only features (no DB/server) omit `schema.ts`, `types.ts`, and `server/`.

### Router (App.tsx)
`features/_core/client/App.tsx` is the single router. All new routes are added here. Pages are lazy-loaded via `React.lazy()`. Three route groups:
1. **Public** — no auth required
2. **Gated** — `<SignedIn>` Clerk wrapper (member portal)
3. **Ops** — role-checked, wrapped in `PortalLayout`

### Naming conventions
- **Files**: PascalCase for components (`MyPage.tsx`), camelCase for utilities (`myHelper.ts`)
- **Routes**: kebab-case URLs (`/membership/benefits`)
- **CSS**: Tailwind utilities preferred; component classes in `index.css` via `@layer components`
- **tRPC**: `trpc.<feature>.<procedure>` — e.g. `trpc.cms.getAllGalleriesWithImages`
- **Branch names**: `claude/<short-description>` (e.g. `claude/brand-standards`)

---

## Safe image placeholder pattern

All image slots use this two-layer pattern so layout composes correctly when photos are absent:

```tsx
<div className="relative aspect-[4/3] overflow-hidden">
  {/* Base layer — always visible */}
  <div className="absolute inset-0 bg-[#2B2823] flex items-center justify-center" aria-hidden="true">
    <span className="text-[10px] tracking-[0.18em] uppercase font-sans text-white/30 select-none">
      Label text
    </span>
  </div>
  {/* Real photo — hides itself via onError if src is missing */}
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

## Git & deployment workflow

### Branch strategy
- `main` — production (auto-deploys to Render on push)
- `claude/<feature>` — working branch for each task
- Never commit directly to `main`; always PR → squash merge → trigger deploy

### Standard PR workflow
```bash
git checkout -b claude/<feature-name>
# make changes
git add <specific files>   # never git add -A blindly
git commit -m "feat: ..."
git push -u origin claude/<feature-name>
# → open PR via GitHub MCP tool
# → merge PR via GitHub MCP tool (squash)
# → pull main + trigger deploy:
git pull origin main
git commit --allow-empty -m "chore: trigger Render production deploy (<feature> — PR #N)"
git push origin main
```

### Deploy trigger
Render deploys automatically on any push to `main`. An empty commit is sufficient to trigger it when the PR was squash-merged without a push.

### Environment variables
Managed in Render dashboard. Key vars:
- `DATABASE_URL` — MySQL connection string
- `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` — auth
- `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID` — Umami analytics
- `VITE_APP_TITLE` = "The Rivers Lodge & Hunt Club"

---

## Content rules

- **Do NOT invent copy, prices, or details** — only use content explicitly provided or already in the repo
- **Do NOT delete source images** from `client/public/img/` — clear `src` attributes instead, leave files on disk
- **Do NOT change the logo** — existing wordmark is final
- **Render is case-sensitive** — always use exact filenames; URL-encode spaces (`%20`) in image paths
- **Colors**: always use brand tokens (`var(--gold)`, `#9B4D19`, `#E0D3BD`, etc.) — no arbitrary oklch values for brand colors

---

## Completed work (historical)

| PR | Description |
|---|---|
| #26 | Nav restructure — 6-item nav with 4 dropdowns, 5 scaffolded pages |
| #27 | Homepage simplification — hero + 3 teasers, removed sections |
| #28 | Brand standards — Montserrat + Crimson Text, RL color palette tokens site-wide |
| #29 | Remove images from /lodging and /gallery (source files preserved) |

---

## Start here next

### Homepage
```
features/marketing/client/pages/Home.tsx
```
Hero slideshow, 3 teaser sections (The Estate, Stay & Gather, Membership). Edit copy or swap image `src` values here. Images live in `client/public/img/`.

### Membership
```
features/membership/client/pages/Membership.tsx          ← main tiers page
features/membership/client/pages/MembershipBenefits.tsx  ← benefits page
features/membership/client/pages/MembershipFaq.tsx       ← FAQ (content placeholder)
features/membership/server/router.ts                     ← tRPC: membership data
features/membership/schema.ts                            ← DB schema
```

### Weddings & Events
```
features/weddings/client/pages/WeddingsLanding.tsx  ← /events (primary CTA page)
features/weddings/client/pages/Weddings.tsx          ← /weddings (detail)
features/weddings/client/pages/Venues.tsx            ← /venues (venue detail)
features/inquiries/client/components/InquiryForm.tsx ← inquiry form used across weddings
```

### Lodging
```
features/lodging/client/pages/Lodging.tsx  ← /lodging (all 5 properties)
features/lodging/client/pages/Estate.tsx   ← /estate (estate overview)
```
Property data in `FALLBACK_LODGING` constant at top of `Lodging.tsx`. CMS-backed when `trpc.cms.getLodgingUnits` returns data.

### Navigation & footer
```
features/public-pages/components/PublicNav.tsx    ← full nav (dropdowns, mobile, portal link)
features/public-pages/components/PublicFooter.tsx ← footer links + legal
features/public-pages/components/PublicLayout.tsx ← wrapper used by all public pages
```

### Design system (colors, fonts, spacing)
```
features/_core/client/index.css   ← ALL brand tokens, Tailwind @theme, component classes
client/index.html                 ← Google Fonts <link> tags
```

### Deployment config
```
render.yaml                       ← Render service definition
features/_core/server/app.ts      ← Express entry point
features/_core/server/env.ts      ← Environment variable schema
```

### App router (add new routes here)
```
features/_core/client/App.tsx
```

---

## Quick reference commands

```bash
pnpm dev          # start dev server (Vite + Express watch mode)
pnpm build        # production build (client Vite + server esbuild)
pnpm lint         # ESLint (boundary enforcement)
pnpm test         # Vitest unit tests
pnpm db:push      # push Drizzle schema changes to DB
```
