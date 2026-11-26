import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const waiverTypeEnum = pgEnum("waiver_type", ["general", "hunt", "fish", "sporting_clays"]);

export const waivers = pgTable("waivers", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: varchar("userId", { length: 36 }),
  signerName: varchar("signerName", { length: 255 }).notNull(),
  signerEmail: varchar("signerEmail", { length: 320 }),
  waiverType: waiverTypeEnum("waiverType").notNull().default("general"),
  signedAt: timestamp("signedAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  content: text("content"),
});

export type Waiver = typeof waivers.$inferSelect;
export type InsertWaiver = typeof waivers.$inferInsert;

// Portal waiver templates and extended portal waivers, via portal's
// server-safe barrel (features/portal/public.ts also re-exports React pages,
// which must not enter the server/DB graph).
export {
  waiverTemplates,
  type WaiverTemplate,
  portalWaivers,
  type PortalWaiver,
} from "@features/portal/server/public";

// DocuSign waivers (migration 0041) — Master waiver per member, Booking waiver per booking.
export * from "./docusignSchema";
