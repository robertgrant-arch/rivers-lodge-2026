/**
 * Enterprise Hunting Property Booking Schema
 * ============================================
 * Designed for The Rivers Lodge & Hunt Club.
 */

import {
  pgTable,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  time,
  decimal,
  json,
  pgEnum,
  bigint,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const huntingPropertyTypeEnum = pgEnum("hunting_property_type", [
  "stand", "blind", "field", "pond", "creek", "food_plot", "zone", "lodge",
]);

export const propertyActivityEnum = pgEnum("property_activity", [
  "deer", "duck", "turkey", "quail", "dove", "hog", "bass", "catfish", "crappie",
  "mixed_hunt", "mixed_fish", "hunt_and_fish",
]);

export const inventoryStatusEnum = pgEnum("inventory_status", [
  "open", "partial", "full", "blocked", "closed",
]);

export const propertyBookingActivityEnum = pgEnum("property_booking_activity", [
  "deer", "duck", "turkey", "quail", "dove", "hog", "bass", "catfish", "crappie",
  "mixed_hunt", "mixed_fish", "hunt_and_fish", "scouting",
]);

export const propertyBookingStatusEnum = pgEnum("property_booking_status", [
  "pending_payment", "confirmed", "pending_approval", "checked_in",
  "completed", "cancelled", "no_show", "declined",
]);

export const memberTierPricingEnum = pgEnum("member_tier_pricing", [
  "founding", "standard", "associate", "day",
]);

export const bookingAddOnTypeEnum = pgEnum("booking_add_on_type", [
  "guide", "atv", "dog_handler", "cleaning", "meals", "ammo", "gear_rental", "photography", "other",
]);

export const bookingPaymentTypeEnum = pgEnum("booking_payment_type", [
  "deposit", "balance", "refund", "adjustment", "late_cancellation_fee",
]);

export const bookingPaymentMethodEnum = pgEnum("booking_payment_method", [
  "stripe", "cash", "check", "comp", "credit", "other",
]);

export const bookingPaymentStatusEnum = pgEnum("booking_payment_status", [
  "pending", "completed", "failed", "refunded", "voided",
]);

export const propertyBlockedReasonEnum = pgEnum("property_blocked_reason", [
  "maintenance", "private_event", "wildlife_management", "weather",
  "staff_use", "lease_restriction", "other",
]);

export const waitlistStatusEnum = pgEnum("waitlist_status", [
  "waiting", "notified", "booked", "expired", "cancelled",
]);

export const propertyImageTypeEnum = pgEnum("property_image_type", [
  "cover", "gallery", "map", "harvest", "amenity",
]);

export const propertyAmenityEnum = pgEnum("property_amenity", [
  "heated_blind", "atv_access", "water_access", "electricity", "cell_service",
  "wifi", "restroom", "food_plot", "feeder", "trail_camera", "boat_launch",
  "dog_kennel", "cleaning_station", "storage", "parking", "handicap_accessible",
]);

export const propertySeasonActivityEnum = pgEnum("property_season_activity", [
  "deer", "duck", "turkey", "quail", "dove", "hog",
  "bass", "catfish", "crappie", "mixed_hunt", "mixed_fish", "hunt_and_fish",
]);

export const harvestActivityEnum = pgEnum("harvest_activity", [
  "deer", "duck", "turkey", "quail", "dove", "hog",
  "bass", "catfish", "crappie", "mixed_hunt", "mixed_fish", "hunt_and_fish",
]);

export const waitlistActivityEnum = pgEnum("waitlist_activity", [
  "deer", "duck", "turkey", "quail", "dove", "hog",
  "bass", "catfish", "crappie", "mixed_hunt", "mixed_fish", "hunt_and_fish",
]);

// ─── Hunting Properties ───────────────────────────────────────────────────────

export const huntingProperties = pgTable("hunting_properties", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  shortName: varchar("shortName", { length: 40 }),
  type: huntingPropertyTypeEnum("type").notNull(),
  primaryActivity: propertyActivityEnum("primaryActivity").notNull(),
  secondaryActivities: json("secondaryActivities"),
  description: text("description"),
  shortDescription: varchar("shortDescription", { length: 280 }),
  acreage: decimal("acreage", { precision: 8, scale: 2 }),
  maxHunters: integer("maxHunters").notNull().default(2),
  hasHeatedBlind: boolean("hasHeatedBlind").default(false),
  hasAtvAccess: boolean("hasAtvAccess").default(false),
  hasWaterAccess: boolean("hasWaterAccess").default(false),
  hasElectricity: boolean("hasElectricity").default(false),
  hasCellService: boolean("hasCellService").default(true),
  gpsLat: decimal("gpsLat", { precision: 10, scale: 7 }),
  gpsLng: decimal("gpsLng", { precision: 10, scale: 7 }),
  locationNotes: varchar("locationNotes", { length: 300 }),
  coverImageUrl: varchar("coverImageUrl", { length: 500 }),
  mapImageUrl: varchar("mapImageUrl", { length: 500 }),
  mapUrl: varchar("mapUrl", { length: 500 }), // Uploaded PDF/image map
  gateCode: varchar("gateCode", { length: 255 }), // Admin-only access code (encrypted)
  active: boolean("active").notNull().default(true),
  featuredOnPublicSite: boolean("featuredOnPublicSite").default(true),
  sortOrder: integer("sortOrder").default(0),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
}, (t) => [
  uniqueIndex("hp_slug_idx").on(t.slug),
  index("hp_activity_idx").on(t.primaryActivity),
  index("hp_active_idx").on(t.active),
]);

