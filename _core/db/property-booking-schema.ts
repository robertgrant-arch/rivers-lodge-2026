/**
 * Enterprise Hunting Property Booking Schema
 * ============================================
 * Designed for The Rivers Lodge & Hunt Club.
 *
 * Entity hierarchy:
 *   hunting_properties          ← Specific bookable locations (Stand 7, Duck Blind A, North Pasture)
 *   property_seasons            ← Season windows per property (Deer Season: Oct 1 – Jan 15)
 *   property_booking_rules      ← Rules per property (advance window, capacity, tier access)
 *   property_pricing            ← Pricing tiers per property/season/group size
 *   property_date_inventory     ← Denormalized availability counter per property per date (O(1) queries)
 *   property_bookings           ← The actual booking records (member, property, date range, status)
 *   booking_add_ons             ← Add-ons attached to a booking (guide, ATV, dog handler)
 *   booking_payments            ← Payment records linked to bookings
 *   booking_audit_log           ← Immutable audit trail of every status change
 *   harvest_reports             ← Post-hunt harvest reporting (required within N days)
 *   property_blocked_dates      ← Admin-set blocked dates per property
 *   booking_waitlist            ← Waitlist entries when property is full
 *   property_images             ← Photos per property (S3 URLs)
 *   property_amenities          ← Amenity tags per property
 *
 * Design decisions:
 *   - idempotencyKey on property_bookings prevents double-booking from retries
 *   - property_date_inventory is a denormalized counter updated atomically on booking insert/cancel
 *   - Booking rules are per-property (each stand can have different advance windows, capacity, tier access)
 *   - Audit log is append-only — never updated, only inserted
 *   - Harvest reports are linked to bookings; system can block future bookings if not filed in time
 *   - Waitlist with TTL notification — cancellations trigger waitlist notifications
 *   - Pricing at zero = included in membership; non-zero = additional fee (Stripe-ready)
 */

import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  time,
  decimal,
  json,
  mysqlEnum,
  bigint,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";

// ─── Hunting Properties ───────────────────────────────────────────────────────

/**
 * The primary entity — a specific bookable hunting location.
 * Examples: "Stand 7 — North Pasture", "Duck Blind A", "Turkey Ridge", "South Pond"
 */
export const huntingProperties = mysqlTable("hunting_properties", {
  id: int("id").autoincrement().primaryKey(),

  // Identity
  name: varchar("name", { length: 120 }).notNull(),          // "Stand 7 — North Pasture"
  slug: varchar("slug", { length: 80 }).notNull().unique(),  // "stand-7-north-pasture"
  shortName: varchar("shortName", { length: 40 }),           // "Stand 7" (for calendar labels)

  // Classification (now supports multiple types per property)
  types: json("types"),  // string[] e.g. ["stand", "blind"] — migration wraps current type in array
  // Note: existing type column kept for backwards compatibility during migration

  // Primary activity for this property
  primaryActivity: mysqlEnum("primaryActivity", [
    "deer",
    "duck",
    "turkey",
    "quail",
    "dove",
    "hog",
    "bass",
    "catfish",
    "crappie",
    "mixed_hunt",
    "mixed_fish",
    "hunt_and_fish",
  ]).notNull(),

  // Secondary activities also available at this property
  secondaryActivities: json("secondaryActivities"),  // string[] e.g. ["deer", "turkey"]

  // Description
  description: text("description"),
  shortDescription: varchar("shortDescription", { length: 280 }),

  // Physical attributes
  acreage: decimal("acreage", { precision: 8, scale: 2 }),
  maxHunters: int("maxHunters").default(2).notNull(),   // max simultaneous hunters/anglers
  hasHeatedBlind: boolean("hasHeatedBlind").default(false),
  hasAtvAccess: boolean("hasAtvAccess").default(false),
  hasWaterAccess: boolean("hasWaterAccess").default(false),
  hasElectricity: boolean("hasElectricity").default(false),
  hasCellService: boolean("hasCellService").default(true),

  // Location
  gpsLat: decimal("gpsLat", { precision: 10, scale: 7 }),
  gpsLng: decimal("gpsLng", { precision: 10, scale: 7 }),
  locationNotes: varchar("locationNotes", { length: 300 }),  // "Take the north fork past the red gate"

  // Media
  coverImageUrl: varchar("coverImageUrl", { length: 500 }),
  mapImageUrl: varchar("mapImageUrl", { length: 500 }),
  mapUrl: varchar("mapUrl", { length: 500 }),  // PDF or image map uploaded by admin

  // Booking defaults (from property-slot-config)
  autoApprove: boolean("autoApprove").default(true),  // Default auto-approve for slots at this property
  overnightExclusive: boolean("overnightExclusive").default(false),  // Block same-day PM + next-day AM if overnight booked
  advanceNoticeHours: int("advanceNoticeHours").default(0),  // Minimum hours before booking

  // Admin-only field
  gateCode: varchar("gateCode", { length: 255 }),  // Access code (store encrypted if available)

  // Status
  active: boolean("active").default(true).notNull(),
  featuredOnPublicSite: boolean("featuredOnPublicSite").default(true),
  sortOrder: int("sortOrder").default(0),

  // Metadata
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
}, (t) => ({
  slugIdx: uniqueIndex("hp_slug_idx").on(t.slug),
  activityIdx: index("hp_activity_idx").on(t.primaryActivity),
  activeIdx: index("hp_active_idx").on(t.active),
}));

