# Rivers Lodge 2026 — Feature Migration Plan

> Generated after a full read-only audit of every source file in:
> `server/`, `client/src/`, `drizzle/`, `shared/`, `scripts/`, and all top-level config.
>
> Convention used throughout:
> - `features/<name>/` — a vertical feature slice
> - `features/_core/` — truly app-wide infrastructure (auth session, tRPC base, db singleton, env, notification, llm, storage, etc.)
> - `features/_shared/` — reusable UI/logic that belongs to no single feature (layouts, ui components, hooks, utils)

---

## Section 1: Proposed Feature List

The starting guess is evaluated below. Each item is either kept, merged, split, or renamed with rationale.

| # | Feature | Decision | Rationale |
|---|---------|----------|-----------|
| 1 | **auth** | **Keep** | `users` table, `auth.me`, `auth.logout`, OAuth flow, session cookies, `useAuth` hook. Tightly scoped; nothing else owns login/session. |
| 2 | **inquiries** | **Keep** | `inquiries` table, `inquiriesRouter` (submit / list / updateStatus). Forms, `InquiryForm.tsx`, `InquiryConfirmed.tsx`, `StickyInquiryCTA.tsx`. Distinct data lifecycle from `leads`. |
| 3 | **membership** | **Keep** | `members`, `membershipApplications` tables; `membershipRouter` + `membershipPortalRouter`. Spans both public application flow and staff management. Split into sub-dirs if desired, but one feature boundary. |
| 4 | **booking** | **Split into two features** | The monolith actually contains two distinct booking systems: (a) **booking-engine** — `bookings` table (legacy), `resource_groups/resources/availability_rules/booking_resource_allocations/conflict_acknowledgments/payment_records/waiver_requirements/reservation_requests/leads/booking_state_transitions`; uses `bookingRouter.ts`, `availability/engine.ts`, `booking/stateMachine.ts`. (b) **property-booking** — `hunting_properties/property_seasons/property_booking_rules/property_pricing/property_date_inventory/property_bookings/booking_add_ons/booking_payments/booking_audit_log/harvest_reports/property_blocked_dates/booking_waitlist/property_images/property_amenities`; uses `propertyBookingRouter.ts`. These share only `members`/`users`. Keep as separate features. |
| 5 | **trips** | **Keep** | `hunt_fish_slots`, `trip_requests`; `tripsRouter.ts`. Member-facing slot booking. Distinct from both booking-engine and property-booking. Cross-ref to `members`. |
| 6 | **portal** | **Split into two features** | The `/ops/*` staff operations portal is a shell + sub-routers. Suggest: (a) **admin-portal** — `portalRouter.ts` (dashboard, calendar, weddings, corporate, huntFish, memberBookings, customers, employees, auditLog, reports sub-routers), portal schema tables. (b) Keep **waivers** as its own feature (see below). |
| 7 | **waivers** | **Extract as own feature** | `waivers` (legacy), `waiverTemplates`, `portalWaivers`, `waiverRequirements`, `waiversRouter` (inline in `routers.ts`), `waiversPortalRouter` (in `portalRouter.ts`), `waiverPdf.ts`, `SignWaiver.tsx`, `PortalWaivers.tsx`. The signing flow is fully self-contained and cross-cuts portal + public. |
| 8 | **cms** | **Keep** | All `cms_*` tables, `cmsRouter` (in `routers.ts`). Content is read by multiple features but authored/managed here. |
| 9 | **updates** | **Merge into reports** | `seasonalUpdates` table + `updatesRouter` is thin (3 procedures). Merge with `reports` feature since field reports and newsletters serve the same "content for members" purpose. |
| 10 | **reports** | **Expand (absorbs updates)** | `field_reports`, `newsletters`; `reportsRouter.ts`. Absorbs `updatesRouter` and `seasonalUpdates`. |
| 11 | **messages** | **Keep** | `messages` table; `messagesRouter` (in `routers.ts`). Member-to-staff concierge thread. Small but distinct lifecycle. |
| 12 | **public-pages** | **Keep** | All `client/src/pages/` public pages (Home, Weddings, Hunt, Fish, Venues, Lodging, Corporate, Estate, Gallery, Contact, Membership, MembershipLanding, WeddingsLanding, Privacy). Server-only: none. These don't have backend routes of their own — they consume `cms`, `inquiries`, `trips`. |
| 13 | **member-portal** | **Add (was implicit)** | `MemberPortal.tsx`, `MyBookings.tsx`, `PropertyBrowser.tsx`, `PropertyDetail.tsx`, `PortalAvailability.tsx` (member view). Member-facing portal shell distinct from the staff `/ops` portal. |

### Final Feature List (13 features + 2 infra zones)

```
_core           — auth session, trpc base, db, env, notification, llm, storage, oauth, map
_shared         — ui/, layouts, shared hooks, utils, ErrorBoundary, ThemeContext
auth            — login/logout endpoints, useAuth, OAuth callback
inquiries       — InquiryForm, inquiries table, router
membership      — application form, members table, member CRUD, portal member mgmt
booking-engine  — resources, availability, allocations, bookings (legacy), leads, requests, state machine
property-booking— hunting_properties hierarchy, member self-booking, waitlist, harvest reports
trips           — hunt_fish_slots, trip_requests, public availability calendar
cms             — all cms_* tables, cmsRouter, admin CRUD
reports         — field_reports, newsletters, seasonalUpdates (merged), AI draft
messages        — concierge messages table + router
waivers         — waiver tables (3), waiverPdf, signing flow, portal waiver mgmt
admin-portal    — /ops shell, portal schema tables, weddings/corporate/huntFish portal routers
public-pages    — all public-facing client pages (no server routes owned here)
member-portal   — MemberPortal.tsx + member-facing portal pages
```

---

## Section 2: DB Table → Feature Assignment

