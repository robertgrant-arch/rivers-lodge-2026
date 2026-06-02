import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Seasonal Updates ─────────────────────────────────────────────────────────

export const seasonalUpdates = mysqlTable("seasonal_updates", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  category: mysqlEnum("category", ["whitetail", "waterfowl", "turkey", "fishing", "general"]).default("general").notNull(),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SeasonalUpdate = typeof seasonalUpdates.$inferSelect;
export type InsertSeasonalUpdate = typeof seasonalUpdates.$inferInsert;
