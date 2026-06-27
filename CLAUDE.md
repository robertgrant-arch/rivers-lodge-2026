# Rivers Lodge & Hunt Club — Claude Master Guide

**Canonical project root:** `/home/user/rivers-lodge-2026`
**Single source of truth** for Claude Desktop, Claude Code CLI, and IDE sessions.
**Quick operator reference:** `OPERATOR.md`
**Session state / handoff:** `context/session-summary.md`

---

## Standing session rules

1. **On session start:** read `context/session-summary.md` if it exists. It contains the current project state, active workstreams, and next steps.
2. **Before any code changes:** confirm `CLAUDE.md` and `OPERATOR.md` are present and current.
3. **On "wrap up":** update `context/session-summary.md` — see the Wrap-Up Protocol section below.

---

## Project overview

Full-stack TypeScript web application for The Rivers Lodge & Hunt Club — a private estate in La Cygne, Kansas. Serves as the public marketing site, member portal, and internal operations platform for weddings, lodging, hunting/fishing, and membership management.

**Live URL:** deployed on Render.com (auto-deploys from `main`)
**Deploy trigger:**
```bash
git commit --allow-empty -m "chore: trigger Render production deploy (<description> — PR #N)" && git push origin main
```

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Wouter (routing) + Tailwind CSS v4 |
| Backend | Express 4 + tRPC 11 (type-safe RPC) |
| Database | MySQL via Drizzle ORM |
| Auth | Clerk v5 (OAuth + sessions + roles) |
| Client bundler | Vite 7 |
| Server bundler | esbuild |
| Testing | Vitest + Testing Library |
| Package manager | pnpm |
| Hosting | Render.com |

---

## Directory map

```
/home/user/rivers-lodge-2026/
│
├── CLAUDE.md                  ← master guide (this file)
├── OPERATOR.md                ← quick operator cheat sheet
├── .claudeignore              ← files Claude skips
├── .claude/settings.json      ← Claude Code project permissions
├── context/
│   └── session-summary.md     ← live handoff state (read on every session start)
│
├── features/                  ← ALL application code (vertical slices)
│   ├── _core/
│   │   ├── server/app.ts      ← Express entry point
│   │   ├── server/router.ts   ← Root tRPC router (mounts all feature routers)
│   │   ├── server/db.ts       ← Drizzle ORM client
│   │   ├── server/env.ts      ← Env var schema (add new vars here first)
│   │   └── client/
│   │       ├── App.tsx        ← Wouter router — ALL routes registered here
│   │       ├── main.tsx       ← React DOM entry
│   │       └── index.css      ← Tailwind @theme, brand tokens, component classes
│   ├── _shared/
│   │   ├── ui/                ← 50+ shadcn/ui primitives
│   │   ├── components/        ← SEOHead, DashboardLayout, Picture, etc.
│   │   ├── hooks/             ← useMobile, useScrollAnimation, etc.
│   │   └── lib/trpc.ts        ← Type-safe tRPC client + React Query hooks
│   ├── public-pages/
│   │   └── components/
│   │       ├── PublicNav.tsx       ← site navigation
│   │       ├── PublicFooter.tsx    ← footer
│   │       └── PublicLayout.tsx    ← public page wrapper
│   │
│   ├── marketing/             ← /  /gallery  /contact  /privacy  /outdoors
│   ├── weddings/              ← /events  /weddings  /venues
│   ├── lodging/               ← /lodging  /estate
│   ├── membership/            ← /membership  /membership/benefits  /membership/faq
│   ├── hunt-fish/             ← /hunt  /fish
│   ├── about/                 ← /about  /about/team  /about/property
│   ├── corporate/             ← /corporate
│   ├── food-and-wine/         ← /food-and-wine
│   ├── inquiries/             ← /inquiry-confirmed + InquiryForm + StickyInquiryCTA
│   ├── waivers/               ← /sign-waiver/:token + PDF generation
│   ├── auth/                  ← /sign-in + Clerk session management
│   ├── portal/                ← /portal  /portal/my-bookings  /portal/properties
│   ├── booking-engine/        ← availability engine (embedded in portal)
│   ├── trips/                 ← hunt/fish slot calendar
│   ├── admin/                 ← /ops/* staff operations portal
│   ├── cms/                   ← FAQ, testimonials, gallery (DB-backed)
│   ├── messages/              ← member ↔ staff concierge messaging
│   ├── reports/               ← /ops/field-reports  /ops/newsletter
│   ├── updates/               ← seasonal field updates
│   └── property-booking/      ← self-service hunt property booking
│
├── client/
│   ├── index.html             ← Vite SPA entry + Google Fonts links
│   └── public/
│       ├── img/               ← photography assets (NEVER delete)
│       └── brand/             ← logo variants (1.png–13.png)
│
├── server/                    ← legacy test stubs only (real server in _core)
├── scripts/                   ← build/utility scripts
├── docs/                      ← architecture documentation
├── package.json               ← pnpm workspace + scripts
├── vite.config.ts             ← Vite + path aliases (@core, @shared, @features)
├── drizzle.config.ts          ← ORM config
├── render.yaml                ← Render hosting service definition
├── tsconfig.json
└── eslint.config.js           ← plugin-boundaries enforces vertical slice rules
```

