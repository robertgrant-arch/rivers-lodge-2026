import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "member"]);
export const userStatusEnum = pgEnum("user_status", ["invited", "active", "disabled"]);

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().$default(() => crypto.randomUUID()),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").notNull().default("member"),
  status: userStatusEnum("status").notNull().default("invited"),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  createdAt: timestamp("created_at").notNull().$default(() => new Date()),
  lastLoginAt: timestamp("last_login_at"),
});

export const invites = pgTable("invites", {
  id: varchar("id", { length: 36 }).primaryKey().$default(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdBy: varchar("created_by", { length: 36 }),
});

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey().$default(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().$default(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserRole = (typeof users.$inferSelect)["role"];
export type Session = typeof sessions.$inferSelect;
export type Invite = typeof invites.$inferSelect;
