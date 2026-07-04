import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Activities ───────────────────────────────────────────────────────────────
// Catalog of available activities (deer, duck, turkey, etc.)

export const activities = pgTable("activities", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  key: varchar("key", { length: 50 }).unique().notNull(), // "deer", "duck", "turkey", etc.
  label: varchar("label", { length: 100 }).notNull(), // "Deer Hunting", "Duck Hunting", etc.
  icon: varchar("icon", { length: 50 }), // lucide icon name
  sortOrder: integer("sort_order").default(0),
  active: boolean("active").default(true),
});

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;

// ─── Slot Templates ───────────────────────────────────────────────────────────
// Time slot templates (AM, PM, Overnight)

export const slotTemplates = pgTable("slot_templates", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  key: varchar("key", { length: 50 }).unique().notNull(), // "am", "pm", "overnight"
  label: varchar("label", { length: 100 }).notNull(), // "Morning (5am-12pm)", etc.
  startTime: time("start_time").notNull(), // "05:00"
  endTime: time("end_time").notNull(), // "12:00"
  spansMultipleDays: integer("spans_days").default(0), // 0 = single day, 1 = overnight (spans next day)
  active: boolean("active").default(true),
});

export type SlotTemplate = typeof slotTemplates.$inferSelect;
export type InsertSlotTemplate = typeof slotTemplates.$inferInsert;

// ─── Properties ───────────────────────────────────────────────────────────────
// Hunt/fish properties (stands, blinds, zones, ponds, etc.)

export const properties = pgTable("properties", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  type: varchar("type", { length: 50 }).notNull(), // "stand", "blind", "field", "pond", etc.
  primaryActivity: varchar("primary_activity", { length: 50 }), // References activities.key
  description: text("description"),
  shortDescription: varchar("short_description", { length: 255 }),
  acreage: integer("acreage"), // stored as integer (cents)
  maxHunters: integer("max_hunters").default(2),
  hasHeatedBlind: boolean("has_heated_blind").default(false),
  hasAtvAccess: boolean("has_atv_access").default(false),
  hasWaterAccess: boolean("has_water_access").default(false),
  hasElectricity: boolean("has_electricity").default(false),
  hasCellService: boolean("has_cell_service").default(true),
  gpsLat: integer("gps_lat"), // stored as integer (microdegrees)
  gpsLng: integer("gps_lng"), // stored as integer (microdegrees)
  locationNotes: text("location_notes"),
  autoApprove: boolean("auto_approve").default(true),
  overnightExclusive: boolean("overnight_exclusive").default(false),
  advanceNoticeHours: integer("advance_notice_hours").default(0),
  active: boolean("active").default(true),
  featuredOnPublicSite: boolean("featured_on_public_site").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

// ─── Property Activities (Join) ────────────────────────────────────────────────
// Link which activities are available at each property (many-to-many)

export const propertyActivities = pgTable(
  "property_activities",
  {
    propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    activityId: integer("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: [t.propertyId, t.activityId],
  }),
);

export type PropertyActivity = typeof propertyActivities.$inferSelect;
export type InsertPropertyActivity = typeof propertyActivities.$inferInsert;

// ─── Property Slots (Per-Property Slot Config) ────────────────────────────────
// Enable/disable specific slot templates per property, with overrides

export const propertySlots = pgTable(
  "property_slots",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    slotTemplateId: integer("slot_template_id").notNull().references(() => slotTemplates.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").default(true),
    autoApprove: boolean("auto_approve"), // null = inherit from property.autoApprove
    maxParty: integer("max_party"), // null = inherit from property.maxHunters
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (t) => ({
    // Ensure no duplicate slot template per property
    unique: uniqueIndex().on(t.propertyId, t.slotTemplateId),
  }),
);

export type PropertySlot = typeof propertySlots.$inferSelect;
export type InsertPropertySlot = typeof propertySlots.$inferInsert;
