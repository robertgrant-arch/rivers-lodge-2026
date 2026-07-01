import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const updateCategoryEnum = pgEnum("update_category", ["whitetail", "waterfowl", "turkey", "fishing", "general"]);

export const seasonalUpdates = pgTable("seasonal_updates", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  category: updateCategoryEnum("category").notNull().default("general"),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SeasonalUpdate = typeof seasonalUpdates.$inferSelect;
export type InsertSeasonalUpdate = typeof seasonalUpdates.$inferInsert;
