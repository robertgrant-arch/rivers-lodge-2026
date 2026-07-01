import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const inquiryTypeEnum = pgEnum("inquiry_type", ["wedding", "corporate", "tour", "general", "membership", "lodging", "event"]);
export const inquiryStatusEnum = pgEnum("inquiry_status", ["new", "contacted", "booked", "closed"]);

export const inquiries = pgTable("inquiries", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  type: inquiryTypeEnum("type").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  eventDate: varchar("eventDate", { length: 100 }),
  guestCount: integer("guestCount"),
  message: text("message"),
  status: inquiryStatusEnum("status").notNull().default("new"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = typeof inquiries.$inferInsert;