export type HuntingProperty = typeof huntingProperties.$inferSelect;
export type InsertHuntingProperty = typeof huntingProperties.$inferInsert;

// ─── Property Photos ──────────────────────────────────────────────────────────

/**
 * Photo gallery for each property.
 * Members see photos in gallery + first photo as hero; gate_code never exposed.
 */
export const propertyPhotos = mysqlTable("property_photos", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),   // FK → hunting_properties
  url: varchar("url", { length: 500 }).notNull(),   // S3 URL or similar
  caption: varchar("caption", { length: 280 }),     // Optional photo description
  sortOrder: int("sortOrder").default(0).notNull(),  // 0 = first photo (hero)
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (t) => ({
  propertyIdx: index("pp_property_idx").on(t.propertyId),
  sortIdx: index("pp_sort_idx").on(t.propertyId, t.sortOrder),
}));

export type PropertyPhoto = typeof propertyPhotos.$inferSelect;
export type InsertPropertyPhoto = typeof propertyPhotos.$inferInsert;

// ─── Property Seasons ─────────────────────────────────────────────────────────

/**
 * Season windows per property.
 * A property can have multiple seasons (e.g., Deer Stand 7 has both Archery and Rifle seasons).
 */
export const propertySeasons = mysqlTable("property_seasons", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),   // FK → hunting_properties

  name: varchar("name", { length: 80 }).notNull(),  // "Archery Season 2026"
  activity: mysqlEnum("activity", [
    "deer", "duck", "turkey", "quail", "dove", "hog",
    "bass", "catfish", "crappie", "mixed_hunt", "mixed_fish", "hunt_and_fish",
  ]).notNull(),

  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),

  // Season-level capacity override (null = use property default)
  maxHuntersOverride: int("maxHuntersOverride"),

  active: boolean("active").default(true).notNull(),
  notes: text("notes"),

  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (t) => ({
  propertyIdx: index("ps_property_idx").on(t.propertyId),
}));

export type PropertySeason = typeof propertySeasons.$inferSelect;
export type InsertPropertySeason = typeof propertySeasons.$inferInsert;

// ─── Property Booking Rules ───────────────────────────────────────────────────

/**
 * Per-property booking rules.
 * Each stand/blind can have different advance windows, capacity, and tier access rules.
 */
