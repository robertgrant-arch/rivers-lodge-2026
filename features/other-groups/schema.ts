// ─── Other Groups — DB schema ─────────────────────────────────────────────────
// Family, social and other group bookings made through ops (modelled on
// hunting_group_bookings). Table created by
// _core/db/migrations/0043_other_group_bookings.sql.
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
import { OTHER_GROUP_EVENT_TYPES, OTHER_GROUP_STATUSES } from "./types";

export const otherGroupStatusEnum = pgEnum("other_group_status", OTHER_GROUP_STATUSES);
export const otherGroupEventTypeEnum = pgEnum("other_group_event_type", OTHER_GROUP_EVENT_TYPES);

export const otherGroupBookings = pgTable("other_group_bookings", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  status: otherGroupStatusEnum("status").notNull().default("inquiry"),
  groupName: varchar("groupName", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 50 }),
  mailingStreet: varchar("mailingStreet", { length: 255 }),
  mailingCity: varchar("mailingCity", { length: 120 }),
  mailingState: varchar("mailingState", { length: 50 }),
  mailingZip: varchar("mailingZip", { length: 20 }),
  eventType: otherGroupEventTypeEnum("eventType"),
  /** Free text, used when eventType = 'other'. */
  eventTypeOther: varchar("eventTypeOther", { length: 255 }),
  arrivalDate: date("arrivalDate"),
  departureDate: date("departureDate"),
  guestCount: integer("guestCount"),
  /** hunting_properties.id */
  propertyIds: integer("propertyIds").array().notNull().default([]),
  lodgingRequired: boolean("lodgingRequired").notNull().default(false),
  lodgingNotes: text("lodgingNotes"),
  mealsRequired: boolean("mealsRequired").notNull().default(false),
  cateringNotes: text("cateringNotes"),
  /** members.id when a member is hosting the group */
  hostingMemberId: integer("hostingMemberId"),
  source: varchar("source", { length: 50 }).default("website"),
  referredBy: varchar("referredBy", { length: 255 }),
  contractValue: decimal("contractValue", { precision: 10, scale: 2 }),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }),
  depositReceivedDate: date("depositReceivedDate"),
  balanceDueDate: date("balanceDueDate"),
  balanceReceivedDate: date("balanceReceivedDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("ogb_status_idx").on(t.status),
  index("ogb_arrival_date_idx").on(t.arrivalDate),
  index("ogb_event_type_idx").on(t.eventType),
  index("ogb_contact_email_idx").on(t.contactEmail),
  index("ogb_created_at_idx").on(t.createdAt),
]);

export type OtherGroupBooking = typeof otherGroupBookings.$inferSelect;
export type InsertOtherGroupBooking = typeof otherGroupBookings.$inferInsert;
