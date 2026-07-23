import {
  bigint,
  boolean,
  date,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const weddingStatusEnum = pgEnum("wedding_status", [
  "inquiry", "contacted", "site_visit", "proposal_sent",
  "contract_out", "confirmed", "completed", "cancelled",
]);
export const bookingSourceEnum = pgEnum("booking_source", ["website", "referral", "direct", "social", "vendor"]);
export const corporateStatusEnum = pgEnum("corporate_status", [
  "inquiry", "contacted", "proposal_sent",
  "contract_out", "confirmed", "completed", "cancelled",
]);
export const corporateEventTypeEnum = pgEnum("corporate_event_type", [
  "team_retreat", "board_meeting", "incentive_trip",
  "company_hunt", "private_buyout", "other",
]);
export const corporateSourceEnum = pgEnum("corporate_source", ["website", "referral", "direct", "repeat"]);
export const huntFishStatusEnum = pgEnum("hunt_fish_status", [
  "requested", "confirmed", "in_progress", "completed", "cancelled",
]);
export const huntFishBookingTypeEnum = pgEnum("hunt_fish_booking_type", [
  "guided_hunt", "self_guided_hunt", "fishing", "sporting_clays",
]);
export const huntFishSpeciesEnum = pgEnum("hunt_fish_species", [
  "whitetail", "waterfowl", "turkey", "bass", "catfish", "crappie", "clays", "other",
]);
export const clientTypeEnum = pgEnum("client_type", ["member", "corporate_group", "guest"]);
export const seasonConfigSpeciesEnum = pgEnum("season_config_species", [
  "whitetail", "waterfowl", "turkey", "bass", "catfish", "crappie", "clays", "all",
]);
export const portalBlockedReasonEnum = pgEnum("portal_blocked_reason", [
  "maintenance", "private_use", "seasonal_closure", "buffer", "other",
]);
export const portalBlockedScopeEnum = pgEnum("portal_blocked_scope", [
  "entire_property", "specific_venue", "specific_lodging",
]);
export const portalEventKindEnum = pgEnum("portal_event_kind", [
  "wedding", "corporate", "hunt_fish", "blocked",
]);
export const portalBookingTypeEnum = pgEnum("portal_booking_type", [
  "wedding", "corporate", "member_booking", "hunt_fish",
]);
export const portalDocFileTypeEnum = pgEnum("portal_doc_file_type", [
  "contract", "proposal", "waiver", "photo", "floor_plan", "other",
]);
export const waiverTemplateTypeEnum = pgEnum("waiver_template_type", [
  "general", "hunt", "fish", "sporting_clays", "event",
]);
export const portalWaiverStatusEnum = pgEnum("portal_waiver_status", [
  "draft", "active", "pending", "sent", "viewed", "signed", "expired", "revoked", "archived",
]);
export const auditActionTypeEnum = pgEnum("audit_action_type", [
  "create", "update", "delete", "status_change", "login", "export", "override",
]);
export const notificationPriorityEnum = pgEnum("notification_priority", [
  "critical", "high", "medium", "low",
]);
export const taskStatusEnum = pgEnum("task_status", ["open", "in_progress", "completed", "cancelled"]);
export const taskPriorityEnum = pgEnum("task_priority", ["high", "medium", "low"]);

// ─── Wedding Bookings ─────────────────────────────────────────────────────────

export const weddingBookings = pgTable("wedding_bookings", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  status: weddingStatusEnum("status").notNull().default("inquiry"),
  coupleName: varchar("coupleName", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 50 }),
  weddingDate: date("weddingDate"),
  ceremonyVenue: varchar("ceremonyVenue", { length: 100 }),
  receptionVenue: varchar("receptionVenue", { length: 100 }),
  lodgingNotes: text("lodgingNotes"),
  guestCountEstimate: integer("guestCountEstimate"),
  guestCountFinal: integer("guestCountFinal"),
  ceremonyTime: varchar("ceremonyTime", { length: 20 }),
  receptionEndTime: varchar("receptionEndTime", { length: 20 }),
  rehearsalDate: date("rehearsalDate"),
  rehearsalDinner: boolean("rehearsalDinner").default(false),
  coordinatorName: varchar("coordinatorName", { length: 255 }),
  coordinatorContact: varchar("coordinatorContact", { length: 255 }),
  contractValue: decimal("contractValue", { precision: 10, scale: 2 }),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }),
  depositReceivedDate: date("depositReceivedDate"),
  balanceDueDate: date("balanceDueDate"),
  balanceReceivedDate: date("balanceReceivedDate"),
  source: bookingSourceEnum("source").default("website"),
  referredBy: varchar("referredBy", { length: 255 }),
  assignedUserId: varchar("assignedUserId", { length: 36 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("wb_status_idx").on(t.status),
  index("wb_wedding_date_idx").on(t.weddingDate),
  index("wb_contact_email_idx").on(t.contactEmail),
  index("wb_created_at_idx").on(t.createdAt),
]);
export type WeddingBooking = typeof weddingBookings.$inferSelect;
export type InsertWeddingBooking = typeof weddingBookings.$inferInsert;