export type HuntingProperty = typeof huntingProperties.$inferSelect;
export type InsertHuntingProperty = typeof huntingProperties.$inferInsert;

// ─── Property Activities (Join) ────────────────────────────────────────────────
// Link which activities are available at each property (many-to-many)

export const propertyActivities = pgTable(
  "property_activities",
  {
    propertyId: integer("propertyId").notNull().references(() => huntingProperties.id, { onDelete: "cascade" }),
    activity: propertyActivityEnum("activity").notNull(),
  },
  (t) => ({
    pk: [t.propertyId, t.activity],
  }),
);

export type PropertyActivity = typeof propertyActivities.$inferSelect;
export type InsertPropertyActivity = typeof propertyActivities.$inferInsert;

// ─── Property Seasons ─────────────────────────────────────────────────────────

export const propertySeasons = pgTable("property_seasons", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("propertyId").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  activity: propertySeasonActivityEnum("activity").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  maxHuntersOverride: integer("maxHuntersOverride"),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (t) => [
  index("ps_property_idx").on(t.propertyId),
]);

export type PropertySeason = typeof propertySeasons.$inferSelect;
export type InsertPropertySeason = typeof propertySeasons.$inferInsert;

// ─── Property Booking Rules ───────────────────────────────────────────────────

export const propertyBookingRules = pgTable("property_booking_rules", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("propertyId").notNull().unique(),
  advanceBookingDays: integer("advanceBookingDays").notNull().default(6),
  minAdvanceHours: integer("minAdvanceHours").notNull().default(24),
  maxConsecutiveDays: integer("maxConsecutiveDays").notNull().default(3),
  maxDaysPerSeason: integer("maxDaysPerSeason").notNull().default(10),
  requiresApproval: boolean("requiresApproval").notNull().default(false),
  allowGuests: boolean("allowGuests").notNull().default(true),
  maxGuestsPerBooking: integer("maxGuestsPerBooking").notNull().default(1),
  guestCountsAgainstAllotment: boolean("guestCountsAgainstAllotment").default(true),
  cancellationHours: integer("cancellationHours").notNull().default(24),
  lateCancellationFee: decimal("lateCancellationFee", { precision: 10, scale: 2 }).default("0"),
  harvestReportRequired: boolean("harvestReportRequired").notNull().default(true),
  harvestReportDays: integer("harvestReportDays").notNull().default(7),
  blockBookingsIfReportOverdue: boolean("blockBookingsIfReportOverdue").default(true),
  tierAccess: json("tierAccess"),
  openingDaysUseLottery: boolean("openingDaysUseLottery").default(false),
  lotteryOpeningDays: integer("lotteryOpeningDays").default(2),
  overbookingPercent: integer("overbookingPercent").default(0),
  notes: text("notes"),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
}, (t) => [
  uniqueIndex("pbr_property_idx").on(t.propertyId),
]);

