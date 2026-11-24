// ─── Stored files (database file storage) ─────────────────────────────────────
// Used by _core/server/storage.ts when the Forge storage service isn't
// configured (BUILT_IN_FORGE_API_URL / BUILT_IN_FORGE_API_KEY unset), so
// uploads still work on Render using only DATABASE_URL. Created by migration
// 0039_stored_files.sql. Files are served by _core/server/storageProxy.ts.
import { pgTable, varchar, integer, timestamp, customType } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const storedFiles = pgTable("stored_files", {
  key: varchar("key", { length: 600 }).primaryKey(),
  contentType: varchar("content_type", { length: 120 }).notNull(),
  size: integer("size").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type StoredFile = typeof storedFiles.$inferSelect;