| Table | Feature | Notes / Cross-feature refs |
|-------|---------|---------------------------|
| `users` | **_core** | Referenced by almost every feature; stays in _core/db |
| `inquiries` | **inquiries** | Also creates `leads` row (booking-engine cross-ref) |
| `membership_applications` | **membership** | — |
| `members` | **membership** | FK from property-booking, trips, reports |
| `bookings` | **booking-engine** | Legacy unified booking table; also read by admin-portal.memberBookings |
| `waivers` | **waivers** | Legacy simple waiver; superseded by portal_waivers |
| `seasonal_updates` | **reports** | Merged; `updatesRouter` becomes `reports.updates.*` |
| `messages` | **messages** | — |
| `blocked_dates` | **booking-engine** | Legacy; `propertyBookingRouter.public.getBlockedDates` reads this |
| `cms_amenities` | **cms** | Also read by public-pages components |
| `cms_lodging_units` | **cms** | Read by Lodging.tsx (public-pages) |
| `cms_event_spaces` | **cms** | Read by Venues.tsx, Weddings.tsx (public-pages) |
| `cms_packages` | **cms** | Read by public-pages |
| `cms_galleries` / `cms_gallery_images` | **cms** | Read by Gallery.tsx (public-pages) |
| `cms_testimonials` | **cms** | Read by TestimonialsCarousel.tsx (_shared) |
| `cms_faqs` | **cms** | Read by FAQAccordion.tsx (_shared) |
| `cms_policies` | **cms** | Read by membership public page |
| `cms_announcements` | **cms** | Read by public-pages and member-portal |
| `cms_contact_routes` | **cms** | Read by inquiries router |
| `cms_member_content` | **cms** | Read by member-portal |
| `cms_singletons` | **cms** | Read by public-pages |
| `field_reports` | **reports** | Read by reports.newsletters (draft generation) |
| `newsletters` | **reports** | — |
| `wedding_bookings` | **admin-portal** | Also read by booking-engine `portal.*` routers |
| `corporate_bookings` | **admin-portal** | Also read by trips/portal |
| `hunt_fish_bookings` | **admin-portal** | Read by portalRouter.huntFish and portalRouter.reports |
| `harvest_records` | **admin-portal** | Read by portalRouter.huntFish.get, portalRouter.reports |
| `season_configs` | **admin-portal** | Managed by huntFishPortalRouter |
| `portal_blocked_dates` | **admin-portal** | Read by booking-engine availability/engine.ts (cross-feature read) |
| `portal_staff_assignments` | **admin-portal** | Internal portal only |
| `portal_documents` | **admin-portal** | Linked to wedding/corporate bookings |
| `waiver_templates` | **waivers** | FK from `waiver_requirements`, `portal_waivers` |
| `portal_waivers` | **waivers** | Public signing flow + staff management |
| `portal_audit_log` | **admin-portal** | Written by all portal sub-routers |
| `portal_notifications` | **admin-portal** | Read by PortalNotifications.tsx |
| `portal_tasks` | **admin-portal** | Staff task management |
| `portal_notes` | **admin-portal** | Timeline notes on wedding/corporate bookings |
| `resource_groups` | **booking-engine** | — |
| `resources` | **booking-engine** | cmsSlug FK links to cms tables (cross-ref, stays import) |
| `availability_rules` | **booking-engine** | — |
| `booking_resource_allocations` | **booking-engine** | — |
| `conflict_acknowledgments` | **booking-engine** | — |
| `payment_records` | **booking-engine** | Payments for legacy `bookings` table |
| `waiver_requirements` | **waivers** | Bridges waivers ↔ booking-engine |
| `reservation_requests` | **booking-engine** | Also created by inquiries router |
| `leads` | **booking-engine** | Also created by inquiries router |
| `booking_state_transitions` | **booking-engine** | — |
| `hunt_fish_slots` | **trips** | — |
| `trip_requests` | **trips** | FK to `members` (membership cross-ref) |
| `hunting_properties` | **property-booking** | — |
| `property_seasons` | **property-booking** | — |
| `property_booking_rules` | **property-booking** | — |
| `property_pricing` | **property-booking** | — |
| `property_date_inventory` | **property-booking** | — |
| `property_bookings` | **property-booking** | FK to `members` (membership cross-ref) |
| `booking_add_ons` | **property-booking** | — |
| `booking_payments` | **property-booking** | Payments for property_bookings (separate from payment_records) |
| `booking_audit_log` | **property-booking** | Append-only per property_bookings |
| `harvest_reports` | **property-booking** | Post-hunt reporting; FK to property_bookings + members |
| `property_blocked_dates` | **property-booking** | Per-property; distinct from portal_blocked_dates |
| `booking_waitlist` | **property-booking** | — |
| `property_images` | **property-booking** | — |
| `property_amenities` | **property-booking** | — |

---

## Section 3: tRPC Router → Feature Assignment

