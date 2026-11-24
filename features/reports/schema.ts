import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

export const fieldReportTypeEnum = pgEnum("field_report_type", ["fishing", "hunting", "field_conditions", "wildlife", "weather"]);
export const fieldConditionsEnum = pgEnum("field_conditions", ["excellent", "good", "fair", "poor"]);
export const reportTierAccessEnum = pgEnum("report_tier_access", ["standard", "premier", "founding", "all"]);
export const newsletterStatusEnum = pgEnum("newsletter_status", ["draft", "pending_approval", "approved", "sent", "cancelled", "scheduled", "sending"]);

export const fieldReports = pgTable("field_reports", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  type: fieldReportTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  species: varchar("species", { length: 255 }),
  conditions: fieldConditionsEnum("conditions"),
  location: varchar("location", { length: 255 }),
  reportDate: date("reportDate").notNull(),
  authorId: varchar("authorId", { length: 36 }).notNull(),
  authorName: varchar("authorName", { length: 255 }),
  tierAccess: reportTierAccessEnum("tierAccess").notNull().default("all"),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type FieldReport = typeof fieldReports.$inferSelect;
export type InsertFieldReport = typeof fieldReports.$inferInsert;

export const newsletters = pgTable("newsletters", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  subject: varchar("subject", { length: 255 }).notNull(),
  draftContent: text("draftContent"),
  finalContent: text("finalContent"),
  aiPromptContext: text("aiPromptContext"),
  status: newsletterStatusEnum("status").notNull().default("draft"),
  approvedBy: varchar("approvedBy", { length: 36 }),
  approvedAt: timestamp("approvedAt"),
  sentAt: timestamp("sentAt"),
  sentCount: integer("sentCount").default(0),
  scheduledFor: timestamp("scheduledFor"),
  createdBy: varchar("createdBy", { length: 36 }).notNull(),
  // ── Mass email (migration 0040) ──
  /** Plain-text version, generated from the HTML body. */
  bodyText: text("bodyText"),
  /** Who receives it — see features/reports/server/audience.ts (EmailAudience). */
  audience: jsonb("audience"),
  /** Human label for the recipient group, e.g. "All active members". */
  audienceLabel: varchar("audienceLabel", { length: 255 }),
  /** Display name in "From: <name> at Rivers Lodge". */
  senderName: varchar("senderName", { length: 255 }),
  /** Reply-To: the sending staff member's email. */
  replyTo: varchar("replyTo", { length: 320 }),
  failedCount: integer("failedCount").notNull().default(0),
  /** "now" | "schedule" — what the sender asked for, applied after approval. */
  requestedSendMode: varchar("requestedSendMode", { length: 16 }),
  sendStartedAt: timestamp("sendStartedAt"),
  duplicatedFromId: integer("duplicatedFromId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type Newsletter = typeof newsletters.$inferSelect;
export type InsertNewsletter = typeof newsletters.$inferInsert;

// ─── Mass email delivery (migration 0040) ─────────────────────────────────────

export const emailRecipients = pgTable("email_recipients", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  newsletterId: integer("newsletter_id").notNull().references(() => newsletters.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }),
  /** queued | sent | failed | bounced | complained */
  status: varchar("status", { length: 16 }).notNull().default("queued"),
  providerMessageId: varchar("provider_message_id", { length: 120 }),
  attempts: integer("attempts").notNull().default(0),
  error: text("error"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique("email_recipients_unique").on(t.newsletterId, t.email),
  index("email_recipients_status_idx").on(t.newsletterId, t.status),
  index("email_recipients_msg_idx").on(t.providerMessageId),
]);
export type EmailRecipient = typeof emailRecipients.$inferSelect;

/** Addresses that must not receive bulk email. Transactional email is unaffected. */
export const emailUnsubscribes = pgTable("email_unsubscribes", {
  email: varchar("email", { length: 320 }).primaryKey(),
  /** link | one_click | complaint | bounce | admin */
  source: varchar("source", { length: 16 }).notNull(),
  newsletterId: integer("newsletter_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailEvents = pgTable("email_events", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  providerMessageId: varchar("provider_message_id", { length: 120 }),
  email: varchar("email", { length: 320 }),
  type: varchar("type", { length: 40 }).notNull(),
  detail: jsonb("detail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("email_events_msg_idx").on(t.providerMessageId)]);

export const emailSettings = pgTable("email_settings", {
  id: integer("id").primaryKey().default(1),
  requireEmployeeApproval: boolean("require_employee_approval").notNull().default(true),
  updatedBy: varchar("updated_by", { length: 36 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
