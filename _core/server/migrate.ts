/**
 * Drizzle Migration Runner
 * ========================
 * Runs pending migrations on app startup using drizzle-orm's migrate function.
 * Ensures database schema is up-to-date before the server starts handling requests.
 */

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Migrations] Database unavailable — skipping migrations");
      return;
    }

    const migrationsFolder = path.join(__dirname, "..", "db", "migrations");
    console.log(`[Migrations] Running migrations from ${migrationsFolder}...`);

    // Run migrations using drizzle-orm's migrate function
    await migrate(db, {
      migrationsFolder,
    } as any);

    console.log("[Migrations] ✅ All migrations completed successfully");
  } catch (error: any) {
    console.error("[Migrations] ❌ Migration failed:", error.message);
    // Log the full error for debugging
    if (error.stack) {
      console.error(error.stack);
    }
    // In production, we could either:
    // 1. Throw and crash the app (strict mode)
    // 2. Log and continue (graceful degradation)
    // For now, we throw to ensure the app doesn't start with an incomplete schema.
    throw error;
  }
}