export const propertyBookingRules = mysqlTable("property_booking_rules", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().unique(),  // FK → hunting_properties (one rule set per property)

  // Advance booking window
  advanceBookingDays: int("advanceBookingDays").default(6).notNull(),   // how many days ahead members can book
  minAdvanceHours: int("minAdvanceHours").default(24).notNull(),        // minimum notice required

  // Duration limits
  maxConsecutiveDays: int("maxConsecutiveDays").default(3).notNull(),   // max consecutive days per booking
  maxDaysPerSeason: int("maxDaysPerSeason").default(10).notNull(),      // max total days per member per season

  // Approval workflow
  requiresApproval: boolean("requiresApproval").default(false).notNull(),  // auto-confirm or admin-approve

  // Guest rules
  allowGuests: boolean("allowGuests").default(true).notNull(),
  maxGuestsPerBooking: int("maxGuestsPerBooking").default(1).notNull(),
  guestCountsAgainstAllotment: boolean("guestCountsAgainstAllotment").default(true),

  // Cancellation policy
  cancellationHours: int("cancellationHours").default(24).notNull(),    // hours before hunt to cancel without penalty
  lateCancellationFee: decimal("lateCancellationFee", { precision: 10, scale: 2 }).default("0"),

  // Harvest reporting
  harvestReportRequired: boolean("harvestReportRequired").default(true).notNull(),
  harvestReportDays: int("harvestReportDays").default(7).notNull(),     // days after hunt to submit report
  blockBookingsIfReportOverdue: boolean("blockBookingsIfReportOverdue").default(true),

  // Member tier access (JSON object: { founding: true, standard: true, associate: false, day: false })
  tierAccess: json("tierAccess"),

  // Season-opening lottery
  openingDaysUseLottery: boolean("openingDaysUseLottery").default(false),
  lotteryOpeningDays: int("lotteryOpeningDays").default(2),             // first N days of season use lottery

  // Overbooking allowance (for cancellation buffer, like hotels)
  overbookingPercent: int("overbookingPercent").default(0),             // 0 = no overbooking

  // Admin notes on special rules
  notes: text("notes"),

  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
}, (t) => ({
  propertyIdx: uniqueIndex("pbr_property_idx").on(t.propertyId),
}));

export type PropertyBookingRules = typeof propertyBookingRules.$inferSelect;
export type InsertPropertyBookingRules = typeof propertyBookingRules.$inferInsert;

// ─── Property Pricing ─────────────────────────────────────────────────────────

/**
 * Pricing tiers per property, season, member tier, and group size.
 * pricePerDay = 0 means included in membership.
 */
export const propertyPricing = mysqlTable("property_pricing", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),   // FK → hunting_properties
  seasonId: int("seasonId"),                 // FK → property_seasons (null = applies to all seasons)

  // Applies to this member tier (null = all tiers)
  memberTier: mysqlEnum("memberTier", ["founding", "standard", "associate", "day"]),

  // Group size range this price applies to
  groupSizeMin: int("groupSizeMin").default(1).notNull(),
  groupSizeMax: int("groupSizeMax").default(99).notNull(),

  // Pricing
  pricePerDay: decimal("pricePerDay", { precision: 10, scale: 2 }).default("0").notNull(),  // 0 = included
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),

  // Add-on pricing
  guideServicePerDay: decimal("guideServicePerDay", { precision: 10, scale: 2 }).default("0"),
  atvRentalPerDay: decimal("atvRentalPerDay", { precision: 10, scale: 2 }).default("0"),
  dogHandlerPerDay: decimal("dogHandlerPerDay", { precision: 10, scale: 2 }).default("0"),
  cleaningFee: decimal("cleaningFee", { precision: 10, scale: 2 }).default("0"),

  active: boolean("active").default(true).notNull(),
  notes: text("notes"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (t) => ({
  propertyIdx: index("pp_property_idx").on(t.propertyId),
}));

export type PropertyPricing = typeof propertyPricing.$inferSelect;
export type InsertPropertyPricing = typeof propertyPricing.$inferInsert;

// ─── Property Date Inventory ──────────────────────────────────────────────────

/**
 * Denormalized availability counter per property per date.
 * Updated atomically on each booking insert/cancel.
 * Makes availability queries O(1) instead of scanning all bookings.
 *
 * This is the "availability inventory" pattern used by hotel systems (Airbnb, Marriott).
 */
