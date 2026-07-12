# Phase 1 Implementation Plan — Vertical Slices

**Status:** Ready for development  
**Duration:** 2–3 weeks  
**Approach:** Vertical slices (each feature is complete from database through UI)

---

## What is a Vertical Slice?

Each slice is a **complete, standalone feature** that includes:
- Database schema changes
- Server API endpoints (CRUD + guards)
- Admin UI component
- Testing steps
- Can be reviewed/edited independently

Slices can be built in any order and merged individually. This makes it easy to catch mistakes and iterate on each feature.

---

## Vertical Slices for Phase 1

### Slice 1: Member Tier Foundation

**What it does:** Add membership_type field to members; allow admin to assign and change member tiers.

**Database:**
```
ALTER TABLE members ADD COLUMN membership_type VARCHAR(20) NOT NULL DEFAULT 'DESIGNATED';
-- Types: DESIGNATED, SILVER, SOCIAL
-- No member can be created without a tier
```

**API Endpoints:**
- `GET /api/admin/members` — list all members with their tier
- `POST /api/admin/members` — create member (requires tier)
- `PATCH /api/admin/members/:id` — update member (can change tier)
- `GET /api/admin/members/:id` — get member details with tier

**Guard:** `requireAdminRole()` on all endpoints

**Admin UI:**
- **Member List Page** (`/ops/members`)
  - Table: ID, Name, Email, Tier (dropdown), Organization (if Social), Joined Date
  - Actions: View, Edit, Delete
- **Member Create Form** (`/ops/members/new`)
  - Fields: Name, Email, Tier (dropdown: Designated / Silver / Social)
  - Organization field (required if tier = Social, hidden otherwise)
  - Submit → creates member
- **Member Edit Form** (`/ops/members/:id`)
  - Can change: Name, Email, Tier, Organization
  - Audit log link (view changes)

**Testing:**
- [ ] Admin can create Designated member (no org required)
- [ ] Admin can create Silver member (no org required)
- [ ] Admin can create Social member (requires org selection)
- [ ] Admin can change member tier (Designated → Silver, etc.)
- [ ] Member list shows all members with correct tier
- [ ] Cannot create member without tier

**Rollback:** Remove `membership_type` column; drop PATCH tier endpoint

---

### Slice 2: Property Tier Visibility

**What it does:** Add tier_visibility field to properties; admin can toggle which tiers can see each property.

**Database:**
```
ALTER TABLE properties ADD COLUMN tier_visibility JSON DEFAULT '{}';
-- { "DESIGNATED": true, "SILVER": false, "SOCIAL": true }
-- Also allows future tiers: just add to JSON
```

**API Endpoints:**
- `GET /api/admin/properties` — list all properties with visibility settings
- `POST /api/admin/properties` — create property (with visibility toggles)
- `PATCH /api/admin/properties/:id` — update property (including visibility)
- `PATCH /api/admin/properties/:id/visibility` — quick toggle visibility per tier
- `DELETE /api/admin/properties/:id` — delete property

**Guard:** `requireAdminRole()` on all endpoints

**Admin UI:**
- **Property List Page** (`/ops/properties`)
  - Table: Name, Tile Photo (thumbnail), Designated ✓/✗, Silver ✓/✗, Social ✓/✗, Status
  - Actions: View, Edit, Delete
  - Quick toggles: click ✓/✗ to toggle visibility per tier
- **Property Create Form** (`/ops/properties/new`)
  - Fields: Name, Description, Tile Photo (upload), Gallery Photos (upload)
  - Checkboxes: Designated ☐, Silver ☐, Social ☐ (select which tiers can see)
  - Submit → creates property
- **Property Edit Form** (`/ops/properties/:id`)
  - Can change: Name, Description, Tile Photo, Gallery Photos, Visibility Checkboxes

**Testing:**
- [ ] Admin can create property with Designated visibility
- [ ] Admin can create property with Silver visibility
- [ ] Admin can create property with Social visibility
- [ ] Admin can toggle visibility on/off per tier
- [ ] Property list shows correct visibility badges
- [ ] Quick toggle actually updates visibility

**Rollback:** Remove `tier_visibility` column

---

