# Calendar Architecture Scope
**Last updated:** 2026-07-12  
**Status:** Approved by Owner (Bill Grant)  
**Priority:** Phase 1 Blocker (foundational UI structure)

---

## Problem Statement

Current calendar implementation is fundamentally broken:
- **Estate Calendar** is incorrectly shown to all members as a special calendar view
- This shows lodge-wide closure/event data that members shouldn't see by default
- No **Master Calendar** exists (restricted calendar for estate operations)
- No **My Calendar** exists (personal bookings view for members)
- No **Property Calendars** exist (individual property availability by skill group)
- No skill-group-based access control for calendar visibility
- Admin has no controls to grant/revoke calendar access per skill group

---

## Terminology

### Skill Group
A combination of:
- **Membership tier:** Designated, Silver, or Social
- **Optional staff role:** Admin, Employee, or (no role = member-only)

Examples:
- `Designated` (Designated member, no staff role)
- `Designated + Admin` (Designated member with admin privileges)
- `Silver + Employee` (Silver member with employee privileges)
- `Social` (Social member, no staff role)

---

## Solution: Three-Calendar System

### 1. Master Calendar
**Purpose:** Estate-wide operations dashboard showing all events, closures, and bookings across the entire property.

**Access Control:**
- **Default:** Visible ONLY to Designated members (membership tier = Designated, no staff role required)
- **Overridable by admin:** Admin can grant Master Calendar access to ANY skill group via checkbox controls
- **Admin controls:** Per-tier, per-role checkboxes in Admin Portal settings
  - `[✓] Designated can view Master Calendar` (default checked)
  - `[ ] Silver can view Master Calendar`
  - `[ ] Social can view Master Calendar`
  - `[✓] Admin staff can view Master Calendar` (default checked, all tiers)
  - `[✓] Employee staff can view Master Calendar` (default checked, all tiers)

**Visibility Rules (pseudo-logic):**
```
canViewMasterCalendar(user) =
  (user.tier === "Designated" AND NO_STAFF_ROLE) 
  OR
  (admin.settings.masterCalendar[user.tier] === true)
  OR
  (admin.settings.masterCalendar[user.staffRole] === true)
```

**Data shown:**
- All property bookings (across all properties)
- Estate closures / maintenance windows
- Staff-only events
- Aggregated occupancy

---

### 2. My Calendar
**Purpose:** Personal calendar showing only bookings that belong to the logged-in user.

