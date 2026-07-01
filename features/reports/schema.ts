import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const fieldReportTypeEnum = pgEnum("field_report_type", ["fishing", "hunting", "field_conditions", "wildlife", "weather"]);
export const fieldConditionsEnum = pgEnum("field_conditions", ["excellent", "good", "fair", "poor"]);
export const reportTierAccessEnum = pgEnum("report_tier_access", ["standard", "premier", "founding", "all"]);
export const newsletterStatusEnum = pgEnum("newsletter_status", ["draft", "pending_approval", "approved", "sent", "cancelled"]);

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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});
export type Newsletter = typeof newsletters.$inferSelect;
export type InsertNewsletter = typeof newsletters.$inferInsert;