### Slice 3: Staff Roles (Admin & Employee)

**What it does:** Add user_role field to users; distinguish between Admin (full control) and Employee (limited).

**Database:**
```
ALTER TABLE users ADD COLUMN user_role VARCHAR(20) DEFAULT NULL;
-- Types: ADMIN, EMPLOYEE (NULL = not staff, just member)
```

**API Endpoints:**
- `GET /api/admin/staff` — list all staff (Admin + Employee)
- `POST /api/admin/staff` — create staff account (assign role)
- `PATCH /api/admin/staff/:id` — change staff role
- `DELETE /api/admin/staff/:id` — remove staff role

**Guard:** `requireAdminRole()` on all endpoints

**Admin UI:**
- **Staff Management Page** (`/ops/staff`)
  - Table: Name, Email, Role (Admin / Employee), Status
  - Actions: Edit, Remove
- **Staff Create Form** (`/ops/staff/new`)
  - Email (lookup existing user or invite)
  - Role: Admin / Employee (dropdown)
  - Submit → assigns role
- **Staff Edit Form** (`/ops/staff/:id`)
  - Can change: Role (Admin ↔ Employee)

**Testing:**
- [ ] Admin can create staff account with Admin role
- [ ] Admin can create staff account with Employee role
- [ ] Admin can change staff role (Admin ↔ Employee)
- [ ] Staff list shows correct roles
- [ ] Employee cannot access admin tools (guard blocks them)

**Rollback:** Remove `user_role` column

---

### Slice 4: Organizations (Social Parent Orgs)

**What it does:** Create organization table; allow admin to create orgs, set budgets and period dates.

**Database:**
```
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'SOCIAL', -- SOCIAL, GROUP, etc.
  annual_booking_allowance INT,
  period_start_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add FK to members:
ALTER TABLE members ADD COLUMN organization_id INT REFERENCES organizations(id);
-- NULL for Designated/Silver; required for Social
```

**API Endpoints:**
- `GET /api/admin/organizations` — list all organizations
- `POST /api/admin/organizations` — create org (name, type, allowance, period_start_date)
- `GET /api/admin/organizations/:id` — get org details
- `PATCH /api/admin/organizations/:id` — update org (name, notes)
- `PATCH /api/admin/organizations/:id/allowance` — adjust allowance (audit-logged)
- `DELETE /api/admin/organizations/:id` — delete org (cascade warning)

**Guard:** `requireAdminRole()` on all endpoints

**Admin UI:**
- **Organizations List Page** (`/ops/organizations`)
  - Table: Name, Type, Annual Allowance, Period Start Date, Member Count
  - Actions: View, Edit, Delete
- **Organization Create Form** (`/ops/organizations/new`)
  - Name, Type (Social / Group), Annual Allowance, Period Start Date
  - Notes (optional)
  - Submit → creates org
- **Organization Detail Page** (`/ops/organizations/:id`)
  - Summary card: Name, Type, Allowance, Period (start → +1 year)
  - Tabs: Members, Allowance Adjustment
  - Members tab: table of members in org
  - Allowance button: modal to adjust (current, new, reason)
- **Organization Edit Form** (`/ops/organizations/:id/edit`)
  - Can change: Name, Notes

**Testing:**
- [ ] Admin can create Social org with allowance and period_start_date
- [ ] Organization list shows all orgs with correct allowance/period
- [ ] Admin can adjust allowance
- [ ] Admin can view members in org
- [ ] Period start date is stored and editable per org
- [ ] Cascade warning shows when deleting org

**Rollback:** Drop `organizations` table; remove `organization_id` from members

---

### Slice 5: Organization Usage Tracking

**What it does:** Create usage tracking table; automatically increment usage when bookings are created.

**Database:**
```
CREATE TABLE organization_usage (
  id SERIAL PRIMARY KEY,
  organization_id INT NOT NULL REFERENCES organizations(id),
  period_start_date DATE NOT NULL,
  property_days_used INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, period_start_date)
);

-- When a booking is created, auto-calculate:
-- - booking.check_out - booking.check_in = days
-- - determine which period the booking's start_date falls into
-- - increment organization_usage.property_days_used
```