---

## Feature → route map

| Feature | Routes | Auth |
|---|---|---|
| `marketing` | `/` `/gallery` `/contact` `/privacy` | Public |
| `weddings` | `/events` `/weddings` `/venues` | Public |
| `lodging` | `/lodging` `/estate` | Public |
| `membership` | `/membership` `/membership/benefits` `/membership/faq` | Public |
| `hunt-fish` | `/hunt` `/fish` | Public |
| `about` | `/about` `/about/team` `/about/property` | Public |
| `corporate` | `/corporate` | Public |
| `food-and-wine` | `/food-and-wine` | Public |
| `inquiries` | `/inquiry-confirmed` | Public |
| `waivers` | `/sign-waiver/:token` | Public |
| `auth` | `/sign-in` `/sign-up` | — |
| `portal` | `/portal` `/portal/my-bookings` `/portal/properties` | Member |
| `admin` | `/ops/*` (15+ sub-routes) | Staff role |

---

## Design system

**File:** `features/_core/client/index.css`

### Brand color tokens

| CSS var | Hex | Role |
|---|---|---|
| `--rl-night` / `--background` | `#2B2823` | Primary background |
| `--rl-sand` / `--foreground` | `#E0D3BD` | Primary text on dark |
| `--rl-clay` / `--gold` | `#9B4D19` | CTA / primary accent |
| `--rl-grass` / `--sage` | `#6B7250` | Membership / hunt-fish accent |
| `--rl-sage` | `#BABAAE` | Muted text |
| `--rl-river` | `#576276` | Secondary accent |
| `--surface` | `#363330` | Card / alternate section bg |
| `--surface-raised` | `#423F3B` | Elevated surface |
| `--border` | `#57544E` | Dividers |

### Fonts

| Family | Weights | Usage |
|---|---|---|
| Montserrat | 400, 500, 600 | H1, H3, eyebrows, buttons |
| Crimson Text | 400, 400 italic | H2, body copy, pull quotes |

**Hierarchy:** H1/H3 → Montserrat uppercase (letter-spacing 0.08em) · H2 → Crimson Text italic · Body → Crimson Text

### Named component classes
`.eyebrow` `.btn-primary` `.btn-outline` `.btn-ghost` `.link-arrow`
`.section` `.gold-rule` `.fade-up` `.text-warm` `.text-muted-brand`
`.bg-surface` `.bg-surface-raised`

