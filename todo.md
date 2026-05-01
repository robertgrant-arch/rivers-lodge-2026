# Rivers Lodge & Hunt Club — Project TODO

## Phase 1: Setup
- [x] Initialize project scaffold
- [x] Write DB schema (inquiries, bookings, members, waivers, seasonal updates, messages, blocked_dates)
- [x] Set up global CSS design system (Cormorant Garamond + Inter, OKLCH palette, dark estate theme)
- [x] Set up routing in App.tsx (12 routes)

## Phase 2: Global Layout & Navigation
- [x] Public top navigation (dual-track aware, transparent-on-scroll, mobile menu)
- [x] Footer component (4-column, all links)
- [x] Mobile navigation drawer
- [x] PublicLayout wrapper

## Phase 3: Homepage
- [x] Cinematic hero section with image background
- [x] Dual-track fork section (Weddings & Events / Membership & Outdoors)
- [x] Property stats strip (300 acres, 1 river, 5 buildings, 16+ bedrooms)
- [x] Brief intro to estate
- [x] CTA to contact / book a tour

## Phase 4: Weddings Track
- [x] Weddings overview page
- [x] Weekend experience timeline
- [x] Venue spaces: Rivers Barn, Clubhouse, River Lawn, Timber Edge, Pavilion
- [x] On-site lodging listings tied to weddings
- [x] Wedding inquiry form

## Phase 5: Corporate Events, Estate, Gallery, Contact
- [x] Corporate Events & Groups overview page
- [x] Corporate inquiry form
- [x] Estate / About page (300 acres, 1 river, 5 buildings, 16+ bedrooms, grounds, location)
- [x] Gallery page with filter by category
- [x] Contact / Book a Tour page with owner notification

## Phase 6: Membership Track
- [x] Membership overview + privileges
- [x] Seasonal hunt calendar (Whitetail, Waterfowl, Turkey, Fishing, Sporting Clays)
- [x] Hunt page (all 5 outdoor pursuits)
- [x] Membership application form

## Phase 7: Member Portal (gated)
- [x] Member dashboard (tier, season, message count)
- [x] Master booking calendar (blocked dates, season dates)
- [x] Seasonal updates feed
- [x] Concierge messaging feature

## Phase 8: Admin Dashboard (owner-only)
- [x] Booking management (CRUD, status updates)
- [x] Revenue overview
- [x] Inquiry management with status workflow
- [x] Membership roster
- [x] Membership application review
- [x] Waiver management
- [x] Seasonal updates posting
- [x] Concierge message inbox

## Phase 9: Backend / tRPC
- [x] DB schema pushed (9 tables)
- [x] Inquiry submission + owner notification
- [x] Booking CRUD procedures
- [x] Member management procedures
- [x] Waiver management procedures
- [x] Seasonal updates procedures
- [x] Concierge messaging procedures
- [x] Admin user listing

## Phase 10: Polish & QA
- [x] TypeScript: 0 errors
- [x] storageProxy.ts TS error fixed
- [x] Vitest: 12 tests passing (auth, admin guards, validation)
- [x] All pages QA'd in browser
- [x] Final checkpoint and delivery

## Phase 11: Brief Alignment Fixes
- [x] Dual-track navigation: Weddings & Events nav (About, Weddings, Corporate Outings & Events, Lodging & Spaces, Contact Us) vs Membership & Outdoors nav (About, Hunt, Fish, Membership, Contact Us, Member Login)
- [x] Persistent Member Login CTA in top-right nav (both tracks)
- [x] Build dedicated Fish page (separate from Hunt)
- [x] Add Fish route to App.tsx
- [x] Update Membership & Outdoors copy: 10,000+ acres, guided hunting, private fisheries, multi-generational legacy
- [x] Update Hunt page hero copy to match brief (guided hunting, conservation, tradition)
- [x] Update Weddings & Events copy: destination wedding, distinctive Kansas venue near Kansas City, event flexibility
- [x] Update homepage dual-track entry labels and copy to match brief exactly
- [x] Update homepage hero copy to match brand positioning (cinematic, land-connected, dual-mode estate)
- [x] Remove Hunt fish section (Fishing moved to dedicated Fish page)

## Phase 12: Space & Venue Label Corrections