**API Endpoints:**
- `GET /api/admin/organizations/:id/usage` — get usage for current period
- `GET /api/admin/organizations/:id/usage-history` — get all bookings in org (with dates and property-days)

**Guard:** `requireAdminRole()` on all endpoints

**Backend Logic:**
```
When POST /api/bookings/property is called:
  1. Determine booking's property_days = checkout - checkin
  2. Determine org's period containing check_in date
  3. Get or create organization_usage record for (org_id, period_start_date)
  4. Increment organization_usage.property_days_used += property_days
  5. Log in audit trail: "booking created, org usage +X days"
```

**Testing:**
- [ ] When Social member books 3-day trip, org usage increments by 3
- [ ] Usage is attributed to correct period (based on start date)
- [ ] Multiple bookings by different members increment org's shared pool
- [ ] Cross-period bookings counted in start-date period only (no splitting)
- [ ] Admin can view usage per org
- [ ] Usage history shows all bookings with property-days

**Rollback:** Drop `organization_usage` table; remove tracking logic from booking creation

---

### Slice 6: Member Profile Extensions

**What it does:** Add optional profile fields to members: interests, DOB, phone, address, spouse, children.

**Database:**
```
ALTER TABLE members ADD COLUMN date_of_birth DATE;
ALTER TABLE members ADD COLUMN phone_number VARCHAR(20);
ALTER TABLE members ADD COLUMN address_street VARCHAR(255);
ALTER TABLE members ADD COLUMN address_city VARCHAR(100);
ALTER TABLE members ADD COLUMN address_state VARCHAR(2);
ALTER TABLE members ADD COLUMN address_zip VARCHAR(10);
ALTER TABLE members ADD COLUMN spouse_name VARCHAR(255);
ALTER TABLE members ADD COLUMN spouse_phone VARCHAR(20);
ALTER TABLE members ADD COLUMN spouse_age INT;
ALTER TABLE members ADD COLUMN children_names TEXT; -- comma-separated or line-by-line
ALTER TABLE members ADD COLUMN interests JSON; -- { "fishing": true, "deer": false, ... }
ALTER TABLE members ADD COLUMN admin_notes TEXT;
```

**API Endpoints:**
- `PATCH /api/members/profile` — member updates their own profile
- `PATCH /api/admin/members/:id/profile` — admin updates member profile
- `GET /api/members/profile` — member views their own profile

**Guard:** 
- Members can only edit their own profile
- Admin can edit any member's profile

**Admin UI:**
- **Member Profile Edit Form** (in member edit form, add section for profile fields)
  - Personal: Name, DOB, Phone
  - Address: Street, City, State, Zip
  - Family: Spouse Name, Spouse Phone, Spouse Age, Children Names
  - Interests: checkboxes (Fishing, Waterfowl, Deer, Upland, Food & Wine, Fly Fishing, Hiking, Yoga, Lodging, 5-Stand)
  - Admin Notes: text area

**Member Portal UI:**
- **My Profile Page** (`/portal/profile`)
  - View/edit own profile (all fields optional except name/email/tier)
  - Save changes locally

**Testing:**
- [ ] Admin can edit member profile fields
- [ ] Member can view/edit their own profile
- [ ] Interests are saved as checkboxes
- [ ] Profile changes are audit-logged
- [ ] All fields are optional except name/email/tier

**Rollback:** Drop all new columns

---

### Slice 7: Property Photos

**What it does:** Add tile photo and gallery photo fields to properties; allow upload/delete.

**Database:**
```
ALTER TABLE properties ADD COLUMN tile_photo_url VARCHAR(500);
ALTER TABLE properties ADD COLUMN gallery_photos JSON; -- array of URLs
-- { "photos": ["url1", "url2", "url3"] }
```

**API Endpoints:**
- `POST /api/admin/properties/:id/upload-tile-photo` — upload tile photo (returns URL)
- `POST /api/admin/properties/:id/upload-gallery-photo` — upload gallery photo (returns URL)
- `DELETE /api/admin/properties/:id/photos/:photoUrl` — delete photo

**Guard:** `requireAdminRole()` on all endpoints

