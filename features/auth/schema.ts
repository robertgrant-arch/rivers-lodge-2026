import {
  boolean,
  datetime,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().$default(() => crypto.randomUUID()),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash"),
  role: mysqlEnum("role", ["admin", "member"]).notNull().default("member"),
  status: mysqlEnum("status", ["invited", "active", "disabled"]).notNull().default("invited"),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  createdAt: datetime("created_at").notNull().$default(() => new Date()),
  lastLoginAt: datetime("last_login_at"),
});

export const invites = mysqlTable("invites", {
  id: varchar("id", { length: 36 }).primaryKey().$default(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: datetime("expires_at").notNull(),
  acceptedAt: datetime("accepted_at"),
  createdBy: varchar("created_by", { length: 36 }),
});

export const sessions = mysqlTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey().$default(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull(),
  expiresAt: datetime("expires_at").notNull(),
  createdAt: datetime("created_at").notNull().$default(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserRole = (typeof users.$inferSelect)["role"];
export type Session = typeof sessions.$inferSelect;
export type Invite = typeof invites.$inferSelect;
