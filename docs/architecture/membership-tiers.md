# Membership Tiers Architecture & Implementation Plan

**Status:** Planning Phase (no implementation code written)  
**Date:** July 2026  
**Target Rollout:** Phase 1 Q3 2026

---

## 0. DECISIONS (Locked)

**Owner has approved the following constraints and requirements:**

1. **Usage Period Boundary:** 8/1 → 7/31 (not calendar year). Each Social member's usage tracking is keyed by period_start_date (always August 1 of the given year). Example: a member's 2026 period runs 8/1/2026 → 7/31/2027.

2. **Cross-Period Bookings:** When a Social member books a stay that spans the period boundary (e.g., 7/30 → 8/2), the ENTIRE booking counts against the period where the start date falls. No splitting across periods.

3. **Admin Cap Override:** Admins may adjust the 40-property-day cap per Social member (grant credit, comp, reset). Every adjustment must be logged in audit trail with: admin user ID, timestamp, reason, and delta (old → new count).

4. **Pricing Visibility:** Event and property pricing are visible to all membership tiers. Do NOT gate pricing by tier. (All members will eventually see only members-only bookings, so transparency is acceptable.)

5. **Tier Downgrade Handling:** Skip automatic downgrade logic. Owner will handle manually if needed. This is out of scope for Phase 1.

6. **Event Booking Limits:** No caps by tier. All members with event access can book unlimited events. (Silver = events-only; Designated/Social = events + property with property cap.)

7. **Membership Type at Account Creation:** Every member MUST have a membership_type assigned at account creation. There is no UNASSIGNED or default state. Signup/invite flows require membership_type as a mandatory field. Remove all references to UNASSIGNED tier.

8. **Admin Reporting:** Required. Admin needs member roster, bookings, revenue, and usage reports segmented by tier, with CSV export capability.

---

## 1. Executive Summary

This document outlines the architecture for a **three-tier membership system** (Designated, Silver, Social) with role-based access control across both the Member Portal and Operations Portal. The system enforces tier-specific capabilities at the data layer (server-side RBAC), backend endpoint guards, and client-side UI conditional rendering.

**Key Objectives:**
- Tier-specific portal access and booking rights
- Admin ability to assign, change, and audit tier assignments
- Enforcement of Social tier's 40 property-day annual cap with usage tracking
- Full audit trail for membership changes and usage adjustments

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

### 2.2 Member Table Changes

**New column:**
```typescript
membershipType: MembershipType  // REQUIRED — no default, no null
```

- Every member MUST have a membership_type at account creation.
- Signup/invite flows enforce this as a mandatory field.
- This field is mutable by admins (see audit log in 2.3).

### 2.3 Usage Tracking Table: `membership_usage`

Tracks property-day usage for Social tier members within their annual period (8/1 → 7/31).

```typescript
// Drizzle schema
export const membershipUsage = pgTable("membership_usage", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  periodStartDate: date("period_start_date").notNull(), // e.g., 2026-08-01
  propertyDaysUsed: integer("property_days_used").notNull().default(0), // cumulative count
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniq: uniqueIndex("membership_usage_member_period").on(table.memberId, table.periodStartDate),
}));
```

- One row per Social member per 8/1 → 7/31 usage period.
- `periodStartDate` is always August 1 (e.g., 2026-08-01 represents the period 8/1/2026 → 7/31/2027).
- `propertyDaysUsed` is cumulative; incremented on each booking confirmation.
- When a Social member books a stay that spans the period boundary (e.g., 7/30 → 8/2), the entire stay counts against the period containing the start date (7/30 = before 8/1, so counts against prior period).
- Scope: Property-day bookings only (not event bookings, not lodge-only stays, not guided experiences).

### 2.4 Audit Log Table: `membership_audit`

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