| Router file | Procedure name | Feature | Notes |
|------------|---------------|---------|-------|
| `server/routers.ts` | `auth.me` | **auth** | Move to `features/auth/router.ts` |
| `server/routers.ts` | `auth.logout` | **auth** | |
| `server/routers.ts` | `inquiries.submit` | **inquiries** | Also writes to `leads` + `reservation_requests` (booking-engine cross-write) |
| `server/routers.ts` | `inquiries.list` | **inquiries** | |
| `server/routers.ts` | `inquiries.updateStatus` | **inquiries** | |
| `server/routers.ts` | `membership.submitApplication` | **membership** | |
| `server/routers.ts` | `membership.listApplications` | **membership** | |
| `server/routers.ts` | `membership.updateApplicationStatus` | **membership** | |
| `server/routers.ts` | `membership.listMembers` | **membership** | |
| `server/routers.ts` | `membership.createMember` | **membership** | |
| `server/routers.ts` | `membership.updateMember` | **membership** | |
| `server/routers.ts` | `membership.myStatus` | **membership** | |
| `server/routers.ts` | `membership.ensureMemberForPreview` | **membership** | |
| `server/routers.ts` | `bookings.list` | **booking-engine** | Legacy bookings table |
| `server/routers.ts` | `bookings.create` | **booking-engine** | |
| `server/routers.ts` | `bookings.update` | **booking-engine** | |
| `server/routers.ts` | `bookings.delete` | **booking-engine** | |
| `server/routers.ts` | `bookings.blockedDates` | **booking-engine** | Legacy blocked_dates table |
| `server/routers.ts` | `bookings.addBlockedDate` | **booking-engine** | |
| `server/routers.ts` | `bookings.removeBlockedDate` | **booking-engine** | |
| `server/routers.ts` | `updates.list` | **reports** | Merged into reports |
| `server/routers.ts` | `updates.create` | **reports** | |
| `server/routers.ts` | `updates.delete` | **reports** | |
| `server/routers.ts` | `messages.myMessages` | **messages** | |
| `server/routers.ts` | `messages.allMessages` | **messages** | |
| `server/routers.ts` | `messages.archive` | **messages** | |
| `server/routers.ts` | `messages.unarchive` | **messages** | |
| `server/routers.ts` | `messages.send` | **messages** | |
| `server/routers.ts` | `messages.reply` | **messages** | |
| `server/routers.ts` | `messages.markRead` | **messages** | |
| `server/routers.ts` | `waivers.list` | **waivers** | Legacy waivers table |
| `server/routers.ts` | `waivers.sign` | **waivers** | |
| `server/routers.ts` | `cms.*` (all 30+ procedures) | **cms** | Move entire cmsRouter to `features/cms/router.ts` |
| `server/routers.ts` | `admin.users` | **auth** | User list — fits auth feature; or _core |
| `server/bookingRouter.ts` | `booking.resources.*` (list, groups, update) | **booking-engine** | |
| `server/bookingRouter.ts` | `booking.availability.*` (check, checkMultiple, calendar) | **booking-engine** | |
| `server/bookingRouter.ts` | `booking.bookings.*` (list, get, create, update, transition, addAllocation, removeAllocation, acknowledgeConflict) | **booking-engine** | |
| `server/bookingRouter.ts` | `booking.payments.*` (record, list) | **booking-engine** | |
| `server/bookingRouter.ts` | `booking.leads.*` (list, create, update, convert) | **booking-engine** | |
| `server/bookingRouter.ts` | `booking.requests.*` (list, submit, update, convert, myRequests) | **booking-engine** | |
| `server/bookingRouter.ts` | `booking.public.getBlockedDates` | **booking-engine** | Public endpoint |
| `server/portalRouter.ts` | `portal.dashboard.*` (kpis, recentActivity, upcomingEvents, notifications, markNotificationRead, markAllNotificationsRead) | **admin-portal** | |
| `server/portalRouter.ts` | `portal.calendar.*` (events, blockDates, unblockDates) | **admin-portal** | |
| `server/portalRouter.ts` | `portal.weddings.*` (list, get, create, update, updateStatus, addNote) | **admin-portal** | |
| `server/portalRouter.ts` | `portal.corporate.*` (list, get, create, update, updateStatus, addNote) | **admin-portal** | |
| `server/portalRouter.ts` | `portal.huntFish.*` (list, get, create, updateStatus, assignGuide, addHarvest, seasons, createSeason, guideSchedule) | **admin-portal** | |
| `server/portalRouter.ts` | `portal.memberBookings.*` (list, updateStatus) | **admin-portal** | Reads legacy `bookings` table |
| `server/portalRouter.ts` | `portal.waivers.*` (templates, createTemplate, list, send, getByToken, sign) | **waivers** | Extract to waivers feature router |
| `server/portalRouter.ts` | `portal.customers.*` (list, get) | **admin-portal** | |
| `server/portalRouter.ts` | `portal.employees.*` (list, updateRole) | **admin-portal** | |
| `server/portalRouter.ts` | `portal.membership.*` (applications, updateApplicationStatus, stats, members, updateMember, searchUsers, createMember) | **membership** | Duplicate of some procedures in routers.ts membershipRouter; consolidate |
| `server/portalRouter.ts` | `portal.auditLog.*` (list) | **admin-portal** | |
| `server/portalRouter.ts` | `portal.reports.*` (pipeline, memberActivity, huntFishSeason) | **admin-portal** | Internal portal analytics; distinct from `reportsRouter` |
| `server/tripsRouter.ts` | `trips.slots.*` (publicAvailability, adminList, create, update, archive) | **trips** | |
| `server/tripsRouter.ts` | `trips.requests.*` (submit, myRequests, cancel, adminList, review) | **trips** | |
| `server/propertyBookingRouter.ts` | `propertyBooking.properties.*` (list, detail, availability, allAvailability) | **property-booking** | Public endpoints |
| `server/propertyBookingRouter.ts` | `propertyBooking.bookings.*` (create, myBookings, detail, cancel, joinWaitlist, submitHarvestReport) | **property-booking** | Member-protected |
| `server/propertyBookingRouter.ts` | `propertyBooking.admin.*` (properties.create, .update, .updateRules, .blockDates; bookings.list, .approve, .decline, .updateStatus, .recordPayment) | **property-booking** | Admin-protected |
| `server/reportsRouter.ts` | `reports.fieldReports.*` (list, get, create, update, delete) | **reports** | |
| `server/reportsRouter.ts` | `reports.newsletters.*` (list, get, generateDraft, update, approve, send, delete) | **reports** | |

---

## Section 4: Full File Migration Plan

### Legend: Migration Order
- **1** = Foundation (no deps on other features — move first)
- **2** = Depends only on order-1 things
- **3** = Depends on order-1 and order-2
- **4** = Move last (touches the most dependents, or is the app entry point)

