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
} from "drizzle-orm/mysql-core";

export * from "@features/auth/schema";
export * from "@features/updates/schema";

// ─── Inquiries ────────────────────────────────────────────────────────────────

export const inquiries = mysqlTable("inquiries", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["wedding", "corporate", "tour", "general", "membership", "lodging", "event"]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  eventDate: varchar("eventDate", { length: 100 }),
  guestCount: int("guestCount"),
  message: text("message"),
  status: mysqlEnum("status", ["new", "contacted", "booked", "closed"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = typeof inquiries.$inferInsert;

// ─── Membership Applications ──────────────────────────────────────────────────

export const membershipApplications = mysqlTable("membership_applications", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  interests: text("interests"),
  referral: text("referral"),
  message: text("message"),
  status: mysqlEnum("status", ["pending", "approved", "declined"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MembershipApplication = typeof membershipApplications.$inferSelect;
export type InsertMembershipApplication = typeof membershipApplications.$inferInsert;

// ─── Members ──────────────────────────────────────────────────────────────────

export const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  memberNumber: varchar("memberNumber", { length: 50 }),
  tier: mysqlEnum("tier", ["standard", "premier", "founding"]).default("standard").notNull(),
  joinDate: date("joinDate"),
  renewalDate: date("renewalDate"),
  active: boolean("active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;

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

// ─── Waivers ──────────────────────────────────────────────────────────────────

export const waivers = mysqlTable("waivers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  signerName: varchar("signerName", { length: 255 }).notNull(),
  signerEmail: varchar("signerEmail", { length: 320 }),
  waiverType: mysqlEnum("waiverType", ["general", "hunt", "fish", "sporting_clays"]).default("general").notNull(),
  signedAt: timestamp("signedAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  content: text("content"),
});

export type Waiver = typeof waivers.$inferSelect;
export type InsertWaiver = typeof waivers.$inferInsert;

// ─── Seasonal Updates ─────────────────────────────────────────────────────────

export const seasonalUpdates = mysqlTable("seasonal_updates", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  category: mysqlEnum("category", ["whitetail", "waterfowl", "turkey", "fishing", "general"]).default("general").notNull(),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SeasonalUpdate = typeof seasonalUpdates.$inferSelect;
export type InsertSeasonalUpdate = typeof seasonalUpdates.$inferInsert;

export * from "@features/messages/schema";

// ─── Blocked Dates ────────────────────────────────────────────────────────────

export const blockedDates = mysqlTable("blocked_dates", {
  id: int("id").autoincrement().primaryKey(),
  date: date("date").notNull(),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlockedDate = typeof blockedDates.$inferSelect;
export type InsertBlockedDate = typeof blockedDates.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// CMS COLLECTIONS — extracted to features/cms/schema.ts
// ═══════════════════════════════════════════════════════════════════════════════

export * from "@features/cms/schema";