export const propertyDateInventory = mysqlTable("property_date_inventory", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),   // FK → hunting_properties
  date: date("date").notNull(),

  // Capacity for this date (may differ from property default due to season rules)
  capacity: int("capacity").notNull(),

  // Confirmed + pending bookings (denormalized counter)
  bookedCount: int("bookedCount").default(0).notNull(),

  // Computed status (updated by trigger/procedure on each booking change)
  status: mysqlEnum("status", [
    "open",       // available spots remain
    "partial",    // ≥75% booked
    "full",       // at capacity
    "blocked",    // admin-blocked (maintenance, private event)
    "closed",     // outside season window
  ]).default("open").notNull(),

  // Version for optimistic locking (prevents race conditions on concurrent bookings)
  version: int("version").default(0).notNull(),

  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
}, (t) => ({
  // DB-LEVEL DEFENSE — this UNIQUE constraint is the primary protection against
  // concurrent inserts for the same property+date.  updateInventory() uses
  // "INSERT ... WHERE NOT EXISTS" followed by "UPDATE ... WHERE propertyId = ?
  // AND date = ?", both within the booking transaction.  If two concurrent
  // transactions somehow both reach the INSERT branch simultaneously, the
  // UNIQUE violation on (propertyId, date) will cause one of them to fail at
  // the DB level, preventing a phantom row.  The FOR UPDATE lock on the
  // inventory SELECT in bookings.create is the first line of defense; this
  // constraint is the second.
  propertyDateIdx: uniqueIndex("pdi_property_date_idx").on(t.propertyId, t.date),
  statusIdx: index("pdi_status_idx").on(t.status),
  dateIdx: index("pdi_date_idx").on(t.date),
}));

export type PropertyDateInventory = typeof propertyDateInventory.$inferSelect;
export type InsertPropertyDateInventory = typeof propertyDateInventory.$inferInsert;

// ─── Property Bookings ────────────────────────────────────────────────────────

/**
 * The core booking record.
 * Lifecycle: confirmed → checked_in → completed | cancelled | no_show
 * (pending_payment → confirmed if deposit required)
 */
export const propertyBookings = mysqlTable("property_bookings", {
  id: int("id").autoincrement().primaryKey(),

  // Human-readable reference (e.g. "RL-2026-00042")
  bookingRef: varchar("bookingRef", { length: 20 }).notNull().unique(),

  // Idempotency key (client-generated UUID) — prevents double-booking from retries
  idempotencyKey: varchar("idempotencyKey", { length: 64 }).notNull().unique(),

  // Who is booking
  memberId: int("memberId").notNull(),         // FK → members
  userId: int("userId").notNull(),             // FK → users (denormalized)

  // What they are booking
  propertyId: int("propertyId").notNull(),     // FK → hunting_properties
  seasonId: int("seasonId"),                   // FK → property_seasons (null if outside defined season)

  // When
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),          // inclusive (same as startDate for single-day)
  totalDays: int("totalDays").default(1).notNull(),

  // Party details
  partySize: int("partySize").default(1).notNull(),
  guestNames: json("guestNames"),              // string[] — names of guests in party
  hasMinors: boolean("hasMinors").default(false),

  // Activity (may differ from property default, e.g., scouting trip)
  activity: mysqlEnum("activity", [
    "deer", "duck", "turkey", "quail", "dove", "hog",
    "bass", "catfish", "crappie", "mixed_hunt", "mixed_fish", "hunt_and_fish", "scouting",
  ]).notNull(),

  // Compliance confirmations
  huntingLicenseConfirmed: boolean("huntingLicenseConfirmed").default(false),
  fishingLicenseConfirmed: boolean("fishingLicenseConfirmed").default(false),
  waiverSignedAt: bigint("waiverSignedAt", { mode: "number" }),

  // Booking status lifecycle
  status: mysqlEnum("status", [
    "pending_payment",   // deposit required before confirmation
    "confirmed",         // active booking (auto-confirmed or staff-approved)
    "pending_approval",  // awaiting staff review (when requiresApproval = true)
    "checked_in",        // member has arrived
    "completed",         // trip completed
    "cancelled",         // cancelled by member or staff
    "no_show",           // member did not appear
    "declined",          // staff declined (for approval-required bookings)
  ]).default("confirmed").notNull(),

  // Approval workflow
  requiresApproval: boolean("requiresApproval").default(false),
  approvedByUserId: int("approvedByUserId"),   // FK → users
  approvedAt: bigint("approvedAt", { mode: "number" }),
  declinedAt: bigint("declinedAt", { mode: "number" }),
  declineReason: text("declineReason"),

  // Cancellation
  cancelledAt: bigint("cancelledAt", { mode: "number" }),
  cancellationReason: text("cancellationReason"),
  cancelledByUserId: int("cancelledByUserId"), // FK → users (member or staff)
  isLateCancellation: boolean("isLateCancellation").default(false),

  // Financial
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  depositPaid: decimal("depositPaid", { precision: 10, scale: 2 }).default("0").notNull(),
  balanceDue: decimal("balanceDue", { precision: 10, scale: 2 }).default("0").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),

  // Notes
  memberNotes: text("memberNotes"),            // member's special requests (visible to staff)
  staffNotes: text("staffNotes"),              // internal staff notes (not visible to member)

  // Notifications
  confirmationSentAt: bigint("confirmationSentAt", { mode: "number" }),
  reminderSentAt: bigint("reminderSentAt", { mode: "number" }),

  // Timestamps
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
}, (t) => ({
  bookingRefIdx: uniqueIndex("pb_ref_idx").on(t.bookingRef),
  idempotencyIdx: uniqueIndex("pb_idempotency_idx").on(t.idempotencyKey),
  memberIdx: index("pb_member_idx").on(t.memberId),
  propertyIdx: index("pb_property_idx").on(t.propertyId),
  dateIdx: index("pb_date_idx").on(t.startDate, t.endDate),
  statusIdx: index("pb_status_idx").on(t.status),
}));

