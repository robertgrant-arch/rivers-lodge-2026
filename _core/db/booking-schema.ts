/**
 * Booking & Availability System Schema
 * Rivers Lodge & Hunt Club
 */

import {
  boolean,
  date,
  decimal,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const resourceGroupTypeEnum = pgEnum("resource_group_type", [
  "event_space", "lodging", "hunt_zone", "fish_zone", "guide_slot", "support", "grounds",
]);

export const resourceTypeEnum = pgEnum("resource_type", [
  "event_space", "lodging_unit", "hunt_zone", "fish_zone", "guide_slot",
  "culinary", "av_support", "grounds", "cleaning",
]);

export const allocationStatusEnum = pgEnum("allocation_status", ["tentative", "confirmed", "cancelled"]);

export const paymentTypeEnum = pgEnum("payment_type", ["deposit", "balance", "addon", "refund", "credit"]);
export const paymentMethodEnum = pgEnum("payment_method", ["stripe", "check", "wire", "cash", "credit_card", "other"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "completed", "failed", "refunded"]);

export const businessLineEnum = pgEnum("business_line", [
  "wedding", "corporate", "member_stay", "hunt", "fish", "hunt_and_fish",
]);

export const requestSourceEnum = pgEnum("request_source", ["member_portal", "public_form", "staff", "phone"]);
export const requestBusinessLineEnum = pgEnum("request_business_line", [
  "wedding", "corporate", "member_stay", "hunt", "fish", "hunt_and_fish", "other",
]);
export const requestStatusEnum = pgEnum("request_status", [
  "new", "contacted", "qualified", "proposal_sent", "converted", "rejected", "lost",
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "website_form", "referral", "direct", "social", "event", "other",
]);
export const leadBusinessLineEnum = pgEnum("lead_business_line", [
  "wedding", "corporate", "member_stay", "hunt", "fish", "hunt_and_fish", "membership", "other",
]);
export const leadStatusEnum = pgEnum("lead_status", [
  "new", "contacted", "qualified", "proposal_sent", "negotiating", "converted", "lost", "unqualified",
]);

export const huntFishActivityEnum = pgEnum("hunt_fish_activity", [
  "duck", "deer", "turkey", "dove", "quail", "hog", "bass", "catfish", "crappie",
  "general_hunt", "general_fish", "hunt_and_fish",
]);

export const huntFishSeasonEnum = pgEnum("hunt_fish_season", [
  "spring", "summer", "fall", "winter", "year_round",
]);

export const tripRequestStatusEnum = pgEnum("trip_request_status", [
  "pending", "confirmed", "declined", "waitlisted", "cancelled", "no_show", "completed",
]);

export const tripPaymentStatusEnum = pgEnum("trip_payment_status", [
  "not_required", "pending", "paid", "refunded", "waived",
]);

// ─── Resource Groups ──────────────────────────────────────────────────────────

export const resourceGroups = pgTable("resource_groups", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  type: resourceGroupTypeEnum("type").notNull(),
  description: text("description"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ResourceGroup = typeof resourceGroups.$inferSelect;
export type InsertResourceGroup = typeof resourceGroups.$inferInsert;

// ─── Resources ────────────────────────────────────────────────────────────────

export const resources = pgTable("resources", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  groupId: integer("groupId").notNull(),
  type: resourceTypeEnum("type").notNull(),
  capacity: integer("capacity").notNull().default(1),
  holdbackHoursBefore: integer("holdbackHoursBefore").notNull().default(0),
  holdbackHoursAfter: integer("holdbackHoursAfter").notNull().default(0),
  exclusiveUse: boolean("exclusiveUse").notNull().default(false),
  description: text("description"),
  cmsSlug: varchar("cmsSlug", { length: 100 }),
  isActive: boolean("isActive").notNull().default(true),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;

// ─── Availability Rules ───────────────────────────────────────────────────────

export const availabilityRules = pgTable("availability_rules", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  resourceId: integer("resourceId"),
  groupId: integer("groupId"),
  dayOfWeek: integer("dayOfWeek"),
  openTime: time("openTime"),
  closeTime: time("closeTime"),
  seasonStart: varchar("seasonStart", { length: 5 }),
  seasonEnd: varchar("seasonEnd", { length: 5 }),
  isActive: boolean("isActive").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AvailabilityRule = typeof availabilityRules.$inferSelect;
export type InsertAvailabilityRule = typeof availabilityRules.$inferInsert;

// ─── Booking Resource Allocations ─────────────────────────────────────────────
// NOTE: Now on PostgreSQL, the DB-level exclusion constraint can be added:
//   CREATE EXTENSION IF NOT EXISTS btree_gist;
//   ALTER TABLE booking_resource_allocations
//     ADD CONSTRAINT no_overlap EXCLUDE USING gist (
//       "resourceId" WITH =,
//       tsrange("allocationStart", "allocationEnd") WITH &&
//     ) WHERE (status != 'cancelled');
// This gives true DB-level double-booking prevention. The application-level
// FOR UPDATE lock in checkAvailability remains as first-line defense.

export const bookingResourceAllocations = pgTable(
  "booking_resource_allocations",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    bookingId: integer("bookingId").notNull(),
    resourceId: integer("resourceId").notNull(),
    allocationStart: timestamp("allocationStart").notNull(),
    allocationEnd: timestamp("allocationEnd").notNull(),
    holdbackStart: timestamp("holdbackStart"),
    holdbackEnd: timestamp("holdbackEnd"),
    status: allocationStatusEnum("status").notNull().default("tentative"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (t) => [
    index("bra_resource_date_idx").on(t.resourceId, t.status, t.allocationStart, t.allocationEnd),
    index("bra_booking_idx").on(t.bookingId),
  ],
);
export type BookingResourceAllocation = typeof bookingResourceAllocations.$inferSelect;
export type InsertBookingResourceAllocation = typeof bookingResourceAllocations.$inferInsert;

// ─── Conflict Acknowledgments ─────────────────────────────────────────────────

export const conflictAcknowledgments = pgTable("conflict_acknowledgments", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  bookingId: integer("bookingId").notNull(),
  conflictRuleId: varchar("conflictRuleId", { length: 20 }).notNull(),
  relatedBookingId: integer("relatedBookingId"),
  resourceId: integer("resourceId"),
  acknowledgedByUserId: varchar("acknowledgedByUserId", { length: 36 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ConflictAcknowledgment = typeof conflictAcknowledgments.$inferSelect;
export type InsertConflictAcknowledgment = typeof conflictAcknowledgments.$inferInsert;

// ─── Payment Records ──────────────────────────────────────────────────────────

export const paymentRecords = pgTable("payment_records", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  bookingId: integer("bookingId").notNull(),
  type: paymentTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: paymentMethodEnum("method"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeRefundId: varchar("stripeRefundId", { length: 255 }),
  notes: text("notes"),
  recordedByUserId: varchar("recordedByUserId", { length: 36 }),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type InsertPaymentRecord = typeof paymentRecords.$inferInsert;

// ─── Waiver Requirements ──────────────────────────────────────────────────────

export const waiverRequirements = pgTable("waiver_requirements", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  businessLine: businessLineEnum("businessLine").notNull(),
  waiverTemplateId: integer("waiverTemplateId").notNull(),
  requiresAllParticipants: boolean("requiresAllParticipants").notNull().default(false),
  isHardGate: boolean("isHardGate").notNull().default(false),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WaiverRequirement = typeof waiverRequirements.$inferSelect;
export type InsertWaiverRequirement = typeof waiverRequirements.$inferInsert;

// ─── Reservation Requests ─────────────────────────────────────────────────────

export const reservationRequests = pgTable("reservation_requests", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  source: requestSourceEnum("source").notNull().default("public_form"),
  businessLine: requestBusinessLineEnum("businessLine").notNull(),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 50 }),
  memberId: integer("memberId"),
  userId: varchar("userId", { length: 36 }),
  requestedStart: date("requestedStart").notNull(),
  requestedEnd: date("requestedEnd").notNull(),
  guestCount: integer("guestCount"),
  preferredSpaces: json("preferredSpaces"),
  specialRequests: text("specialRequests"),
  eventType: varchar("eventType", { length: 100 }),
  budgetRange: varchar("budgetRange", { length: 100 }),
  hearAboutUs: varchar("hearAboutUs", { length: 255 }),
  status: requestStatusEnum("status").notNull().default("new"),
  assignedToUserId: varchar("assignedToUserId", { length: 36 }),
  convertedBookingId: integer("convertedBookingId"),
  rejectionReason: text("rejectionReason"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type ReservationRequest = typeof reservationRequests.$inferSelect;
export type InsertReservationRequest = typeof reservationRequests.$inferInsert;

// ─── Leads ────────────────────────────────────────────────────────────────────

export const leads = pgTable("leads", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  source: leadSourceEnum("source").notNull().default("website_form"),
  businessLine: leadBusinessLineEnum("businessLine").notNull(),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 50 }),
  companyOrCoupleName: varchar("companyOrCoupleName", { length: 255 }),
  requestedStartDate: date("requestedStartDate"),
  requestedEndDate: date("requestedEndDate"),
  estimatedGuestCount: integer("estimatedGuestCount"),
  estimatedBudget: decimal("estimatedBudget", { precision: 10, scale: 2 }),
  status: leadStatusEnum("status").notNull().default("new"),
  assignedToUserId: varchar("assignedToUserId", { length: 36 }),
  reservationRequestId: integer("reservationRequestId"),
  convertedBookingId: integer("convertedBookingId"),
  lostReason: text("lostReason"),
  notes: text("notes"),
  lastContactedAt: timestamp("lastContactedAt"),
  followUpDate: date("followUpDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ─── Booking State Transitions ────────────────────────────────────────────────

export const bookingStateTransitions = pgTable("booking_state_transitions", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  bookingId: integer("bookingId").notNull(),
  fromStatus: varchar("fromStatus", { length: 50 }),
  toStatus: varchar("toStatus", { length: 50 }).notNull(),
  triggeredByUserId: varchar("triggeredByUserId", { length: 36 }),
  notes: text("notes"),
  gateChecks: json("gateChecks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BookingStateTransition = typeof bookingStateTransitions.$inferSelect;
export type InsertBookingStateTransition = typeof bookingStateTransitions.$inferInsert;

// ─── Hunt & Fish Slots ────────────────────────────────────────────────────────

export const huntFishSlots = pgTable("hunt_fish_slots", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  activity: huntFishActivityEnum("activity").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  slotDate: date("slotDate").notNull(),
  slotEndDate: date("slotEndDate"),
  checkInTime: time("checkInTime"),
  checkOutTime: time("checkOutTime"),
  totalCapacity: integer("totalCapacity").notNull().default(6),
  bookedCount: integer("bookedCount").notNull().default(0),
  season: huntFishSeasonEnum("season").notNull().default("fall"),
  regulatoryNotes: text("regulatoryNotes"),
  pricePerPerson: decimal("pricePerPerson", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  resourceId: integer("resourceId"),
  guideNotes: text("guideNotes"),
  isPublic: boolean("isPublic").notNull().default(true),
  isActive: boolean("isActive").notNull().default(true),
  notes: text("notes"),
  createdByUserId: varchar("createdByUserId", { length: 36 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type HuntFishSlot = typeof huntFishSlots.$inferSelect;
export type InsertHuntFishSlot = typeof huntFishSlots.$inferInsert;

// ─── Trip Requests ────────────────────────────────────────────────────────────

export const tripRequests = pgTable("trip_requests", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  slotId: integer("slotId").notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  memberId: integer("memberId"),
  partySize: integer("partySize").notNull().default(1),
  guestNames: json("guestNames"),
  hasMinors: boolean("hasMinors").notNull().default(false),
  huntingLicenseConfirmed: boolean("huntingLicenseConfirmed").notNull().default(false),
  fishingLicenseConfirmed: boolean("fishingLicenseConfirmed").notNull().default(false),
  waiverSignedAt: timestamp("waiverSignedAt"),
  status: tripRequestStatusEnum("status").notNull().default("pending"),
  reviewedByUserId: varchar("reviewedByUserId", { length: 36 }),
  reviewedAt: timestamp("reviewedAt"),
  declineReason: text("declineReason"),
  staffNotes: text("staffNotes"),
  memberNotes: text("memberNotes"),
  confirmationSentAt: timestamp("confirmationSentAt"),
  paymentStatus: tripPaymentStatusEnum("paymentStatus").notNull().default("not_required"),
  amountDue: decimal("amountDue", { precision: 10, scale: 2 }),
  amountPaid: decimal("amountPaid", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type TripRequest = typeof tripRequests.$inferSelect;
export type InsertTripRequest = typeof tripRequests.$inferInsert;