### Safe image placeholder pattern
```tsx
<div className="relative aspect-[4/3] overflow-hidden">
  <div className="absolute inset-0 bg-[#2B2823] flex items-center justify-center" aria-hidden="true">
    <span className="text-[10px] tracking-[0.18em] uppercase font-sans text-white/30 select-none">
      Label
    </span>
  </div>
  <img
    src={src} alt={alt}
    className="absolute inset-0 w-full h-full object-cover"
    loading="lazy"
    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
  />
</div>
```

---

## Coding conventions

### Vertical slice law
```
✅  import { X } from 'features/trips/client/public'       ← barrel only
✅  import { trpc } from '@shared/lib/trpc'
❌  import X from 'features/trips/client/components/X'     ← bypass public.ts
❌  import X from 'features/booking-engine/server/router'  ← server in client
```

### File naming
- Components: `PascalCase.tsx`
- Utilities / hooks: `camelCase.ts`
- Routes: kebab-case URLs

### Import aliases (vite.config.ts)
```
@core     → features/_core
@shared   → features/_shared
@features → features
```

### New feature checklist
1. Create `features/<name>/` folder
2. Add `schema.ts` (if DB), `types.ts`, `public.ts`
3. Add `server/router.ts`, mount in `features/_core/server/router.ts`
4. Add pages to `client/pages/`
5. Register routes in `features/_core/client/App.tsx`

---

## Commands

```bash
pnpm dev        # local dev — Vite + Express watch mode
pnpm build      # production build
pnpm test       # Vitest unit tests
pnpm lint       # ESLint — run before every PR
pnpm db:push    # push Drizzle schema to DB
```

---

## Git & deployment workflow

```bash
# 1. Feature branch — never commit to main directly
git checkout -b claude/<feature-name>

# 2. Stage specific files, commit, push
git add features/path/to/file.tsx
git commit -m "feat: describe the change"
git push -u origin claude/<feature-name>

# 3. Open PR → squash merge (GitHub MCP tools or UI)

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

## Wrap-up protocol

**Trigger phrase: "wrap up"**

When I say "wrap up", do the following before ending the session:

1. Update `context/session-summary.md` with:
   - **Completed this session** — bullet list of what was done, with PR numbers if applicable
   - **In progress / pending** — anything started but not finished
   - **Key decisions** — architectural or content choices made
   - **Blockers** — anything waiting on external input
   - **Recommended next command** — exact shell command or file to open next session
   - **Recommended next file** — the most important file to review or edit next
   - **Last updated** — date/time

2. Commit `context/session-summary.md`:
   ```bash
   git add context/session-summary.md
   git commit -m "chore: update session summary"
   git push origin main
   ```

3. Confirm the commit was pushed.

---

## PR history

| PR | Description |
|---|---|
| #26 | Nav restructure — 6-item nav with 4 dropdowns, 5 scaffolded pages |
| #27 | Homepage simplification — hero + 3 teasers |
| #28 | Brand standards — Montserrat + Crimson Text, RL color palette tokens site-wide |
| #29 | Remove images from /lodging and /gallery (source files preserved) |
| #43 | Site-wide image performance hardening (`<Picture>` + srcset + cache headers) |
| #44 | Fix: swap Fishing pursuit card image |

---

## Start here next

| Task | File |
|---|---|
| Homepage | `features/marketing/client/pages/Home.tsx` |
| Membership tiers | `features/membership/client/pages/Membership.tsx` |
| Membership FAQ | `features/membership/client/pages/MembershipFaq.tsx` |
| Weddings / Events | `features/weddings/client/pages/WeddingsLanding.tsx` |
| Lodging properties | `features/lodging/client/pages/Lodging.tsx` |
| Nav / footer | `features/public-pages/components/PublicNav.tsx` |
| Brand tokens / fonts | `features/_core/client/index.css` |
| Add a new route | `features/_core/client/App.tsx` |
| Deployment config | `render.yaml` |
| Photography | `client/public/img/` |
| Session state | `context/session-summary.md` |