export type PropertyBooking = typeof propertyBookings.$inferSelect;
export type InsertPropertyBooking = typeof propertyBookings.$inferInsert;

// ─── Booking Add-Ons ──────────────────────────────────────────────────────────

/**
 * Optional add-ons attached to a booking.
 * Examples: guide service, ATV rental, dog handler, cleaning service, meals.
 */
export const bookingAddOns = mysqlTable("booking_add_ons", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),       // FK → property_bookings

  type: mysqlEnum("type", [
    "guide",
    "atv",
    "dog_handler",
    "cleaning",
    "meals",
    "ammo",
    "gear_rental",
    "photography",
    "other",
  ]).notNull(),

  description: varchar("description", { length: 200 }),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).default("0").notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).default("0").notNull(),

  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (t) => ({
  bookingIdx: index("bao_booking_idx").on(t.bookingId),
}));

export type BookingAddOn = typeof bookingAddOns.$inferSelect;
export type InsertBookingAddOn = typeof bookingAddOns.$inferInsert;

// ─── Booking Payments ─────────────────────────────────────────────────────────

/**
 * Payment records linked to bookings.
 * Supports deposits, balance payments, refunds, and adjustments.
 * Stripe-ready: stripePaymentIntentId field for future integration.
 */
export const bookingPayments = mysqlTable("booking_payments", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),       // FK → property_bookings

  type: mysqlEnum("type", [
    "deposit",
    "balance",
    "refund",
    "adjustment",
    "late_cancellation_fee",
  ]).notNull(),

  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),

  method: mysqlEnum("method", [
    "stripe",
    "cash",
    "check",
    "comp",
    "credit",
    "other",
  ]).notNull(),

  // Stripe integration fields
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 200 }),
  stripeChargeId: varchar("stripeChargeId", { length: 200 }),

  status: mysqlEnum("status", [
    "pending",
    "completed",
    "failed",
    "refunded",
    "voided",
  ]).default("completed").notNull(),

  recordedByUserId: int("recordedByUserId"),   // FK → users (staff who recorded it)
  notes: text("notes"),

  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (t) => ({
  bookingIdx: index("bpay_booking_idx").on(t.bookingId),
}));

export type BookingPayment = typeof bookingPayments.$inferSelect;
export type InsertBookingPayment = typeof bookingPayments.$inferInsert;

// ─── Booking Audit Log ────────────────────────────────────────────────────────

