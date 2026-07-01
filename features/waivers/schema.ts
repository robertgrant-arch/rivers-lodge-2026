import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Waivers (legacy simple sign-and-store flow) ──────────────────────────────

export const waivers = mysqlTable("waivers", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("userId", { length: 36 }),
  signerName: varchar("signerName", { length: 255 }).notNull(),
  signerEmail: varchar("signerEmail", { length: 320 }),
  waiverType: mysqlEnum("waiverType", ["general", "hunt", "fish", "sporting_clays"]).default("general").notNull(),
  signedAt: timestamp("signedAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  content: text("content"),
});

export type Waiver = typeof waivers.$inferSelect;
export type InsertWaiver = typeof waivers.$inferInsert;

// Portal waiver templates and extended portal waivers
export {
  waiverTemplates,
  type WaiverTemplate,
  portalWaivers,
  type PortalWaiver,
} from "@features/portal/schema";
