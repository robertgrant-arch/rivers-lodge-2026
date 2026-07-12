# Membership Tiers Architecture & Implementation Plan

**Status:** Planning Phase (no implementation code written)  
**Date:** July 2026  
**Target Rollout:** Phase 1 Q3 2026

---

## 0. DECISIONS (Locked)

**Owner has approved the following constraints and requirements:**

1. **Usage Period Boundary:** 8/1 → 7/31 (not calendar year). Social parent organizations set their own period_start_date (e.g., contract start or fiscal year). The annual period for each org runs from period_start_date → period_start_date + 1 year.

2. **Cross-Period Bookings:** When a Social member books a stay that spans the period boundary (e.g., org period ends 7/31 and member books 7/30 → 8/2), the ENTIRE booking counts against the period where the start date falls. No splitting across periods.

3. **Social Tier Structure:** Social members are grouped under a **Social Parent Organization**. Each org has a shared annual_booking_allowance (e.g., 40 property-days) that ALL members under that org share from a single pool. Individual Social members do NOT have per-member caps; they draw from their org's allowance.

4. **Admin Cap Override:** Admins may adjust the annual_booking_allowance for a Social Parent Organization at any time (grant additional days, reset usage, comp). Every adjustment must be logged in audit trail with: admin user ID, timestamp, reason, and delta (old → new allowance).

5. **Pricing Visibility:** Event and property pricing are visible to all membership tiers. Do NOT gate pricing by tier. (All members will eventually see only members-only bookings, so transparency is acceptable.)

6. **Tier Downgrade Handling:** Skip automatic downgrade logic. Owner will handle manually if needed. This is out of scope for Phase 1.

7. **Event Booking Limits:** No caps by tier. All members with event access can book unlimited events. (Silver = events-only; Designated/Social = events + property with property cap.)

8. **Membership Type at Account Creation:** Every member MUST have a membership_type assigned at account creation. There is no UNASSIGNED or default state. Signup/invite flows require membership_type as a mandatory field. For Social members: must also select/create a Social Parent Organization. Remove all references to UNASSIGNED tier.

9. **Admin Reporting:** Required. Admin needs member roster, bookings, revenue, and usage reports segmented by tier. Additionally: organization-level usage report showing per-org allowance, YTD usage, remaining balance, and breakdown by member within org. All with CSV export capability.

---

## 1. Executive Summary

This document outlines the architecture for a **three-tier membership system** (Designated, Silver, Social) with role-based access control across both the Member Portal and Operations Portal. Social members are organized under **Social Parent Organizations**, each with a shared annual property-day allowance. The system enforces tier-specific capabilities at the data layer (server-side RBAC), backend endpoint guards, and client-side UI conditional rendering.

**Key Objectives:**
- Tier-specific portal access and booking rights
- Admin ability to assign, change, and audit tier assignments
- Social tier organized under parent organizations with shared property-day allowance per org
- Enforcement of org-level annual booking caps with shared pool across all Social members in an org
- Full audit trail for membership changes, tier assignments, and usage adjustments

**Phased Rollout:** 3 phases spanning schema, admin UI, member-facing views, and enforcement.

---

## 2. Data Model & Schema Changes

### 2.1 Enum: MembershipType

```typescript
// PostgreSQL enum
enum("membership_type", ["DESIGNATED", "SILVER", "SOCIAL"])

// TypeScript type
type MembershipType = "DESIGNATED" | "SILVER" | "SOCIAL";
```

### 2.2 Social Parent Organization Table (New)

Represents a corporate or organizational entity that purchases a Social membership tier. All Social members under an org share the org's annual property-day allowance.