| Current path | New path | Feature | Order |
|---|---|---|---|
| `server/_core/context.ts` | `features/_core/server/context.ts` | _core | 1 |
| `server/_core/cookies.ts` | `features/_core/server/cookies.ts` | _core | 1 |
| `server/_core/dataApi.ts` | `features/_core/server/dataApi.ts` | _core | 1 |
| `server/_core/env.ts` | `features/_core/server/env.ts` | _core | 1 |
| `server/_core/imageGeneration.ts` | `features/_core/server/imageGeneration.ts` | _core | 1 |
| `server/_core/index.ts` | `features/_core/server/index.ts` | _core | 1 |
| `server/_core/llm.ts` | `features/_core/server/llm.ts` | _core | 1 |
| `server/_core/map.ts` | `features/_core/server/map.ts` | _core | 1 |
| `server/_core/notification.ts` | `features/_core/server/notification.ts` | _core | 1 |
| `server/_core/oauth.ts` | `features/_core/server/oauth.ts` | _core | 1 |
| `server/_core/sdk.ts` | `features/_core/server/sdk.ts` | _core | 1 |
| `server/_core/storageProxy.ts` | `features/_core/server/storageProxy.ts` | _core | 1 |
| `server/_core/systemRouter.ts` | `features/_core/server/systemRouter.ts` | _core | 1 |
| `server/_core/trpc.ts` | `features/_core/server/trpc.ts` | _core | 1 |
| `server/_core/types/cookie.d.ts` | `features/_core/server/types/cookie.d.ts` | _core | 1 |
| `server/_core/types/manusTypes.ts` | `features/_core/server/types/manusTypes.ts` | _core | 1 |
| `server/_core/vite.ts` | `features/_core/server/vite.ts` | _core | 1 |
| `server/_core/voiceTranscription.ts` | `features/_core/server/voiceTranscription.ts` | _core | 1 |
| `server/db.ts` | `features/_core/server/db.ts` | _core | 1 |
| `server/storage.ts` | `features/_core/server/storage.ts` | _core | 1 |
| `shared/_core/errors.ts` | `features/_core/shared/errors.ts` | _core | 1 |
| `shared/const.ts` | `features/_core/shared/const.ts` | _core | 1 |
| `shared/types.ts` | `features/_core/shared/types.ts` | _core | 1 |
| `drizzle/schema.ts` | `features/_core/db/schema.ts` | _core | 1 |
| `drizzle/portal-schema.ts` | `features/_core/db/portal-schema.ts` | _core | 1 |
| `drizzle/booking-schema.ts` | `features/_core/db/booking-schema.ts` | _core | 1 |
| `drizzle/property-booking-schema.ts` | `features/_core/db/property-booking-schema.ts` | _core | 1 |
| `drizzle/relations.ts` | `features/_core/db/relations.ts` | _core | 1 |
| `client/src/_core/hooks/useAuth.ts` | `features/_core/client/hooks/useAuth.ts` | _core | 1 |
| `client/src/lib/trpc.ts` | `features/_core/client/lib/trpc.ts` | _core | 1 |
| `client/src/lib/utils.ts` | `features/_core/client/lib/utils.ts` | _core | 1 |
| `client/src/const.ts` | `features/_core/client/const.ts` | _core | 1 |
| `client/src/contexts/ThemeContext.tsx` | `features/_core/client/contexts/ThemeContext.tsx` | _core | 1 |
| `client/src/hooks/useComposition.ts` | `features/_shared/hooks/useComposition.ts` | _shared | 1 |
| `client/src/hooks/useMobile.tsx` | `features/_shared/hooks/useMobile.tsx` | _shared | 1 |
| `client/src/hooks/usePersistFn.ts` | `features/_shared/hooks/usePersistFn.ts` | _shared | 1 |
| `client/src/hooks/useScrollAnimation.ts` | `features/_shared/hooks/useScrollAnimation.ts` | _shared | 1 |
| `client/src/components/ui/` (all 50+ files) | `features/_shared/ui/` | _shared | 1 |
| `client/src/components/ErrorBoundary.tsx` | `features/_shared/components/ErrorBoundary.tsx` | _shared | 1 |
| `client/src/components/SEOHead.tsx` | `features/_shared/components/SEOHead.tsx` | _shared | 1 |
| `client/src/components/DashboardLayout.tsx` | `features/_shared/components/DashboardLayout.tsx` | _shared | 1 |
| `client/src/components/DashboardLayoutSkeleton.tsx` | `features/_shared/components/DashboardLayoutSkeleton.tsx` | _shared | 1 |
| `client/src/components/ManusDialog.tsx` | `features/_shared/components/ManusDialog.tsx` | _shared | 1 |
| `client/src/components/Map.tsx` | `features/_shared/components/Map.tsx` | _shared | 2 |
| `client/src/components/PublicFooter.tsx` | `features/public-pages/components/PublicFooter.tsx` | public-pages | 1 |
| `client/src/components/PublicLayout.tsx` | `features/public-pages/components/PublicLayout.tsx` | public-pages | 1 |
| `client/src/components/PublicNav.tsx` | `features/public-pages/components/PublicNav.tsx` | public-pages | 1 |
| `client/src/components/PortalLayout.tsx` | `features/admin-portal/components/PortalLayout.tsx` | admin-portal | 2 |
| `client/src/components/FAQAccordion.tsx` | `features/cms/components/FAQAccordion.tsx` | cms | 2 |
| `client/src/components/TestimonialsCarousel.tsx` | `features/cms/components/TestimonialsCarousel.tsx` | cms | 2 |
| `client/src/components/AvailabilityCalendar.tsx` | `features/booking-engine/components/AvailabilityCalendar.tsx` | booking-engine | 2 |
| `client/src/components/HuntFishAvailabilityCalendar.tsx` | `features/trips/components/HuntFishAvailabilityCalendar.tsx` | trips | 2 |
| `client/src/components/InquiryForm.tsx` | `features/inquiries/components/InquiryForm.tsx` | inquiries | 2 |
| `client/src/components/StickyInquiryCTA.tsx` | `features/inquiries/components/StickyInquiryCTA.tsx` | inquiries | 2 |
| `client/src/components/AIChatBox.tsx` | `features/_shared/components/AIChatBox.tsx` | _shared | 2 |
| `client/src/pages/Home.tsx` | `features/public-pages/pages/Home.tsx` | public-pages | 2 |
| `client/src/pages/WeddingsLanding.tsx` | `features/public-pages/pages/WeddingsLanding.tsx` | public-pages | 2 |
| `client/src/pages/MembershipLanding.tsx` | `features/public-pages/pages/MembershipLanding.tsx` | public-pages | 2 |
| `client/src/pages/Weddings.tsx` | `features/public-pages/pages/Weddings.tsx` | public-pages | 2 |
| `client/src/pages/Venues.tsx` | `features/public-pages/pages/Venues.tsx` | public-pages | 2 |
| `client/src/pages/Lodging.tsx` | `features/public-pages/pages/Lodging.tsx` | public-pages | 2 |
| `client/src/pages/Corporate.tsx` | `features/public-pages/pages/Corporate.tsx` | public-pages | 2 |
| `client/src/pages/Estate.tsx` | `features/public-pages/pages/Estate.tsx` | public-pages | 2 |
| `client/src/pages/Gallery.tsx` | `features/public-pages/pages/Gallery.tsx` | public-pages | 2 |
| `client/src/pages/Contact.tsx` | `features/public-pages/pages/Contact.tsx` | public-pages | 2 |
| `client/src/pages/Membership.tsx` | `features/membership/pages/Membership.tsx` | membership | 2 |
| `client/src/pages/Hunt.tsx` | `features/public-pages/pages/Hunt.tsx` | public-pages | 2 |
| `client/src/pages/Fish.tsx` | `features/public-pages/pages/Fish.tsx` | public-pages | 2 |
| `client/src/pages/Privacy.tsx` | `features/public-pages/pages/Privacy.tsx` | public-pages | 2 |
| `client/src/pages/NotFound.tsx` | `features/public-pages/pages/NotFound.tsx` | public-pages | 2 |
| `client/src/pages/InquiryConfirmed.tsx` | `features/inquiries/pages/InquiryConfirmed.tsx` | inquiries | 2 |
| `client/src/pages/ComponentShowcase.tsx` | `features/_shared/pages/ComponentShowcase.tsx` | _shared | 2 |
| `client/src/pages/SignWaiver.tsx` | `features/waivers/pages/SignWaiver.tsx` | waivers | 2 |
| `client/src/pages/MemberPortal.tsx` | `features/member-portal/pages/MemberPortal.tsx` | member-portal | 3 |
| `client/src/pages/portal/MyBookings.tsx` | `features/member-portal/pages/MyBookings.tsx` | member-portal | 3 |
| `client/src/pages/portal/PropertyBrowser.tsx` | `features/member-portal/pages/PropertyBrowser.tsx` | member-portal | 3 |
| `client/src/pages/portal/PropertyDetail.tsx` | `features/member-portal/pages/PropertyDetail.tsx` | member-portal | 3 |
| `client/src/pages/portal/PortalAvailability.tsx` | `features/member-portal/pages/PortalAvailability.tsx` | member-portal | 3 |
| `client/src/pages/AdminDashboard.tsx` | `features/admin-portal/pages/AdminDashboard.tsx` | admin-portal | 3 |
| `client/src/pages/portal/PortalDashboard.tsx` | `features/admin-portal/pages/PortalDashboard.tsx` | admin-portal | 3 |
| `client/src/pages/portal/PortalCalendar.tsx` | `features/admin-portal/pages/PortalCalendar.tsx` | admin-portal | 3 |
| `client/src/pages/portal/PortalWeddings.tsx` | `features/admin-portal/pages/PortalWeddings.tsx` | admin-portal | 3 |
| `client/src/pages/portal/PortalCorporate.tsx` | `features/admin-portal/pages/PortalCorporate.tsx` | admin-portal | 3 |
| `client/src/pages/portal/PortalHuntFish.tsx` | `features/admin-portal/pages/PortalHuntFish.tsx` | admin-portal | 3 |
| `client/src/pages/portal/PortalMemberBookings.tsx` | `features/admin-portal/pages/PortalMemberBookings.tsx` | admin-portal | 3 |
| `client/src/pages/portal/PortalCustomers.tsx` | `features/admin-portal/pages/PortalCustomers.tsx` | admin-portal | 3 |
| `client/src/pages/portal/PortalEmployees.tsx` | `features/admin-portal/pages/PortalEmployees.tsx` | admin-portal | 3 |
| `client/src/pages/portal/PortalMembership.tsx` | `features/admin-portal/pages/PortalMembership.tsx` | admin-portal | 3 |
| `client/src/pages/portal/PortalReports.tsx` | `features/admin-portal/pages/PortalReports.tsx` | admin-portal | 3 |
| `client/src/pages/portal/PortalBookings.tsx` | `features/admin-portal/pages/PortalBookings.tsx` | admin-portal | 3 |
| `client/src/pages/portal/PortalLeads.tsx` | `features/admin-portal/pages/PortalLeads.tsx` | admin-portal | 3 |
| `client/src/pages/portal/PortalNotifications.tsx` | `features/admin-portal/pages/PortalNotifications.tsx` | admin-portal | 3 |
| `client/src/pages/portal/PortalTestimonials.tsx` | `features/admin-portal/pages/PortalTestimonials.tsx` | admin-portal | 3 |
| `client/src/pages/portal/PortalProperties.tsx` | `features/admin-portal/pages/PortalProperties.tsx` | admin-portal | 3 |
| `client/src/pages/portal/PortalWaivers.tsx` | `features/waivers/pages/PortalWaivers.tsx` | waivers | 3 |
| `client/src/pages/portal/PortalFieldReports.tsx` | `features/reports/pages/PortalFieldReports.tsx` | reports | 3 |
| `client/src/pages/portal/PortalNewsletter.tsx` | `features/reports/pages/PortalNewsletter.tsx` | reports | 3 |
| `server/availability/engine.ts` | `features/booking-engine/server/availability/engine.ts` | booking-engine | 2 |
| `server/booking/stateMachine.ts` | `features/booking-engine/server/booking/stateMachine.ts` | booking-engine | 2 |
| `server/waiverPdf.ts` | `features/waivers/server/waiverPdf.ts` | waivers | 2 |
| `server/bookingRouter.ts` | `features/booking-engine/server/router.ts` | booking-engine | 3 |
| `server/tripsRouter.ts` | `features/trips/server/router.ts` | trips | 3 |
| `server/propertyBookingRouter.ts` | `features/property-booking/server/router.ts` | property-booking | 3 |
| `server/reportsRouter.ts` | `features/reports/server/router.ts` | reports | 3 |
| `server/portalRouter.ts` | `features/admin-portal/server/router.ts` (bulk) + extract waiver sub-router to `features/waivers/server/portalRouter.ts` + extract membership sub-router to `features/membership/server/portalRouter.ts` | admin-portal / waivers / membership | 3 |
| `server/routers.ts` | `features/_core/server/appRouter.ts` (thin assembler only) | _core | 4 |
| `client/src/main.tsx` | `client/src/main.tsx` (stays at root; imports from features) | _core | 4 |
| `client/src/App.tsx` | `client/src/App.tsx` (stays at root; route imports updated) | _core | 4 |
| `client/src/index.css` | `client/src/index.css` (stays) | _core | 4 |

