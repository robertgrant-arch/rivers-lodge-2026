// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL OPERATIONS PORTAL — Phase 16
// ═══════════════════════════════════════════════════════════════════════════════
import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  date,
  json,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Portal Staff Roles ───────────────────────────────────────────────────────
// Extended role enum is on the users table in schema.ts
// Portal roles: owner, venue_sales, events_manager, membership_manager,
//               hunt_fish_ops, hospitality, staff, finance
// (member, user, admin remain for public/member portal)

// ─── Wedding Bookings ─────────────────────────────────────────────────────────
export const weddingBookings = mysqlTable("wedding_bookings", {
  id: int("id").autoincrement().primaryKey(),
  status: mysqlEnum("status", [
    "inquiry", "contacted", "site_visit", "proposal_sent",
    "contract_out", "confirmed", "completed", "cancelled"
  ]).default("inquiry").notNull(),
  // Couple info
  coupleName: varchar("coupleName", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 50 }),
  // Event details
  weddingDate: date("weddingDate"),
  ceremonyVenue: varchar("ceremonyVenue", { length: 100 }),
  receptionVenue: varchar("receptionVenue", { length: 100 }),
  lodgingNotes: text("lodgingNotes"),
  guestCountEstimate: int("guestCountEstimate"),
  guestCountFinal: int("guestCountFinal"),
  ceremonyTime: varchar("ceremonyTime", { length: 20 }),
  receptionEndTime: varchar("receptionEndTime", { length: 20 }),
  rehearsalDate: date("rehearsalDate"),
  rehearsalDinner: boolean("rehearsalDinner").default(false),
  // Coordinator
  coordinatorName: varchar("coordinatorName", { length: 255 }),
  coordinatorContact: varchar("coordinatorContact", { length: 255 }),
  // Financial
  contractValue: decimal("contractValue", { precision: 10, scale: 2 }),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }),
  depositReceivedDate: date("depositReceivedDate"),
  balanceDueDate: date("balanceDueDate"),
  balanceReceivedDate: date("balanceReceivedDate"),
  // Meta
  source: mysqlEnum("source", ["website", "referral", "direct", "social", "vendor"]).default("website"),
  referredBy: varchar("referredBy", { length: 255 }),
  assignedUserId: int("assignedUserId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WeddingBooking = typeof weddingBookings.$inferSelect;
export type InsertWeddingBooking = typeof weddingBookings.$inferInsert;

// ─── Corporate Bookings ───────────────────────────────────────────────────────
export const corporateBookings = mysqlTable("corporate_bookings", {
  id: int("id").autoincrement().primaryKey(),
  status: mysqlEnum("status", [
    "inquiry", "contacted", "proposal_sent",
    "contract_out", "confirmed", "completed", "cancelled"
  ]).default("inquiry").notNull(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 50 }),
  eventType: mysqlEnum("eventType", [
    "team_retreat", "board_meeting", "incentive_trip",
    "company_hunt", "private_buyout", "other"
  ]).default("other"),
  arrivalDate: date("arrivalDate"),
  departureDate: date("departureDate"),
  venueNotes: text("venueNotes"),
  lodgingNotes: text("lodgingNotes"),
  attendeeCount: int("attendeeCount"),
  cateringRequired: boolean("cateringRequired").default(false),
  avRequired: boolean("avRequired").default(false),
  huntFishAddon: boolean("huntFishAddon").default(false),
  linkedHuntFishId: int("linkedHuntFishId"),
  contractValue: decimal("contractValue", { precision: 10, scale: 2 }),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }),
  depositReceivedDate: date("depositReceivedDate"),
  balanceDueDate: date("balanceDueDate"),
  balanceReceivedDate: date("balanceReceivedDate"),
  source: mysqlEnum("source", ["website", "referral", "direct", "repeat"]).default("website"),
  repeatClient: boolean("repeatClient").default(false),
  assignedUserId: int("assignedUserId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CorporateBooking = typeof corporateBookings.$inferSelect;
export type InsertCorporateBooking = typeof corporateBookings.$inferInsert;

// ─── Hunt & Fish Bookings ─────────────────────────────────────────────────────
export const huntFishBookings = mysqlTable("hunt_fish_bookings", {
  id: int("id").autoincrement().primaryKey(),
  status: mysqlEnum("status", [
    "requested", "confirmed", "in_progress", "completed", "cancelled"
  ]).default("requested").notNull(),
  bookingType: mysqlEnum("bookingType", [
    "guided_hunt", "self_guided_hunt", "fishing", "sporting_clays"
  ]).notNull(),
  species: mysqlEnum("species", [
    "whitetail", "waterfowl", "turkey", "bass", "catfish", "crappie", "clays", "other"
  ]).default("other"),
  clientType: mysqlEnum("clientType", ["member", "corporate_group", "guest"]).default("member"),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }),
  memberId: int("memberId"),
  linkedCorporateId: int("linkedCorporateId"),
  linkedMemberBookingId: int("linkedMemberBookingId"),
  bookingDate: date("bookingDate").notNull(),
  startTime: varchar("startTime", { length: 20 }),
  endTime: varchar("endTime", { length: 20 }),
  partySize: int("partySize").default(1),
  guideUserId: int("guideUserId"),
  standLocation: varchar("standLocation", { length: 255 }),
  season: varchar("season", { length: 100 }),
  totalCharge: decimal("totalCharge", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type HuntFishBooking = typeof huntFishBookings.$inferSelect;
export type InsertHuntFishBooking = typeof huntFishBookings.$inferInsert;

// ─── Harvest Records ──────────────────────────────────────────────────────────
export const harvestRecords = mysqlTable("harvest_records", {
  id: int("id").autoincrement().primaryKey(),
  huntFishBookingId: int("huntFishBookingId").notNull(),
  species: varchar("species", { length: 100 }).notNull(),
  count: int("count").default(1),
  details: text("details"),
  photoKey: varchar("photoKey", { length: 500 }),
  guideNotes: text("guideNotes"),
  harvestDate: date("harvestDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type HarvestRecord = typeof harvestRecords.$inferSelect;
export type InsertHarvestRecord = typeof harvestRecords.$inferInsert;

// ─── Season Configurations ────────────────────────────────────────────────────
export const seasonConfigs = mysqlTable("season_configs", {
  id: int("id").autoincrement().primaryKey(),
  seasonName: varchar("seasonName", { length: 100 }).notNull(),
  species: mysqlEnum("species", [
    "whitetail", "waterfowl", "turkey", "bass", "catfish", "crappie", "clays", "all"
  ]).notNull(),
  openDate: date("openDate").notNull(),
  closeDate: date("closeDate").notNull(),
  dailyBagLimit: int("dailyBagLimit"),
  seasonBagLimit: int("seasonBagLimit"),
  availableStands: json("availableStands"),
  guideRate: decimal("guideRate", { precision: 10, scale: 2 }),
  memberNotes: text("memberNotes"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SeasonConfig = typeof seasonConfigs.$inferSelect;
export type InsertSeasonConfig = typeof seasonConfigs.$inferInsert;

// ─── Portal Blocked Dates (extended) ─────────────────────────────────────────
export const portalBlockedDates = mysqlTable("portal_blocked_dates", {
  id: int("id").autoincrement().primaryKey(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  reason: mysqlEnum("reason", [
    "maintenance", "private_use", "seasonal_closure", "buffer", "other"
  ]).default("other"),
  reasonNotes: text("reasonNotes"),
  scope: mysqlEnum("scope", ["entire_property", "specific_venue", "specific_lodging"]).default("entire_property"),
  scopeTarget: varchar("scopeTarget", { length: 100 }),
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PortalBlockedDate = typeof portalBlockedDates.$inferSelect;
export type InsertPortalBlockedDate = typeof portalBlockedDates.$inferInsert;

// ─── Portal Staff Assignments ─────────────────────────────────────────────────
export const portalStaffAssignments = mysqlTable("portal_staff_assignments", {
  id: int("id").autoincrement().primaryKey(),
  staffUserId: int("staffUserId").notNull(),
  bookingType: mysqlEnum("bookingType", ["wedding", "corporate", "member_booking", "hunt_fish"]).notNull(),
  bookingId: int("bookingId").notNull(),
  role: varchar("role", { length: 100 }),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
});
export type PortalStaffAssignment = typeof portalStaffAssignments.$inferSelect;

// ─── Portal Documents ─────────────────────────────────────────────────────────
export const portalDocuments = mysqlTable("portal_documents", {
  id: int("id").autoincrement().primaryKey(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: mysqlEnum("fileType", ["contract", "proposal", "waiver", "photo", "floor_plan", "other"]).default("other"),
  s3Key: varchar("s3Key", { length: 500 }).notNull(),
  uploadedByUserId: int("uploadedByUserId"),
  linkedEntityType: varchar("linkedEntityType", { length: 50 }),
  linkedEntityId: int("linkedEntityId"),
  version: int("version").default(1),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PortalDocument = typeof portalDocuments.$inferSelect;

// ─── Portal Waiver Templates ──────────────────────────────────────────────────
export const waiverTemplates = mysqlTable("waiver_templates", {
  id: int("id").autoincrement().primaryKey(),
  templateName: varchar("templateName", { length: 255 }).notNull(),
  templateType: mysqlEnum("templateType", ["general", "hunt", "fish", "sporting_clays", "event"]).default("general"),
  bodyText: text("bodyText").notNull(),
  version: int("version").default(1).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WaiverTemplate = typeof waiverTemplates.$inferSelect;

// ─── Portal Waivers (extended) ────────────────────────────────────────────────
export const portalWaivers = mysqlTable("portal_waivers", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId"),
  signatoryName: varchar("signatoryName", { length: 255 }).notNull(),
  signatoryEmail: varchar("signatoryEmail", { length: 320 }),
  linkedBookingType: varchar("linkedBookingType", { length: 50 }),
  linkedBookingId: int("linkedBookingId"),
  linkedMemberId: int("linkedMemberId"),
  status: mysqlEnum("status", ["pending", "sent", "signed", "expired"]).default("pending").notNull(),
  signingToken: varchar("signingToken", { length: 128 }).unique(),
  sentAt: timestamp("sentAt"),
  signedAt: timestamp("signedAt"),
  signedPdfKey: varchar("signedPdfKey", { length: 500 }),
  ipAddress: varchar("ipAddress", { length: 64 }),
  isMinor: boolean("isMinor").default(false),
  guardianName: varchar("guardianName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PortalWaiver = typeof portalWaivers.$inferSelect;

// ─── Portal Audit Log ─────────────────────────────────────────────────────────
export const portalAuditLog = mysqlTable("portal_audit_log", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  actingUserId: int("actingUserId"),
  actingUserName: varchar("actingUserName", { length: 255 }),
  actionType: mysqlEnum("actionType", [
    "create", "update", "delete", "status_change", "login", "export", "override"
  ]).notNull(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: varchar("entityId", { length: 50 }),
  fieldChanged: varchar("fieldChanged", { length: 100 }),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PortalAuditLog = typeof portalAuditLog.$inferSelect;

// ─── Portal Notifications ─────────────────────────────────────────────────────
export const portalNotifications = mysqlTable("portal_notifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientUserId: int("recipientUserId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  priority: mysqlEnum("priority", ["critical", "high", "medium", "low"]).default("medium"),
  entityType: varchar("entityType", { length: 100 }),
  entityId: int("entityId"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PortalNotification = typeof portalNotifications.$inferSelect;

// ─── Portal Tasks ─────────────────────────────────────────────────────────────
export const portalTasks = mysqlTable("portal_tasks", {
  id: int("id").autoincrement().primaryKey(),
  assignedToUserId: int("assignedToUserId").notNull(),
  createdByUserId: int("createdByUserId"),
  title: varchar("title", { length: 255 }).notNull(),
  notes: text("notes"),
  dueDate: date("dueDate"),
  status: mysqlEnum("status", ["open", "in_progress", "completed", "cancelled"]).default("open").notNull(),
  priority: mysqlEnum("priority", ["high", "medium", "low"]).default("medium"),
  entityType: varchar("entityType", { length: 100 }),
  entityId: int("entityId"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PortalTask = typeof portalTasks.$inferSelect;

// ─── Portal Notes / Timeline ──────────────────────────────────────────────────
export const portalNotes = mysqlTable("portal_notes", {
  id: int("id").autoincrement().primaryKey(),
  authorUserId: int("authorUserId").notNull(),
  authorName: varchar("authorName", { length: 255 }),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: int("entityId").notNull(),
  body: text("body").notNull(),
  internal: boolean("internal").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PortalNote = typeof portalNotes.$inferSelect;
