/**
 * Booking & Availability System Schema
 * Rivers Lodge & Hunt Club
 *
 * This file extends the base schema with the full booking system entities
 * defined in the Booking & Availability System Specification.
 */

import {
  boolean,
  date,
  decimal,
  int,
  index,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  time,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Resource Groups ──────────────────────────────────────────────────────────
// Logical groupings of resources (Event Spaces, Lodging, Hunt Zones, etc.)

export const resourceGroups = mysqlTable("resource_groups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  type: mysqlEnum("type", [
    "event_space",
    "lodging",
    "hunt_zone",
    "fish_zone",
    "guide_slot",
    "support",
    "grounds",
  ]).notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ResourceGroup = typeof resourceGroups.$inferSelect;
export type InsertResourceGroup = typeof resourceGroups.$inferInsert;

// ─── Resources ────────────────────────────────────────────────────────────────
// Individual bookable resources (Rivers Barn, Lodge, Duck Blind 1, etc.)

export const resources = mysqlTable("resources", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  groupId: int("groupId").notNull(),
  type: mysqlEnum("type", [
    "event_space",
    "lodging_unit",
    "hunt_zone",
    "fish_zone",
    "guide_slot",
    "culinary",
    "av_support",
    "grounds",
    "cleaning",
  ]).notNull(),
  // Maximum concurrent bookings (1 = exclusive, >1 = capacity-based like fish zones)
  capacity: int("capacity").default(1).notNull(),
  // Hours to hold before and after a booking for setup/breakdown/cleaning
  holdbackHoursBefore: int("holdbackHoursBefore").default(0).notNull(),
  holdbackHoursAfter: int("holdbackHoursAfter").default(0).notNull(),
  // Whether this resource requires exclusive use of the property
  exclusiveUse: boolean("exclusiveUse").default(false).notNull(),
  description: text("description"),
  cmsSlug: varchar("cmsSlug", { length: 100 }), // links to cms_lodging_units or cms_event_spaces
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;

// ─── Availability Rules ───────────────────────────────────────────────────────
// Defines when a resource is available (day of week, seasonal windows)

export const availabilityRules = mysqlTable("availability_rules", {
  id: int("id").autoincrement().primaryKey(),
  resourceId: int("resourceId"), // null = applies to entire group
  groupId: int("groupId"),       // null = applies to specific resource only
  // Day of week (0=Sunday, 1=Monday, ..., 6=Saturday), null = all days
  dayOfWeek: int("dayOfWeek"),
  openTime: time("openTime"),    // null = all day
  closeTime: time("closeTime"),  // null = all day
  // Seasonal window (null = year-round)
  seasonStart: varchar("seasonStart", { length: 5 }), // MM-DD format
  seasonEnd: varchar("seasonEnd", { length: 5 }),     // MM-DD format
  isActive: boolean("isActive").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AvailabilityRule = typeof availabilityRules.$inferSelect;
export type InsertAvailabilityRule = typeof availabilityRules.$inferInsert;

// ─── Booking Resource Allocations ─────────────────────────────────────────────
// Links a booking to specific resources for specific date/time windows.
//
// DB-LEVEL DEFENSE AGAINST DOUBLE-BOOKING — TRADEOFF NOTE:
//
// PostgreSQL supports exclusion constraints (EXCLUDE USING gist) that can
// enforce non-overlapping ranges at the DB level.  MySQL has no equivalent.
//
// What we DO enforce at the DB level:
//   - The composite index below makes the conflict SELECT fast and targeted,
//     ensuring the FOR UPDATE row-level lock set is as tight as possible.
//
// What we CANNOT enforce at the DB level (MySQL limitation):
//   - "No two non-cancelled rows for the same resourceId may have overlapping
//     (allocationStart, allocationEnd) ranges."
//   - This constraint is enforced at the application level by:
//     a) `getConflictingAllocations` with `.for("update")` — serialises
//        concurrent transactions at the row-set level.
//     b) `checkAvailability` called inside `db.transaction()` in every
//        booking mutation — the check and insert are atomic.
//
// If this database is ever migrated to PostgreSQL, replace the FOR UPDATE
// lock with:
//   CREATE EXTENSION IF NOT EXISTS btree_gist;
//   ALTER TABLE booking_resource_allocations
//     ADD CONSTRAINT no_overlap EXCLUDE USING gist (
//       resource_id WITH =,
//       tsrange(allocation_start, allocation_end) WITH &&
//     ) WHERE (status != 'cancelled');
// That would make overlapping inserts fail at the DB level regardless of
// isolation level, providing a true defense-in-depth second layer.

export const bookingResourceAllocations = mysqlTable(
  "booking_resource_allocations",
  {
    id: int("id").autoincrement().primaryKey(),
    bookingId: int("bookingId").notNull(),
    resourceId: int("resourceId").notNull(),
    allocationStart: timestamp("allocationStart").notNull(),
    allocationEnd: timestamp("allocationEnd").notNull(),
    // Includes holdback windows (setup/breakdown/cleaning time)
    holdbackStart: timestamp("holdbackStart"), // allocationStart - holdbackHoursBefore
    holdbackEnd: timestamp("holdbackEnd"),     // allocationEnd + holdbackHoursAfter
    status: mysqlEnum("status", ["tentative", "confirmed", "cancelled"]).default("tentative").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    // Composite index used by getConflictingAllocations.
    // Covers: WHERE resourceId = ? AND status != 'cancelled'
    //           AND allocationStart < ? AND allocationEnd > ?
    // This keeps the FOR UPDATE lock set tight and the range scan efficient
    // even as the table grows to hundreds of thousands of rows.
    resourceDateIdx: index("bra_resource_date_idx").on(
      t.resourceId,
      t.status,
      t.allocationStart,
      t.allocationEnd,
    ),
    bookingIdx: index("bra_booking_idx").on(t.bookingId),
  }),
);
export type BookingResourceAllocation = typeof bookingResourceAllocations.$inferSelect;
export type InsertBookingResourceAllocation = typeof bookingResourceAllocations.$inferInsert;

// ─── Conflict Acknowledgments ─────────────────────────────────────────────────
// Records when staff acknowledges a soft conflict

export const conflictAcknowledgments = mysqlTable("conflict_acknowledgments", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  conflictRuleId: varchar("conflictRuleId", { length: 20 }).notNull(), // e.g. 'SC-03'
  relatedBookingId: int("relatedBookingId"),
  resourceId: int("resourceId"),
  acknowledgedByUserId: int("acknowledgedByUserId").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ConflictAcknowledgment = typeof conflictAcknowledgments.$inferSelect;
export type InsertConflictAcknowledgment = typeof conflictAcknowledgments.$inferInsert;

// ─── Payment Records ──────────────────────────────────────────────────────────
// Tracks all financial transactions for a booking

export const paymentRecords = mysqlTable("payment_records", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  type: mysqlEnum("type", ["deposit", "balance", "addon", "refund", "credit"]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: mysqlEnum("method", ["stripe", "check", "wire", "cash", "credit_card", "other"]),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeRefundId: varchar("stripeRefundId", { length: 255 }),
  notes: text("notes"),
  recordedByUserId: int("recordedByUserId"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type InsertPaymentRecord = typeof paymentRecords.$inferInsert;

// ─── Waiver Requirements ──────────────────────────────────────────────────────
// Defines which waiver templates are required for each business line

export const waiverRequirements = mysqlTable("waiver_requirements", {
  id: int("id").autoincrement().primaryKey(),
  businessLine: mysqlEnum("businessLine", [
    "wedding",
    "corporate",
    "member_stay",
    "hunt",
    "fish",
    "hunt_and_fish",
  ]).notNull(),
  waiverTemplateId: int("waiverTemplateId").notNull(), // FK to waiver_templates
  // If true, ALL participants must sign (hard gate for check-in)
  requiresAllParticipants: boolean("requiresAllParticipants").default(false).notNull(),
  // If true, unsigned waiver blocks check-in (hard gate)
  isHardGate: boolean("isHardGate").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WaiverRequirement = typeof waiverRequirements.$inferSelect;
export type InsertWaiverRequirement = typeof waiverRequirements.$inferInsert;

// ─── Reservation Requests ─────────────────────────────────────────────────────
// Pre-booking requests from members or public inquiry forms

export const reservationRequests = mysqlTable("reservation_requests", {
  id: int("id").autoincrement().primaryKey(),
  // Source of the request
  source: mysqlEnum("source", ["member_portal", "public_form", "staff", "phone"]).default("public_form").notNull(),
  businessLine: mysqlEnum("businessLine", [
    "wedding",
    "corporate",
    "member_stay",
    "hunt",
    "fish",
    "hunt_and_fish",
    "other",
  ]).notNull(),
  // Contact info (for non-member requests)
  contactName: varchar("contactName", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 50 }),
  // Member reference (for member portal requests)
  memberId: int("memberId"),
  userId: int("userId"),
  // Requested dates
  requestedStart: date("requestedStart").notNull(),
  requestedEnd: date("requestedEnd").notNull(),
  // Request details
  guestCount: int("guestCount"),
  preferredSpaces: json("preferredSpaces"), // array of resource slugs
  specialRequests: text("specialRequests"),
  // Qualification fields
  eventType: varchar("eventType", { length: 100 }), // wedding, corporate retreat, etc.
  budgetRange: varchar("budgetRange", { length: 100 }),
  hearAboutUs: varchar("hearAboutUs", { length: 255 }),
  // Workflow
  status: mysqlEnum("status", [
    "new",
    "contacted",
    "qualified",
    "proposal_sent",
    "converted",
    "rejected",
    "lost",
  ]).default("new").notNull(),
  assignedToUserId: int("assignedToUserId"),
  convertedBookingId: int("convertedBookingId"), // FK to bookings once converted
  rejectionReason: text("rejectionReason"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ReservationRequest = typeof reservationRequests.$inferSelect;
export type InsertReservationRequest = typeof reservationRequests.$inferInsert;

// ─── Leads ────────────────────────────────────────────────────────────────────
// Sales pipeline leads (can be created from reservation requests or directly)

export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  // Source
  source: mysqlEnum("source", [
    "website_form",
    "referral",
    "direct",
    "social",
    "event",
    "other",
  ]).default("website_form").notNull(),
  businessLine: mysqlEnum("businessLine", [
    "wedding",
    "corporate",
    "member_stay",
    "hunt",
    "fish",
    "hunt_and_fish",
    "membership",
    "other",
  ]).notNull(),
  // Contact
  contactName: varchar("contactName", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 50 }),
  companyOrCoupleName: varchar("companyOrCoupleName", { length: 255 }),
  // Event details
  requestedStartDate: date("requestedStartDate"),
  requestedEndDate: date("requestedEndDate"),
  estimatedGuestCount: int("estimatedGuestCount"),
  estimatedBudget: decimal("estimatedBudget", { precision: 10, scale: 2 }),
  // Pipeline
  status: mysqlEnum("status", [
    "new",
    "contacted",
    "qualified",
    "proposal_sent",
    "negotiating",
    "converted",
    "lost",
    "unqualified",
  ]).default("new").notNull(),
  assignedToUserId: int("assignedToUserId"),
  reservationRequestId: int("reservationRequestId"), // source request if applicable
  convertedBookingId: int("convertedBookingId"),
  lostReason: text("lostReason"),
  notes: text("notes"),
  lastContactedAt: timestamp("lastContactedAt"),
  followUpDate: date("followUpDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ─── Booking State Transitions ────────────────────────────────────────────────
// Immutable log of every booking status change (part of audit trail)

export const bookingStateTransitions = mysqlTable("booking_state_transitions", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  fromStatus: varchar("fromStatus", { length: 50 }),
  toStatus: varchar("toStatus", { length: 50 }).notNull(),
  triggeredByUserId: int("triggeredByUserId"),
  notes: text("notes"),
  gateChecks: json("gateChecks"), // snapshot of which gates passed/failed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BookingStateTransition = typeof bookingStateTransitions.$inferSelect;
export type InsertBookingStateTransition = typeof bookingStateTransitions.$inferInsert;

// ─── Hunt & Fish Slots ────────────────────────────────────────────────────────
// Structured availability windows for hunt/fish trips.
// Staff create slots (e.g. "Duck Hunt – Nov 15, capacity 6") and members book
// against them. Slots are the source of truth for the public availability calendar.

export const huntFishSlots = mysqlTable("hunt_fish_slots", {
  id: int("id").autoincrement().primaryKey(),

  // Activity type
  activity: mysqlEnum("activity", [
    "duck",
    "deer",
    "turkey",
    "dove",
    "quail",
    "hog",
    "bass",
    "catfish",
    "crappie",
    "general_hunt",
    "general_fish",
    "hunt_and_fish",
  ]).notNull(),

  // Display label (e.g. "Early Teal Season – Opening Weekend")
  label: varchar("label", { length: 255 }).notNull(),

  // Date window for this slot
  slotDate: date("slotDate").notNull(),          // primary date (start of multi-day trip)
  slotEndDate: date("slotEndDate"),              // null = single-day trip
  checkInTime: time("checkInTime"),              // optional, e.g. 05:30 for duck hunt
  checkOutTime: time("checkOutTime"),

  // Capacity management
  totalCapacity: int("totalCapacity").default(6).notNull(),  // max party size across all bookings
  bookedCount: int("bookedCount").default(0).notNull(),      // denormalized for fast calendar queries

  // Season / regulatory context
  season: mysqlEnum("season", ["spring", "summer", "fall", "winter", "year_round"]).default("fall").notNull(),
  regulatoryNotes: text("regulatoryNotes"),      // e.g. "Kansas WP bag limits apply"

  // Pricing (optional — for future Stripe integration)
  pricePerPerson: decimal("pricePerPerson", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("USD"),

  // Guide / resource linkage
  resourceId: int("resourceId"),                // FK to resources (hunt_zone or fish_zone)
  guideNotes: text("guideNotes"),               // internal notes for guides

  // Visibility
  isPublic: boolean("isPublic").default(true).notNull(),    // show on public calendar
  isActive: boolean("isActive").default(true).notNull(),    // soft delete / archive

  // Metadata
  notes: text("notes"),
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HuntFishSlot = typeof huntFishSlots.$inferSelect;
export type InsertHuntFishSlot = typeof huntFishSlots.$inferInsert;

// ─── Trip Requests ────────────────────────────────────────────────────────────
// A member's request to join a specific hunt/fish slot.
// Lifecycle: pending → confirmed | declined | cancelled | waitlisted
// When confirmed, bookedCount on the parent slot is incremented.

export const tripRequests = mysqlTable("trip_requests", {
  id: int("id").autoincrement().primaryKey(),

  // Slot being requested
  slotId: int("slotId").notNull(),              // FK to hunt_fish_slots

  // Requester identity
  userId: int("userId").notNull(),              // FK to users
  memberId: int("memberId"),                    // FK to members (denormalized for quick lookup)

  // Party details
  partySize: int("partySize").default(1).notNull(),
  guestNames: json("guestNames"),               // array of strings — names of guests in party
  hasMinors: boolean("hasMinors").default(false).notNull(),

  // Licensing & compliance
  huntingLicenseConfirmed: boolean("huntingLicenseConfirmed").default(false).notNull(),
  fishingLicenseConfirmed: boolean("fishingLicenseConfirmed").default(false).notNull(),
  waiverSignedAt: timestamp("waiverSignedAt"),

  // Workflow status
  status: mysqlEnum("status", [
    "pending",       // submitted, awaiting staff review
    "confirmed",     // staff approved, slot capacity decremented
    "declined",      // staff declined
    "waitlisted",    // slot full, member placed on waitlist
    "cancelled",     // member or staff cancelled after confirmation
    "no_show",       // member did not appear
    "completed",     // trip completed
  ]).default("pending").notNull(),

  // Staff workflow
  reviewedByUserId: int("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  declineReason: text("declineReason"),
  staffNotes: text("staffNotes"),               // internal notes, not visible to member

  // Member-facing communication
  memberNotes: text("memberNotes"),             // member's special requests / notes
  confirmationSentAt: timestamp("confirmationSentAt"),

  // Payment (for future Stripe integration)
  paymentStatus: mysqlEnum("paymentStatus", [
    "not_required",
    "pending",
    "paid",
    "refunded",
    "waived",
  ]).default("not_required").notNull(),
  amountDue: decimal("amountDue", { precision: 10, scale: 2 }),
  amountPaid: decimal("amountPaid", { precision: 10, scale: 2 }),

  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TripRequest = typeof tripRequests.$inferSelect;
export type InsertTripRequest = typeof tripRequests.$inferInsert;