---

## Section 5: Cross-Feature Dependencies

### 5.1 inquiries → booking-engine (write)
- **What:** `inquiriesRouter.submit` inserts rows into `leads` and `reservation_requests` (both owned by booking-engine).
- **Decision:** Truly cross-feature write. After migration, `inquiries/server/router.ts` imports `{ leads, reservationRequests } from "features/booking-engine/db"` (public export from booking-engine). This is the correct pattern — inquiries is a source of leads, not the owner.

### 5.2 availability/engine.ts → admin-portal (read)
- **What:** `server/availability/engine.ts` imports `portalBlockedDates` from `portal-schema`, which is an admin-portal table.
- **Decision:** Truly cross-feature read. The engine is pure read-only; it should import `{ portalBlockedDates }` from `features/admin-portal/db` public export. Do not merge booking-engine into admin-portal — they have distinct lifecycles.

### 5.3 admin-portal reports → membership + admin-portal tables
- **What:** `portalRouter.reports.*` queries `weddingBookings`, `corporateBookings`, `huntFishBookings`, `members`.
- **Decision:** `weddingBookings`, `corporateBookings`, `huntFishBookings` are owned by admin-portal; `members` is owned by membership. The reports sub-router stays in admin-portal and imports `members` from `features/membership/db`. This is an intentional pipeline aggregation — stays as cross-feature import.

