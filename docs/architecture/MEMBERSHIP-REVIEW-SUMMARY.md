# Rivers Lodge Membership System — Owner Review Summary

**For Owner Approval Only. Not Implementation Code.**  
**Status:** Architecture Review — awaiting owner approval before Phase 1 build begins  
**Date:** July 12, 2026  
**Revised:** Clarified Staff Roles vs. Member Tiers, Extensible Access Control Model, CRUD Permissions

---

## What This Document Is

This is a plain-English summary of Rivers Lodge's user-type-based access control system. The platform is built on two independent axes:

1. **Staff Roles** (who works for Rivers Lodge): Admin, Employee
2. **Member Tiers** (membership purchased): Designated, Silver, Social

Every view, feature, and communication channel is controlled by these roles and tiers, making the system flexible for future additions.

**What this is NOT:**
- Not code or technical implementation details
- Not including SQL schema or API endpoints
- Not ready to build until you review and approve

---

## Core Concepts: Staff Roles vs. Member Tiers

The system has **two independent permission axes**:

### Staff Roles
**Internal users who work for Rivers Lodge** (not members, separate from membership tiers)

- **Admin** — Full system control (owner, operations manager)
- **Employee** — Operational support (guide, concierge, coordinator)

A staff member can be either Admin OR Employee, but not both. (An admin who also performs guide duties is still one role or the other at any given time.)

### Member Tiers
**External users who purchase membership** (independent of staff roles)

- **Designated** — Full member access
- **Silver** — Approved offerings only
- **Social** — Property access with shared org allowance

A member has exactly one tier at a time.

---

## Staff Roles (Internal)

### Admin
**Operations Manager / Full System Control**

**What they can do:**
- View and edit the Master Calendar
- Create, edit, delete members
- Assign and change member tiers
- Create and manage Social Parent Organizations
- Adjust organization allowances
- Override any booking or access restriction (manual intervention)
- View all reports and audit logs
- Manage other staff roles (promote/demote Employee ↔ Admin, if needed)
- Send communications to any member or staff type
- Manage all system settings and configuration
- View all member data and booking details

**What they CANNOT do:**
- (Everything else is fair game; Admin is unrestricted)

**Example:** Owner, operations manager, senior staff

### Employee
**Internal Staff / Operational Support**

**What they can do:**
- **View** the Master Calendar (read-only; cannot edit dates, closures, or bookings)
- **View** member contact information and their own bookings (to coordinate experiences)
- **Create and edit** guided experiences/approved offerings (define what Silver members can book)
- **View** their own activity logs and history
- **Send messages** to Admin and other Employees (internal coordination)
- **Receive and respond to** member messages (concierge support)

**What they CANNOT do:**
- Edit the Master Calendar (block dates, schedule hunts, etc. — Admin only)
- Create, edit, or delete members
- Change any member's tier
- Access member payment/billing information
- Create announcements or bulk communications
- Access reports or audit logs
- Override any restrictions or caps
- Manage other staff members

**Example:** Guide, concierge, operations coordinator, instructor

---

## Member Tiers (External)

### Designated
**Full Member Access**

**What they can do:**
- **View** the Master Calendar (read-only member view; shows closures, hunts, fishes, other Designated bookings)
- **Browse and book** properties enabled for Designated tier (unlimited access, no caps)
- **View** all pricing for Designated offerings
- **View** their own bookings and confirmations
- **View** their own profile and edit it
- **Message staff** for concierge support
- **Receive** announcements and communications sent to Designated members or all members

**What they CANNOT do:**
- **View** Employee calendar edit controls, Silver offerings, Social properties, or admin tools
- **View** other members' bookings or profiles
- **Edit** the Master Calendar
- **Override** any rules or caps
- **Access** reports or financial data

**Example:** Primary members, ownership family, key partner families

### Silver
**Approved Offerings Only**

**What they can do:**
- **Browse and book** properties/offerings explicitly enabled for Silver tier (guided hunts, guided fishing, paid lodging packages, etc.)
- **View** pricing for approved Silver offerings only
- **View** their own bookings and confirmations
- **View** their own profile and edit it
- **Message staff** for experience coordination
- **Receive** announcements and communications sent to Silver members or all members

**What they CANNOT do:**
- **View** the Master Calendar, Designated properties, Social properties, or admin tools
- **View** other members' details, bookings, or profiles
- **Edit** anything
- **Override** rules or access restrictions
- **Access** reports or financial data

