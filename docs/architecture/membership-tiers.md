# Membership Tiers Architecture & Implementation Plan

**Status:** Planning Phase (no implementation code written)  
**Date:** July 2026  
**Target Rollout:** Phase 1 Q3 2026 (pending owner tier assignments)

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
enum("membership_type", ["DESIGNATED", "SILVER", "SOCIAL", "UNASSIGNED"])

// TypeScript type
type MembershipType = "DESIGNATED" | "SILVER" | "SOCIAL" | "UNASSIGNED";
```

### 2.2 Member Table Changes

**New column:**
```typescript
membershipType: MembershipType = "UNASSIGNED"
```

- Existing members default to `UNASSIGNED` until owner reviews and assigns.
- This field is mutable by admins (see audit log in 2.3).

### 2.3 Usage Tracking Table: `membership_usage`

Tracks annual property-day usage for Social tier members only.

```typescript
// Drizzle schema
export const membershipUsage = pgTable("membership_usage", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  year: integer("year").notNull(), // e.g., 2026
  propertyDaysUsed: integer("property_days_used").notNull().default(0), // cumulative count
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniq: uniqueIndex("membership_usage_member_year").on(table.memberId, table.year),
}));
```

- One row per Social member per calendar year.
- `propertyDaysUsed` is cumulative; incremented on each booking confirmation.
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
    const currentYear = new Date().getFullYear();
    const usage = await getMembershipUsage(member.id, currentYear);
    const proposed = (usage?.propertyDaysUsed ?? 0) + propertyDays;
    
    if (proposed > 40) {
      throw new TierLimitError(
        `Booking would exceed 40-property-day annual limit. You have ${40 - usage.propertyDaysUsed} days remaining this year.`
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
    await incrementMembershipUsage(member.id, currentYear, propertyDays);
    await logAudit(member.id, "USAGE_ADJUSTED", ..., `Booking confirmed: +${propertyDays} days`);
  }
  
  return { booking, remainingBalance: member.membershipType === "SOCIAL" ? 40 - newUsageCount : null };
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

```typescript
export async function adjustMemberUsage(req) {
  const admin = requireAdminRole(req, ["manager", "superadmin"]);
  const { memberId } = req.params;
  const { year, adjustment, reason } = req.body;
  // adjustment can be positive (grant) or negative (deduct)
  
  const member = await getMember(memberId);
  if (member.membershipType !== "SOCIAL") {
    throw new Error("Usage adjustment only applies to SOCIAL members");
  }
  
  const usage = await getMembershipUsage(memberId, year);
  const newCount = Math.max(0, (usage?.propertyDaysUsed ?? 0) + adjustment);
  
  await updateMembershipUsage(memberId, year, newCount);
  await logAudit(
    memberId, 
    "USAGE_ADJUSTED", 
    usage?.propertyDaysUsed ?? 0, 
    newCount, 
    reason, 
    admin.id
  );
  
  return { success: true, year, newCount };
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
- Prevents unassigned members from accessing any tier-specific features.

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
      const currentYear = new Date().getFullYear();
      const usage = await getMembershipUsage(member.id, currentYear);
      const proposed = (usage?.propertyDaysUsed ?? 0) + propertyDays;
      
      if (proposed > 40) {
        return res.status(400).json({
          error: "USAGE_LIMIT_EXCEEDED",
          message: `This booking would exceed your 40-property-day annual limit.`,
          remainingDays: 40 - usage.propertyDaysUsed,
          requestedDays: propertyDays,
        });
      }
      
      // Attach usage info to req for handler to use
      req.memberUsage = { currentYear, propertyDays, remaining: 40 - proposed };
    }
    
    return handler(req, res, next);
  };
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

---

## 7. Migration & Backfill Plan

### 7.1 Initial Data Setup

**Current state:** 2 members exist with no tier assignment.

**After Phase 1 schema deployment:**

1. Run migration to add `membershipType` column with default `"UNASSIGNED"`.
2. Both existing members now have `membershipType = "UNASSIGNED"`.
3. Owner reviews each member individually and assigns via admin UI.
4. Once assigned, member can access tier-gated features.

### 7.2 Backfill Script (if owner provides bulk tier assignments)