// ─── Corporate Bookings ───────────────────────────────────────────────────────

export const corporateBookings = pgTable("corporate_bookings", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  status: corporateStatusEnum("status").notNull().default("inquiry"),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 50 }),
  eventType: corporateEventTypeEnum("eventType").default("other"),
  arrivalDate: date("arrivalDate"),
  departureDate: date("departureDate"),
  venueNotes: text("venueNotes"),
  lodgingNotes: text("lodgingNotes"),
  attendeeCount: integer("attendeeCount"),
  cateringRequired: boolean("cateringRequired").default(false),
  avRequired: boolean("avRequired").default(false),
  huntFishAddon: boolean("huntFishAddon").default(false),
  linkedHuntFishId: integer("linkedHuntFishId"),
  contractValue: decimal("contractValue", { precision: 10, scale: 2 }),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }),
  depositReceivedDate: date("depositReceivedDate"),
  balanceDueDate: date("balanceDueDate"),
  balanceReceivedDate: date("balanceReceivedDate"),
  source: corporateSourceEnum("source").default("website"),
  repeatClient: boolean("repeatClient").default(false),
  assignedUserId: varchar("assignedUserId", { length: 36 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("cb_status_idx").on(t.status),
  index("cb_arrival_date_idx").on(t.arrivalDate),
  index("cb_contact_email_idx").on(t.contactEmail),
  index("cb_created_at_idx").on(t.createdAt),
]);
export type CorporateBooking = typeof corporateBookings.$inferSelect;
export type InsertCorporateBooking = typeof corporateBookings.$inferInsert;

// ─── Hunt & Fish Bookings ─────────────────────────────────────────────────────

export const huntFishBookings = pgTable("hunt_fish_bookings", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  status: huntFishStatusEnum("status").notNull().default("requested"),
  bookingType: huntFishBookingTypeEnum("bookingType").notNull(),
  species: huntFishSpeciesEnum("species").default("other"),
  clientType: clientTypeEnum("clientType").default("member"),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }),
  memberId: integer("memberId"),
  linkedCorporateId: integer("linkedCorporateId"),
  linkedMemberBookingId: integer("linkedMemberBookingId"),
  bookingDate: date("bookingDate").notNull(),
  startTime: varchar("startTime", { length: 20 }),
  endTime: varchar("endTime", { length: 20 }),
  partySize: integer("partySize").default(1),
  guideUserId: varchar("guideUserId", { length: 36 }),
  standLocation: varchar("standLocation", { length: 255 }),
  season: varchar("season", { length: 100 }),
  totalCharge: decimal("totalCharge", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("hfb_status_idx").on(t.status),
  index("hfb_booking_date_idx").on(t.bookingDate),
  index("hfb_guide_user_idx").on(t.guideUserId),
  index("hfb_created_at_idx").on(t.createdAt),
]);
export type HuntFishBooking = typeof huntFishBookings.$inferSelect;
export type InsertHuntFishBooking = typeof huntFishBookings.$inferInsert;

// ─── Harvest Records ──────────────────────────────────────────────────────────

export const harvestRecords = pgTable("harvest_records", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  huntFishBookingId: integer("huntFishBookingId").notNull(),
  species: varchar("species", { length: 100 }).notNull(),
  count: integer("count").default(1),
  details: text("details"),
  photoKey: varchar("photoKey", { length: 500 }),
  guideNotes: text("guideNotes"),
  harvestDate: date("harvestDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("hrec_booking_idx").on(t.huntFishBookingId),
  index("hrec_species_idx").on(t.species),
]);
export type HarvestRecord = typeof harvestRecords.$inferSelect;
export type InsertHarvestRecord = typeof harvestRecords.$inferInsert;

// ─── Season Configurations ────────────────────────────────────────────────────