**Example:** Investors, long-term partners, corporate guests seeking structured experiences

### Social
**Property Access with Tracked Organization Allowance**

**What they can do:**
- **Browse and book** properties enabled for Social tier (unlimited; usage is tracked for billing)
- **View** pricing for Social properties only
- **View** property-specific availability calendar (booked dates shown in red, available dates bookable)
- **View** their own bookings and confirmations
- **View** their own profile and edit it
- **View** other members' names within the same organization (to coordinate group trips)
- **Message staff** for booking support
- **Receive** announcements sent to Social members, all members, or their specific organization

**What they CANNOT do:**
- **View** the Master Calendar, Designated properties, Silver offerings, or admin tools
- **View** other organizations' members or details
- **View** their organization's budget or usage tracking
- **Edit** anything
- **Access** reports or financial data

**Important:** Social members can book beyond their org's annual allowance. Usage is tracked and admin bills for overages after the fact.

**Example:** Corporate groups, institutional partners like Five Elms Capital

---

## CRUD Permission Matrix (What Each Role Can Create, Read, Update, Delete)

| Resource/Action | Admin | Employee | Designated | Silver | Social |
|---|---|---|---|---|---|
| **Members** | ✅ CRUD | ❌ | ❌ | ❌ | ❌ |
| **Member Tiers** | ✅ CRU | ❌ | ❌ | ❌ | ❌ |
| **Properties** | ✅ CRUD | ❌ | 🔍 R | 🔍 R | 🔍 R |
| **Property Visibility** | ✅ CRU | ❌ | ❌ | ❌ | ❌ |
| **Guided Experiences** | ✅ CRU | ✅ CRU | ❌ | 🔍 R | ❌ |
| **Master Calendar** | ✅ CRUD | 🔍 R | 🔍 R | ❌ | ❌ |
| **Own Profile** | ✅ RU | ✅ RU | ✅ RU | ✅ RU | ✅ RU |
| **Other Members' Profiles** | ✅ R | ❌ | ❌ | ❌ | 🔍 R (org only) |
| **Own Bookings** | ✅ R | ❌ | ✅ R | ✅ R | ✅ R |
| **All Bookings** | ✅ R | ❌ | ❌ | ❌ | ❌ |
| **Communications** | ✅ CRUD | ✅ CU (staff only) | 🔍 R (own) | 🔍 R (own) | 🔍 R (own) |
| **Organizations/Groups** | ✅ CRUD | ❌ | ❌ | ❌ | ❌ |
| **Allowances/Caps** | ✅ CRU | ❌ | ❌ | ❌ | ❌ |
| **Reports** | ✅ R | ❌ | ❌ | ❌ | ❌ |
| **Audit Logs** | ✅ R | ❌ | ❌ | ❌ | ❌ |

**Key:**
- ✅ = Full access
- 🔍 = Limited/read-only access
- ❌ = No access

---

## User-Type-Based Access Control: The Core Pattern

This is the **principle that drives all development**. Every feature in the system follows this model:

### 1. Every Resource Has Visibility Settings

When admin creates or manages **any** resource (property, guide experience, news, gallery, document, etc.), they set:
- Which staff roles can see it (Admin, Employee)
- Which member tiers can see it (Designated, Silver, Social)
- Any tier-specific variants (e.g., "pricing shown to all; but this property is Silver-only")

### 2. Every View Shows Only Allowed Content

