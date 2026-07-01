import {
  boolean,
  date,
  decimal,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const bookingTypeEnum = pgEnum("booking_type", ["wedding", "corporate", "member_stay", "hunt_fish"]);
export const bookingStatusEnum = pgEnum("booking_status", ["inquiry", "confirmed", "completed", "cancelled"]);

export const bookings = pgTable("bookings", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  type: bookingTypeEnum("type").notNull(),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }),
  clientPhone: varchar("clientPhone", { length: 50 }),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  spaces: text("spaces"),
  guestCount: integer("guestCount"),
  totalRevenue: decimal("totalRevenue", { precision: 10, scale: 2 }),
  depositPaid: boolean("depositPaid").default(false),
  status: bookingStatusEnum("status").notNull().default("inquiry"),
  notes: text("notes"),
  userId: varchar("userId", { length: 36 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

export const blockedDates = pgTable("blocked_dates", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  date: date("date").notNull(),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlockedDate = typeof blockedDates.$inferSelect;
export type InsertBlockedDate = typeof blockedDates.$inferInsert;