### 5.4 property-booking → membership (read/validate)
- **What:** `propertyBookingRouter` calls `requireMember(db, userId)` — queries `members` table.
- **Decision:** Cross-feature read. After migration: `features/property-booking/server/router.ts` imports a `getMember()` helper from `features/membership/server/helpers.ts`. This is correct — property-booking is a consumer of membership status, not an owner of it.

### 5.5 trips → membership (read)
- **What:** `tripsRouter` calls `getMemberForUser(userId)` querying `members`.
- **Decision:** Same pattern as 5.4. trips imports from membership public API.

### 5.6 reports → reports (field_reports → newsletters)
- **What:** `newsletterRouter.generateDraft` queries `fieldReports` for context. Both are in the same `reports` feature — this is intra-feature and requires no cross-feature coordination.

### 5.7 cms ↔ public-pages (read)
- **What:** All public pages (Lodging, Venues, Weddings, Gallery, Hunt, Fish) call `trpc.cms.*` queries. Components `FAQAccordion`, `TestimonialsCarousel` consume cms data.
- **Decision:** Truly cross-feature read. public-pages is a consumer of cms, not an owner. The tRPC client call is the correct abstraction boundary — no direct DB import from public-pages. FAQAccordion and TestimonialsCarousel are better placed in `features/cms/components/` since their only purpose is rendering cms data; public-pages imports them from there.

### 5.8 admin-portal (memberBookings) → booking-engine (legacy bookings table)
- **What:** `portalRouter.memberBookings.*` queries the legacy `bookings` table, which is owned by booking-engine.
- **Decision:** Cross-feature read. During migration, `admin-portal/server/router.ts` imports `{ bookings } from "features/booking-engine/db"`. Long-term, migrate legacy bookings to property-booking and retire this table.

### 5.9 admin-portal → membership (membershipPortalRouter duplication)
- **What:** `portalRouter` contains a full `membershipPortalRouter` sub-router that duplicates some procedures from the main `membershipRouter` in `routers.ts`. `portal.membership.*` and top-level `membership.*` both manage `members` and `membershipApplications`.
- **Decision:** Collapse into one. The `membershipPortalRouter` sub-router inside `portalRouter.ts` should be extracted and merged into `features/membership/server/router.ts`. The portal exposes it at `portal.membership.*` only for namespacing in the current monolith; post-migration, the membership feature owns both public and staff procedures.