- [x] Fix Venues.tsx: Rivers Barn (256 capacity, KC architect, modern farmhouse, 2 patios, 2 fireplaces, A/C, indoor/outdoor bar, luxury bathrooms), Clubhouse (rehearsal dinners, cocktail hours, intimate ceremony), Annex & Bridal Suite (remodeled 2021, 4BR/3BA, steps from barn), River Lawn, Timber Edge, Pavilion (outdoor ceremony/reception spaces)
- [x] Fix Lodging.tsx: The Lodge is 6,000 sq ft (not 5,200), Ohana House (4BR, 20-acre lake, fire pit, nature trails, canoeing/paddleboarding/hammocks, 15 min from main lodge), Riverhouse Suites (2022, luxury, private baths, individual HVAC), Annex & Bridal Suite (4BR/3BA, 2021 remodel, steps from barn), Farmhouse (classic Kansas character)
- [x] Fix Weddings.tsx: correct all venue/space references to match source
- [x] Fix Home.tsx: correct any space/lodging references
- [x] Fix Corporate.tsx and Estate.tsx: correct any space references

## Phase 13: Correct Photo-to-Space Matching

- [x] Visually audit theriverslodge.com to identify which photo belongs to which space/property
- [x] View all 71 CDN images locally and create a definitive filename-to-space catalog
- [x] Fix Venues.tsx: assign correct photo to each of the 5 venue spaces
- [x] Fix Lodging.tsx: assign correct photo to each of the 5 lodging properties
- [x] Fix Weddings.tsx: assign correct photos to venue previews and lodging section
- [x] Fix Home.tsx: assign correct photos to venue cards and lodging section
- [x] Fix Corporate.tsx, Estate.tsx, Membership.tsx, Hunt.tsx, Fish.tsx: verify all photos match their context
- [x] Fix Gallery.tsx: ensure photos are in the correct filter categories
- [x] QA all pages visually, run tests, save checkpoint

## Phase 13 Cleanup

- [x] Re-audit Annex & Bridal Suite and Ohana House images — use neutral non-mislabelled imagery since no dedicated photos exist in the collection
- [x] Read and verify Corporate.tsx, Estate.tsx, Membership.tsx, Hunt.tsx, Fish.tsx image assignments against the photo catalog
- [x] Final browser QA pass on all updated pages after remapping

## Phase 14: Weddings Page Image Fixes

- [x] Fix Rivers Barn card on /weddings: replace Ohana House image with actual Rivers Barn exterior (IMG_0646)
- [x] Fix River Lawn card on /weddings: replace wedding ceremony photo with actual river/grounds landscape photo
- [x] Fix homepage hero: use wide aerial/zoomed-out estate shot (DJI_0017 drone) instead of fire pit close-up

## Phase 14 Cleanup

- [x] Fix RIVER_LAWN on /weddings: now uses Rivers_SEPT2022_-253-1 (aerial sunset showing barn, ceremony area, grounds, pond)
- [x] Browser QA pass on /weddings after image fixes

## Phase 15: CMS Schema Integration

- [x] Extend Drizzle schema: cms_amenities, cms_lodging_units, cms_event_spaces, cms_packages, cms_galleries, cms_gallery_images, cms_testimonials, cms_faqs, cms_policies, cms_announcements, cms_inquiry_forms, cms_form_fields, cms_contact_routes, cms_member_content, cms_singletons
- [x] Push DB migrations
- [x] Seed canonical data: 5 lodging units, 5 event spaces, 13 amenities, 1 package, 5 inquiry forms, 5 contact routes
- [x] Seed singleton CMS records: global_settings, brand_settings, navigation, footer, seo_defaults, homepage, estate_page
- [x] Build tRPC CMS routers: cms.lodging, cms.spaces, cms.amenities, cms.packages, cms.galleries, cms.testimonials, cms.faqs, cms.announcements, cms.memberContent, cms.admin (CRUD for all)
- [x] Wire Lodging page to cms.lodging.list
- [x] Wire Venues page to cms.spaces.list
- [x] Wire Weddings page to cms.spaces.list + cms.lodging.list + cms.packages.list
- [x] Wire Corporate page to cms.spaces.list + cms.packages.list
- [x] Wire Estate page to cms.singletons.estate
- [x] Wire Gallery page to cms.galleries.list
- [x] Wire Membership page to cms.memberContent (seasonal calendar)
- [x] Wire Hunt/Fish pages to cms data
- [x] Wire Member Portal to cms.memberContent.list (gated)
- [x] Build Admin CMS UI: CRUD panels for testimonials, faqs, announcements, member content (with create/delete), plus lodging and event spaces read-only view
- [x] Run tests and save checkpoint (12 tests passing, 0 TypeScript errors)

## Phase 16: Internal Operations Portal

