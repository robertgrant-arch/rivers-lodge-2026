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