```typescript
export const socialParentOrganization = pgTable("social_parent_organization", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // e.g., "Five Elms Capital"
  annualBookingAllowance: integer("annual_booking_allowance").notNull(), // e.g., 40 property-days
  periodStartDate: date("period_start_date").notNull(), // e.g., 2026-09-01; the annual period runs from this date +1 year
  notes: text("notes"), // admin-only description (e.g., "5-seat license, contract through 2027")
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

- Each org has ONE allowance that is shared across ALL Social members under that org.
- period_start_date is set once at creation and defines the org's annual period boundary (e.g., if 2026-09-01, period runs 9/1/2026 → 8/31/2027).
- Admin can adjust annualBookingAllowance at any time (logged in audit trail).

### 2.3 Member Table Changes

**New columns:**
```typescript
membershipType: MembershipType  // REQUIRED — no default, no null
socialParentOrganizationId: integer("social_parent_organization_id")  // FK, REQUIRED for Social members only, NULL for Designated/Silver
```

- Every member MUST have a membership_type at account creation.
- If membershipType = "SOCIAL", socialParentOrganizationId is required and not null.
- If membershipType = "DESIGNATED" or "SILVER", socialParentOrganizationId is null.
- Signup/invite flows enforce this as a mandatory field.
- membershipType is mutable by admins (see audit log in 2.4).

### 2.4 Usage Tracking Table: `social_organization_usage`

Tracks cumulative property-day usage for a Social Parent Organization within its annual period. ONE row per org per annual period. All Social members under that org draw from this shared pool.

```typescript
// Drizzle schema
export const socialOrganizationUsage = pgTable("social_organization_usage", {
  id: serial("id").primaryKey(),
  socialParentOrganizationId: integer("social_parent_organization_id").notNull()
    .references(() => socialParentOrganization.id, { onDelete: "cascade" }),
  periodStartDate: date("period_start_date").notNull(), // e.g., 2026-09-01; matches org's period boundary
  propertyDaysUsed: integer("property_days_used").notNull().default(0), // cumulative count across all members in org
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniq: uniqueIndex("social_org_usage_period").on(table.socialParentOrganizationId, table.periodStartDate),
}));
```

- One row per Social Parent Organization per annual period.
- `periodStartDate` matches the org's period_start_date (e.g., org created with period_start_date=2026-09-01, so all usage rows for that org use 2026-09-01 as the key, representing the period 9/1/2026 → 8/31/2027).
- `propertyDaysUsed` is cumulative across ALL Social members under this org; incremented on each booking confirmation.
- Any Social member's booking decrements the org's shared pool (not an individual per-member counter).
- Scope: Property-day bookings only (not event bookings, not lodge-only stays, not guided experiences).
- When a Social member books a stay that spans the period boundary, the entire stay counts against the period containing the start date.

### 2.5 Audit Log Table: `membership_audit`

Tracks all tier changes and usage adjustments for compliance and troubleshooting.

```typescript
export const membershipAudit = pgTable("membership_audit", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  action: varchar("action"), // e.g., "TIER_CHANGED", "USAGE_ADJUSTED", "COUNTER_RESET"
  oldValue: varchar("old_value"), // JSON or string (e.g., "UNASSIGNED" or "propertyDaysUsed: 5")
  newValue: varchar("new_value"), // (e.g., "SILVER" or "propertyDaysUsed: 10")
  reason: text("reason"), // Admin-provided note (e.g., "Owner decision", "Comp 1 day")
  changedBy: varchar("changed_by"), // admin user ID or "system"
  changedAt: timestamp("changed_at").defaultNow(),
});
```

- Every tier mutation writes a row here.
- Every manual counter adjustment (admin grants credit, comps booking) writes a row.
- Retention: keep indefinitely for audit trail.

---

## 3. Server API & Endpoint Changes

### 3.1 Tier-Gated Endpoints Summary

| Endpoint | Method | Designated | Silver | Social | Notes |
|---|---|---|---|---|---|
| GET `/api/properties` (list + availability) | GET | ✅ | ❌ | ✅ | Silver can't browse properties at all |
| GET `/api/calendar/master` | GET | ✅ | ❌ | ❌ | Designated only |
| GET `/api/events` (guided events catalog) | GET | ✅ | ✅ | ✅ | All tiers can see events |
| POST `/api/bookings/property` (create property booking) | POST | ✅ | ❌ | ✅ (with cap check) | Social subject to 40-day cap |
| POST `/api/bookings/event` (create event booking) | POST | ✅ | ✅ | ✅ | All tiers can book events |
| GET `/api/member/usage` (usage info) | GET | ✅ | ✅ | ✅ | Social sees their 40-cap status; Designated/Silver see N/A |

### 3.2 New Endpoints (Admin/Operations Portal)

#### Member Management
| Endpoint | Method | Purpose |
|---|---|---|
| PATCH `/api/admin/members/:id/tier` | PATCH | Change member tier; log audit |
| GET `/api/admin/audit/:memberId` | GET | Fetch audit log for a member |

#### Social Parent Organization Management
| Endpoint | Method | Purpose |
|---|---|---|
| GET `/api/admin/social-orgs` | GET | List all Social Parent Organizations |
| POST `/api/admin/social-orgs` | POST | Create new Social Parent Organization |
| GET `/api/admin/social-orgs/:id` | GET | Get org details (name, allowance, period, usage, members) |
| PATCH `/api/admin/social-orgs/:id` | PATCH | Update org (name, notes, period_start_date) |
| PATCH `/api/admin/social-orgs/:id/allowance` | PATCH | Adjust org's annual_booking_allowance; log audit with delta |
| GET `/api/admin/social-orgs/:id/members` | GET | List all Social members under this org |
| GET `/api/admin/social-orgs/:id/usage` | GET | Get current-period usage stats for org (property-days used, remaining, per-member breakdown) |
| GET `/api/admin/social-orgs/:id/usage-history` | GET | Get all bookings made by members under this org (per-member, per-booking detail) |

### 3.3 Endpoint Implementation Details

#### GET `/api/properties` (Member-facing)

**Guard:** `requireAuth()` → `requireMembershipTier(['DESIGNATED', 'SOCIAL'])`

```typescript
// Pseudocode
export async function getProperties(req) {
  const user = requireAuth(req);
  const member = requireMembershipTier(user, ["DESIGNATED", "SOCIAL"]);
  
  // Return properties + current-year availability
  return getPropertiesWithAvailability();
}
```

#### GET `/api/calendar/master` (Member-facing)

**Guard:** `requireAuth()` → `requireMembershipTier(['DESIGNATED'])`

Returns the full estate calendar showing all events, closures, and existing bookings (for context).

#### POST `/api/bookings/property` (Member-facing)

**Guard:** `requireAuth()` → `requireMembershipTier(['DESIGNATED', 'SOCIAL'])` → `withUsageCheck` (for Social only)

```typescript
export async function createPropertyBooking(req) {
  const user = requireAuth(req);
  const member = requireMembershipTier(user, ["DESIGNATED", "SOCIAL"]);
  
  const { propertyId, checkIn, checkOut } = req.body;
  const propertyDays = computePropertyDays(checkIn, checkOut);
  
  // For Social tier, enforce org-level cap
  if (member.membershipType === "SOCIAL") {
    const checkInDate = new Date(checkIn);
    const org = await getSocialParentOrganization(member.socialParentOrganizationId);
    const periodStartDate = getPeriodStartDate(checkInDate, org.periodStartDate); // org's period boundary
    
    const usage = await getSocialOrgUsage(org.id, periodStartDate);
    const proposed = (usage?.propertyDaysUsed ?? 0) + propertyDays;
    
    if (proposed > org.annualBookingAllowance) {
      throw new TierLimitError(
        `Booking would exceed ${org.name}'s property-day allowance (${org.annualBookingAllowance} total). Your organization has ${org.annualBookingAllowance - usage.propertyDaysUsed} days remaining this period.`
      );
    }
  }
  
  // Create booking
  const booking = await createBooking({
    memberId: member.id,
    propertyId,
    checkIn,
    checkOut,
    status: "CONFIRMED",
  });
  
  // Increment usage counter for Social org
  if (member.membershipType === "SOCIAL") {
    const checkInDate = new Date(checkIn);
    const org = await getSocialParentOrganization(member.socialParentOrganizationId);
    const periodStartDate = getPeriodStartDate(checkInDate, org.periodStartDate);
    
    const oldCount = (await getSocialOrgUsage(org.id, periodStartDate))?.propertyDaysUsed ?? 0;
    const newCount = oldCount + propertyDays;
    
    await incrementSocialOrgUsage(org.id, periodStartDate, propertyDays);
    await logAudit(
      member.id, 
      "ORG_USAGE_ADJUSTED", 
      String(oldCount), 
      String(newCount), 
      `Booking ${booking.id} confirmed: +${propertyDays} property-days for ${org.name}`, 
      "system"
    );
  }
  
  let remainingBalance = null;
  if (member.membershipType === "SOCIAL") {
    const checkInDate = new Date(checkIn);
    const org = await getSocialParentOrganization(member.socialParentOrganizationId);
    const periodStartDate = getPeriodStartDate(checkInDate, org.periodStartDate);
    const usageCount = await getSocialOrgUsageCount(org.id, periodStartDate);
    remainingBalance = org.annualBookingAllowance - usageCount;
  }
  
  return { booking, remainingBalance };
}
```

#### POST `/api/bookings/event` (Member-facing)

**Guard:** `requireAuth()` → `requireMembershipTier(['DESIGNATED', 'SILVER', 'SOCIAL'])`

No usage caps; all tiers can book events.

#### PATCH `/api/admin/members/:id/tier` (Admin/Operations)

**Guard:** `requireAdmin()` → `requireAdminRole('manager' | 'superadmin')`

```typescript
export async function updateMemberTier(req) {
  const admin = requireAdminRole(req, ["manager", "superadmin"]);
  const { memberId } = req.params;
  const { newTier, reason } = req.body;
  
  const member = await getMember(memberId);
  const oldTier = member.membershipType;
  
  // Update
  await updateMember(memberId, { membershipType: newTier });
  
  // Audit
  await logAudit(memberId, "TIER_CHANGED", oldTier, newTier, reason, admin.id);
  
  return { success: true, member };
}
```

#### PATCH `/api/admin/members/:id/usage/adjust` (Admin/Operations)

**Guard:** `requireAdmin()` → `requireAdminRole('manager' | 'superadmin')`

Admin can manually adjust the property-day usage counter for a Social member. All adjustments (positive or negative) are logged in the audit trail with the admin's user ID, timestamp, and reason.

```typescript
export async function adjustMemberUsage(req) {
  const admin = requireAdminRole(req, ["manager", "superadmin"]);
  const { memberId } = req.params;
  const { periodStartDate, adjustment, reason } = req.body;
  // adjustment can be positive (grant) or negative (deduct)
  // periodStartDate is the 8/1 of the period, e.g., "2026-08-01"
  
  const member = await getMember(memberId);
  if (member.membershipType !== "SOCIAL") {
    throw new Error("Usage adjustment only applies to SOCIAL members");
  }
  
  const usage = await getMembershipUsage(memberId, periodStartDate);
  const oldCount = usage?.propertyDaysUsed ?? 0;
  const newCount = Math.max(0, oldCount + adjustment);
  
  await updateMembershipUsage(memberId, periodStartDate, newCount);
  await logAudit(
    memberId, 
    "USAGE_ADJUSTED", 
    String(oldCount), 
    String(newCount), 
    reason, 
    admin.id
  );
  
  return { success: true, periodStartDate, oldCount, newCount };
}
```

#### GET `/api/admin/audit/:memberId` (Admin/Operations)

**Guard:** `requireAdmin()` → `requireAdminRole('manager' | 'superadmin')`

Returns paginated audit log for the member, sorted by `changedAt` descending.

---

## 4. Middleware & RBAC Design

### 4.1 Core Guards

#### `requireAuth(req)` → User

Standard auth check; ensures user is logged in via Clerk.

#### `requireMembershipTier(user, allowedTiers)` → Member

```typescript
export function requireMembershipTier(
  user: AuthUser, 
  allowedTiers: MembershipType[]
): Member {
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

- Applied at the route handler level or as middleware.
- Prevents Silver from ever seeing property lists.

#### `requireAdminRole(req, allowedRoles)` → Admin

```typescript
export function requireAdminRole(
  user: AuthUser, 
  allowedRoles: string[]
): Admin {
  const admin = db.select().from(admins).where(eq(admins.clerkId, user.id)).get();
  if (!admin || !allowedRoles.includes(admin.role)) {
    throw new ForbiddenError("Admin access required");
  }
  return admin;
}
```

### 4.2 Usage Check Decorator (Social Tier)

```typescript
// Decorator for property booking endpoints
export async function withUsageCheck(
  handler: (req, res, next) => Promise<void>
) {
  return async (req, res, next) => {
    const user = requireAuth(req);
    const member = requireMembershipTier(user, ["DESIGNATED", "SOCIAL"]);
    
    // Only Social members get the cap check (org-level, not individual)
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
          message: `This booking would exceed ${org.name}'s property-day allowance (${org.annualBookingAllowance} total).`,
          orgAllowance: org.annualBookingAllowance,
          orgUsed: usage.propertyDaysUsed,
          remainingDays: org.annualBookingAllowance - usage.propertyDaysUsed,
          requestedDays: propertyDays,
          period: `${periodStartDate} → ${addYears(periodStartDate, 1)}`,
        });
      }
      
      // Attach usage info to req for handler to use
      req.orgUsage = { 
        periodStartDate, 
        propertyDays, 
        remaining: org.annualBookingAllowance - proposed,
        orgName: org.name,
        orgAllowance: org.annualBookingAllowance,
      };
    }
    
    return handler(req, res, next);
  };
}