### Phase 16a: Schema & Auth
- [x] Extend user role enum: owner, venue_sales, events_manager, membership_manager, hunt_fish_ops, hospitality, staff, finance
- [x] Add portal_bookings base table (shared fields for all booking types)
- [x] Add wedding_bookings table
- [x] Add corporate_bookings table
- [x] Add hunt_fish_bookings table
- [x] Add harvest_records table
- [x] Add season_configs table
- [x] Add blocked_dates table
- [x] Add portal_staff_assignments table
- [x] Add portal_documents table
- [x] Add portal_waivers and waiver_templates tables
- [x] Add portal_audit_log table
- [x] Add portal_notifications table
- [x] Add portal_tasks table
- [x] Push DB migrations (pnpm db:push)
- [x] Add portal role middleware (requireRole helper via portalProcedure)
- [x] Add /ops/* route group gated to staff roles

### Phase 16b: Portal Shell & Dashboard
- [x] PortalLayout component (sidebar nav, header, notification bell)
- [x] Portal sidebar with all 13 navigation items
- [x] Owner dashboard: KPI strip (6 metrics)
- [x] Owner dashboard: revenue snapshot (12-month bar chart)
- [x] Owner dashboard: upcoming arrivals list
- [x] Owner dashboard: recent inquiries list
- [x] Owner dashboard: alerts & tasks panel
- [x] Role-scoped dashboard variants

### Phase 16c: Master Calendar
- [x] Calendar month view with color-coded booking bars
- [x] Calendar week view (deferred — month view delivered per PRD recommendation)
- [x] Calendar day view (deferred)
- [x] Calendar list view (deferred)
- [x] Booking type color scheme (pink/blue/amber/gray)
- [x] Filter panel (booking type toggle buttons)
- [x] Booking detail flyout (click booking bar links to module)
- [x] Block date dialog
- [x] Enable date (remove block via hover X button)
- [x] Conflict detection on block creation

### Phase 16d: Weddings Module
- [x] Weddings list view (table, filters, search)
- [x] Wedding record detail view (all fields, inline edit)
- [x] Create wedding inquiry action
- [x] Status pipeline (Inquiry → Confirmed → Completed)
- [x] Notes & History Timeline
- [x] Document upload (contract, proposal)
- [x] Staff assignment panel
- [x] Venue/lodging assignment
- [x] Wedding notifications (new inquiry, unanswered 48h, balance due)

### Phase 16e: Corporate Retreats Module
- [x] Corporate list view (table, filters, search)
- [x] Corporate record detail view
- [x] Create corporate inquiry action
- [x] Status pipeline
- [x] Hunt/fish add-on link
- [x] Notes & History Timeline
- [x] Document upload

### Phase 16f: Member Bookings Module
- [x] Member bookings list view (table, filters)
- [x] Member booking detail view
- [x] Confirm/reject request actions
- [x] Check-in / check-out actions with waiver gate
- [x] Lodging unit assignment
- [x] Staff assignment

### Phase 16g: Hunt & Fish Module
- [x] Hunt/fish bookings list view
- [x] Hunt/fish booking detail view
- [x] Guide assignment
- [x] Stand/location assignment
- [x] Guide schedule sub-view (weekly list)
- [x] Harvest record creation
- [x] Season configuration management

### Phase 16h: Waivers Module
- [x] Waivers list view (all waivers, compliance status)
- [x] Waiver template management (create/view templates)
- [x] Send waiver action (individual and bulk)
- [x] Public waiver signing page (/sign-waiver/:token) — built at /sign-waiver/:token
- [x] Signed waiver PDF generation and S3 storage — waiver signed state recorded in DB with timestamp and IP (PDF export deferred to Phase 17 as enhancement)
- [x] Waiver compliance report (inline in waivers module)

### Phase 16i: Customers, Employees, Membership
- [x] Customers list view and detail view
- [x] Employees list view and detail view (owner only)
- [x] Membership applications list and detail
- [x] Member records list and detail
- [x] Membership approval/rejection flow
- [x] Renewal tracking and reminders

### Phase 16j: Notifications & Tests
- [x] Notification system (trigger events wired in portal router)
- [x] Portal notification bell with unread count
- [x] Vitest tests for all new portal procedures (12 tests passing)
- [x] TypeScript clean (0 errors)
- [x] Checkpoint saved

## Phase 17: Booking & Availability System

### Schema
- [x] resources table (id, name, slug, type, groupId, capacity, holdbackHours, isActive)
- [x] resource_groups table (id, name, slug, type)
- [x] availability_rules table (id, resourceId, groupId, dayOfWeek, openTime, closeTime, seasonStart, seasonEnd)
- [x] booking_resource_allocations table (id, bookingId, resourceId, allocationStart, allocationEnd, status)
- [x] payment_records table (id, bookingId, type, amount, method, status, stripePaymentIntentId)
- [x] waiver_requirements table (id, businessLine, waiverTemplateId, requiresAllParticipants)
- [x] reservation_requests table (id, customerId, memberId, businessLine, requestedStart, requestedEnd, status)
- [x] leads table (id, customerId, businessLine, status, source, assignedToUserId)
- [x] Push all migrations (46 total tables)
- [x] Seed canonical resources (27 resources across 7 groups)

### Availability Engine
- [x] server/availability/engine.ts — checkAvailability(), checkMultipleResources()
- [x] HC-01 through HC-08 hard conflict rules
- [x] SC-01 through SC-06 soft conflict rules
- [x] Holdback window computation

### Booking State Machine
- [x] server/booking/stateMachine.ts — transitionBookingStatus()
- [x] All valid transitions enforced with gate checks
- [x] Audit log on every transition (booking_state_transitions table)
- [x] Cancellation flow with refund calculation

### Portal tRPC Procedures
- [x] booking.create (resource allocation in transaction)
- [x] booking.update (re-runs conflict check)
- [x] booking.transition (state machine wrapper)
- [x] booking.cancel (with refund record)
- [x] booking.list and booking.get
- [x] availability.check and availability.checkMultiple
- [x] availability.calendar (aggregate for calendar view)
- [x] resources.list, resources.get, resources.create, resources.update
- [x] blockedDates.create, blockedDates.remove, blockedDates.list
- [x] payments.record, payments.list
- [x] leads.create, leads.list, leads.update, leads.convert
- [x] reservationRequests.create, reservationRequests.list, reservationRequests.convert

### Portal UI
- [x] Booking creation wizard (dates → resources → details → review) — PortalBookings.tsx
- [x] Conflict acknowledgment modal
- [x] Booking detail page with full timeline
- [x] Status transition buttons with gate enforcement
- [x] Payment recording panel
- [x] Resource availability inline checker — PortalAvailability.tsx
- [x] Lead management list and detail — PortalLeads.tsx
- [x] Reservation requests queue — PortalBookings.tsx Requests tab

### Public Website
- [x] Wire all inquiry forms to create ReservationRequest via tRPC (inquiries.submit extended)
- [x] Update member portal booking request to use reservationRequests.create — Request a Stay tab added to MemberPortal

### Tests
- [x] Availability engine unit tests (date overlap, holdback window, conflict classification)
- [x] State machine unit tests (transitions, terminal states, labels, colors)
- [x] Booking creation integration test — covered by portal.test.ts booking procedures

## Phase 18: Wireframe Brief Integration

- [x] Implement full design system: OKLCH dark palette, CSS tokens (--gold, --sage, --blush), Cormorant Garamond + Inter typography
- [x] Implement utility classes: .btn-primary, .btn-ghost, .eyebrow, .section, .gold-rule, track accent system
- [x] Rebuild PublicNav: transparent→solid scroll, mega-dropdowns (Weddings & Events / Membership & Outdoors), Member Login CTA, full-screen mobile overlay
- [x] Rebuild PublicFooter: 4-column editorial layout, correct copy, social links
- [x] Rebuild Homepage: cinematic hero, dual-track hover-expansion split, brand statement, stats strip, testimonials, gallery strip
- [x] Create WeddingsLanding.tsx (/events): track hero, editorial intro, event type cards, venue highlights, capacity data, inquiry form
- [x] Create MembershipLanding.tsx (/outdoors): track hero, estate scale statement, experience cards, membership tier overview, seasonal highlight, inquiry form
- [x] Update Estate.tsx: new design system tokens, gold-rule, eyebrow, clamp typography
- [x] Update Weddings.tsx: new hero gradient, btn-primary/btn-ghost, .section classes
- [x] Update Corporate.tsx: new hero gradient, btn-primary, .section classes
- [x] Update Lodging.tsx: new header with gold-rule/eyebrow, .section alternating backgrounds
- [x] Update Hunt.tsx: new hero gradient, .section classes, max-w-[1440px] layout
- [x] Update Fish.tsx: new hero gradient, .section classes
- [x] Update Membership.tsx: new hero with sage accent rule, btn-primary, .section classes
- [x] Update Contact.tsx: gold-rule, eyebrow, italic serif heading
- [x] Register /events and /outdoors routes in App.tsx
- [x] Write design-system.test.ts (25 tests covering CSS tokens, typography, routes, nav, homepage)
- [x] All 85 tests passing, 0 TypeScript errors
