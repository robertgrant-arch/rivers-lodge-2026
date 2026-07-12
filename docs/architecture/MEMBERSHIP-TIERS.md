# Rivers Lodge Membership Tiers — Architecture & Implementation Plan

**Status:** DRAFT — owner-approved, pending Phase 1 build kickoff  
**Last Updated:** July 12, 2026  
**Author:** Claude Code on behalf of Rivers Lodge owner

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Tier Matrix](#tier-matrix)
3. [Social Parent Organization Model](#social-parent-organization-model)
4. [Locked Owner Decisions](#locked-owner-decisions)
5. [Data Model & Schema](#data-model--schema)
6. [Server API & RBAC](#server-api--rbac)
7. [Client-Side Conditional Rendering](#client-side-conditional-rendering)
8. [Admin Operations Portal UI](#admin-operations-portal-ui)
9. [Phased Rollout Plan](#phased-rollout-plan)
10. [Open Questions & Deferred Items](#open-questions--deferred-items)
11. [Change Log](#change-log)

---

## Executive Summary

Rivers Lodge operates a **three-tier membership system** (Designated, Silver, Social) with role-based access control across both the Member Portal and Operations Portal. **Social members are organized under Social Parent Organizations**, each with a shared annual property-day allowance (e.g., Five Elms Capital: 40 property-days per annual period). The system enforces tier-specific capabilities at the data layer (server-side RBAC), backend endpoint guards, and client-side UI conditional rendering. Admins manage member tier assignments, create/edit Social parent organizations, adjust allowances, and review audit logs via the Operations Portal. A phased rollout spans schema setup, admin UI, member-facing conditional views, and booking-flow enforcement.

---

## Tier Matrix

| Tier | Master Calendar | Properties List | Can Book Properties | Can Book Events | Property-Day Cap | Event Cap |
|------|---|---|---|---|---|---|
| **Designated** | ✅ Full access | ✅ Full access | ✅ Unlimited | ✅ Unlimited | None | None |
| **Silver** | ❌ Hidden | ❌ Hidden | ❌ Blocked | ✅ Unlimited (guided events only) | N/A | None |
| **Social** | ❌ Hidden | ✅ Full access | ✅ Limited per org pool | ✅ Unlimited | ✅ Org's annual allowance (shared with other org members) | None |

---

## Social Parent Organization Model

### Entity Definition

A **Social Parent Organization** represents a corporate or institutional entity that purchases a Social membership tier. All Social members under an org share a single annual property-day allowance.

```typescript
// Drizzle Schema
export const socialParentOrganization = pgTable("social_parent_organization", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),  // e.g., "Five Elms Capital"
  annualBookingAllowance: integer("annual_booking_allowance").notNull(),  // property-days (e.g., 40)
  periodStartDate: date("period_start_date").notNull(),  // org's annual period begins this date (e.g., 2026-09-01)
  notes: text("notes"),  // admin-only description
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Relationship to Social Members

Every Social member is required to belong to exactly one social_parent_organization:

```typescript
// Members table changes
membershipType: "DESIGNATED" | "SILVER" | "SOCIAL"  // NOT NULL
socialParentOrganizationId: integer("social_parent_organization_id") 
  // REQUIRED for SOCIAL members (FK to socialParentOrganization.id)
  // NULL for DESIGNATED and SILVER members
```

### Shared Allowance Pool

- One `annualBookingAllowance` applies to ALL Social members under a single org.
- Any Social member's property booking decrements the shared org-level pool.
- **Example:** Five Elms Capital has 5 Social users and a 40-property-day allowance. If member A books 15 days, the org now has 25 days remaining (all members draw from the same 25).

### Annual Period & Org-Specific Period Boundaries

Each org has its own `periodStartDate`, which anchors the annual usage period:
- Org's annual period runs from `periodStartDate` through the same date + 1 year.
- **Example:** Five Elms Capital with `periodStartDate = 2026-09-01` has an annual period of 9/1/2026 → 8/31/2027.
- Usage counter resets annually on the org's period boundary (not calendar-aligned across all orgs).

### Cross-Period Booking Rule

If a Social member books a stay that spans the org's period boundary:
- The **entire booking counts against the period containing the start date**.
- **No splitting** across periods.
- **Example:** Five Elms' period ends 8/31/2027. A 4-day stay from 8/30/2027 → 9/3/2027 counts entirely against the period ending 8/31 (not split 1 day + 3 days).

### Booking Unit Definition

- **1 booking = 1 property × 1 day**
- A 2-day stay at one property = 2 bookings
- A 1-day stay at 2 different properties = 2 bookings
- Event bookings are NOT counted toward the property-day cap

### Seed Data Plan

- **Organization:** Five Elms Capital
- **Annual Allowance:** 40 property-days (to be confirmed by owner)
- **Period Start Date:** TBD (owner will provide contract start date or fiscal year anchor)

---

## Locked Owner Decisions

1. **Usage Period Boundary:** Each Social Parent Organization sets its own annual period anchor (period_start_date). Usage is org-specific, not calendar-aligned.

2. **Cross-Period Booking Counting:** When a Social member books a stay that spans the org's period boundary, the entire booking counts against the period containing the start date. No splitting across periods.

3. **Admin Cap Override:** Admins can adjust an org's annual_booking_allowance at any time (e.g., grant additional days, reset counter). All adjustments are audit-logged with: admin user ID, timestamp, reason, and delta (old → new allowance).

4. **Pricing Visibility:** Event and property pricing are visible to all membership tiers (Designated, Silver, Social). Do NOT gate pricing by tier.

5. **Tier Downgrade Handling:** No automatic downgrade logic. Owner handles tier changes manually if needed. Out of scope for Phase 1.

6. **Event Booking Limits:** No caps by tier. All members with event access (Designated, Silver, Social) can book unlimited events.

7. **No UNASSIGNED State:** Every member MUST have a membership_type assigned at account creation. There is no UNASSIGNED or default state. Signup/invite flows require membership_type as a mandatory field. For Social members, require social_parent_organization_id assignment as well.

8. **Reporting & Analytics:** Admin reporting is segmented by membership_type and by Social parent organization. All reports support CSV export.

---

## Data Model & Schema

### MembershipType Enum

```typescript
enum("membership_type", ["DESIGNATED", "SILVER", "SOCIAL"])

type MembershipType = "DESIGNATED" | "SILVER" | "SOCIAL";
```

### Members Table Changes

```typescript
membershipType: varchar("membership_type").notNull()  // REQUIRED — no default

socialParentOrganizationId: integer("social_parent_organization_id")  // FK, nullable
  .references(() => socialParentOrganization.id, { onDelete: "cascade" })
  // REQUIRED for SOCIAL members; NULL for DESIGNATED/SILVER
```

### Social Parent Organization Table

```typescript
export const socialParentOrganization = pgTable("social_parent_organization", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  annualBookingAllowance: integer("annual_booking_allowance").notNull(),
  periodStartDate: date("period_start_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Social Organization Usage Table

Tracks cumulative property-day usage for a Social Parent Organization within its annual period.

```typescript
export const socialOrganizationUsage = pgTable("social_organization_usage", {
  id: serial("id").primaryKey(),
  socialParentOrganizationId: integer("social_parent_organization_id").notNull()
    .references(() => socialParentOrganization.id, { onDelete: "cascade" }),
  periodStartDate: date("period_start_date").notNull(),  // matches org's period anchor
  propertyDaysUsed: integer("property_days_used").notNull().default(0),  // cumulative
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniq: uniqueIndex("social_org_usage_period").on(
    table.socialParentOrganizationId,
    table.periodStartDate
  ),
}));
```

### Membership Audit Log Table

Tracks all tier changes, allowance adjustments, and manual counter modifications.

```typescript
export const membershipAudit = pgTable("membership_audit", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  action: varchar("action").notNull(),  // "TIER_CHANGED", "USAGE_ADJUSTED", "ALLOWANCE_ADJUSTED", etc.
  oldValue: varchar("old_value"),  // previous state (e.g., "DESIGNATED" or "propertyDaysUsed: 10")
  newValue: varchar("new_value"),  // new state
  reason: text("reason"),  // admin-provided note
  changedBy: varchar("changed_by").notNull(),  // admin user ID or "system"
  changedAt: timestamp("changed_at").defaultNow(),
});
```

### Migration Notes

1. Add `membershipType` column to members table (NOT NULL, no default).
2. Create `social_parent_organization` table.
3. Add `social_parent_organization_id` FK to members table (nullable).
4. Create `social_organization_usage` table.
5. Create `membership_audit` table.
6. **Backfill existing members:** Owner must assign each existing member a tier (and social_parent_organization_id if Social) via admin UI before migration is complete.
7. No UNASSIGNED intermediate state — all members must have a tier assigned before Phase 1 goes live.

---

## Server API & RBAC

### Core RBAC Guards

#### `requireAuth(req)` → User

Standard authentication check; ensures user is logged in.

#### `requireTier(user, allowedTiers)` → Member

```typescript
export function requireTier(user: AuthUser, allowedTiers: MembershipType[]): Member {
  const member = db.select().from(members).where(eq(members.clerkId, user.id)).get();
  if (!member) throw new NotFoundError("Member record not found");
  if (!allowedTiers.includes(member.membershipType)) {
    throw new ForbiddenError(
      `Your membership tier (${member.membershipType}) does not have access to this feature.`
    );
  }
  return member;
}
```

- Applied at route handler level or middleware.
- Prevents Silver from ever accessing property lists or master calendar.
- Enforces tier-based access at the server layer.

#### `requireAdminRole(user, allowedRoles)` → Admin

Standard admin access check.

### Usage Check Middleware (Social Tier)

```typescript
export async function withUsageCheck(
  handler: (req, res, next) => Promise<void>
) {
  return async (req, res, next) => {
    const user = requireAuth(req);
    const member = requireTier(user, ["DESIGNATED", "SOCIAL"]);
    
    // Only Social members get the cap check
    if (member.membershipType === "SOCIAL") {
      const { checkIn, checkOut } = req.body;
      const propertyDays = computePropertyDays(checkIn, checkOut);
      const checkInDate = new Date(checkIn);
      
      const org = await getSocialParentOrganization(member.socialParentOrganizationId);
      const periodStartDate = getPeriodStartDate(checkInDate, org.periodStartDate);
      
      const usage = await getSocialOrgUsage(org.id, periodStartDate);
      const proposed = (usage?.propertyDaysUsed ?? 0) + propertyDays;
      
      if (proposed > org.annualBookingAllowance) {
        return res.status(400).json({
          error: "ORG_USAGE_LIMIT_EXCEEDED",
          message: `This booking would exceed ${org.name}'s allowance (${org.annualBookingAllowance} total).`,
          orgAllowance: org.annualBookingAllowance,
          orgUsed: usage.propertyDaysUsed,
          remainingDays: org.annualBookingAllowance - usage.propertyDaysUsed,
          requestedDays: propertyDays,
        });
      }
      
      req.orgUsage = { 
        periodStartDate, 
        propertyDays, 
        remaining: org.annualBookingAllowance - proposed,
        orgName: org.name,
      };
    }
    
    return handler(req, res, next);
  };
}
```

### Tier-Gated Endpoints

| Endpoint | Method | Designated | Silver | Social | RBAC Guard |
|---|---|---|---|---|---|
| GET `/api/properties` | GET | ✅ | ❌ | ✅ | `requireTier(['DESIGNATED', 'SOCIAL'])` |
| GET `/api/calendar/master` | GET | ✅ | ❌ | ❌ | `requireTier(['DESIGNATED'])` |
| GET `/api/events` | GET | ✅ | ✅ | ✅ | `requireTier(['DESIGNATED', 'SILVER', 'SOCIAL'])` |
| POST `/api/bookings/property` | POST | ✅ | ❌ | ✅ | `requireTier(['DESIGNATED', 'SOCIAL'])` + `withUsageCheck` (for Social) |
| POST `/api/bookings/event` | POST | ✅ | ✅ | ✅ | `requireTier(['DESIGNATED', 'SILVER', 'SOCIAL'])` |
| GET `/api/member/usage` | GET | ✅ | ✅ | ✅ | `requireTier(['DESIGNATED', 'SILVER', 'SOCIAL'])` |

### Admin Endpoints (Operations Portal)

| Endpoint | Method | Purpose | Guard |
|---|---|---|---|
| PATCH `/api/admin/members/:id/tier` | PATCH | Change member tier; audit log | `requireAdminRole(['manager', 'superadmin'])` |
| GET `/api/admin/audit/:memberId` | GET | Fetch audit log for member | `requireAdminRole(['manager', 'superadmin'])` |
| GET `/api/admin/social-orgs` | GET | List all Social Parent Orgs | `requireAdminRole(['manager', 'superadmin'])` |
| POST `/api/admin/social-orgs` | POST | Create Social Parent Org | `requireAdminRole(['manager', 'superadmin'])` |
| GET `/api/admin/social-orgs/:id` | GET | Org details (members, usage) | `requireAdminRole(['manager', 'superadmin'])` |
| PATCH `/api/admin/social-orgs/:id` | PATCH | Update org name/notes | `requireAdminRole(['manager', 'superadmin'])` |
| PATCH `/api/admin/social-orgs/:id/allowance` | PATCH | Adjust allowance; audit log | `requireAdminRole(['manager', 'superadmin'])` |
| GET `/api/admin/social-orgs/:id/members` | GET | List Social members in org | `requireAdminRole(['manager', 'superadmin'])` |
| GET `/api/admin/social-orgs/:id/usage` | GET | Org's current usage stats | `requireAdminRole(['manager', 'superadmin'])` |
| GET `/api/admin/social-orgs/:id/usage-history` | GET | Bookings by org members | `requireAdminRole(['manager', 'superadmin'])` |
| GET `/api/admin/reports/members` | GET | Members roster (CSV export) | `requireAdminRole(['manager', 'superadmin'])` |
| GET `/api/admin/reports/bookings` | GET | Bookings report (CSV export) | `requireAdminRole(['manager', 'superadmin'])` |
| GET `/api/admin/reports/revenue` | GET | Revenue by tier (CSV export) | `requireAdminRole(['manager', 'superadmin'])` |
| GET `/api/admin/reports/social-org-usage` | GET | Social org usage report (CSV export) | `requireAdminRole(['manager', 'superadmin'])` |
| GET `/api/admin/reports/social-members-by-org/:orgId` | GET | Per-member usage in org (CSV export) | `requireAdminRole(['manager', 'superadmin'])` |

---

## Client-Side Conditional Rendering

### Navigation Gating

Based on `member.membershipType`:

```typescript
export function MemberNavigation({ member }) {
  return (
    <>
      {/* All tiers */}
      <NavItem href="/portal/my-bookings" label="My Bookings" />
      <NavItem href="/portal/events" label="Events" />
      
      {/* Designated & Social only (NOT Silver) */}
      {(member.membershipType === "DESIGNATED" || member.membershipType === "SOCIAL") && (
        <NavItem href="/portal/properties" label="Properties" />
      )}
      
      {/* Designated only (NOT Silver or Social) */}
      {member.membershipType === "DESIGNATED" && (
        <NavItem href="/portal/master-calendar" label="Master Calendar" />
      )}
      
      {/* Social only: show remaining balance */}
      {member.membershipType === "SOCIAL" && (
        <NavItem href="/portal/usage" label={`Property Days (${remaining}/${org.annualBookingAllowance})`} />
      )}
    </>
  );
}
```

### Dashboard Tiles

Conditional rendering based on tier:

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <BookingsCard />
  <EventsCard />
  
  {/* Designated & Social */}
  {["DESIGNATED", "SOCIAL"].includes(member.membershipType) && (
    <PropertiesCard />
  )}
  
  {/* Designated only */}
  {member.membershipType === "DESIGNATED" && (
    <MasterCalendarCard />
  )}
  
  {/* Social only: org usage display */}
  {member.membershipType === "SOCIAL" && (
    <OrgUsageCard org={org} usage={usage} />
  )}
</div>
```

### Booking Form Variants

- **Silver:** Events-only picker (no property selection UI ever shown)
- **Social:** Property picker + org's remaining-balance display
- **Designated:** Property picker (unlimited) + master calendar for context

---

## Admin Operations Portal UI

### Member Management

**Member Edit Form (existing + new fields):**
- Name, email, tier (required dropdown)
- For Social members: required dropdown to select existing Social Parent Organization or inline create-new-org button
- Audit log link (view all changes for this member)

### Social Parent Organizations Section (`/ops/social-orgs`)

#### Organizations List

- Table: name, annual allowance, period start date, YTD usage, remaining, member count
- Actions: view details, edit, delete (with cascade warning)
- Buttons: + Create Organization, bulk export (CSV)

#### Organization Details Page (`/ops/social-orgs/:id`)

**Summary Card:**
- Org name, annual allowance, period (start date → +1 year)
- YTD usage: X / [allowance] property-days, remaining: [balance]
- Button: Adjust Allowance

**Members Tab:**
- Table: member name, email, YTD property-days, booking count
- Action: view member detail, remove from org

**Usage History Tab:**
- Table: member name, property name, check-in, check-out, property-days, booked date
- Pagination, search, export to CSV
- All bookings made by org members in the current period

**Allowance Adjustment UI:**
- Modal: current allowance, new allowance (input), reason (text field)
- Submit → audit log entry created with: admin ID, timestamp, reason, delta (old → new)

### Audit Log View (`/ops/members/:id/audit` or `/ops/audit-log`)

- Table: timestamp, action type, old value, new value, reason, admin user
- Filterable by member, action type, date range
- Read-only (audit trail is immutable)

### Reports Dashboard (`/ops/reports`)

1. **Member Roster Report**
   - Filters: tier (Designated/Silver/Social)
   - Columns: ID, name, email, tier, joined date
   - Export to CSV

2. **Bookings Report**
   - Filters: tier, date range
   - Columns: member name, tier, property/event, check-in, check-out, property-days, status
   - Export to CSV

3. **Revenue Report**
   - Filters: tier, date range
   - Summary: total revenue, by tier, average per booking
   - Breakdown by booking type
   - Export to CSV

4. **Social Organization Usage Report**
   - Columns: org name, annual allowance, YTD used, remaining, member count, period start date
   - Sortable by usage %, remaining, member count
   - Export to CSV

5. **Social Members by Organization Report**
   - Select org from dropdown
   - Columns: member name, YTD property-days used, booking count
   - Export to CSV

---

## Phased Rollout Plan

### Phase 1: Schema + Admin UI Setup (2–3 weeks)

**Deliverables:**
- Schema migration: add membership_type, social_parent_organization, social_organization_usage, membership_audit tables
- Backfill existing members with tier assignments (via admin UI or owner handoff)
- Member edit form: tier dropdown, org selector (for Social)
- Social Parent Organizations CRUD (list, create, edit, view members, view usage)
- Manual allowance adjustment (audit-logged)
- Reports dashboard (5 reports, CSV export)
- Audit log view

**Acceptance Criteria:**
- All existing members have a membershipType assigned
- Admin can create/edit Social parent orgs
- Admin can adjust allowance and see audit trail
- Reports export valid CSV

**Testing:**
- Admin UI smoke tests (create org, edit tier, adjust allowance)
- Audit log spot-checks
- CSV export validation
- Seed data verification (Five Elms Capital)

**Rollback Plan:**
- Reverse migration (drop new tables, remove columns)
- Restore members table to pre-Phase1 state

---

### Phase 2: Member-Facing Conditional Rendering (1 week)

**Deliverables:**
- Navigation gating: hide Properties and Master Calendar per tier
- Dashboard tiles: conditional render per tier
- Booking form variants: events-only for Silver, property picker for Social/Designated
- Client-side hooks for tier-based feature access

**Server-Side Enforcement (guards only, no booking restrictions yet):**
- GET `/api/properties` → requireTier(['DESIGNATED', 'SOCIAL'])
- GET `/api/calendar/master` → requireTier(['DESIGNATED'])
- All other tier-gated endpoints enforce guards (rejection, not redirect)

**Acceptance Criteria:**
- Silver members cannot see Properties nav item
- Silver members cannot see Master Calendar
- Booking forms render correctly per tier
- Forbidden endpoints return 403 Forbidden (not HTML error page)

**Testing:**
- E2E: each tier logs in, navigates, verifies visible sections
- E2E: Silver tries to navigate to /portal/properties → 403 or redirect to /portal
- API: call forbidden endpoint as Silver → 403 response

**Rollback Plan:**
- Revert client-side conditional rendering (all nav items always visible)
- Keep server-side guards (safe; they don't break existing functionality)

---

### Phase 3: Social Org-Level Allowance Enforcement (1–2 weeks)

**Deliverables:**
- POST `/api/bookings/property` implements `withUsageCheck` middleware
- Usage counter increment on booking confirm (org-level, not per-member)
- Property booking form: display "X remaining for [Org Name]" for Social members
- Reject booking if proposed usage exceeds org allowance (unless admin override)
- Admin cap-override control (audit-logged: admin, timestamp, reason, delta)
- Period-date calculation logic (based on org's periodStartDate, not fixed 8/1)

**Acceptance Criteria:**
- Social member books 25 days, org shows 15 remaining (40-cap example)
- Second Social member under same org tries to book 20 days → rejected with remaining-balance msg
- Admin can grant 5 additional days (allowance becomes 45) → audit log updated
- Cross-period bookings: 4-day stay spanning period boundary counts entirely against start-date period

**Testing:**
- Integration: Social member books within cap → success, counter incremented
- Integration: Social member exceeds org cap → rejected with 400 error
- Integration: multiple Social members under same org draw from shared pool
- Integration: cross-period booking counts correctly
- E2E: Social member books property, sees remaining balance, second member is blocked when pool exhausted
- Admin override: adjust allowance, booking succeeds

**Rollback Plan:**
- Remove usage-check middleware
- Disable admin override UI
- Property bookings proceed without cap enforcement (allowance ignored)
- Usage counters are not decremented on new bookings

---

## Open Questions & Deferred Items

### Decisions Still Needed from Owner

1. **Five Elms Capital Period Start Date:** Owner to provide contract start date or preferred fiscal-year anchor (e.g., September 1, 2026).

2. **Additional Social Parent Organizations:** How many total orgs exist today? If more than Five Elms, provide names and allowances for each.

3. **Existing Members Tier Assignment:** Owner must assign each of the 2 existing members a tier (DESIGNATED, SILVER, or SOCIAL) before Phase 1 migration. If Social, also assign to an organization.

### Deferred to Post-Phase-1

1. **Tier Downgrade Automation:** No automatic handling if Designated → Silver conversion. Manual process only.

2. **Member-Visible Remaining-Balance Widget Styling:** Phase 3 delivers the display; design/styling TBD.

3. **Bulk Member Import:** If orgs expand with 10+ new Social members, batch-import tooling may be needed. Currently manual invite-per-member.

4. **Real-Time Sync of Allowance Across Members:** Admin adjusts allowance mid-period; does UI need to refresh for all org members? Decided: no real-time notification; next page-load sees new balance. Audit log is durable.

5. **Event Booking Slot Reservation:** Events do not consume property-day cap. No separate event-slot limits. (Already decided: no event caps.)

6. **Member Portal Usage Widget (Social Only):** Design TBD (progress bar, text, icon). Phase 3 implements the data; design is cosmetic post-launch.

---

## Change Log

### Commits Included in This Consolidation

1. **6e1fc45** — `docs(architecture): lock membership tier decisions per owner (period 8/1, admin override, reporting)`
   - Added DECISIONS section with owner's 8 answers
   - Changed usage model from per-member to per-period (period_start_date key)
   - Updated audit log to track deltas
   - Removed UNASSIGNED tier references
   - Added reporting endpoints

2. **f617a61** — `docs(architecture): revise social tier to use parent-organization model (shared allowance)`
   - Major model revision: Social members grouped under Social Parent Organizations
   - Shared allowance pool per org (not per member)
   - Org-specific period_start_date (not fixed 8/1)
   - Updated admin UI to manage orgs (not per-member usage adjustment)
   - Added 2 new reporting endpoints (org-level and per-member-in-org)
   - Updated Phase 1 checklist with org-management items

3. **232c2c8** — `copy: replace 'estate' with 'lodge' in user-facing text (keep /estate route, keep homepage hero)`
   - Copy edits only; not architectural. Included for completeness.

---

## Appendix: Quick Reference

### Key Data Types

- **MembershipType:** "DESIGNATED" | "SILVER" | "SOCIAL"
- **Annual Period:** org-specific (periodStartDate → +1 year)
- **Booking Unit:** 1 property × 1 day = 1 "property-day"
- **Org Pool:** shared across ALL Social members in that org

### Critical Rules (Server-Side Enforced)

1. All tier checks happen server-side via `requireTier()`
2. Social property bookings checked via `withUsageCheck()` before booking is created
3. Period dates computed from org.periodStartDate, not fixed 8/1
4. Admin allowance adjustments are audit-logged and permanent immediately
5. Pricing is visible to all tiers (no gating)
6. Events have no booking cap (unlimited by tier)

### Terminology

- **Social Parent Organization:** corporate/institutional entity with shared property-day allowance
- **Designated Member:** full access (properties, calendar, events, unlimited)
- **Silver Member:** events-only (no property visibility)
- **Social Member:** property-capped (draws from org's shared allowance)
- **Property-Day:** 1 property × 1 day consumed from Social org allowance
- **Master Calendar:** Designated-only view of all estate closures and events