// Helper: given a date and an org's period_start_date, return the period start date
// Example: org's period_start_date is 2026-09-01; if booking date is 2026-10-15, return 2026-09-01
// If booking date is 2026-08-15 (before period start), return 2025-09-01 (prior period)
function getPeriodStartDate(bookingDate: Date, orgPeriodStartDate: Date): string {
  const orgMonth = orgPeriodStartDate.getMonth(); // 0-indexed
  const orgDay = orgPeriodStartDate.getDate();
  const bookingMonth = bookingDate.getMonth();
  const bookingDay = bookingDate.getDate();
  const bookingYear = bookingDate.getFullYear();
  
  // Check if booking date is on or after the org's period start in the year
  const isOnOrAfterPeriodStart = 
    bookingMonth > orgMonth || 
    (bookingMonth === orgMonth && bookingDay >= orgDay);
  
  const periodYear = isOnOrAfterPeriodStart ? bookingYear : bookingYear - 1;
  const periodDate = new Date(periodYear, orgMonth, orgDay);
  return formatDateAsISO(periodDate); // "2026-09-01"
}
```

---

## 5. Client-Side Architecture

### 5.1 Member Portal Navigation & Routing

**Conditional nav items based on `member.membershipType`:**

```typescript
// In PublicNav.tsx or MemberNav.tsx
export function MemberNavigation({ member }) {
  return (
    <>
      {/* All tiers */}
      <NavItem href="/portal/my-bookings" label="My Bookings" />
      <NavItem href="/portal/events" label="Events" />
      
      {/* Designated & Social only */}
      {(member.membershipType === "DESIGNATED" || member.membershipType === "SOCIAL") && (
        <NavItem href="/portal/properties" label="Properties" />
      )}
      
      {/* Designated only */}
      {member.membershipType === "DESIGNATED" && (
        <NavItem href="/portal/master-calendar" label="Master Calendar" />
      )}
      
      {/* Social only: show usage info */}
      {member.membershipType === "SOCIAL" && (
        <NavItem href="/portal/usage" label={`Property Days (${usage.remaining}/40)`} />
      )}
    </>
  );
}
```

### 5.2 Dashboard Tiles (Member Portal Home)

```typescript
// In MemberPortal.tsx dashboard
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
  
  {/* Social only: usage counter */}
  {member.membershipType === "SOCIAL" && (
    <UsageCard usage={usage} />
  )}
</div>
```

### 5.3 Property Booking Form (Designated & Social)

**Silver never sees this screen.**

```typescript
// In BookPropertyModal.tsx
export function BookPropertyModal({ member, onSubmit }) {
  const [checkIn, setCheckIn] = useState();
  const [checkOut, setCheckOut] = useState();
  const [remainingDays, setRemainingDays] = useState(null);
  
  const handleDateChange = async () => {
    const propertyDays = computePropertyDays(checkIn, checkOut);
    
    if (member.membershipType === "SOCIAL") {
      const remaining = 40 - usage.propertyDaysUsed;
      if (propertyDays > remaining) {
        setError(`This stay uses ${propertyDays} property-days, but you only have ${remaining} remaining.`);
        setRemainingDays(null);
      } else {
        setRemainingDays(remaining - propertyDays);
      }
    }
  };
  
  return (
    <form onSubmit={onSubmit}>
      <PropertySelector />
      <DatePicker onchange={handleDateChange} />
      
      {member.membershipType === "SOCIAL" && (
        <div className="bg-yellow-100 p-3 rounded">
          <p className="text-sm">
            This stay uses {propertyDays} property-days. 
            You will have {remainingDays}/{40} days remaining this year.
          </p>
        </div>
      )}
      
      <button type="submit">Confirm Booking</button>
    </form>
  );
}
```

### 5.4 Event Booking Form (All Tiers)

**Silver cannot see the property-selection UI; only event picker.**

```typescript
export function BookEventModal({ member, onSubmit }) {
  // All tiers can book events
  // No property selection, no day counting
  // Form shows: event name, date(s), number of guests, tier-appropriate pricing
  
  if (member.membershipType === "SILVER") {
    return <EventsOnlyBooker />;
  }
  
  // Designated & Social see full event catalog
  return <EventAndPropertyBooker />;
}
```

### 5.5 API Client Hooks (tRPC or fetch)

```typescript
// hooks/useBookings.ts
export function usePropertyBookings() {
  const member = useMember();
  
  return useQuery({
    queryKey: ["property-bookings", member.id],
    queryFn: async () => {
      // Client-side check to prevent unnecessary API calls
      if (!["DESIGNATED", "SOCIAL"].includes(member.membershipType)) {
        return null; // Hide from UI
      }
      return fetch("/api/bookings/property").then(r => r.json());
    },
    enabled: ["DESIGNATED", "SOCIAL"].includes(member.membershipType),
  });
}