export const seasonConfigs = pgTable("season_configs", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  seasonName: varchar("seasonName", { length: 100 }).notNull(),
  species: seasonConfigSpeciesEnum("species").notNull(),
  openDate: date("openDate").notNull(),
  closeDate: date("closeDate").notNull(),
  dailyBagLimit: integer("dailyBagLimit"),
  seasonBagLimit: integer("seasonBagLimit"),
  availableStands: text("availableStands"),
  guideRate: decimal("guideRate", { precision: 10, scale: 2 }),
  memberNotes: text("memberNotes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type SeasonConfig = typeof seasonConfigs.$inferSelect;
export type InsertSeasonConfig = typeof seasonConfigs.$inferInsert;

// ─── Portal Blocked Dates ─────────────────────────────────────────────────────

export const portalBlockedDates = pgTable("portal_blocked_dates", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  title: varchar("title", { length: 255 }),
  kind: portalEventKindEnum("kind").default("blocked"),
  startAt: timestamp("startAt", { mode: "string" }),
  endAt: timestamp("endAt", { mode: "string" }),
  allDay: boolean("allDay").default(true),
  reason: portalBlockedReasonEnum("reason").default("other"),
  reasonNotes: text("reasonNotes"),
  scope: portalBlockedScopeEnum("scope").default("entire_property"),
  scopeTarget: varchar("scopeTarget", { length: 100 }),
  hiddenFromMembers: boolean("hiddenFromMembers").default(false).notNull(),
  createdByUserId: varchar("createdByUserId", { length: 36 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("pbd_start_date_idx").on(t.startDate),
  index("pbd_end_date_idx").on(t.endDate),
]);
export type PortalBlockedDate = typeof portalBlockedDates.$inferSelect;
export type InsertPortalBlockedDate = typeof portalBlockedDates.$inferInsert;

// ─── Portal Staff Assignments ─────────────────────────────────────────────────

export const portalStaffAssignments = pgTable("portal_staff_assignments", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  staffUserId: varchar("staffUserId", { length: 36 }).notNull(),
  bookingType: portalBookingTypeEnum("bookingType").notNull(),
  bookingId: integer("bookingId").notNull(),
  role: varchar("role", { length: 100 }),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
});
export type PortalStaffAssignment = typeof portalStaffAssignments.$inferSelect;

// ─── Portal Documents ─────────────────────────────────────────────────────────

export const portalDocuments = pgTable("portal_documents", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: portalDocFileTypeEnum("fileType").default("other"),
  s3Key: varchar("s3Key", { length: 500 }).notNull(),
  uploadedByUserId: varchar("uploadedByUserId", { length: 36 }),
  linkedEntityType: varchar("linkedEntityType", { length: 50 }),
  linkedEntityId: integer("linkedEntityId"),
  version: integer("version").default(1),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("pdoc_entity_idx").on(t.linkedEntityType, t.linkedEntityId),
]);
export type PortalDocument = typeof portalDocuments.$inferSelect;

// ─── Waiver Templates ─────────────────────────────────────────────────────────

export const waiverTemplates = pgTable("waiver_templates", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  templateName: varchar("templateName", { length: 255 }).notNull(),
  templateType: waiverTemplateTypeEnum("templateType").default("general"),
  description: text("description"),
  bodyText: text("bodyText").notNull(),
  fileKey: varchar("fileKey", { length: 500 }),
  fileName: varchar("fileName", { length: 255 }),
  expiresInDays: integer("expiresInDays"),
  version: integer("version").notNull().default(1),
  active: boolean("active").notNull().default(true),
  archived: boolean("archived").notNull().default(false),
  createdByUserId: varchar("createdByUserId", { length: 36 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type WaiverTemplate = typeof waiverTemplates.$inferSelect;

// Immutable per-version snapshots so signed waivers always reference the exact
// template content that was in force at signing time.
export const waiverTemplateVersions = pgTable("waiver_template_versions", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  templateId: integer("templateId").notNull(),
  version: integer("version").notNull(),
  templateName: varchar("templateName", { length: 255 }).notNull(),
  templateType: waiverTemplateTypeEnum("templateType").default("general"),
  bodyText: text("bodyText").notNull(),
  fileKey: varchar("fileKey", { length: 500 }),
  fileName: varchar("fileName", { length: 255 }),
  createdByUserId: varchar("createdByUserId", { length: 36 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("wtv_template_idx").on(t.templateId, t.version),
]);
export type WaiverTemplateVersion = typeof waiverTemplateVersions.$inferSelect;

// ─── Portal Waivers ───────────────────────────────────────────────────────────

export const portalWaivers = pgTable("portal_waivers", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  templateId: integer("templateId"),
  // Snapshot of the exact template version in force when this waiver was sent.
  templateVersionId: integer("templateVersionId"),
  templateVersion: integer("templateVersion"),
  snapshotTitle: varchar("snapshotTitle", { length: 255 }),
  snapshotBody: text("snapshotBody"),
  signatoryName: varchar("signatoryName", { length: 255 }).notNull(),
  signatoryEmail: varchar("signatoryEmail", { length: 320 }),
  linkedBookingType: varchar("linkedBookingType", { length: 50 }),
  linkedBookingId: integer("linkedBookingId"),
  linkedMemberId: integer("linkedMemberId"),
  status: portalWaiverStatusEnum("status").notNull().default("sent"),
  signingToken: varchar("signingToken", { length: 128 }).unique(),
  senderUserId: varchar("senderUserId", { length: 36 }),
  senderName: varchar("senderName", { length: 255 }),
  customMessage: text("customMessage"),
  expiresAt: timestamp("expiresAt"),
  sentAt: timestamp("sentAt"),
  viewedAt: timestamp("viewedAt"),
  signedAt: timestamp("signedAt"),
  revokedAt: timestamp("revokedAt"),
  revokedByUserId: varchar("revokedByUserId", { length: 36 }),
  consentAccepted: boolean("consentAccepted").notNull().default(false),
  consentText: text("consentText"),
  signatureName: varchar("signatureName", { length: 255 }),
  signatureData: text("signatureData"),
  signedPdfKey: varchar("signedPdfKey", { length: 500 }),
  deliveryStatus: varchar("deliveryStatus", { length: 32 }),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: varchar("userAgent", { length: 512 }),
  isMinor: boolean("isMinor").default(false),
  guardianName: varchar("guardianName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("pw_status_idx").on(t.status),
  index("pw_linked_booking_idx").on(t.linkedBookingType, t.linkedBookingId),
  index("pw_email_idx").on(t.signatoryEmail),
  index("pw_template_idx").on(t.templateId),
  index("pw_created_at_idx").on(t.createdAt),
]);
export type PortalWaiver = typeof portalWaivers.$inferSelect;

// ─── Portal Audit Log ─────────────────────────────────────────────────────────

export const portalAuditLog = pgTable("portal_audit_log", {
  id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  actingUserId: varchar("actingUserId", { length: 36 }),
  actingUserName: varchar("actingUserName", { length: 255 }),
  actionType: auditActionTypeEnum("actionType").notNull(),
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

export const portalNotifications = pgTable("portal_notifications", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  recipientUserId: varchar("recipientUserId", { length: 36 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  priority: notificationPriorityEnum("priority").default("medium"),
  entityType: varchar("entityType", { length: 100 }),
  entityId: integer("entityId"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("pn_recipient_read_idx").on(t.recipientUserId, t.read),
  index("pn_created_at_idx").on(t.createdAt),
]);
export type PortalNotification = typeof portalNotifications.$inferSelect;

// ─── Portal Tasks ─────────────────────────────────────────────────────────────

export const portalTasks = pgTable("portal_tasks", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  assignedToUserId: varchar("assignedToUserId", { length: 36 }).notNull(),
  createdByUserId: varchar("createdByUserId", { length: 36 }),
  title: varchar("title", { length: 255 }).notNull(),
  notes: text("notes"),
  dueDate: date("dueDate"),
  status: taskStatusEnum("status").notNull().default("open"),
  priority: taskPriorityEnum("priority").default("medium"),
  entityType: varchar("entityType", { length: 100 }),
  entityId: integer("entityId"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("ptask_assignee_status_idx").on(t.assignedToUserId, t.status),
]);
export type PortalTask = typeof portalTasks.$inferSelect;

// ─── Portal Notes / Timeline ──────────────────────────────────────────────────

export const portalNotes = pgTable("portal_notes", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  authorUserId: varchar("authorUserId", { length: 36 }).notNull(),
  authorName: varchar("authorName", { length: 255 }),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: integer("entityId").notNull(),
  body: text("body").notNull(),
  internal: boolean("internal").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("pnote_entity_idx").on(t.entityType, t.entityId),
  index("pnote_created_at_idx").on(t.createdAt),
]);
export type PortalNote = typeof portalNotes.$inferSelect;

// ─── Calendar Access Settings ────────────────────────────────────────────────

export const calendarAccessSettings = pgTable("calendar_access_settings", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  settingKey: varchar("setting_key", { length: 255 }).notNull().unique(),
  settingValue: text("setting_value").notNull(), // JSON stringified
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type CalendarAccessSettings = typeof calendarAccessSettings.$inferSelect;
export type InsertCalendarAccessSettings = typeof calendarAccessSettings.$inferInsert;