/**
 * Immutable append-only audit trail of every booking state change.
 * Never updated — only inserted. Provides complete history for disputes.
 */
export const bookingAuditLog = mysqlTable("booking_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),       // FK → property_bookings

  action: varchar("action", { length: 80 }).notNull(),
  // Examples: 'booking_created', 'status_changed', 'payment_recorded',
  //           'notes_updated', 'approved', 'declined', 'cancelled', 'checked_in'

  fromValue: text("fromValue"),                // Previous value (JSON-serialized)
  toValue: text("toValue"),                    // New value (JSON-serialized)

  performedByUserId: int("performedByUserId").notNull(),  // FK → users
  performedAt: bigint("performedAt", { mode: "number" }).notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),        // IPv4 or IPv6

  notes: text("notes"),                        // Optional human-readable description
}, (t) => ({
  bookingIdx: index("bal_booking_idx").on(t.bookingId),
  performedAtIdx: index("bal_performed_at_idx").on(t.performedAt),
}));

export type BookingAuditLog = typeof bookingAuditLog.$inferSelect;
export type InsertBookingAuditLog = typeof bookingAuditLog.$inferInsert;

// ─── Harvest Reports ──────────────────────────────────────────────────────────

/**
 * Post-hunt harvest reporting.
 * Required within harvestReportDays of the hunt date.
 * Failure to report blocks future bookings (configurable per property rules).
 */
export const harvestReports = mysqlTable("harvest_reports", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),       // FK → property_bookings
  memberId: int("memberId").notNull(),         // FK → members
  propertyId: int("propertyId").notNull(),     // FK → hunting_properties

  huntDate: date("huntDate").notNull(),

  activity: mysqlEnum("activity", [
    "deer", "duck", "turkey", "quail", "dove", "hog",
    "bass", "catfish", "crappie", "mixed_hunt", "mixed_fish", "hunt_and_fish",
  ]).notNull(),

  // Harvest details
  harvested: boolean("harvested").default(false).notNull(),
  species: varchar("species", { length: 80 }),           // "Whitetail Buck", "Mallard", etc.
  count: int("count").default(1),                        // number of animals harvested
  weightLbs: decimal("weightLbs", { precision: 6, scale: 2 }),
  antlerPoints: int("antlerPoints"),                     // for deer
  antlerSpread: decimal("antlerSpread", { precision: 5, scale: 2 }),  // inches

  // Conditions
  weatherConditions: varchar("weatherConditions", { length: 100 }),
  temperatureF: int("temperatureF"),
  windSpeed: int("windSpeed"),                           // mph
  windDirection: varchar("windDirection", { length: 10 }),

  // Notes and media
  notes: text("notes"),
  photoUrl: varchar("photoUrl", { length: 500 }),        // S3 URL

  // Submission
  submittedAt: bigint("submittedAt", { mode: "number" }).notNull(),
  dueBy: bigint("dueBy", { mode: "number" }).notNull(),  // deadline for submission
  isOverdue: boolean("isOverdue").default(false),

  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (t) => ({
  bookingIdx: index("hr_booking_idx").on(t.bookingId),
  memberIdx: index("hr_member_idx").on(t.memberId),
  propertyIdx: index("hr_property_idx").on(t.propertyId),
}));

export type HarvestReport = typeof harvestReports.$inferSelect;
export type InsertHarvestReport = typeof harvestReports.$inferInsert;

// ─── Property Blocked Dates ───────────────────────────────────────────────────

/**
 * Admin-set blocked dates per property (or all properties).
 * Used for maintenance, private events, wildlife management closures, etc.
 */
export const propertyBlockedDates = mysqlTable("property_blocked_dates", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId"),               // FK → hunting_properties (null = all properties)

  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),

  reason: mysqlEnum("reason", [
    "maintenance",
    "private_event",
    "wildlife_management",
    "weather",
    "staff_use",
    "lease_restriction",
    "other",
  ]).default("other"),

  reasonNotes: varchar("reasonNotes", { length: 300 }),
  isPubliclyVisible: boolean("isPubliclyVisible").default(true),  // show as "unavailable" on public calendar

  createdByUserId: int("createdByUserId").notNull(),  // FK → users
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (t) => ({
  propertyDateIdx: index("pbd_property_date_idx").on(t.propertyId, t.startDate),
}));