### 5.10 waivers → booking-engine + property-booking (waiver_requirements)
- **What:** `waiver_requirements` links waiver templates (owned by waivers) to business lines (used by booking-engine and property-booking).
- **Decision:** The `waiverRequirements` table logically belongs to waivers feature but is read by booking-engine (gate check on check-in transition). After migration, booking-engine imports `{ waiverRequirements }` from `features/waivers/db`. waivers is a gating dependency for booking-engine, not vice versa.

---

## Section 6: Hard-to-Assign Files

### 6.1 `server/portalRouter.ts` — `reportsRouter` sub-router (inside portal)
- **Option A:** Keep in admin-portal — it's a pipeline analytics report querying portal tables, not the same as `reportsRouter.ts` content (field reports, newsletters).
- **Option B:** Move to reports feature — merging all reporting.
- **Option C:** Rename to `portal.analytics` to clarify it's not the same as member-facing reports.
- **Recommendation:** **Option A** — keep in admin-portal but rename to `portal.analytics` to avoid naming collision with `features/reports`. The `reportsRouter.ts` (field reports + newsletters) is clearly distinct.

### 6.2 `client/src/pages/portal/PortalAvailability.tsx`
- **Option A:** member-portal — it appears in the member `/portal` section (property availability browser).
- **Option B:** property-booking — it's a UI for property availability, which is property-booking's domain.
- **Option C:** admin-portal — all `/ops/availability` portal pages live there.
- **Recommendation:** **Option A (member-portal)** — the file is used at `/portal/properties` (member-facing route), not `/ops/availability`. `PortalAvailability` in `/ops/` is a different file (`PortalAvailability.tsx` in portal/ which is actually imported at `/ops/availability`). These are two different files serving two different audiences. Confirm before moving.

### 6.3 `drizzle/relations.ts` (currently empty / stub)
- **Option A:** _core/db — it's a Drizzle ORM relations definition file.
- **Option B:** Delete — it's currently just `import {} from "./schema";` with no actual relations defined.
- **Option C:** Populate and keep in _core/db.
- **Recommendation:** **Option C** — populate with actual Drizzle `relations()` definitions using the FK knowledge from the schema files, then move to `features/_core/db/relations.ts`.

### 6.4 `server/db.ts` — mixed data-access functions
- `db.ts` currently serves as both the DB singleton initializer AND a collection of ~40 data-access helper functions (all importing only from `schema.ts`). Post-migration, these belong in individual feature DAL (data access layer) files, not a monolithic `db.ts`.
- **Option A:** Migrate all helpers into feature-specific `dal.ts` files (e.g., `features/membership/server/dal.ts`).
- **Option B:** Keep as `features/_core/server/db.ts` with only the `getDb()` singleton; move each group of helpers to the owning feature.
- **Recommendation:** **Option B** — split by feature ownership. The `getDb()` singleton stays in `_core`. The helpers for `users` stay in `features/auth/server/dal.ts`, for `members` in `features/membership/server/dal.ts`, etc.

### 6.5 `client/src/components/AIChatBox.tsx`
- **Option A:** _shared — it's a generic chat component.
- **Option B:** admin-portal — it's likely used in the staff portal context.
- **Option C:** member-portal — if used in the member dashboard.
- **Recommendation:** Without reading its full usage, place in **_shared** as a candidate; confirm usage in MemberPortal.tsx before committing.

### 6.6 Seed scripts at repo root (`seed-cms.mjs`, `seed-resources.mjs`, `seed-test-member.mjs`, `seed-testimonials.mjs`) vs. `scripts/` subdirectory
- **Option A:** Move all to `scripts/`.
- **Option B:** Keep at root — they are one-off dev utilities.
- **Recommendation:** **Option A** — consolidate all seed scripts under `scripts/` for discoverability.

---

## Section 7: Migration Batches

### Batch 1 — Foundation Infrastructure (no broken state possible)

**What moves:**
- All `server/_core/` files → `features/_core/server/`
- `server/db.ts` → `features/_core/server/db.ts` (keep only `getDb()` singleton for now; DAL helpers stay temporarily)
- `server/storage.ts` → `features/_core/server/storage.ts`
- `shared/` → `features/_core/shared/`
- All `drizzle/*.ts` → `features/_core/db/`
- `client/src/_core/` → `features/_core/client/`
- `client/src/lib/` → `features/_core/client/lib/`
- `client/src/const.ts` → `features/_core/client/const.ts`
- `client/src/contexts/ThemeContext.tsx` → `features/_core/client/contexts/`
- All `client/src/components/ui/` → `features/_shared/ui/`
- `client/src/hooks/` (generic hooks) → `features/_shared/hooks/`
- `client/src/components/ErrorBoundary.tsx`, `SEOHead.tsx`, `DashboardLayout.tsx`, `DashboardLayoutSkeleton.tsx`, `ManusDialog.tsx` → `features/_shared/components/`

**Why first:** Zero feature dependencies. Everything else imports from here. Until these paths are stable, nothing else can move safely.

**Imports to update:** All `@/lib/trpc`, `@/_core/hooks/useAuth`, `@shared/const`, `../drizzle/schema` import paths across the entire codebase. Use a codemod or bulk find-replace on the path aliases. Update `tsconfig.json` and `vite.config.ts` path aliases to point to new locations.

---

### Batch 2 — Leaf Features (depend only on Batch 1)

**What moves:**
- `server/waiverPdf.ts` → `features/waivers/server/waiverPdf.ts`
- `server/availability/engine.ts` → `features/booking-engine/server/availability/engine.ts`
- `server/booking/stateMachine.ts` → `features/booking-engine/server/booking/stateMachine.ts`
- Public layout components → `features/public-pages/components/`
- `FAQAccordion.tsx`, `TestimonialsCarousel.tsx` → `features/cms/components/`
- `AvailabilityCalendar.tsx` → `features/booking-engine/components/`
- `HuntFishAvailabilityCalendar.tsx` → `features/trips/components/`
- `InquiryForm.tsx`, `StickyInquiryCTA.tsx` → `features/inquiries/components/`
- All public pages (Home, Weddings, Hunt, Fish, etc.) → `features/public-pages/pages/`
- `Membership.tsx` → `features/membership/pages/`
- `SignWaiver.tsx` → `features/waivers/pages/`