export type PropertyBookingRules = typeof propertyBookingRules.$inferSelect;
export type InsertPropertyBookingRules = typeof propertyBookingRules.$inferInsert;

// ─── Property Pricing ─────────────────────────────────────────────────────────

export const propertyPricing = pgTable("property_pricing", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("propertyId").notNull(),
  seasonId: integer("seasonId"),
  memberTier: memberTierPricingEnum("memberTier"),
  groupSizeMin: integer("groupSizeMin").notNull().default(1),
  groupSizeMax: integer("groupSizeMax").notNull().default(99),
  pricePerDay: decimal("pricePerDay", { precision: 10, scale: 2 }).notNull().default("0"),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }).notNull().default("0"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  guideServicePerDay: decimal("guideServicePerDay", { precision: 10, scale: 2 }).default("0"),
  atvRentalPerDay: decimal("atvRentalPerDay", { precision: 10, scale: 2 }).default("0"),
  dogHandlerPerDay: decimal("dogHandlerPerDay", { precision: 10, scale: 2 }).default("0"),
  cleaningFee: decimal("cleaningFee", { precision: 10, scale: 2 }).default("0"),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (t) => [
  index("pp_property_idx").on(t.propertyId),
]);

export type PropertyPricing = typeof propertyPricing.$inferSelect;
export type InsertPropertyPricing = typeof propertyPricing.$inferInsert;

// ─── Property Date Inventory ──────────────────────────────────────────────────

export const propertyDateInventory = pgTable("property_date_inventory", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("propertyId").notNull(),
  date: date("date").notNull(),
  capacity: integer("capacity").notNull(),
  bookedCount: integer("bookedCount").notNull().default(0),
  status: inventoryStatusEnum("status").notNull().default("open"),
  version: integer("version").notNull().default(0),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
}, (t) => [
  uniqueIndex("pdi_property_date_idx").on(t.propertyId, t.date),
  index("pdi_status_idx").on(t.status),
  index("pdi_date_idx").on(t.date),
]);

export type PropertyDateInventory = typeof propertyDateInventory.$inferSelect;
export type InsertPropertyDateInventory = typeof propertyDateInventory.$inferInsert;

// ─── Property Bookings ────────────────────────────────────────────────────────

export const propertyBookings = pgTable("property_bookings", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  bookingRef: varchar("bookingRef", { length: 20 }).notNull().unique(),
  idempotencyKey: varchar("idempotencyKey", { length: 64 }).notNull().unique(),
  memberId: integer("memberId").notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  propertyId: integer("propertyId").notNull(),
  seasonId: integer("seasonId"),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  totalDays: integer("totalDays").notNull().default(1),
  partySize: integer("partySize").notNull().default(1),
  guestNames: json("guestNames"),
  hasMinors: boolean("hasMinors").default(false),
  activity: propertyBookingActivityEnum("activity").notNull(),
  huntingLicenseConfirmed: boolean("huntingLicenseConfirmed").default(false),
  fishingLicenseConfirmed: boolean("fishingLicenseConfirmed").default(false),
  waiverSignedAt: bigint("waiverSignedAt", { mode: "number" }),
  status: propertyBookingStatusEnum("status").notNull().default("confirmed"),
  requiresApproval: boolean("requiresApproval").default(false),
  approvedByUserId: varchar("approvedByUserId", { length: 36 }),
  approvedAt: bigint("approvedAt", { mode: "number" }),
  declinedAt: bigint("declinedAt", { mode: "number" }),
  declineReason: text("declineReason"),
  cancelledAt: bigint("cancelledAt", { mode: "number" }),
  cancellationReason: text("cancellationReason"),
  cancelledByUserId: varchar("cancelledByUserId", { length: 36 }),
  isLateCancellation: boolean("isLateCancellation").default(false),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull().default("0"),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }).notNull().default("0"),
  depositPaid: decimal("depositPaid", { precision: 10, scale: 2 }).notNull().default("0"),
  balanceDue: decimal("balanceDue", { precision: 10, scale: 2 }).notNull().default("0"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  memberNotes: text("memberNotes"),
  staffNotes: text("staffNotes"),
  confirmationSentAt: bigint("confirmationSentAt", { mode: "number" }),
  reminderSentAt: bigint("reminderSentAt", { mode: "number" }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
}, (t) => [
  uniqueIndex("pb_ref_idx").on(t.bookingRef),
  uniqueIndex("pb_idempotency_idx").on(t.idempotencyKey),
  index("pb_member_idx").on(t.memberId),
  index("pb_property_idx").on(t.propertyId),
  index("pb_date_idx").on(t.startDate, t.endDate),
  index("pb_status_idx").on(t.status),
]);

