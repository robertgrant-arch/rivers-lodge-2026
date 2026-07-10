/**
 * Apply SQL Migrations (boot-time)
 * ================================
 * Reads every *.sql file in _core/db/migrations/ in filename order and
 * applies any that have not yet been recorded in the _migrations_applied
 * tracking table.
 *
 * Runs AFTER runStartupMigration() so idempotent DDL from hunting_properties
 * still executes, but this is the authoritative source of truth for all
 * additive schema changes going forward (portal_blocked_dates, enums, etc.).
 *
 * Safe to re-run on every deploy: each file is applied at most once per DB.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function applySqlMigrations(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn("[apply-sql-migrations] DATABASE_URL not set \u2014 skipping");
    return;
  }

  // Resolve migrations directory. When bundled/transpiled, __dirname is not
  // reliable, so derive from import.meta.url when available, else fall back to
  // process.cwd().
  let migrationsDir: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const here = dirname(fileURLToPath((import.meta as any).url));
    migrationsDir = resolve(here, "..", "db", "migrations");
  } catch {
    migrationsDir = resolve(process.cwd(), "_core", "db", "migrations");
  }

  let files: string[];
  try {
    const entries = await readdir(migrationsDir);
    files = entries.filter((f) => f.endsWith(".sql")).sort();
  } catch (err) {
    console.warn(
      `[apply-sql-migrations] could not read ${migrationsDir}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return;
  }

  if (files.length === 0) {
    console.log("[apply-sql-migrations] no .sql files found; nothing to do");
    return;
  }

  const pgModule = await import("pg");
  const Pool = pgModule.Pool;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    try {
      // Ensure tracking table exists.
      await client.query(`
        CREATE TABLE IF NOT EXISTS _migrations_applied (
          filename varchar(255) PRIMARY KEY,
          applied_at timestamp NOT NULL DEFAULT now()
        );
      `);

      const appliedRes = await client.query<{ filename: string }>(
        `SELECT filename FROM _migrations_applied`
      );
      const applied = new Set(appliedRes.rows.map((r) => r.filename));

      for (const file of files) {
        if (applied.has(file)) {
          continue;
        }
        const fullPath = join(migrationsDir, file);
        const sql = await readFile(fullPath, "utf8");
        console.log(`[apply-sql-migrations] applying ${file}...`);
        try {
          await client.query("BEGIN");
          await client.query(sql);
          await client.query(
            `INSERT INTO _migrations_applied (filename) VALUES ($1)
             ON CONFLICT (filename) DO NOTHING`,
            [file]
          );
          await client.query("COMMIT");
          console.log(`[apply-sql-migrations] \u2705 ${file}`);
        } catch (err) {
          await client.query("ROLLBACK").catch(() => undefined);
          console.error(
            `[apply-sql-migrations:error] failed on ${file}: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
          if (err instanceof Error && (err as any).code) {
            console.error(`  pg code: ${(err as any).code}`);
          }
          // Continue to next file rather than aborting boot.
        }
      }

      console.log("[apply-sql-migrations] done");
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
