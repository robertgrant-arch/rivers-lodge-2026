import {
  boolean,
  date,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

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