**Admin UI:**
- **Property Edit Form** (add photo section)
  - Tile Photo: upload button, preview image, delete button
  - Gallery Photos: upload button, preview grid, delete buttons for each
  - Photos stored as URLs in S3 or similar

**Member Portal UI:**
- **Property List** (`/portal/properties`)
  - Show tile photo as thumbnail for each property
- **Property Detail** (`/portal/properties/:id`)
  - Show tile photo as hero image
  - Show gallery photos below

**Testing:**
- [ ] Admin can upload tile photo
- [ ] Admin can upload multiple gallery photos
- [ ] Tile photo displays on property list
- [ ] Gallery photos display on property detail
- [ ] Admin can delete photos
- [ ] Photos are stored and retrieved correctly

**Rollback:** Drop `tile_photo_url` and `gallery_photos` columns

---

### Slice 8: Membership Audit Logging

**What it does:** Create audit log table; log all changes to members, properties, orgs, staff.

**Database:**
```
CREATE TABLE membership_audit (
  id SERIAL PRIMARY KEY,
  member_id INT REFERENCES members(id),
  action VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  changed_by VARCHAR(255) NOT NULL, -- admin user ID or "system"
  changed_at TIMESTAMP DEFAULT NOW()
);
```

**Audit Events to Log:**
- Member created: `action=MEMBER_CREATED, new_value={all fields}`
- Member tier changed: `action=TIER_CHANGED, old_value=DESIGNATED, new_value=SILVER`
- Member org changed: `action=ORG_CHANGED, old_value=null, new_value=Five Elms Capital`
- Member profile updated: `action=PROFILE_UPDATED, old_value={old}, new_value={new}`
- Property created: `action=PROPERTY_CREATED`
- Property visibility changed: `action=VISIBILITY_CHANGED, old_value={old}, new_value={new}`
- Organization allowance adjusted: `action=ALLOWANCE_ADJUSTED, old_value=40, new_value=50, reason="Contract amendment"`
- Booking created: `action=BOOKING_CREATED, new_value={booking details}`

**API Endpoints:**
- `GET /api/admin/audit-log` — list all audit entries (filterable by member, action, date range)
- `GET /api/admin/members/:id/audit` — audit log for specific member

**Guard:** `requireAdminRole()` on all endpoints

**Admin UI:**
- **Audit Log Page** (`/ops/audit-log`)
  - Table: Timestamp, Member, Action, Old Value, New Value, Reason, Changed By
  - Filters: Member (dropdown), Action (dropdown), Date Range
  - Sort by timestamp (descending)

**Testing:**
- [ ] Tier changes are logged
- [ ] Member profile updates are logged
- [ ] Property visibility changes are logged
- [ ] Organization allowance changes are logged
- [ ] Audit log shows admin who made change
- [ ] Audit log is read-only (immutable)
- [ ] Can filter by member, action, date range

**Rollback:** Drop `membership_audit` table

---

### Slice 9: Communication System (Backend Only)

**What it does:** Create communication table for messages and announcements; build backend logic (Phase 3 will add UI for staff to send).