export type PropertyBooking = typeof propertyBookings.$inferSelect;
export type InsertPropertyBooking = typeof propertyBookings.$inferInsert;

// ─── Booking Add-Ons ──────────────────────────────────────────────────────────

export const bookingAddOns = pgTable("booking_add_ons", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  bookingId: integer("bookingId").notNull(),
  type: bookingAddOnTypeEnum("type").notNull(),
  description: varchar("description", { length: 200 }),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull().default("0"),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (t) => [
  index("bao_booking_idx").on(t.bookingId),
]);

export type BookingAddOn = typeof bookingAddOns.$inferSelect;
export type InsertBookingAddOn = typeof bookingAddOns.$inferInsert;

// ─── Booking Payments ─────────────────────────────────────────────────────────

export const bookingPayments = pgTable("booking_payments", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  bookingId: integer("bookingId").notNull(),
  type: bookingPaymentTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  method: bookingPaymentMethodEnum("method").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 200 }),
  stripeChargeId: varchar("stripeChargeId", { length: 200 }),
  status: bookingPaymentStatusEnum("status").notNull().default("completed"),
  recordedByUserId: varchar("recordedByUserId", { length: 36 }),
  notes: text("notes"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (t) => [
  index("bpay_booking_idx").on(t.bookingId),
]);

export type BookingPayment = typeof bookingPayments.$inferSelect;
export type InsertBookingPayment = typeof bookingPayments.$inferInsert;

// ─── Booking Audit Log ────────────────────────────────────────────────────────

export const bookingAuditLog = pgTable("booking_audit_log", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  bookingId: integer("bookingId").notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  fromValue: text("fromValue"),
  toValue: text("toValue"),
  performedByUserId: varchar("performedByUserId", { length: 36 }).notNull(),
  performedAt: bigint("performedAt", { mode: "number" }).notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  notes: text("notes"),
}, (t) => [
  index("bal_booking_idx").on(t.bookingId),
  index("bal_performed_at_idx").on(t.performedAt),
]);

export type BookingAuditLog = typeof bookingAuditLog.$inferSelect;
export type InsertBookingAuditLog = typeof bookingAuditLog.$inferInsert;

// ─── Harvest Reports ──────────────────────────────────────────────────────────