```typescript
// scripts/bulk-assign-tiers.ts
// Usage: MEMBER_TIERS_JSON="[{id:1,tier:'DESIGNATED'},{id:2,tier:'SILVER'}]" pnpm run bulk-assign-tiers

const assignments = JSON.parse(process.env.MEMBER_TIERS_JSON || "[]");

for (const { id, tier } of assignments) {
  const member = await getMember(id);
  await updateMember(id, { membershipType: tier });
  await logAudit(id, "TIER_CHANGED", "UNASSIGNED", tier, "Bulk backfill", "system");
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
- ✅ Add `membership_type` enum and column to `members` table
- ✅ Create `membership_usage` table for Social tier tracking
- ✅ Create `membership_audit` table
- ✅ Admin endpoints: PATCH tier, GET/PATCH usage, GET audit log
- ✅ Member edit form with tier dropdown + usage section (admin only)
- ✅ Audit log view (admin only)
- ✅ Backfill: both existing members set to `UNASSIGNED`
- ✅ Owner reviews and assigns tiers via admin UI
- ❌ No member-facing changes yet (no hiding/showing features)

**Testing:** Admin UI manual test, audit log spot-check

**Deployment:** Test on staging; deploy to production once owner has assigned tiers.

---

### Phase 2: Member-Facing UI (Conditional Rendering) (1 week)

**Deliverables:**
- ✅ Conditional nav: hide "Properties" and "Master Calendar" based on tier
- ✅ Conditional dashboard tiles: show/hide based on tier
- ✅ Calendar view: Designated only
- ✅ Properties list: Designated & Social only
- ✅ Events booking: All tiers (visible)
- ✅ Usage display: Social only (shows X/40 in nav)

**Endpoint guards (server-side):**
- GET `/api/properties` → requires `DESIGNATED` or `SOCIAL`
- GET `/api/calendar/master` → requires `DESIGNATED` only
- GET `/api/events` → all tiers

**Testing:**
- E2E: each tier navigates to expected sections, forbidden sections 404 or redirect
- Verify Silver cannot see property picker even if they navigate directly

**Deployment:** Roll out to production once Phase 1 admin ops are complete.

---

### Phase 3: Social Tier 40-Day Enforcement (1 week)

**Deliverables:**
- ✅ POST `/api/bookings/property` guard: check Social tier usage
- ✅ Usage counter increment on booking confirm
- ✅ Booking form: show "X remaining days" warning for Social
- ✅ Reject booking if it would exceed 40 days
- ✅ Admin can manually adjust/grant/comp usage
- ✅ Year boundary handling (usage resets Jan 1 by default; OR member anniversary if configured)

**Testing:** Integration tests for booking cap enforcement, year-reset logic

**Deployment:** Final phase; production rollout once all Phase 2 tests pass.

---

## 10. Open Questions for Owner

Before Phase 1 begins, the owner must decide:

1. **Annual Reset Boundary**: Should Social member usage reset on:
   - Jan 1 (calendar year) — simpler, standard
   - Membership anniversary (member's signup date) — per-member tracking required
   - Custom date (e.g., Sept 1 for lodge fiscal year)
   
   *Recommendation: Jan 1 (calendar year) for simplicity.*

2. **Year Boundary Crossings**: If a Social member books a 10-day property that spans Dec 31 → Jan 1 (5 days in 2026, 5 days in 2027):
   - Count all 10 days against 2026?
   - Split across years (5 + 5)?
   - Count only the check-in year (2026)?
   
   *Recommendation: Count against the year of the check-in date.*

3. **Admin Override Authority**: Can admins (Operations staff) override the 40-day cap for Social members (e.g., "owner wants to grant this member an extra 10 days this year")?
   - Yes → build admin override flag
   - No → cap is absolute; admin can only adjust via usage counter
   
   *Recommendation: Yes, admins can adjust (via the usage-adjust endpoint); cap remains enforced for regular bookings.*

4. **Silver Tier Event Pricing**: Should Silver members see event pricing before login, or only after they authenticate?
   - Public pricing → same as Designated/Social
   - Member-rate pricing only → login required to see price
   
   *Recommendation: Member-rate pricing after login (protects confidentiality; non-members see marketing page only).*

5. **Designated ↔ Silver Conversion**: If a Designated member downgrade to Silver, what happens to their existing property bookings?
   - Honor existing bookings (don't cancel)
   - Cancel future property bookings
   - Require admin review before downgrade
   
   *Recommendation: Honor existing bookings; cancel future ones; log warning in audit.*

6. **Event Booking Caps**: Are there any event-booking limits by tier (e.g., Social limited to 2 guided events/year)?
   - Current requirement: NO limits; all tiers can book events freely
   - Owner preference?
   
   *Recommendation: No limits on events; tiers differ only on properties.*

7. **UNASSIGNED Member Access**: During the backfill phase (before owner assigns tiers), should unassigned members:
   - See a locked portal ("awaiting tier assignment")?
   - Access as SOCIAL (permissive default)?
   - Access nothing (deny all)?
   
   *Recommendation: Deny all; owner must assign tier before access granted. Prevents confusion.*

8. **Usage Reporting**: Do you want monthly/quarterly usage reports for all Social members (e.g., "Member X has used 22/40 days as of July 31")?
   - Yes → build a report page in admin dashboard
   - No → on-demand lookup only (admin views per member)
   
   *Recommendation: Yes, add a Social members usage dashboard for admin review.*

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

- [ ] Schema: MembershipType enum created
- [ ] Schema: membership_type column added to members
- [ ] Schema: membership_usage table created
- [ ] Schema: membership_audit table created
- [ ] Endpoint: PATCH /api/admin/members/:id/tier
- [ ] Endpoint: GET /api/admin/members/:id/usage
- [ ] Endpoint: PATCH /api/admin/members/:id/usage/adjust
- [ ] Endpoint: GET /api/admin/audit/:memberId
- [ ] Guard: requireMembershipTier()
- [ ] Guard: requireAdminRole()
- [ ] Decorator: withUsageCheck()
- [ ] GET /api/properties: add tier guard
- [ ] GET /api/calendar/master: add tier guard
- [ ] POST /api/bookings/property: add usage check
- [ ] Admin UI: Member edit form tier dropdown
- [ ] Admin UI: Social usage display + adjust button
- [ ] Admin UI: Audit log view
- [ ] Member UI: Conditional nav per tier
- [ ] Member UI: Conditional dashboard tiles
- [ ] Member UI: Usage card (Social only)
- [ ] Member UI: Booking form usage warning
- [ ] Backfill: both members → UNASSIGNED
- [ ] Tests: unit tests for guards
- [ ] Tests: integration tests for booking flows
- [ ] Tests: E2E happy paths per tier
- [ ] Documentation: README for admins
- [ ] Owner input: resolve all 8 open questions

