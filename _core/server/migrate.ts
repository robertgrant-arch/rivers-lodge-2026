/**
 * Database Migration Runner
 * ==========================
 * Runs pending SQL migrations on app startup.
 * Ensures database schema is up-to-date before the server starts handling requests.
 */

import { getDb } from "./db";
import path from "path";
import { fileURLToPath } from "url";
import { readdir, readFile } from "fs/promises";
import { sql } from "drizzle-orm";

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

    // Read all .sql files in the migrations folder
    const files = await readdir(migrationsFolder);
    const sqlFiles = files.filter(f => f.endsWith(".sql")).sort();

    if (sqlFiles.length === 0) {
      console.log("[Migrations] No migration files found");
      return;
    }

    // Execute each migration file
    for (const file of sqlFiles) {
      const filePath = path.join(migrationsFolder, file);
      const sqlContent = await readFile(filePath, "utf-8");

      console.log(`[Migrations] Running ${file}...`);

      // Execute the SQL directly
      await db.execute(sql.raw(sqlContent));

      console.log(`[Migrations]   ✓ ${file} completed`);
    }

    console.log("[Migrations] ✅ All migrations completed successfully");
  } catch (error: any) {
    console.error("[Migrations] ❌ Migration failed:", error.message);
    // Log the full error for debugging
    if (error.stack) {
      console.error(error.stack);
    }
    // In production, we crash the app to prevent silent data issues
    throw error;
  }
}
