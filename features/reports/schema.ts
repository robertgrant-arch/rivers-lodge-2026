import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  date,
} from "drizzle-orm/mysql-core";

// ─── Field Reports ────────────────────────────────────────────────────────────
// Fishing, hunting, and general field condition reports posted by admins
export const fieldReports = mysqlTable("field_reports", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["fishing", "hunting", "field_conditions", "wildlife", "weather"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  // Structured metadata (species, counts, conditions, etc.)
  species: varchar("species", { length: 255 }), // e.g. "Largemouth Bass, Crappie"
  conditions: mysqlEnum("conditions", ["excellent", "good", "fair", "poor"]),
  location: varchar("location", { length: 255 }), // e.g. "South Pond", "North Timber Stand"
  reportDate: date("reportDate").notNull(),
  authorId: int("authorId").notNull(), // users.id
  authorName: varchar("authorName", { length: 255 }), // denormalized for display
  // Visibility
  tierAccess: mysqlEnum("tierAccess", ["standard", "premier", "founding", "all"]).default("all").notNull(),
  published: boolean("published").default(false).notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FieldReport = typeof fieldReports.$inferSelect;
export type InsertFieldReport = typeof fieldReports.$inferInsert;

// ─── Newsletters ──────────────────────────────────────────────────────────────
// AI-drafted weekly newsletters that go through admin approval before sending
export const newsletters = mysqlTable("newsletters", {
  id: int("id").autoincrement().primaryKey(),
  subject: varchar("subject", { length: 255 }).notNull(),
  // AI-generated draft content (HTML or Markdown)
  draftContent: text("draftContent"),
  // Admin-edited final content
  finalContent: text("finalContent"),
  // Prompt context used to generate the draft
  aiPromptContext: text("aiPromptContext"),
  status: mysqlEnum("status", ["draft", "pending_approval", "approved", "sent", "cancelled"]).default("draft").notNull(),
  // Approval workflow
  approvedBy: int("approvedBy"), // users.id
  approvedAt: timestamp("approvedAt"),
  // Send tracking
  sentAt: timestamp("sentAt"),
  sentCount: int("sentCount").default(0),
  // Scheduling
  scheduledFor: timestamp("scheduledFor"),
  // Authorship
  createdBy: int("createdBy").notNull(), // users.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Newsletter = typeof newsletters.$inferSelect;
export type InsertNewsletter = typeof newsletters.$inferInsert;