export function useMembershipUsage() {
  const member = useMember();
  
  return useQuery({
    queryKey: ["membership-usage", member.id],
    queryFn: () => fetch("/api/member/usage").then(r => r.json()),
    enabled: member.membershipType === "SOCIAL",
  });
}
```

---

## 6. Admin UI Changes (Operations Portal)

### 6.1 Member Edit Form (Admin Dashboard)

**New field: Membership Type dropdown**

```typescript
export function MemberEditForm({ memberId }) {
  const [member, setMember] = useState(null);
  const [tierChanging, setTierChanging] = useState(false);
  
  const handleTierChange = async (newTier) => {
    const reason = prompt("Reason for tier change (optional):");
    setTierChanging(true);
    
    const res = await fetch(`/api/admin/members/${memberId}/tier`, {
      method: "PATCH",
      body: JSON.stringify({ newTier, reason }),
    });
    
    if (res.ok) {
      const updated = await res.json();
      setMember(updated.member);
      showNotification(`Tier changed to ${newTier}`);
    }
    setTierChanging(false);
  };
  
  return (
    <form>
      <FormField label="Name" value={member.name} />
      <FormField label="Email" value={member.email} />
      
      <div className="form-group">
        <label>Membership Type</label>
        <select 
          value={member.membershipType} 
          onChange={(e) => handleTierChange(e.target.value)}
          disabled={tierChanging}
        >
          <option value="UNASSIGNED">UNASSIGNED (pending owner review)</option>
          <option value="DESIGNATED">DESIGNATED</option>
          <option value="SILVER">SILVER</option>
          <option value="SOCIAL">SOCIAL</option>
        </select>
      </div>
      
      {/* Social member: usage counter section */}
      {member.membershipType === "SOCIAL" && (
        <SocialMemberUsageSection memberId={memberId} member={member} />
      )}
    </form>
  );
}
```

### 6.2 Social Member Usage Section

```typescript
export function SocialMemberUsageSection({ memberId, member }) {
  const [usageByYear, setUsageByYear] = useState([]);
  const [adjusting, setAdjusting] = useState(false);
  
  useEffect(() => {
    fetch(`/api/admin/members/${memberId}/usage`)
      .then(r => r.json())
      .then(data => setUsageByYear(data));
  }, []);
  
  const handleAdjustUsage = async (year) => {
    const adjustment = prompt(`Adjust property-day count for ${year}:\nEnter +/- days (e.g., +5 to grant 5 days, -2 to deduct 2)`);
    if (!adjustment) return;
    
    const reason = prompt("Reason for adjustment:");
    setAdjusting(true);
    
    const res = await fetch(`/api/admin/members/${memberId}/usage/adjust`, {
      method: "PATCH",
      body: JSON.stringify({
        year: parseInt(year),
        adjustment: parseInt(adjustment),
        reason,
      }),
    });
    
    if (res.ok) {
      const updated = await res.json();
      setUsageByYear(prev => 
        prev.map(u => u.year === updated.year ? updated : u)
      );
      showNotification(`Usage adjusted for ${year}`);
    }
    setAdjusting(false);
  };
  
  return (
    <fieldset>
      <legend>Property-Day Usage (Social Tier)</legend>
      <table className="text-sm">
        <thead>
          <tr>
            <th>Year</th>
            <th>Used / Cap</th>
            <th>Remaining</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {usageByYear.map(usage => (
            <tr key={usage.year}>
              <td>{usage.year}</td>
              <td>{usage.propertyDaysUsed} / 40</td>
              <td>{40 - usage.propertyDaysUsed}</td>
              <td>
                <button 
                  type="button"
                  onClick={() => handleAdjustUsage(usage.year)}
                  disabled={adjusting}
                >
                  Adjust
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </fieldset>
  );
}
```

### 6.3 Social Parent Organization Management

**New section in Operations Portal: `/ops/social-orgs`**

Lists all Social Parent Organizations with ability to create, edit, and manage allowances.

```typescript
export function SocialOrgsList() {
  const [orgs, setOrgs] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  useEffect(() => {
    fetch(`/api/admin/social-orgs`)
      .then(r => r.json())
      .then(data => setOrgs(data));
  }, []);
  
  const handleCreateOrg = async (formData) => {
    const res = await fetch(`/api/admin/social-orgs`, {
      method: "POST",
      body: JSON.stringify(formData), // { name, annualBookingAllowance, periodStartDate, notes }
    });
    if (res.ok) {
      const newOrg = await res.json();
      setOrgs([...orgs, newOrg]);
      setShowCreateForm(false);
    }
  };
  
  return (
    <section>
      <h2>Social Parent Organizations</h2>
      <button onClick={() => setShowCreateForm(!showCreateForm)}>+ New Organization</button>
      
      {showCreateForm && (
        <SocialOrgForm onSubmit={handleCreateOrg} onCancel={() => setShowCreateForm(false)} />
      )}
      
      <table>
        <thead>
          <tr>
            <th>Organization Name</th>
            <th>Annual Allowance</th>
            <th>Period Start Date</th>
            <th>YTD Used / Remaining</th>
            <th># of Members</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map(org => (
            <tr key={org.id}>
              <td>{org.name}</td>
              <td>{org.annualBookingAllowance} property-days</td>
              <td>{org.periodStartDate}</td>
              <td>{org.propertyDaysUsed} / {org.annualBookingAllowance - org.propertyDaysUsed}</td>
              <td>{org.memberCount}</td>
              <td>
                <Link href={`/ops/social-orgs/${org.id}`}>View Details</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

**Organization Details Page: `/ops/social-orgs/:id`**

```typescript
export function SocialOrgDetails({ orgId }) {
  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [usageHistory, setUsageHistory] = useState([]);
  const [adjusting, setAdjusting] = useState(false);
  
  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/social-orgs/${orgId}`).then(r => r.json()),
      fetch(`/api/admin/social-orgs/${orgId}/members`).then(r => r.json()),
      fetch(`/api/admin/social-orgs/${orgId}/usage-history`).then(r => r.json()),
    ]).then(([org, members, history]) => {
      setOrg(org);
      setMembers(members);
      setUsageHistory(history);
    });
  }, [orgId]);
  
  const handleAdjustAllowance = async () => {
    const newAllowance = prompt(`Current allowance: ${org.annualBookingAllowance}. Enter new allowance:`);
    if (!newAllowance) return;
    
    const reason = prompt("Reason for adjustment:");
    const delta = parseInt(newAllowance) - org.annualBookingAllowance;
    
    setAdjusting(true);
    const res = await fetch(`/api/admin/social-orgs/${orgId}/allowance`, {
      method: "PATCH",
      body: JSON.stringify({ newAllowance: parseInt(newAllowance), reason }),
    });
    
    if (res.ok) {
      const updated = await res.json();
      setOrg(updated.org);
      showNotification(`Allowance adjusted: ${org.annualBookingAllowance} → ${updated.org.annualBookingAllowance} (${delta > 0 ? "+" : ""}${delta})`);
    }
    setAdjusting(false);
  };
  
  if (!org) return <div>Loading...</div>;
  
  return (
    <section>
      <h2>{org.name}</h2>
      <div className="org-info">
        <p><strong>Annual Allowance:</strong> {org.annualBookingAllowance} property-days <button onClick={handleAdjustAllowance} disabled={adjusting}>Adjust</button></p>
        <p><strong>Period:</strong> {org.periodStartDate} → {addYears(org.periodStartDate, 1)}</p>
        <p><strong>YTD Usage:</strong> {org.propertyDaysUsed} / {org.annualBookingAllowance} ({100 * org.propertyDaysUsed / org.annualBookingAllowance}%)</p>
        <p><strong>Remaining:</strong> {org.annualBookingAllowance - org.propertyDaysUsed} property-days</p>
        <p><strong>Notes:</strong> {org.notes || "(none)"}</p>
      </div>
      
      <h3>Members ({members.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Member Name</th>
            <th>Email</th>
            <th>YTD Bookings</th>
          </tr>
        </thead>
        <tbody>
          {members.map(m => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td>{m.email}</td>
              <td>{m.ytdPropertyDays} property-days</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <h3>Usage History (All Bookings)</h3>
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th>Property</th>
            <th>Check-In</th>
            <th>Check-Out</th>
            <th>Property-Days</th>
            <th>Booked At</th>
          </tr>
        </thead>
        <tbody>
          {usageHistory.map(booking => (
            <tr key={booking.id}>
              <td>{booking.memberName}</td>
              <td>{booking.propertyName}</td>
              <td>{booking.checkIn}</td>
              <td>{booking.checkOut}</td>
              <td>{booking.propertyDays}</td>
              <td>{new Date(booking.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

### 6.4 Audit Log View

**New page: `/ops/members/:id/audit`**

```typescript
export function MemberAuditLog({ memberId }) {
  const [auditLog, setAuditLog] = useState([]);
  
  useEffect(() => {
    fetch(`/api/admin/audit/${memberId}`)
      .then(r => r.json())
      .then(data => setAuditLog(data));
  }, []);
  
  return (
    <section>
      <h2>Audit Log for Member {memberId}</h2>
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Action</th>
            <th>Old Value</th>
            <th>New Value</th>
            <th>Reason</th>
            <th>Changed By</th>
          </tr>
        </thead>
        <tbody>
          {auditLog.map(log => (
            <tr key={log.id}>
              <td>{new Date(log.changedAt).toLocaleString()}</td>
              <td>{log.action}</td>
              <td><code>{log.oldValue}</code></td>
              <td><code>{log.newValue}</code></td>
              <td>{log.reason}</td>
              <td>{log.changedBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

### 6.5 Reporting & Analytics

**New reports page: `/ops/reports`**

Admin users need segmented reporting on membership tiers, bookings, revenue, and Social organization usage. All reports are filterable by membership_type and exportable to CSV.

#### 6.4.1 Member Roster Report

Lists all members with filters and export.

```typescript
export function MemberRosterReport() {
  const [members, setMembers] = useState([]);
  const [filterTier, setFilterTier] = useState("ALL");
  
  useEffect(() => {
    const tier = filterTier === "ALL" ? undefined : filterTier;
    fetch(`/api/admin/reports/members?tier=${tier}`)
      .then(r => r.json())
      .then(data => setMembers(data));
  }, [filterTier]);
  
  const handleExportCSV = () => {
    const csv = membersToCSV(members);
    downloadCSV(csv, "member-roster.csv");
  };
  
  return (
    <section>
      <h2>Member Roster</h2>
      <div className="filters">
        <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)}>
          <option value="ALL">All Tiers</option>
          <option value="DESIGNATED">Designated</option>
          <option value="SILVER">Silver</option>
          <option value="SOCIAL">Social</option>
        </select>
        <button onClick={handleExportCSV}>Export CSV</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Member ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Membership Type</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {members.map(m => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td>{m.name}</td>
              <td>{m.email}</td>
              <td>{m.membershipType}</td>
              <td>{new Date(m.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

#### 6.4.2 Bookings Report

Lists all property and event bookings, filterable by tier and date range.

```typescript
// Endpoint: GET /api/admin/reports/bookings?tier=DESIGNATED&startDate=2026-01-01&endDate=2026-12-31
// Returns: array of { memberId, memberName, tier, propertyId, propertyName, checkIn, checkOut, propertyDays, bookingStatus, createdAt }

export function BookingsReport() {
  const [bookings, setBookings] = useState([]);
  const [filterTier, setFilterTier] = useState("ALL");
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-12-31");
  
  useEffect(() => {
    const tier = filterTier === "ALL" ? undefined : filterTier;
    fetch(`/api/admin/reports/bookings?tier=${tier}&startDate=${startDate}&endDate=${endDate}`)
      .then(r => r.json())
      .then(data => setBookings(data));
  }, [filterTier, startDate, endDate]);
  
  const handleExportCSV = () => {
    const csv = bookingsToCSV(bookings);
    downloadCSV(csv, "bookings-report.csv");
  };
  
  return (
    <section>
      <h2>Bookings Report</h2>
      <div className="filters">
        <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)}>
          <option value="ALL">All Tiers</option>
          <option value="DESIGNATED">Designated</option>
          <option value="SILVER">Silver</option>
          <option value="SOCIAL">Social</option>
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button onClick={handleExportCSV}>Export CSV</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Member Name</th>
            <th>Tier</th>
            <th>Property / Event</th>
            <th>Check-In</th>
            <th>Check-Out</th>
            <th>Days</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map(b => (
            <tr key={b.id}>
              <td>{b.memberName}</td>
              <td>{b.tier}</td>
              <td>{b.propertyName || b.eventName}</td>
              <td>{b.checkIn}</td>
              <td>{b.checkOut}</td>
              <td>{b.propertyDays}</td>
              <td>{b.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

#### 6.4.3 Revenue Report

Revenue aggregated by tier (total bookings value, average per booking, etc.).

```typescript
// Endpoint: GET /api/admin/reports/revenue?tier=DESIGNATED&startDate=2026-01-01&endDate=2026-12-31
// Returns: { tier, totalRevenue, bookingCount, avgPerBooking, breakdown: [...] }

export function RevenueReport() {
  const [revenue, setRevenue] = useState(null);
  const [filterTier, setFilterTier] = useState("ALL");
  
  useEffect(() => {
    const tier = filterTier === "ALL" ? undefined : filterTier;
    fetch(`/api/admin/reports/revenue?tier=${tier}`)
      .then(r => r.json())
      .then(data => setRevenue(data));
  }, [filterTier]);
  
  const handleExportCSV = () => {
    const csv = revenueToCSV(revenue);
    downloadCSV(csv, "revenue-report.csv");
  };
  
  return (
    <section>
      <h2>Revenue Report</h2>
      <div className="filters">
        <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)}>
          <option value="ALL">All Tiers</option>
          <option value="DESIGNATED">Designated</option>
          <option value="SILVER">Silver</option>
          <option value="SOCIAL">Social</option>
        </select>
        <button onClick={handleExportCSV}>Export CSV</button>
      </div>
      {revenue && (
        <div>
          <h3>{revenue.tier || "All Tiers"}</h3>
          <p>Total Revenue: ${revenue.totalRevenue.toFixed(2)}</p>
          <p>Bookings: {revenue.bookingCount}</p>
          <p>Avg per Booking: ${revenue.avgPerBooking.toFixed(2)}</p>
        </div>
      )}
    </section>
  );
}
```

#### 6.5.4 Social Organization Usage Report

Aggregated usage by Social Parent Organization: allowance, YTD usage, remaining, per-member breakdown.

```typescript
// Endpoint: GET /api/admin/reports/social-org-usage
// Returns: array of { orgId, orgName, annualAllowance, periodStartDate, propertyDaysUsed, remaining, memberCount, members: [...] }

export function SocialOrgUsageReport() {
  const [orgUsageData, setOrgUsageData] = useState([]);
  
  useEffect(() => {
    fetch(`/api/admin/reports/social-org-usage`)
      .then(r => r.json())
      .then(data => setOrgUsageData(data));
  }, []);
  
  const handleExportCSV = () => {
    const csv = orgUsageToCSV(orgUsageData);
    downloadCSV(csv, "social-org-usage-report.csv");
  };
  
  return (
    <section>
      <h2>Social Organization Usage Report</h2>
      <button onClick={handleExportCSV}>Export CSV</button>
      <table>
        <thead>
          <tr>
            <th>Organization Name</th>
            <th>Annual Allowance</th>
            <th>Used / Allowance</th>
            <th>Remaining</th>
            <th>Period Start Date</th>
            <th># Members</th>
          </tr>
        </thead>
        <tbody>
          {orgUsageData.map(org => (
            <tr key={org.orgId}>
              <td><Link href={`/ops/social-orgs/${org.orgId}`}>{org.orgName}</Link></td>
              <td>{org.annualAllowance} property-days</td>
              <td>{org.propertyDaysUsed} / {org.annualAllowance}</td>
              <td>{org.remaining}</td>
              <td>{org.periodStartDate}</td>
              <td>{org.memberCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

#### 6.5.5 Social Members by Organization (Detail Report)

Per-member usage breakdown within each organization.

```typescript
// Endpoint: GET /api/admin/reports/social-members-by-org/:orgId
// Returns: array of { memberId, memberName, ytdPropertyDays, bookingCount }

export function SocialMembersByOrgReport({ orgId }) {
  const [members, setMembers] = useState([]);
  const [org, setOrg] = useState(null);
  
  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/reports/social-members-by-org/${orgId}`).then(r => r.json()),
      fetch(`/api/admin/social-orgs/${orgId}`).then(r => r.json()),
    ]).then(([members, org]) => {
      setMembers(members);
      setOrg(org);
    });
  }, [orgId]);
  
  const handleExportCSV = () => {
    const csv = membersToCSV(members);
    downloadCSV(csv, `social-members-${org.name}.csv`);
  };
  
  if (!org) return <div>Loading...</div>;
  
  return (
    <section>
      <h2>Social Members: {org.name}</h2>
      <p>Annual Allowance: {org.annualBookingAllowance} | YTD Used: {org.propertyDaysUsed} | Remaining: {org.annualBookingAllowance - org.propertyDaysUsed}</p>
      <button onClick={handleExportCSV}>Export CSV</button>
      <table>
        <thead>
          <tr>
            <th>Member Name</th>
            <th>YTD Property-Days</th>
            <th>Bookings</th>
          </tr>
        </thead>
        <tbody>
          {members.map(m => (
            <tr key={m.memberId}>
              <td>{m.memberName}</td>
              <td>{m.ytdPropertyDays}</td>
              <td>{m.bookingCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

---

## 7. Migration & Backfill Plan

### 7.1 Initial Schema Setup

**Current state:** 2 members exist with no tier assignment.

**Phase 1 schema deployment:**

1. Create new table `social_parent_organization` with columns: id, name, annual_booking_allowance, period_start_date, notes, created_at, updated_at.
2. Create new table `social_organization_usage` with columns: id, social_parent_organization_id (FK), period_start_date, property_days_used, created_at, updated_at.
3. Add columns to `members` table:
   - `membershipType` (VARCHAR, NOT NULL, no default) — must be assigned at creation time
   - `social_parent_organization_id` (INTEGER, FK, nullable) — required for SOCIAL members, null for DESIGNATED/SILVER
4. Seed initial data: create "Five Elms Capital" as the first Social Parent Organization (owner will provide period_start_date and annual_booking_allowance at go-live).

**After Phase 1 schema deployment:**

1. **Manual backfill required:** Owner must assign a tier (DESIGNATED, SILVER, or SOCIAL) to each existing member via the admin UI.
2. For Social members: owner must also select the Social Parent Organization they belong to (or create new org if needed).
3. Once each member has been assigned a tier + org (if Social), they can log in and access tier-gated features.

**Important:** Do not deploy Phase 1 to production until all existing members have a tier assigned. Attempting to access the portal with no membershipType set will result in an error.

### 7.2 New Member Creation Flow

For all **new** member signups or admin invites after Phase 1 deployment:

- The signup/invite flow MUST collect or specify the membership_type as a required field.
- Admin invites: a form field "Membership Tier" (required, enum: DESIGNATED | SILVER | SOCIAL).
- **For SOCIAL members:** show a second field "Select Social Parent Organization" (required, dropdown of existing orgs, with "Create new org" option).
- Self-signup flows (if enabled): ideally show a form asking "Choose your membership tier" and (if Social) "Which organization?" before account creation completes.
- The member record is not created until both membershipType AND (if Social) socialParentOrganizationId are set.

### 7.3 Backfill Script (Manual Bulk Assignment)

If owner wants to assign tiers to multiple existing members via a script:

```typescript
// scripts/bulk-assign-tiers.ts
// Usage: MEMBER_TIERS_JSON="[{id:1,tier:'DESIGNATED'},{id:2,tier:'SOCIAL',orgId:1}]" pnpm run bulk-assign-tiers

const assignments = JSON.parse(process.env.MEMBER_TIERS_JSON || "[]");

for (const { id, tier, orgId } of assignments) {
  const member = await getMember(id);
  if (!member) continue;
  
  const updates: any = { membershipType: tier };
  if (tier === "SOCIAL" && orgId) {
    updates.socialParentOrganizationId = orgId;
  }
  
  await updateMember(id, updates);
  await logAudit(id, "TIER_CHANGED", "(backfill - no prior tier)", tier, 
    tier === "SOCIAL" ? `Assigned to org ${orgId} during Phase 1 setup` : "Bulk assignment during Phase 1 setup", 
    "system");
}
```

### 7.4 Seed Data

During Phase 1 deployment, create the first Social Parent Organization:

```typescript
// seeds/social-orgs.ts

const fiveElms = await createSocialParentOrganization({
  name: "Five Elms Capital",
  annualBookingAllowance: 40,  // To be confirmed by owner
  periodStartDate: "2026-09-01",  // To be confirmed by owner
  notes: "Founding social member organization",
});
```

The owner will confirm:
- Organization name(s) and count
- Annual allowance per org
- Period start date per org

---

## 8. Test Plan

### 8.1 Unit Tests (Guard Functions)

```typescript
// tests/guards.test.ts

describe("requireMembershipTier", () => {
  it("allows Designated member to access Designated-only features", () => {
    const member = { id: 1, membershipType: "DESIGNATED" };
    const result = requireMembershipTier(member, ["DESIGNATED"]);
    expect(result).toBe(member);
  });
  
  it("rejects Silver member from property booking", () => {
    const member = { id: 2, membershipType: "SILVER" };
    expect(() => requireMembershipTier(member, ["DESIGNATED", "SOCIAL"]))
      .toThrow(ForbiddenError);
  });
  
  it("rejects UNASSIGNED member from any tier-gated feature", () => {
    const member = { id: 3, membershipType: "UNASSIGNED" };
    expect(() => requireMembershipTier(member, ["DESIGNATED", "SILVER", "SOCIAL"]))
      .toThrow(ForbiddenError);
  });
});

describe("withUsageCheck", () => {
  it("allows Social member to book within cap", async () => {
    const member = { id: 4, membershipType: "SOCIAL" };
    const usage = { propertyDaysUsed: 30 };
    const propertyDays = 5;
    
    const req = { body: { checkIn: "2026-08-01", checkOut: "2026-08-06" } };
    const res = { status: jest.fn().json: jest.fn() };
    
    const handler = jest.fn();
    await withUsageCheck(handler)(req, res, () => {});
    
    expect(handler).toHaveBeenCalled();
  });
  
  it("rejects Social member booking that exceeds cap", async () => {
    const member = { id: 5, membershipType: "SOCIAL" };
    const usage = { propertyDaysUsed: 38 };
    const propertyDays = 5;
    
    const req = { body: { checkIn: "2026-08-01", checkOut: "2026-08-06" } };
    const res = { status: jest.fn().json: jest.fn() };
    
    await withUsageCheck(() => {})(req, res, () => {});
    
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
```

### 8.2 Integration Tests (Booking Flows)

```typescript
// tests/integration/tiers.test.ts

describe("Membership Tier Booking Flows", () => {
  describe("Designated Tier", () => {
    it("can view all properties", async () => {
      const res = await apiCall("GET", "/api/properties", { tier: "DESIGNATED" });
      expect(res.status).toBe(200);
      expect(res.body.properties).toBeDefined();
    });
    
    it("can view master calendar", async () => {
      const res = await apiCall("GET", "/api/calendar/master", { tier: "DESIGNATED" });
      expect(res.status).toBe(200);
    });
    
    it("can book properties without cap", async () => {
      const res = await apiCall("POST", "/api/bookings/property", {
        tier: "DESIGNATED",
        propertyId: 1,
        checkIn: "2026-08-01",
        checkOut: "2026-08-10", // 9 days
      });
      expect(res.status).toBe(201);
    });
    
    it("can book events", async () => {
      const res = await apiCall("POST", "/api/bookings/event", {
        tier: "DESIGNATED",
        eventId: 1,
      });
      expect(res.status).toBe(201);
    });
  });
  
  describe("Silver Tier", () => {
    it("cannot view properties", async () => {
      const res = await apiCall("GET", "/api/properties", { tier: "SILVER" });
      expect(res.status).toBe(403);
    });
    
    it("cannot view master calendar", async () => {
      const res = await apiCall("GET", "/api/calendar/master", { tier: "SILVER" });
      expect(res.status).toBe(403);
    });
    
    it("cannot book properties", async () => {
      const res = await apiCall("POST", "/api/bookings/property", {
        tier: "SILVER",
        propertyId: 1,
        checkIn: "2026-08-01",
        checkOut: "2026-08-10",
      });
      expect(res.status).toBe(403);
    });
    
    it("can book events (guided only)", async () => {
      const res = await apiCall("POST", "/api/bookings/event", {
        tier: "SILVER",
        eventId: 1, // waterfowl hunt, turkey hunt, etc.
      });
      expect(res.status).toBe(201);
    });
  });
  
  describe("Social Tier", () => {
    it("can view properties", async () => {
      const res = await apiCall("GET", "/api/properties", { tier: "SOCIAL" });
      expect(res.status).toBe(200);
    });
    
    it("cannot view master calendar", async () => {
      const res = await apiCall("GET", "/api/calendar/master", { tier: "SOCIAL" });
      expect(res.status).toBe(403);
    });
    
    it("can book properties within 40-day annual cap", async () => {
      const res = await apiCall("POST", "/api/bookings/property", {
        tier: "SOCIAL",
        propertyId: 1,
        checkIn: "2026-08-01",
        checkOut: "2026-08-10", // 9 days
      });
      expect(res.status).toBe(201);
      expect(res.body.remainingBalance).toBe(31); // 40 - 9
    });
    
    it("rejects property booking that exceeds 40-day cap", async () => {
      await apiCall("POST", "/api/bookings/property", {
        tier: "SOCIAL",
        propertyId: 1,
        checkIn: "2026-08-01",
        checkOut: "2026-08-11", // 10 days
      });
      
      const res = await apiCall("POST", "/api/bookings/property", {
        tier: "SOCIAL",
        propertyId: 2,
        checkIn: "2026-08-12",
        checkOut: "2026-08-23", // 11 days; total would be 21, within cap
      });
      expect(res.status).toBe(201);
      
      const overCapRes = await apiCall("POST", "/api/bookings/property", {
        tier: "SOCIAL",
        propertyId: 3,
        checkIn: "2026-09-01",
        checkOut: "2026-09-11", // 10 days; total would be 31, still in cap
      });
      expect(overCapRes.status).toBe(201);
      
      // Now exceeding
      const exceedRes = await apiCall("POST", "/api/bookings/property", {
        tier: "SOCIAL",
        propertyId: 1,
        checkIn: "2026-09-12",
        checkOut: "2026-09-23", // 11 days; total would be 42, exceeds cap
      });
      expect(exceedRes.status).toBe(400);
      expect(exceedRes.body.error).toBe("USAGE_LIMIT_EXCEEDED");
    });
    
    it("can book events", async () => {
      const res = await apiCall("POST", "/api/bookings/event", {
        tier: "SOCIAL",
        eventId: 1,
      });
      expect(res.status).toBe(201);
    });
  });
});
```

### 8.3 E2E Tests (Happy Path per Tier)

```typescript
// tests/e2e/tiers.e2e.ts
// Run with Playwright

describe("Membership Tiers - E2E Happy Paths", () => {
  describe("Designated Member", () => {
    it("can view and book a property, then view master calendar", async ({ page }) => {
      // 1. Login as Designated member
      await loginAsDesignated(page);
      
      // 2. Navigate to properties
      await page.goto("/portal/properties");
      await expect(page.locator("h1")).toContainText("Properties");
      
      // 3. Book a property
      await page.click('button:has-text("Book Property")');
      await selectProperty(page, "Deer Cottage");
      await selectDates(page, "Aug 1", "Aug 5");
      await page.click('button:has-text("Confirm Booking")');
      await expect(page.locator(".notification")).toContainText("Booking confirmed");
      
      // 4. View master calendar
      await page.goto("/portal/master-calendar");
      await expect(page.locator("h1")).toContainText("Master Calendar");
    });
  });
  
  describe("Silver Member", () => {
    it("cannot see properties but can book a guided event", async ({ page }) => {
      // 1. Login as Silver member
      await loginAsSilver(page);
      
      // 2. Properties nav item should not exist
      await expect(page.locator('a:has-text("Properties")')).not.toBeVisible();
      
      // 3. Navigate directly to /portal/properties → should redirect or show 403
      await page.goto("/portal/properties");
      await expect(page.locator(".error-message")).toContainText("not authorized");
      
      // 4. Book a guided event
      await page.goto("/portal/events");
      await page.click('button:has-text("Book")');
      // Event booking form should NOT show property picker
      await expect(page.locator('label:has-text("Property")')).not.toBeVisible();
      await page.click('button:has-text("Confirm Booking")');
      await expect(page.locator(".notification")).toContainText("Event booked");
    });
  });
  
  describe("Social Member", () => {
    it("can book properties up to 40-day cap and see remaining balance", async ({ page }) => {
      // 1. Login as Social member
      await loginAsSocial(page);
      
      // 2. View usage indicator in nav
      const usageNav = page.locator('a:has-text("Property Days")');
      await expect(usageNav).toContainText("40/40");
      
      // 3. Book a property (9 days)
      await page.goto("/portal/properties");
      await page.click('button:has-text("Book Property")');
      await selectProperty(page, "Duck Lake");
      await selectDates(page, "Aug 1", "Aug 10");
      
      // Should show remaining balance
      await expect(page.locator(".usage-info")).toContainText("31 days remaining");
      await page.click('button:has-text("Confirm Booking")');
      await expect(page.locator(".notification")).toContainText("Booking confirmed");
      
      // 4. Verify usage updated
      await page.goto("/portal");
      await expect(page.locator(".usage-card")).toContainText("9 / 40");
    });
  });
});
```

---

## 9. Rollout Plan (3 Phases)

### Phase 1: Schema + Admin UI Setup (2-3 weeks)

**Deliverables:**

*Schema & Seed Data:*
- ✅ Add `membership_type` enum and column to `members` table (NOT NULL, required)
- ✅ Create `social_parent_organization` table (id, name, annualBookingAllowance, periodStartDate, notes)
- ✅ Add `social_parent_organization_id` FK to members (required for Social, null for others)
- ✅ Create `social_organization_usage` table with (orgId, periodStartDate) key
- ✅ Create `membership_audit` table for full audit trail
- ✅ Seed "Five Elms Capital" Social Parent Organization (owner provides: name, allowance, period)

*Admin Endpoints:*
- ✅ Member tier management: PATCH tier, GET audit log
- ✅ Social org CRUD: GET list, POST create, GET details, PATCH update, PATCH allowance adjust
- ✅ Social org usage: GET usage stats, GET members under org, GET usage history
- ✅ Reporting endpoints: members, bookings, revenue, social-org-usage, social-members-by-org (all with CSV export)

*Admin UI:*
- ✅ Member edit form with tier dropdown + org selector (for Social)
- ✅ Social Parent Organizations management page (list, create, edit)
- ✅ Social org details page (members, usage, booking history, allowance adjust)
- ✅ Audit log view (member-level)
- ✅ Reporting dashboard (5 report views including Social org usage)

*Backfill & Signup:*
- ✅ Existing members manually assigned tiers + orgs (if Social) via admin UI
- ✅ New signup/invite flows enforce membershipType as required field
- ✅ New signup/invite flows enforce org selection for Social members
- ❌ No member-facing changes yet (no hiding/showing features)

**Testing:** Admin UI manual test, social org CRUD validation, reporting export validation, seed data verification

**Deployment:** Test on staging; deploy to production. All existing members MUST have a tier + org (if Social) assigned before members can log in.

---

### Phase 2: Member-Facing UI (Conditional Rendering) (1 week)

**Deliverables:**
- ✅ Conditional nav: hide "Properties" and "Master Calendar" based on tier
- ✅ Conditional dashboard tiles: show/hide based on tier
- ✅ Calendar view: Designated only
- ✅ Properties list: Designated & Social only
- ✅ Events booking: All tiers (visible; unlimited)
- ✅ Usage display: Social only (shows X/40 in nav)

**Endpoint guards (server-side):**
- GET `/api/properties` → requires `DESIGNATED` or `SOCIAL`
- GET `/api/calendar/master` → requires `DESIGNATED` only
- GET `/api/events` → all tiers

**Testing:**
- E2E: each tier navigates to expected sections, forbidden sections 404 or redirect
- Verify Silver cannot see property picker even if they navigate directly

**Deployment:** Roll out to production once Phase 1 is stable.

---

### Phase 3: Social Tier Org-Level Allowance Enforcement (1-2 weeks)

**Deliverables:**
- ✅ POST `/api/bookings/property` guard: check Social org's usage against org's annualBookingAllowance per period
- ✅ Usage counter increment on booking confirm (increments org's shared counter, not individual member)
- ✅ Cross-period booking logic: entire booking counts against the period containing the start date (using org's periodStartDate)
- ✅ Booking form: show "X days remaining for [Org Name]" warning for Social
- ✅ Reject booking if it would exceed org's allowance for the period
- ✅ Admin can manually adjust/grant/comp org's allowance (logged in audit trail with delta)
- ✅ Social member can see org's shared pool status (not individual quota)

**Testing:** 
- Integration tests for org-level cap enforcement
- Integration tests for period boundary handling (using org's period, not fixed 8/1)
- Integration tests for multiple Social members under same org drawing from shared pool
- E2E: Social member1 books 25 days, member2 tries to book 20 days (under same org, cap 40); second booking rejected
- E2E: Admin adjusts org allowance mid-period, usage counter updates correctly

**Deployment:** Final phase; production rollout once all Phase 2 tests pass.

---

## 10. Reporting Endpoints (Admin API)

New admin-only endpoints that power the reporting dashboard:

```typescript
// GET /api/admin/reports/members?tier=DESIGNATED
// Returns array of members, filterable by tier

// GET /api/admin/reports/bookings?tier=SOCIAL&startDate=2026-01-01&endDate=2026-12-31
// Returns array of bookings with property-days, status, member tier

// GET /api/admin/reports/revenue?tier=DESIGNATED&startDate=...&endDate=...
// Returns revenue metrics: total, by tier, by booking type

// GET /api/admin/social-orgs
// Returns array of all Social Parent Organizations with current usage

// GET /api/admin/social-orgs/:id
// Returns org details: name, allowance, period, YTD usage, member count

// GET /api/admin/social-orgs/:id/members
// Returns all Social members under this org

// GET /api/admin/social-orgs/:id/usage
// Returns org's current-period usage stats and per-member breakdown

// GET /api/admin/social-orgs/:id/usage-history
// Returns all bookings made by members under this org (detailed, paginated)

// GET /api/admin/reports/social-org-usage
// Returns array of all Social orgs with YTD usage, remaining, member count

// GET /api/admin/reports/social-members-by-org/:orgId
// Returns per-member usage breakdown within a specific org

// All reports support ?export=csv for direct CSV download
```

---

## 11. Implementation Files & Locations

### Schema & Migrations
- `features/_core/server/schema.ts` — add MembershipType enum, membership_type column, membership_usage table, membership_audit table
- `drizzle/migrations/*.sql` — auto-generated migration files

### Server Endpoints
- `features/_core/server/router.ts` — mount new admin routes
- `features/portal/server/router.ts` — modify bookings route with tier guards
- New file: `features/_core/server/guards.ts` — requireMembershipTier, requireAdminRole, withUsageCheck

### Client Components
- `features/portal/client/pages/MemberPortal.tsx` — conditional nav, dashboard tiles
- `features/portal/client/components/BookPropertyModal.tsx` — add usage display for Social
- `features/public-pages/components/MemberNav.tsx` — conditional nav items
- New file: `features/portal/client/components/UsageCard.tsx` — Social tier usage display
- New file: `features/admin/client/pages/AdminMemberAuditLog.tsx` — audit log view

### Tests
- `tests/units/guards.test.ts` — guard function unit tests
- `tests/integration/tiers.test.ts` — booking flow integration tests
- `tests/e2e/tiers.e2e.ts` — Playwright E2E tests

---

## Appendix: Implementation Checklist

**Phase 1: Schema + Admin UI**

*Schema:*
- [ ] Schema: MembershipType enum (DESIGNATED, SILVER, SOCIAL)
- [ ] Schema: membership_type column added to members (NOT NULL, required)
- [ ] Schema: social_parent_organization table created (id, name, annualBookingAllowance, periodStartDate, notes, timestamps)
- [ ] Schema: social_parent_organization_id FK added to members (required for Social, null for others)
- [ ] Schema: social_organization_usage table created (id, social_parent_organization_id, periodStartDate, propertyDaysUsed, timestamps)
- [ ] Schema: membership_audit table created with delta tracking
- [ ] Seed data: create "Five Elms Capital" org (or placeholder, to be filled in)

*Member Management Endpoints:*
- [ ] Endpoint: PATCH /api/admin/members/:id/tier (with audit log)
- [ ] Endpoint: GET /api/admin/audit/:memberId (audit log view)

*Social Org Management Endpoints:*
- [ ] Endpoint: GET /api/admin/social-orgs (list all orgs with usage)
- [ ] Endpoint: POST /api/admin/social-orgs (create org)
- [ ] Endpoint: GET /api/admin/social-orgs/:id (org details)
- [ ] Endpoint: PATCH /api/admin/social-orgs/:id (update org name, notes, period)
- [ ] Endpoint: PATCH /api/admin/social-orgs/:id/allowance (adjust allowance, log audit with delta)
- [ ] Endpoint: GET /api/admin/social-orgs/:id/members (list members under org)
- [ ] Endpoint: GET /api/admin/social-orgs/:id/usage (org usage stats + per-member breakdown)
- [ ] Endpoint: GET /api/admin/social-orgs/:id/usage-history (all bookings by members in org)

*Reporting Endpoints:*
- [ ] Endpoint: GET /api/admin/reports/members (CSV export)
- [ ] Endpoint: GET /api/admin/reports/bookings (CSV export)
- [ ] Endpoint: GET /api/admin/reports/revenue (CSV export)
- [ ] Endpoint: GET /api/admin/reports/social-org-usage (CSV export)
- [ ] Endpoint: GET /api/admin/reports/social-members-by-org/:orgId (CSV export)

*Admin UI:*
- [ ] Admin UI: Member edit form tier dropdown + org selector (for Social)
- [ ] Admin UI: Audit log view
- [ ] Admin UI: Social Parent Organizations list page
- [ ] Admin UI: Social org create/edit form (name, allowance, period, notes)
- [ ] Admin UI: Social org details page (members, usage, booking history)
- [ ] Admin UI: Social org usage adjustment (with audit logging)
- [ ] Admin UI: Reports dashboard (member roster, bookings, revenue)
- [ ] Admin UI: Social org usage report
- [ ] Admin UI: Social members by org detail report

*Backfill & Signup:*
- [ ] Backfill: existing members manually assigned tiers + orgs (if Social) via admin UI
- [ ] Member signup/invite flows: membershipType as required field
- [ ] Member signup/invite flows: for Social, org selector as required field

**Phase 2: Member-Facing UI (Conditional Rendering)**
- [ ] Guard: requireMembershipTier()
- [ ] Guard: requireAdminRole()
- [ ] Middleware: withUsageCheck() (with 8/1-7/31 period logic)
- [ ] GET /api/properties: add tier guard (DESIGNATED, SOCIAL only)
- [ ] GET /api/calendar/master: add tier guard (DESIGNATED only)
- [ ] GET /api/events: all tiers can access
- [ ] Member UI: Conditional nav per tier
- [ ] Member UI: Conditional dashboard tiles
- [ ] Member UI: Usage card (Social only, shows X/40)
- [ ] Member UI: Booking form (event-only for Silver; property+event for others)

**Phase 3: Social Tier 40-Day Enforcement**
- [ ] POST /api/bookings/property: add usage check with periodStartDate logic
- [ ] POST /api/bookings/property: increment usage counter on confirmation
- [ ] POST /api/bookings/property: handle cross-period bookings (entire booking against start date period)
- [ ] Client: Booking form usage warning (remaining days display)
- [ ] Client: Reject booking UI if cap exceeded

**Testing**
- [ ] Unit tests: requireMembershipTier() guards
- [ ] Unit tests: period date calculation (getPeriodStartDate)
- [ ] Unit tests: usage counter increment logic
- [ ] Integration tests: each tier's booking flows
- [ ] Integration tests: cross-period booking counting
- [ ] Integration tests: admin usage adjust + audit log
- [ ] Integration tests: reports endpoint filtering & CSV export
- [ ] E2E: Designated happy path (full access)
- [ ] E2E: Silver happy path (events-only)
- [ ] E2E: Social happy path (property booking with cap)
- [ ] E2E: Social overage rejection
- [ ] E2E: Admin tier change workflow

**Documentation**
- [ ] README: admin guide for tier management
- [ ] README: member guide for Social tier cap
- [ ] Comment in getPeriodStartDate() on period logic
- [ ] Comment in withUsageCheck() on 8/1 boundary