export type PropertyBlockedDate = typeof propertyBlockedDates.$inferSelect;
export type InsertPropertyBlockedDate = typeof propertyBlockedDates.$inferInsert;

// ─── Booking Waitlist ─────────────────────────────────────────────────────────

/**
 * Waitlist entries when a property is full on a requested date.
 * When a cancellation opens a slot, waitlisted members are notified
 * and have a configurable window (default 24 hours) to claim the spot.
 */
export const bookingWaitlist = mysqlTable("booking_waitlist", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),         // FK → members
  userId: int("userId").notNull(),             // FK → users
  propertyId: int("propertyId").notNull(),     // FK → hunting_properties

  requestedDate: date("requestedDate").notNull(),
  partySize: int("partySize").default(1).notNull(),
  activity: mysqlEnum("activity", [
    "deer", "duck", "turkey", "quail", "dove", "hog",
    "bass", "catfish", "crappie", "mixed_hunt", "mixed_fish", "hunt_and_fish",
  ]),

  status: mysqlEnum("status", [
    "waiting",    // on the waitlist
    "notified",   // notified of an opening, awaiting response
    "booked",     // successfully booked after notification
    "expired",    // notification window expired without booking
    "cancelled",  // member removed themselves from waitlist
  ]).default("waiting").notNull(),

  // Notification tracking
  notifiedAt: bigint("notifiedAt", { mode: "number" }),
  expiresAt: bigint("expiresAt", { mode: "number" }),    // 24 hours after notification
  bookedAt: bigint("bookedAt", { mode: "number" }),

  memberNotes: text("memberNotes"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (t) => ({
  memberPropertyIdx: index("bwl_member_property_idx").on(t.memberId, t.propertyId),
  statusIdx: index("bwl_status_idx").on(t.status),
}));

export type BookingWaitlist = typeof bookingWaitlist.$inferSelect;
export type InsertBookingWaitlist = typeof bookingWaitlist.$inferInsert;

// ─── Property Images ──────────────────────────────────────────────────────────

/**
 * Photo gallery per property (stored in S3).
 */
export const propertyImages = mysqlTable("property_images", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),     // FK → hunting_properties

  url: varchar("url", { length: 500 }).notNull(),     // S3 URL
  storageKey: varchar("storageKey", { length: 300 }), // S3 key for deletion
  altText: varchar("altText", { length: 200 }),
  caption: varchar("caption", { length: 300 }),

  type: mysqlEnum("type", [
    "cover",       // hero/cover image
    "gallery",     // gallery image
    "map",         // property map
    "harvest",     // harvest photo
    "amenity",     // amenity photo
  ]).default("gallery").notNull(),

  sortOrder: int("sortOrder").default(0),
  active: boolean("active").default(true),

  uploadedByUserId: int("uploadedByUserId"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (t) => ({
  propertyIdx: index("pi_property_idx").on(t.propertyId),
}));

export type PropertyImage = typeof propertyImages.$inferSelect;
export type InsertPropertyImage = typeof propertyImages.$inferInsert;

// ─── Property Amenities ───────────────────────────────────────────────────────

/**
 * Amenity tags per property.
 * Allows flexible tagging without schema changes.
 */
export const propertyAmenities = mysqlTable("property_amenities", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),     // FK → hunting_properties

  amenity: mysqlEnum("amenity", [
    "heated_blind",
    "atv_access",
    "water_access",
    "electricity",
    "cell_service",
    "wifi",
    "restroom",
    "food_plot",
    "feeder",
    "trail_camera",
    "boat_launch",
    "dog_kennel",
    "cleaning_station",
    "storage",
    "parking",
    "handicap_accessible",
  ]).notNull(),

  notes: varchar("notes", { length: 200 }),
}, (t) => ({
  propertyIdx: index("pa_property_idx").on(t.propertyId),
}));

export type PropertyAmenity = typeof propertyAmenities.$inferSelect;
export type InsertPropertyAmenity = typeof propertyAmenities.$inferInsert;
