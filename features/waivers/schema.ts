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

// Portal waiver templates and extended portal waivers.
// Re-exported from portal's *schema* (not its public.ts barrel): public.ts also
// re-exports React pages, and pulling those into the server/DB graph broke
// every server test that touches the schema (same pattern as admin/schema.ts).
export {
  waiverTemplates,
  type WaiverTemplate,
  portalWaivers,
  type PortalWaiver,
} from "@features/portal/schema";
