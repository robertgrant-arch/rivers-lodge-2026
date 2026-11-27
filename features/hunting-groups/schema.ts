// ─── Hunting Groups — DB schema ───────────────────────────────────────────────
// Outside hunting parties booked through ops (modelled on corporate_bookings).
// Table created by _core/db/migrations/0042_hunting_group_bookings.sql.
import {
  boolean,
  date,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { HUNTING_GROUP_STATUSES } from "./types";

export const huntingGroupStatusEnum = pgEnum("hunting_group_status", HUNTING_GROUP_STATUSES);

export const huntingGroupBookings = pgTable("hunting_group_bookings", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  status: huntingGroupStatusEnum("status").notNull().default("inquiry"),
  groupName: varchar("groupName", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 50 }),
  mailingStreet: varchar("mailingStreet", { length: 255 }),
  mailingCity: varchar("mailingCity", { length: 120 }),
  mailingState: varchar("mailingState", { length: 50 }),
  mailingZip: varchar("mailingZip", { length: 20 }),
  arrivalDate: date("arrivalDate"),
  departureDate: date("departureDate"),
  partySize: integer("partySize"),
  /** waterfowl | upland | whitetail | turkey | fishing | other */
  species: text("species").array().notNull().default([]),
  /** hunting_properties.id */
  propertyIds: integer("propertyIds").array().notNull().default([]),
  /** users.id of the guides (staff) */
  guideUserIds: varchar("guideUserIds", { length: 36 }).array().notNull().default([]),
  lodgingRequired: boolean("lodgingRequired").notNull().default(false),
  lodgingNotes: text("lodgingNotes"),
  mealsRequired: boolean("mealsRequired").notNull().default(false),
  cateringNotes: text("cateringNotes"),
  licensesConfirmed: boolean("licensesConfirmed").notNull().default(false),
  /** members.id when a member is hosting the group */
  linkedMemberId: integer("linkedMemberId"),
  contractValue: decimal("contractValue", { precision: 10, scale: 2 }),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }),
  depositReceivedDate: date("depositReceivedDate"),
  balanceDueDate: date("balanceDueDate"),
  balanceReceivedDate: date("balanceReceivedDate"),
  source: varchar("source", { length: 50 }).default("website"),
  referredBy: varchar("referredBy", { length: 255 }),
  repeatClient: boolean("repeatClient").notNull().default(false),
  assignedUserId: varchar("assignedUserId", { length: 36 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("hgb_status_idx").on(t.status),
  index("hgb_arrival_date_idx").on(t.arrivalDate),
  index("hgb_contact_email_idx").on(t.contactEmail),
  index("hgb_created_at_idx").on(t.createdAt),
]);

export type HuntingGroupBooking = typeof huntingGroupBookings.$inferSelect;
export type InsertHuntingGroupBooking = typeof huntingGroupBookings.$inferInsert;
