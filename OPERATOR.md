# Rivers Lodge — Operator's Cheat Sheet

Quick reference for day-to-day content, engineering, and deployment work.
Full architecture details: see CLAUDE.md.

---

## Where content lives

### Homepage
`features/marketing/client/pages/Home.tsx`
Hero slideshow sources in `HERO_SLIDES[]` at top of file.
Three teasers below (The Estate, Stay & Gather, Membership).
Photography: `client/public/img/`

### Membership
```
features/membership/client/pages/Membership.tsx          ← tiers & pricing
features/membership/client/pages/MembershipBenefits.tsx  ← benefits detail
features/membership/client/pages/MembershipFaq.tsx       ← FAQ (content placeholder)
features/membership/server/router.ts                     ← tRPC: membership data
features/membership/schema.ts                            ← DB schema
```

### Weddings & Events
```
features/weddings/client/pages/WeddingsLanding.tsx  ← /events  (primary CTA page)
features/weddings/client/pages/Weddings.tsx          ← /weddings
features/weddings/client/pages/Venues.tsx            ← /venues
```

### Lodging
`features/lodging/client/pages/Lodging.tsx`
Property data lives in the `FALLBACK_LODGING` constant at the top of that file —
names, copy, bed counts, amenities, and image src fields.
CMS overrides the static data when DB records exist via `trpc.cms.getLodgingUnits`.

### Contact & Inquiries
```
features/marketing/client/pages/Contact.tsx                 ← /contact page
features/inquiries/client/components/InquiryForm.tsx        ← form component (used site-wide)
features/inquiries/client/components/StickyInquiryCTA.tsx   ← floating CTA button
features/inquiries/server/router.ts                         ← form submission handler
```

### Sign-in & Member Portal
```
features/auth/client/LoginButton.tsx           ← sign-in button (in nav)
features/portal/client/pages/MemberPortal.tsx  ← /portal  member dashboard
features/portal/client/pages/MyBookings.tsx    ← /portal/my-bookings
features/portal/client/pages/PropertyBrowser.tsx ← /portal/properties
```
Auth is Clerk-managed. Keys live in Render env vars — nothing to edit in the repo.

### Admin & Ops Tools
```
features/admin/client/pages/PortalDashboard.tsx  ← /ops root
features/admin/client/pages/Portal*.tsx          ← all /ops/* sub-pages
features/admin/client/components/PortalLayout.tsx ← sidebar shell
```
Access `/ops` by signing in with a staff-role Clerk account.

### Nav, Footer, Layout
```
features/public-pages/components/PublicNav.tsx     ← full nav (dropdowns, mobile, portal link)
features/public-pages/components/PublicFooter.tsx  ← footer links + legal
features/public-pages/components/PublicLayout.tsx  ← wrapper used by all public pages
```

### Design System (colors, fonts, spacing)
```
features/_core/client/index.css   ← ALL brand tokens, Tailwind @theme, component classes
client/index.html                 ← Google Fonts <link> tags
```

### App Router (add new routes here)
`features/_core/client/App.tsx`

### Render Deployment Config
```
render.yaml                      ← service definition (health check, region, build/start)
features/_core/server/env.ts     ← env var schema (add new vars here first)
```
Env var values are set in the Render dashboard — not in the repo.

---

## Commands

```bash
pnpm dev        # local development (Vite + Express watch mode)
pnpm build      # production build (Vite client + esbuild server)
pnpm test       # run Vitest unit tests
pnpm lint       # ESLint — enforces vertical-slice boundaries; run before every PR
pnpm db:push    # push Drizzle schema changes to the database
```

---

## Safe deploy sequence

```bash
# 1. Work on a feature branch — never commit straight to main
git checkout -b claude/<feature-name>

# 2. Make changes, stage specific files (never git add -A blindly)
git add features/path/to/changed/file.tsx
git commit -m "feat: describe the change"
git push -u origin claude/<feature-name>

# 3. Open PR → squash merge (via GitHub MCP tools or GitHub UI)

# 4. Pull merged main and trigger Render deploy
git checkout main && git pull origin main
git commit --allow-empty -m "chore: trigger Render production deploy (<feature> — PR #N)"
git push origin main
```

Render auto-deploys on any push to `main`.

### Hard rules
- Always PR → squash merge → deploy. Never push directly to `main`.
- Never `git push --force` on any branch.
- Run `pnpm lint` before opening a PR.
- Never delete files from `client/public/img/` — clear `src=""` instead.
- Never invent copy, prices, or details not provided by the client.
- Never change the logo.

---

## Standing session rule

**Generate or confirm CLAUDE.md and OPERATOR.md before making any code changes.**
Both files must be committed and current before engineering work begins in any session.