**Access Control:**
- **Visibility:** All skill groups (every authenticated member)
- **Data isolation:** Shows ONLY bookings/reservations for that user (no admin/staff visibility into other members' calendars)

**Visibility Rules:**
```
canViewMyCalendar(user) = user.isAuthenticated()
```

**Data shown:**
- User's hunt/fish bookings (across all properties)
- User's lodging/wedding reservations
- User's personal events/holds
- Confirmation dates, cancellation deadlines

---

### 3. Property Calendars
**Purpose:** View availability and bookings for a specific property.

**Access Control:**
- **Per-property control:** Admin can enable/disable each property's calendar for each skill group
- **Admin controls:** Checkboxes in Admin Portal for each property
  - Property: "Grand Lodge"
    - `[✓] Designated can view calendar`
    - `[ ] Silver can view calendar`
    - `[ ] Social can view calendar`
    - `[✓] Admin staff can view calendar`
    - `[✓] Employee staff can view calendar`

**Visibility Rules:**
```
canViewPropertyCalendar(user, property) =
  admin.settings.propertyCalendar[property.id][user.tier] === true
  OR
  admin.settings.propertyCalendar[property.id][user.staffRole] === true
```

**Data shown:**
- Property availability (open/blocked dates)
- Bookings for that property only
- Capacity remaining
- Booking activity (new reservations, cancellations)

---

### 4. Estate Property
**Implementation:**
- Estate (lodge + grounds) is treated as a **property** in the booking system (not a special calendar view)
- Estate has its own property ID in `hunting_properties` table
- Estate calendar is accessed like any other property calendar
- Visibility controlled by the same skill-group checkboxes as other properties
- Can be hidden from Silver/Social members if admin unchecks their access

---

## Data Model Changes

### New Admin Settings Table
```sql
CREATE TABLE calendar_access_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);

-- Possible keys and structures:
-- "master_calendar_access" → {
--   "Designated": true,
--   "Silver": false,
--   "Social": false,
--   "Admin": true,
--   "Employee": true
-- }

-- "property_calendar_access" → {
--   "1": { "Designated": true, "Silver": false, "Social": false, "Admin": true, "Employee": true },
--   "2": { "Designated": true, "Silver": true, "Social": false, "Admin": true, "Employee": true },
--   ...
-- }
```

### No Schema Changes Required
- Existing `property_bookings` table already links users to properties
- Existing `hunting_properties` table already stores all properties (including Estate)
- Access control is purely configuration-driven (no new columns needed on members table)

---

## UI Components & Routes

### Portal Member View
**Path:** `/portal` → Calendar tab

**Tabs visible based on access:**
1. **My Calendar** (always visible)
   - Personal bookings across all accessible properties
   - Confirm/cancel bookings

2. **Master Calendar** (conditional, based on skill group + admin settings)
   - Estate-wide view
   - Read-only for most users; admin can see details

3. **Property Calendars** (conditional, per-property based on skill group + admin settings)
   - Select property from dropdown
   - View that property's availability and bookings
   - Book/manage bookings for that property

### Admin Portal View
**Path:** `/ops/calendar-settings` (new)

**Admin Controls:**
- **Master Calendar Access**
  - Checkboxes for each tier (Designated, Silver, Social)
  - Checkboxes for each staff role (Admin, Employee)
  - Toggle visibility on/off

- **Property Calendar Access**
  - Table with properties (rows) and tiers/roles (columns)
  - Checkbox grid: enable/disable per property × skill group
  - Bulk actions: "All Designated members can view all properties"

---

## Implementation Roadmap

### Phase 1a: Calendar Architecture Foundation (THIS BLOCKER)
**Goals:**
1. Replace broken "Estate Calendar" view with proper three-calendar system
2. Implement skill-group-based access control
3. Add admin settings for Master Calendar and property visibility
4. Update MemberPortal.tsx to conditionally render calendars based on access

**Files affected:**
- `features/portal/client/pages/MemberPortal.tsx` — Remove "Estate Calendar" tab, add conditional tabs
- `features/portal/client/components/PortalCalendar.tsx` — Refactor to support Master/My/Property modes
- `features/admin/server/router.ts` — Add calendar access settings CRUD endpoints
- `features/admin/client/pages/PortalAdmin.tsx` — Add calendar settings UI
- `features/_core/server/startup-migration.ts` — Create calendar_access_settings table

**Acceptance Criteria:**
- [ ] "Estate Calendar" tab removed from member view
- [ ] "My Calendar" tab shows only personal bookings
- [ ] "Master Calendar" tab appears only for Designated members (or when admin has granted access)
- [ ] "Property Calendar" tabs appear based on admin settings
- [ ] Admin can toggle Master Calendar access per skill group
- [ ] Admin can toggle property calendar access per skill group
- [ ] All calendar data is correctly filtered by user's skill group

### Phase 1b: Complete Membership Scope (depends on 1a)
**Goals:** Complete remaining Phase 1 deliverables (organizations, usage tracking, reports)

This is unblocked once calendar architecture is fixed.

---

## Access Control Matrix

| Calendar | Designated | Silver | Social | Admin Staff | Employee Staff |
|---|---|---|---|---|---|
| Master | ✓ (default) | ✗ (unless granted) | ✗ (unless granted) | ✓ | ✓ |
| My Calendar | ✓ | ✓ | ✓ | ✓ | ✓ |
| Property | Per admin setting | Per admin setting | Per admin setting | ✓ | ✓ |
| Estate Property | Per admin setting | Per admin setting | Per admin setting | ✓ | ✓ |

---

## Questions for Clarification

None — requirements are clearly specified. Proceed with implementation based on above scope.

---

## Approval Checklist

- [x] Owner (Bill Grant) approved clarified requirements in chat
- [x] Scope document created and ready for development
- [ ] Implementation branch created
- [ ] Calendar refactor PR opened
- [ ] Calendar refactor PR merged to main
- [ ] Deployed to production