**Database:**
```
CREATE TABLE communications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- ANNOUNCEMENT, DIRECT_MESSAGE, NOTIFICATION, etc.
  sender_id INT REFERENCES users(id), -- admin/employee ID
  recipient_role VARCHAR(20), -- ADMIN, EMPLOYEE, DESIGNATED, SILVER, SOCIAL (or NULL for direct message)
  recipient_id INT REFERENCES members(id), -- NULL for announcements, set for direct messages
  subject VARCHAR(255),
  body TEXT,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**API Endpoints (Backend, used by system):**
- `POST /api/communications/send-announcement` — admin sends announcement to roles/tiers
- `POST /api/communications/send-direct-message` — member/staff sends message
- `GET /api/communications/inbox` — user gets their messages/notifications
- `PATCH /api/communications/:id/read` — user marks message as read

**Guard:** Various (admin can send to anyone, members can only message staff, etc.)

**Testing:**
- [ ] Announcements can be sent to specific roles/tiers
- [ ] Direct messages can be sent between members and staff
- [ ] Messages are stored and retrievable
- [ ] Read status is tracked
- [ ] No member-to-member messaging (only to staff)

**Rollback:** Drop `communications` table

**Note:** UI for staff to send announcements is Phase 3. Phase 1 is backend only.

---

### Slice 10: Reports Dashboard

**What it does:** Build reports pages with custom date range filtering and CSV export.

**API Endpoints:**
- `GET /api/admin/reports/members` — member roster (filterable by tier, status)
- `GET /api/admin/reports/bookings` — bookings report (filterable by tier, status, date range)
- `GET /api/admin/reports/revenue` — revenue summary (by tier, date range)
- `GET /api/admin/reports/organization-usage` — org usage report (allowance vs. actual usage)
- `GET /api/admin/reports/organization-members` — per-member usage within org

**Query Parameters:**
- `startDate=2026-08-01&endDate=2026-10-31` — custom date range
- `tier=DESIGNATED` — filter by tier
- `format=csv` — export to CSV

**Guard:** `requireAdminRole()` on all endpoints

**Admin UI:**
- **Reports Dashboard Page** (`/ops/reports`)
  - Tabs: Members, Bookings, Revenue, Organization Usage, Organization Members
  
- **Members Report Tab**
  - Filters: Tier (dropdown), Status (dropdown)
  - Table: ID, Name, Email, Tier, Org, Joined Date
  - Export to CSV button

- **Bookings Report Tab**
  - Filters: Tier (dropdown), Status (dropdown), Date Range (start/end picker)
  - Table: Member, Tier, Property, Check-In, Check-Out, Property-Days, Status
  - Export to CSV button

- **Revenue Report Tab**
  - Filters: Tier (dropdown), Date Range
  - Summary card: Total Revenue, By Tier breakdown, Average per Booking
  - Table: Breakdown by property, tier, date range
  - Export to CSV button

- **Organization Usage Report Tab**
  - Table: Org Name, Annual Allowance, Property-Days Used (in selected period), Overage, Member Count, Period Start Date
  - Sortable by usage %, remaining, member count
  - Export to CSV button

- **Organization Members Report Tab**
  - Dropdown to select organization
  - Table: Member Name, Property-Days Used (in date range), Booking Count
  - Export to CSV button

**Testing:**
- [ ] Reports generate with correct data
- [ ] Custom date ranges work correctly
- [ ] Filters by tier work
- [ ] CSV export produces valid files
- [ ] Organization usage shows allowance vs. actual usage
- [ ] Overages are identified (actual > allowance)

**Rollback:** Remove endpoints and UI (no data lost, just features unavailable)

---

## Build Order & Dependencies

**Suggested order (can be parallelized):**

1. **Slice 1** (Member Tier Foundation) — foundation for others
2. **Slice 3** (Staff Roles) — foundation for access control
3. **Slice 2** (Property Visibility) — depends on Slice 1
4. **Slice 4** (Organizations) — depends on Slice 1
5. **Slice 5** (Usage Tracking) — depends on Slices 1, 4
6. **Slice 6** (Member Profiles) — independent
7. **Slice 7** (Photos) — independent
8. **Slice 8** (Audit Logging) — depends on Slices 1, 2, 4
9. **Slice 9** (Communication) — depends on Slice 1
10. **Slice 10** (Reports) — depends on Slices 1, 4, 5

**Parallelizable:**
- Slices 6, 7 can be built at any time
- Slices 2, 4 can start once Slice 1 is done
- Slice 9 (backend) doesn't block other work

---

## Testing Checklist

After each slice is merged, run:

```bash
pnpm test                  # Unit tests pass
pnpm lint                  # No linting errors
pnpm build                 # Build succeeds
# Manual testing in /ops:
# - Create/edit members
# - Toggle property visibility
# - Create organizations
# - View reports
```

---

## Rollback Plan (Per Slice)

If a slice breaks something:

1. Identify which slice caused the issue
2. Revert that slice's PR
3. Fix the issue on the branch
4. Re-submit

Since each slice is independent, reverting one doesn't affect others.

---

## Notes

- Each slice should be a **pull request** for easy review
- Keep slices small and focused (1-2 days of work each)
- Test each slice independently before moving to the next
- Ask for feedback after each PR before merging