**Why second:** These files only import from _core/_shared and have no dependency on any other feature's pages or routers.

**Imports to update:** Import paths for PublicLayout, PublicNav, PublicFooter in each page; component imports inside pages.

---

### Batch 3 — Feature Routers (server-side feature logic)

**What moves (in order within batch):**
1. Extract DAL helpers from `server/db.ts` into feature-specific `dal.ts` files:
   - `features/auth/server/dal.ts` (users helpers)
   - `features/membership/server/dal.ts` (members, membershipApplications)
   - `features/inquiries/server/dal.ts` (inquiries)
   - `features/booking-engine/server/dal.ts` (bookings, blockedDates, paymentRecords, etc.)
   - `features/waivers/server/dal.ts` (waivers)
   - `features/messages/server/dal.ts` (messages)
   - `features/reports/server/dal.ts` (seasonalUpdates, fieldReports, newsletters)
   - `features/cms/server/dal.ts` (all cms_* helpers)
2. Move routers:
   - `server/reportsRouter.ts` → `features/reports/server/router.ts`
   - `server/tripsRouter.ts` → `features/trips/server/router.ts`
   - `server/propertyBookingRouter.ts` → `features/property-booking/server/router.ts`
   - `server/bookingRouter.ts` → `features/booking-engine/server/router.ts`
   - Split `server/portalRouter.ts`:
     - Extract waiver sub-router → `features/waivers/server/portalRouter.ts`
     - Extract membership sub-router → `features/membership/server/portalRouter.ts`
     - Remainder → `features/admin-portal/server/router.ts`
   - Split inline routers from `server/routers.ts`:
     - `inquiriesRouter` → `features/inquiries/server/router.ts`
     - `membershipRouter` → merged into `features/membership/server/router.ts`
     - `bookingsRouter` (legacy) → `features/booking-engine/server/legacyRouter.ts`
     - `updatesRouter` → `features/reports/server/updatesRouter.ts`
     - `messagesRouter` → `features/messages/server/router.ts`
     - `waiversRouter` (legacy) → `features/waivers/server/legacyRouter.ts`
     - `cmsRouter` → `features/cms/server/router.ts`
     - `adminRouter` → `features/auth/server/adminRouter.ts`
     - auth inline router → `features/auth/server/router.ts`

**Why third:** Routers depend on DAL helpers and the _core trpc base, both moved in Batches 1–2.

**Imports to update:** Each router file's imports of `db.*` helpers, schema tables, and `_core/trpc`. Cross-feature imports (e.g., booking-engine reading `portalBlockedDates` from admin-portal) are formalized here via public export files (`features/admin-portal/db/index.ts` etc.).

---

### Batch 4 — Portal Pages and App Entry Points

**What moves:**
- All `/ops` portal pages → `features/admin-portal/pages/`
- `PortalWaivers.tsx` → `features/waivers/pages/`
- `PortalFieldReports.tsx`, `PortalNewsletter.tsx` → `features/reports/pages/`
- Member portal pages (MemberPortal, MyBookings, PropertyBrowser, PropertyDetail) → `features/member-portal/pages/`
- `server/routers.ts` → `features/_core/server/appRouter.ts` (thin assembler: imports all feature routers and composes `appRouter`)
- `client/src/App.tsx` — update all route imports to point to new feature paths
- `client/src/main.tsx` — update provider/import paths if changed

**Why last:** `App.tsx` and `appRouter.ts` import from every feature; they can only be updated once all feature modules exist at their new paths. Moving them last ensures all imports are resolvable.

**Imports to update:** Every `import` in `App.tsx`; all feature router registrations in `appRouter.ts`. Update `drizzle.config.ts` to point to `features/_core/db/schema.ts`.

---

### Post-Migration Cleanup (not a numbered batch — do after all 4 batches pass CI)

1. **Remove `server/routers.ts`** (replaced by `features/_core/server/appRouter.ts`)
2. **Remove `server/db.ts`** (replaced by _core singleton + feature DAL files)
3. **Remove `server/portalRouter.ts`** (replaced by feature-split routers)
4. **Remove `server/bookingRouter.ts`**, `server/tripsRouter.ts`, `server/propertyBookingRouter.ts`, `server/reportsRouter.ts` (all moved to feature routers)
5. **Consolidate seed scripts** from repo root into `scripts/`
6. **Populate `drizzle/relations.ts`** (currently empty) and move to `features/_core/db/relations.ts`
7. **Verify `PortalAvailability.tsx` duality** (two files with same name serve different audiences — rename the member-facing one to `PropertyAvailabilityPage.tsx`)
8. **Merge duplicate membership management** between `membershipRouter` and `membershipPortalRouter`

---

## Appendix: File Count Summary

| Zone | Server files | Client files |
|------|-------------|-------------|
| _core | 18 | 5 |
| _shared | 0 | 55+ (ui/ + hooks + misc components) |
| auth | 1 router | 1 hook |
| inquiries | 1 router + 1 dal | 2 components + 2 pages |
| membership | 2 routers + 1 dal | 1 page |
| booking-engine | 1 router + 2 modules + 1 dal | 1 component |
| property-booking | 1 router | 2 pages |
| trips | 1 router | 1 component |
| cms | 1 router + 1 dal | 2 components |
| reports | 1 router + 1 dal | 2 pages |
| messages | 1 router + 1 dal | — |
| waivers | 2 routers + 1 pdf util + 1 dal | 2 pages |
| admin-portal | 1 router | 1 layout + 19 pages |
| member-portal | — | 5 pages |
| public-pages | — | 1 layout + 3 nav/footer + 15 pages |