| Endpoint | Method | Purpose |
|---|---|---|
| PATCH `/api/admin/members/:id/tier` | PATCH | Change member tier; log audit |
| GET `/api/admin/members/:id/usage` | GET | Get Social member usage for current & prior years |
| PATCH `/api/admin/members/:id/usage/adjust` | PATCH | Manually adjust Social member usage (grant credit, reset, etc.) |
| GET `/api/admin/audit/:memberId` | GET | Fetch audit log for a member |

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
  
  // For Social tier, enforce 40-day cap
  if (member.membershipType === "SOCIAL") {
    const checkInDate = new Date(checkIn);
    const periodStartDate = getPeriodStartDate(checkInDate);
    const usage = await getMembershipUsage(member.id, periodStartDate);
    const proposed = (usage?.propertyDaysUsed ?? 0) + propertyDays;
    
    if (proposed > 40) {
      throw new TierLimitError(
        `Booking would exceed 40-property-day limit for your period (${periodStartDate} → 7/31). You have ${40 - usage.propertyDaysUsed} days remaining.`
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
  
  // Increment usage counter for Social
  if (member.membershipType === "SOCIAL") {
    const checkInDate = new Date(checkIn);
    const periodStartDate = getPeriodStartDate(checkInDate);
    const oldCount = (await getMembershipUsage(member.id, periodStartDate))?.propertyDaysUsed ?? 0;
    const newCount = oldCount + propertyDays;
    
    await incrementMembershipUsage(member.id, periodStartDate, propertyDays);
    await logAudit(
      member.id, 
      "USAGE_ADJUSTED", 
      String(oldCount), 
      String(newCount), 
      `Booking ${booking.id} confirmed: +${propertyDays} property-days`, 
      "system"
    );
  }
  
  const remainingBalance = member.membershipType === "SOCIAL" 
    ? 40 - await getMembershipUsageCount(member.id, getPeriodStartDate(new Date(checkIn)))
    : null;
  
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
    
    // Only Social members get the cap check
    if (member.membershipType === "SOCIAL") {
      const { checkIn, checkOut } = req.body;
      const propertyDays = computePropertyDays(checkIn, checkOut);
      
      // Determine which period this booking falls into
      // Period is 8/1 → 7/31; if checkIn is 8/1 or later, use current year's period (8/1)
      // If checkIn is before 8/1, use prior year's period (prior 8/1)
      const checkInDate = new Date(checkIn);
      const periodStartDate = getPeriodStartDate(checkInDate); // returns "2026-08-01" or "2027-08-01", etc.
      
      const usage = await getMembershipUsage(member.id, periodStartDate);
      const proposed = (usage?.propertyDaysUsed ?? 0) + propertyDays;
      
      if (proposed > 40) {
        return res.status(400).json({
          error: "USAGE_LIMIT_EXCEEDED",
          message: `This booking would exceed your 40-property-day annual limit (period: ${periodStartDate} → next 7/31).`,
          remainingDays: 40 - usage.propertyDaysUsed,
          requestedDays: propertyDays,
        });
      }
      
      // Attach usage info to req for handler to use
      req.memberUsage = { periodStartDate, propertyDays, remaining: 40 - proposed };
    }
    
    return handler(req, res, next);
  };
}

// Helper: given a date, return the period_start_date (always 8/1)
function getPeriodStartDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-indexed
  // If date is 8/1 or later, period started Aug 1 of this year
  // If date is before 8/1, period started Aug 1 of prior year
  const periodYear = month >= 8 ? year : year - 1;
  return `${periodYear}-08-01`;
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

### 6.3 Audit Log View

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

### 6.4 Reporting & Analytics

**New reports page: `/ops/reports`**

Admin users need segmented reporting on membership tiers, bookings, revenue, and usage. All reports are filterable by membership_type and exportable to CSV.

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

#### 6.4.4 Social Tier Usage Report

Detailed usage breakdown for all Social members: property-days used, remaining, admin adjustments.

```typescript
// Endpoint: GET /api/admin/reports/social-usage?periodStartDate=2026-08-01
// Returns: array of { memberId, memberName, periodStartDate, propertyDaysUsed, remaining, adjustments: [...] }

export function SocialUsageReport() {
  const [usageData, setUsageData] = useState([]);
  const [periodStartDate, setPeriodStartDate] = useState("2026-08-01");
  
  useEffect(() => {
    fetch(`/api/admin/reports/social-usage?periodStartDate=${periodStartDate}`)
      .then(r => r.json())
      .then(data => setUsageData(data));
  }, [periodStartDate]);
  
  const handleExportCSV = () => {
    const csv = usageDataToCSV(usageData);
    downloadCSV(csv, "social-usage-report.csv");
  };
  
  return (
    <section>
      <h2>Social Tier Usage Report</h2>
      <div className="filters">
        <label>Period Start Date:</label>
        <input type="date" value={periodStartDate} onChange={(e) => setPeriodStartDate(e.target.value)} />
        <button onClick={handleExportCSV}>Export CSV</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Member Name</th>
            <th>Used / 40</th>
            <th>Remaining</th>
            <th>Admin Adjustments</th>
          </tr>
        </thead>
        <tbody>
          {usageData.map(u => (
            <tr key={u.memberId}>
              <td>{u.memberName}</td>
              <td>{u.propertyDaysUsed} / 40</td>
              <td>{u.remaining}</td>
              <td>{u.adjustments.length > 0 ? u.adjustments.map(a => `${a.delta} (${a.reason})`).join("; ") : "None"}</td>
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

### 7.1 Initial Data Setup

**Current state:** 2 members exist with no tier assignment.

**After Phase 1 schema deployment:**

1. Run migration to add `membershipType` column to the members table. This column has NO default; it is NOT NULL.
2. **Manual backfill required:** Owner must assign a tier (DESIGNATED, SILVER, or SOCIAL) to each existing member before Phase 1 goes live. This is done via the admin UI (Member edit form).
3. Once each member has been assigned a tier, they can log in and access tier-gated features.

**Important:** Do not deploy Phase 1 to production until all existing members have a tier assigned. Attempting to access the portal with no membershipType set will result in an error.

### 7.2 New Member Creation Flow

For all **new** member signups or admin invites after Phase 1 deployment:

- The signup/invite flow MUST collect or specify the membership_type as a required field.
- Admin invites: a form field "Membership Tier" (required, enum: DESIGNATED | SILVER | SOCIAL).
- Self-signup flows (if enabled): ideally show a form asking "Choose your membership tier" or route users to tier selection before account creation completes.
- The member record is not created until membershipType is set.

### 7.3 Backfill Script (Manual Bulk Assignment)

If owner wants to assign tiers to multiple existing members via a script:

```typescript
// scripts/bulk-assign-tiers.ts
// Usage: MEMBER_TIERS_JSON="[{id:1,tier:'DESIGNATED'},{id:2,tier:'SILVER'}]" pnpm run bulk-assign-tiers

const assignments = JSON.parse(process.env.MEMBER_TIERS_JSON || "[]");

for (const { id, tier } of assignments) {
  const member = await getMember(id);
  if (!member) continue;
  
  await updateMember(id, { membershipType: tier });
  await logAudit(id, "TIER_CHANGED", "(backfill - no prior tier)", tier, "Bulk assignment during Phase 1 setup", "system");
}
```

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

### Phase 1: Schema + Admin UI Setup (2 weeks)

**Deliverables:**
- ✅ Add `membership_type` enum and column to `members` table (NOT NULL, required)
- ✅ Create `membership_usage` table with periodStartDate key (8/1 → 7/31)
- ✅ Create `membership_audit` table for full audit trail
- ✅ Admin endpoints: PATCH tier, GET/PATCH usage (by period), GET audit log
- ✅ Reporting endpoints: members, bookings, revenue, social-usage (all with CSV export)
- ✅ Member edit form with tier dropdown + Social usage section
- ✅ Audit log view (admin only)
- ✅ Reporting dashboard (4 report views)
- ✅ Backfill: existing members manually assigned tiers via admin UI
- ✅ New signup/invite flows enforce membershipType as required field
- ❌ No member-facing changes yet (no hiding/showing features)

**Testing:** Admin UI manual test, audit log spot-check, reporting export validation

**Deployment:** Test on staging; deploy to production. All existing members MUST have a tier assigned before members can log in.

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

### Phase 3: Social Tier 40-Day Enforcement (1 week)

**Deliverables:**
- ✅ POST `/api/bookings/property` guard: check Social tier usage against 8/1-7/31 period
- ✅ Usage counter increment on booking confirm
- ✅ Cross-period booking logic: entire booking counts against start-date period
- ✅ Booking form: show "X remaining days" warning for Social
- ✅ Reject booking if it would exceed 40-day cap for the period
- ✅ Admin can manually adjust/grant/comp usage (logged in audit trail)

**Testing:** 
- Integration tests for booking cap enforcement
- Integration tests for period boundary handling
- E2E: Social member books up to 40 days, then rejected on overage

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

// GET /api/admin/reports/social-usage?periodStartDate=2026-08-01
// Returns Social member usage: days used, remaining, adjustments by member

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
- [ ] Schema: MembershipType enum (DESIGNATED, SILVER, SOCIAL)
- [ ] Schema: membership_type column added to members (NOT NULL, required)
- [ ] Schema: membership_usage table created with periodStartDate (8/1) key
- [ ] Schema: membership_audit table created with delta tracking
- [ ] Endpoint: PATCH /api/admin/members/:id/tier (with audit log)
- [ ] Endpoint: GET /api/admin/members/:id/usage (by periodStartDate)
- [ ] Endpoint: PATCH /api/admin/members/:id/usage/adjust (manual adjustment with audit)
- [ ] Endpoint: GET /api/admin/audit/:memberId (audit log view)
- [ ] Endpoint: GET /api/admin/reports/members (CSV export)
- [ ] Endpoint: GET /api/admin/reports/bookings (CSV export)
- [ ] Endpoint: GET /api/admin/reports/revenue (CSV export)
- [ ] Endpoint: GET /api/admin/reports/social-usage (CSV export)
- [ ] Admin UI: Member edit form tier dropdown
- [ ] Admin UI: Social usage display + manual adjust button
- [ ] Admin UI: Audit log view
- [ ] Admin UI: Reports dashboard (4 report views)
- [ ] Backfill: existing members manually assigned tiers via admin UI
- [ ] Member signup/invite flows: membershipType as required field

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