export const harvestReports = pgTable("harvest_reports", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  bookingId: integer("bookingId").notNull(),
  memberId: integer("memberId").notNull(),
  propertyId: integer("propertyId").notNull(),
  huntDate: date("huntDate").notNull(),
  activity: harvestActivityEnum("activity").notNull(),
  harvested: boolean("harvested").notNull().default(false),
  species: varchar("species", { length: 80 }),
  count: integer("count").default(1),
  weightLbs: decimal("weightLbs", { precision: 6, scale: 2 }),
  antlerPoints: integer("antlerPoints"),
  antlerSpread: decimal("antlerSpread", { precision: 5, scale: 2 }),
  weatherConditions: varchar("weatherConditions", { length: 100 }),
  temperatureF: integer("temperatureF"),
  windSpeed: integer("windSpeed"),
  windDirection: varchar("windDirection", { length: 10 }),
  notes: text("notes"),
  photoUrl: varchar("photoUrl", { length: 500 }),
  submittedAt: bigint("submittedAt", { mode: "number" }).notNull(),
  dueBy: bigint("dueBy", { mode: "number" }).notNull(),
  isOverdue: boolean("isOverdue").default(false),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (t) => [
  index("hr_booking_idx").on(t.bookingId),
  index("hr_member_idx").on(t.memberId),
  index("hr_property_idx").on(t.propertyId),
]);

export type HarvestReport = typeof harvestReports.$inferSelect;
export type InsertHarvestReport = typeof harvestReports.$inferInsert;

// ─── Property Blocked Dates ───────────────────────────────────────────────────

export const propertyBlockedDates = pgTable("property_blocked_dates", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("propertyId"),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  reason: propertyBlockedReasonEnum("reason").default("other"),
  reasonNotes: varchar("reasonNotes", { length: 300 }),
  isPubliclyVisible: boolean("isPubliclyVisible").default(true),
  createdByUserId: varchar("createdByUserId", { length: 36 }).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (t) => [
  index("pbd_property_date_idx").on(t.propertyId, t.startDate),
]);

export type PropertyBlockedDate = typeof propertyBlockedDates.$inferSelect;
export type InsertPropertyBlockedDate = typeof propertyBlockedDates.$inferInsert;

// ─── Booking Waitlist ─────────────────────────────────────────────────────────

export const bookingWaitlist = pgTable("booking_waitlist", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  memberId: integer("memberId").notNull(),
  userId: varchar("userId", { length: 36 }).notNull(),
  propertyId: integer("propertyId").notNull(),
  requestedDate: date("requestedDate").notNull(),
  partySize: integer("partySize").notNull().default(1),
  activity: waitlistActivityEnum("activity"),
  status: waitlistStatusEnum("status").notNull().default("waiting"),
  notifiedAt: bigint("notifiedAt", { mode: "number" }),
  expiresAt: bigint("expiresAt", { mode: "number" }),
  bookedAt: bigint("bookedAt", { mode: "number" }),
  memberNotes: text("memberNotes"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (t) => [
  index("bwl_member_property_idx").on(t.memberId, t.propertyId),
  index("bwl_status_idx").on(t.status),
]);

export type BookingWaitlist = typeof bookingWaitlist.$inferSelect;
export type InsertBookingWaitlist = typeof bookingWaitlist.$inferInsert;

// ─── Property Images ──────────────────────────────────────────────────────────

export const propertyImages = pgTable("property_images", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("propertyId").notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  storageKey: varchar("storageKey", { length: 300 }),
  altText: varchar("altText", { length: 200 }),
  caption: varchar("caption", { length: 300 }),
  type: propertyImageTypeEnum("type").notNull().default("gallery"),
  sortOrder: integer("sortOrder").default(0),
  active: boolean("active").default(true),
  uploadedByUserId: varchar("uploadedByUserId", { length: 36 }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (t) => [
  index("pi_property_idx").on(t.propertyId),
]);

export type PropertyImage = typeof propertyImages.$inferSelect;
export type InsertPropertyImage = typeof propertyImages.$inferInsert;

// ─── Property Amenities ───────────────────────────────────────────────────────

export const propertyAmenities = pgTable("property_amenities", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("propertyId").notNull(),
  amenity: propertyAmenityEnum("amenity").notNull(),
  notes: varchar("notes", { length: 200 }),
}, (t) => [
  index("pa_property_idx").on(t.propertyId),
]);

export type PropertyAmenity = typeof propertyAmenities.$inferSelect;
export type InsertPropertyAmenity = typeof propertyAmenities.$inferInsert;