When any user logs in:
- Their role + tier determines what views are available
- Navigation automatically filters based on their access
- Content is filtered at the API level (server never returns forbidden data)
- Client-side rendering respects their tier (hides tabs, buttons, forms they can't use)

### 3. Every Action is Tier-Gated

When a user tries to do something (book property, message staff, view report):
- Server checks their role + tier
- If allowed: action proceeds
- If forbidden: server returns 403 Forbidden or 404 Not Found (user doesn't even see it exists)

### 4. Adding a New Feature is Simple

To add a new feature (e.g., "Dining Menu Reservations"):
1. Create the feature in the admin tool
2. Add visibility toggles: ☐ Admin, ☐ Employee, ☐ Designated, ☐ Silver, ☐ Social
3. Mark which tiers can **view** it, which can **book** it, which can **edit** it
4. Deploy. Users automatically see only what they're allowed to see.

---

## Extensibility: Adding New Roles or Tiers in the Future

The architecture is designed to support adding new roles or tiers without rewriting the core system.

### Adding a New Staff Role

If you add a new role (e.g., "Manager"):
1. Create the new role in the database
2. Define its permissions (which resources it can CRUD)
3. Update the CRUD matrix
4. Existing resources automatically respect the new role's permissions

### Adding a New Member Tier

If you add a new membership tier (e.g., "Platinum"):
1. Create the new tier in the database
2. Define its permissions and caps (if any)
3. Property visibility toggles automatically include the new tier (Admin can enable ☐ Platinum for properties)
4. All access control checks automatically include the new tier

### How This Works

The system doesn't hardcode "if Designated, then... if Silver, then..." Instead:
- Every resource stores visibility: a list of allowed roles/tiers
- Every access check asks: "Does this user's role/tier appear in this resource's visibility list?"
- New roles/tiers automatically work everywhere because they're just another entry in the visibility list

---

## Member Visibility & Privacy Rules

### Can Members See Each Other?

**Designated members:**
- **Cannot see** other Designated members' profiles or bookings (privacy by default)
- Can see **anonymized** master calendar (closures, hunts/fishes, but no member names)

**Silver members:**
- **Cannot see** other Silver members' details

**Social members:**
- **Can see** other Social members' **names only** within their organization (to coordinate group trips)
- **Cannot see** other members' booking details or full profile
- **Cannot see** members from other organizations

### Can Admin See Everything?

**Admin:**
- **Can view** all members' profiles, bookings, preferences, and contact information
- **Can view** reports showing bookings by tier, member, organization, etc.

---

## Member Profile Fields

### Mandatory Fields (Required for Every Member)

1. **Name** — member's full name
2. **Email** — primary contact (used for authentication)
3. **Membership Tier** — MUST be assigned at signup (Designated, Silver, or Social)
4. **Organization** (if tier is Social) — required; selects which org they belong to

### Optional Profile Fields

1. **Date of Birth** — used for legal/waiver purposes
2. **Phone Number** — primary contact number
3. **Address** — mailing address (street, city, state, zip)
4. **Spouse Name** — name of spouse/partner
5. **Spouse Phone** — spouse/partner contact number
6. **Spouse Age** — age of spouse/partner
7. **Children Names** — list of children's names (text area)

### Interest Checklist

Members indicate interests so staff can tailor recommendations and coordinate experiences. **Multiple selections allowed.**

**Available interests:**
- Fishing
- Waterfowl hunting
- Deer hunting
- Upland hunting
- Food & Wine
- Fly Fishing
- Hiking
- Yoga
- Lodging
- 5-Stand shooting

**Note:** Interest checklist is used for member experience coordination (staff reads interests, suggests appropriate bookings). It's not used for access control; interests do not restrict what a member can see or book.

### Admin-Only Fields

1. **Internal Notes** — admin-only notes (e.g., "CEO of Five Elms Capital", "prefers upland over waterfowl")
2. **Billing Address** — if different from mailing address
3. **Payment Method** — stored via payment processor
4. **Account Status** — Active, Suspended, Inactive (admin-only; affects access)

**Key Decision:** Every member MUST have a tier assigned at account creation. There is no "pending" or "unassigned" state.

---

## Organizations & Groups (Flexible Model)

### Social Parent Organizations (Today)

A **Social Parent Organization** is a corporate entity (Five Elms Capital) where multiple Social members book properties under a shared annual allowance.

**How it works:**
- Organization has annual budgeted allowance (e.g., 40 property-days/year)
- All Social members under that org can book properties freely (no blocking)
- Actual usage is tracked automatically when members book
- Allowance resets annually on the org's period_start_date anniversary (e.g., Five Elms: 8/1 each year)
- Admin can adjust the allowance anytime (e.g., change 40 → 50 for next year)
- Admin runs reports showing actual usage vs. budgeted allowance
- Admin manually bills for overages after the fact (e.g., "You budgeted 40, used 43; charging for 3 days")

**Members do NOT see:**
- Their org's allowance or budget
- How many days have been used
- Remaining days

**Admin sees:**
- Usage per org (tracked automatically)
- Reports by custom date ranges (not just fiscal year; any dates admin chooses)
- Can identify overages and bill accordingly

### Future: Groups for Any Tier

The system is designed to support **groups/organizations for any membership tier**, not just Social:

- **Designated Group:** Multiple Designated members from the same company; track shared preferences or group event scheduling
- **Silver Group:** Corporate Silver members; track group experience availability
- **Designated + Social:** Family units or corporate entities with mixed-tier access

The database structure supports this. Phase 1 implements it for Social; future phases can extend it to other tiers.

---

## Properties & Visibility Controls

### Property Visibility Model (Flexible)

Each **property has visibility settings** that can be toggled by admin:

**Visibility checkboxes (one per tier/role):**
- ☐ Admin can see (for management)
- ☐ Employee can see (for coordination)
- ☐ Designated can see/book
- ☐ Silver can see/book
- ☐ Social can see/book

**Design principle:** If you add a new member tier (e.g., Platinum), a new checkbox automatically appears for it.

**Examples:**

| Property | Admin | Employee | Designated | Silver | Social | Notes |
|---|---|---|---|---|---|---|
| Rivers Lodge Main | ☑ | ☑ | ☑ | ☑ | ☐ | Designated + Silver can book; admin/staff manage |
| Upland Hideaway | ☑ | ☐ | ☐ | ☑ | ☐ | Silver-exclusive guided experience |
| Remote Hunt Camp | ☑ | ☑ | ☐ | ☐ | ☑ | Social members only (with cap) |
| Deer Blind Cabin | ☑ | ☑ | ☑ | ☐ | ☑ | Designated + Social; not for Silver |

### Master Calendar

**Who can view it:**
- Designated members (read-only member view)
- Admin (full view and edit)

**Who can edit it:**
- Admin only

**Who cannot see it:**
- Employee (cannot view)
- Silver (cannot view)
- Social (cannot view)

---

## Communication System

### Types of Communication

The platform supports **multiple communication channels**, all tier-aware:

1. **Announcements** — Admin sends to selected roles/tiers (e.g., "Waterfowl season opens Sept 15" → Designated + Social; or "Staff meeting 10am" → Employee only)

2. **Direct Messages** — Members message staff; staff message members or each other

3. **Notifications** — System sends auto-notifications (e.g., "Booking confirmed" → member; "New booking" → staff; "Allowance updated" → org members)

4. **Newsletters/Campaigns** — Admin sends to specific tiers (e.g., "September news for Designated members", "quarterly org report for Five Elms")

5. **Confirmations** — Auto-generated upon booking/cancellation (member receives; admin can see in audit log)

### Communication Permissions

| Who sends | To whom | Example |
|---|---|---|
| Admin | Any role/tier or specific members | "Waterfowl season opening: Sept 15" → all members OR → Designated members only |
| Employee | Admin + other Employees (internal) | "Guide ready for John's hunt tomorrow?" |
| Member (Designated, Silver, Social) | Staff only | "Question about my Sept 15 booking" |

### Future Communication Features

The system is designed to support:
- Tier-specific email campaigns
- Notification preferences per tier (members opt in/out of announcements)
- Member-to-member messaging (within organizations, if you enable it)
- Event-triggered communications (booking made → send itinerary email)

---

## Admin Tools: Comprehensive Management

### Admin Member Management

**Where:** `/ops/members`

**Capabilities:**
- **View all members** — table with name, email, tier, organization, status, joined date
- **Create member** — form requires name, email, tier, organization (if Social)
- **Edit member** — change name, email, tier, organization, profile fields, account status
- **View member audit log** — all changes to this member (tier changes, profile updates, bookings, communications received)
- **Delete member** — removes from system; warns of cascade
- **Bulk actions** — export to CSV, apply tier changes to multiple members (if needed)

### Admin Property Management

**Where:** `/ops/properties`

**Capabilities:**
- **View all properties** — table with name, tile photo, visibility settings (Admin ✓/✗, Employee ✓/✗, Designated ✓/✗, Silver ✓/✗, Social ✓/✗), status
- **Create property** — form with:
  - Name, description, detailed description
  - **Tile photo upload** (featured image that displays on property list/tile in member portal)
  - Additional photos/gallery (detail page)
  - **Visibility checkboxes** for each role/tier (select who can see/book)
  - Property attributes (beds, bathrooms, amenities, etc.)
- **Edit property** — change details, photos, visibility, or attributes
- **Quick toggle** — toggle visibility per tier without full edit
- **Delete property** — removes from system
- **Photo management:** Upload, replace, or delete tile photo and gallery photos

### Admin Organization/Group Management

**Where:** `/ops/organizations`

**Capabilities:**

1. **View all organizations** — table with name, type (Social, Group, etc.), annual allowance (if capped), period start date, YTD usage, member count

2. **Create organization** — form requires:
   - Organization name
   - Type (Social = shared cap; Group = no cap, just grouping)
   - Annual allowance (if type is Social)
   - Period start date
   - Optional notes

3. **View organization details** — drill-down page showing:
   - Summary card (name, allowance, period, YTD usage, remaining, member count)
   - Members tab (table of members in org, their usage)
   - Usage history tab (all bookings made by members, searchable/exportable)
   - Allowance adjustment button

4. **Edit organization** — change name, type, allowance, period

5. **Adjust allowance** — modal with current allowance, new amount, reason (audit-logged immediately)

6. **Delete organization** — warns of cascade effect to members

### Admin Reports Dashboard

**Where:** `/ops/reports`

**All reports support custom date ranges** (admin picks any start/end dates, not limited to fiscal year or org period boundaries).

**Reports:**

1. **Member Roster** — filterable by tier, status; columns: ID, name, email, tier, org, joined date; export CSV

2. **Bookings Report** — filterable by tier, status; includes custom date range picker; columns: member, tier, property, dates booked, booking status, property-days used; export CSV

3. **Revenue Report** — by tier and/or org; includes custom date range picker; summary of property-days used and breakdown by property; export CSV

4. **Organization Usage Report** — table showing: org name, annual allowance, property-days used (in selected date range), overage (if any), member count; export CSV
   - **Example:** Five Elms Capital used 43 days in Aug 1 - July 31 period (allowance 40); overage = 3 days

5. **Organization Members Report** — select an org, see per-member usage; columns: member name, property-days used in date range, booking count; export CSV

All reports are filterable and exportable to CSV for billing/analysis.

### Admin Audit Log View

**Where:** `/ops/audit-log`

**Capabilities:**
- View all changes: member edits, tier changes, property edits, allowance adjustments, communications sent, bookings made
- Filterable by: member, action type, date range, staff member who made change
- Shows: timestamp, action, old value, new value, reason, admin/employee who made change
- Read-only (immutable)

### Admin Communication Management (Phase 3)

**Where:** `/ops/communications`

**Capabilities:**
- **Create announcement** — select recipient roles/tiers, write message, schedule/send
- **View communication history** — all announcements sent, who received them, read status (if applicable)
- **Create campaign** — send newsletter/update to specific tiers with template

---

## What Gets Built in Each Phase

### Phase 1: Access Control Foundation & Admin UI (2–3 weeks)

**Database schema:**
- Add `membership_type` to members (Designated / Silver / Social)
- Add `tier_visibility` to properties (flexible array: roles/tiers that can see it)
- Add `user_role` to staff accounts (Admin, Employee)
- Create `organization` table (supports Social orgs and future groups)
- Create `organization_usage` table (tracks property-days used per org per period)
- Create `membership_audit` table (logs all changes)
- Create `communication` table (messages, announcements, notifications)
- Add `interests` to members (checklist)
- Add member profile fields (DOB, phone, address, spouse, children, notes)
- Add `tile_photo_url` and `gallery_photos` to properties

**Admin UI:**
- User role management (Admin, Employee assignments)
- Member CRUD (create, edit, delete, tier assignment)
- Property CRUD (create, edit, delete, **tile photo upload**, visibility toggles)
- Organization CRUD (create, edit, manage, **adjust allowances**)
  - Admin sets period_start_date per org (e.g., 8/1 for Five Elms)
  - Allowance resets automatically on anniversary date
- Reports dashboard (5 reports with **custom date range picker**, CSV export)
- Audit log viewer
- Communication system backend (storage, delivery logic)
- **Automatic usage tracking:** When a booking is created, property-days are tracked toward the org's usage

**What's NOT built:**
- Client-side filtering (members still see all nav)
- Property availability calendar (booked dates shown; built in Phase 2)
- Communication UI for staff (can't send from portal yet)
- Tier-based routing in member portal

**Testing:**
- Admin can set property visibility per tier
- Admin can upload tile photos for properties
- Properties filter correctly by role/tier
- Members can be created/edited with tier assignment
- Organizations can be created with period_start_date and allowance
- Usage is tracked when bookings are made
- Reports generate by custom date ranges and export to CSV
- Audit logs record all changes

**Rollback:** Reverse migration; restore tables to pre-Phase-1

---

### Phase 2: Member-Facing Conditional Rendering & Property Availability (1 week)

**Frontend filtering:**
- Navigation dynamically shows/hides sections per tier
- Dashboard tiles shown/hidden per tier
- Property lists filter to tier-enabled properties only
- Booking forms show/hide options per tier
- Master Calendar shown to Designated only

**Property Availability Calendar:**
- When member views a property, they see a calendar/date picker
- **Booked dates display in RED** (unavailable, cannot book)
- **Available dates are clickable/bookable**
- This calendar shows the same for all tiers (Designated, Silver, Social)
- Member selects available dates to book

**Tile Photo Display:**
- Property list shows tile photo for each property
- Property detail page shows featured photo + gallery

**Backend guards:**
- API rejects forbidden access with 403 Forbidden
- Server never returns data for tier-disabled resources
- All endpoints check tier before returning data

**Member communication UI:**
- Members can message staff
- Members receive notifications and announcements
- Members see tier-relevant confirmations

**What's NOT enforced:**
- Admin communication UI (staff can't send announcements yet; backend only)

**Testing:**
- Log in as each tier; verify correct nav
- Silver can't see Properties or Master Calendar
- Property detail page shows booked dates in red
- Can click available dates to book
- Tile photos display on property list
- Forbidden endpoints return 403

**Rollback:** Revert UI; keep schema and guards

---

### Phase 3: Advanced Reporting & Staff Communication UI (1–2 weeks)

**Advanced Reporting:**
- Usage tracking per org is automatic (built in Phase 1)
- Reports dashboard allows custom date range queries (built in Phase 1)
- Phase 3 adds: detailed billing analytics, member usage trends, revenue forecasting (if needed)

**Staff Communication UI:**
- Admin can create/send announcements from portal (pick target role/tier)
- Employee can send internal messages to admin/other employees
- View communication history and read status
- Message templates for common communications (booking confirmations, policy reminders, etc.)

**Advanced features:**
- Notification preferences per member (opt in/out of announcements)
- Automated notification emails (booking confirmed, property available, etc.)
- Tier-specific email templates
- Communication archive/search

**Billing Integration (optional):**
- If desired: integration with billing system to auto-charge overages
- Detailed overages tracking per org, per period
- Invoice generation from overage reports

**Testing:**
- Admin can send announcement → correct tiers receive it
- Admin can view communication history
- Custom date range reports show accurate usage
- Overages are clearly identified for billing

**Rollback:** Disable staff communication UI; reports still available

---

## Clear Summary: What's Documented vs. What's Actually in Code (July 12)

### In Planning / Architecture Documents Only:

1. ✅ **This owner-facing review summary** — comprehensive tier-based access control architecture
   - **This is planning only; no code implements it yet**

### NOT Yet in Code (Completely Unchanged):

1. ❌ **No database schema changes**
2. ❌ **No admin UI** — Operations Portal doesn't have these tools yet
3. ❌ **No tier-based filtering** — member portal shows same content to all
4. ❌ **No communication system** — no messaging or announcements
5. ❌ **No booking enforcement** — no caps, no allowance tracking
6. ❌ **No profile extensions** — no interests, spouse info, etc.

### What Actually Exists Today:

- Basic user login via Clerk
- Basic member portal (no tier filtering)
- Basic booking system (no restrictions)
- Basic admin tools

**Bottom line:** Zero code for the membership tier system. All implementation is blocked until you approve.

---

## Owner Decisions Locked In

✅ **Employees can view Master Calendar (read-only)** — Employees see it but cannot edit. Only Admin can edit.

✅ **Members cannot message each other** — Members can only message staff. No member-to-member communication.

✅ **Five Elms Capital period start date: 8/1** — Admin sets this per organization when creating it, and can edit it later if contract terms change.

✅ **Period start date is configurable per organization** — Each Social Parent Organization has its own period_start_date. Admin sets it at creation, can update it. Future organizations will have their own dates.

✅ **Existing member tier assignments** — You'll set these up one-by-one via admin tool. No need to backfill or migrate existing data; we'll handle it fresh.

---

## Ready to Move Forward?

The document now reflects your decisions. **Everything is locked in and documented.**

**Is there anything else you'd like to clarify or change before we begin Phase 1 implementation?**

If you approve this document as-is, we can:
1. Commit this final architecture doc to the repo
2. Begin Phase 1: Database schema + Admin UI foundation
3. Your first task after Phase 1: create Five Elms Capital org (8/1 period), assign Designated/Silver/Social tiers to members via admin tool
