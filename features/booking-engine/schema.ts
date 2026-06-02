import {
  boolean,
  date,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["wedding", "corporate", "member_stay", "hunt_fish"]).notNull(),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }),
  clientPhone: varchar("clientPhone", { length: 50 }),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  spaces: text("spaces"),
  guestCount: int("guestCount"),
  totalRevenue: decimal("totalRevenue", { precision: 10, scale: 2 }),
  depositPaid: boolean("depositPaid").default(false),
  status: mysqlEnum("status", ["inquiry", "confirmed", "completed", "cancelled"]).default("inquiry").notNull(),
  notes: text("notes"),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

// ─── Blocked Dates ────────────────────────────────────────────────────────────

export const blockedDates = mysqlTable("blocked_dates", {
  id: int("id").autoincrement().primaryKey(),
  date: date("date").notNull(),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlockedDate = typeof blockedDates.$inferSelect;
export type InsertBlockedDate = typeof blockedDates.$inferInsert;
