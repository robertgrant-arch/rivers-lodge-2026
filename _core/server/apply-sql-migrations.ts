/**
 * Apply SQL Migrations (boot-time)
 * ================================
 * Reads every *.sql file in _core/db/migrations/ in filename order and
 * applies any that have not yet been recorded in the _migrations_applied
 * tracking table.
 *
 * CRITICAL: Fails hard on unexpected migration errors to prevent silent boot failures.
 * Known-superseded migrations are allowed to fail and logged separately.
 * Any other migration failure causes process.exit(1) immediately — boot does NOT continue.
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

// Migrations known to be superseded by later fixes
// These are allowed to fail during execution without aborting boot
// (Empty: all migrations now fail-fast on real errors, no exceptions)
const KNOWN_SUPERSEDED_MIGRATIONS = new Set<string>();

export async function applySqlMigrations(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn("[apply-sql-migrations] DATABASE_URL not set \u2014 skipping");
    return;
  }

    // ============================================================
  // INLINE IDEMPOTENT DDL (runs before any .sql file processing)
  // ============================================================
  // Guarantees portal_blocked_dates has the columns the Drizzle schema
  // expects for the calendar Save Event flow, regardless of whether the
  // .sql migration files can be applied cleanly. Uses ADD COLUMN IF NOT
  // EXISTS so this is safe to run on every boot.
  try {
    const pgModuleEarly = await import("pg");
    const PoolEarly = pgModuleEarly.Pool;
    const earlyPool = new PoolEarly({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    try {
      const earlyClient = await earlyPool.connect();
      try {
        console.log("[apply-sql-migrations] inline DDL: ensuring portal_blocked_dates columns");
        // Ensure the portal_event_kind enum exists (used by "kind" column).
        await earlyClient.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'portal_event_kind') THEN
              CREATE TYPE portal_event_kind AS ENUM (
                'blocked','wedding','corporate','hunt','fish','other'
              );
            END IF;
          END $$;
        `);
        // Ensure the base table exists (no-op if it already does).
        await earlyClient.query(`
          CREATE TABLE IF NOT EXISTS portal_blocked_dates (
            id serial PRIMARY KEY
          );
        `);
        // Idempotently add every column the router insert references.
        await earlyClient.query(`
          ALTER TABLE portal_blocked_dates
            ADD COLUMN IF NOT EXISTS "startDate" date,
            ADD COLUMN IF NOT EXISTS "endDate" date,
            ADD COLUMN IF NOT EXISTS "title" varchar(255),
            ADD COLUMN IF NOT EXISTS "kind" portal_event_kind DEFAULT 'blocked',
            ADD COLUMN IF NOT EXISTS "startAt" timestamp,
            ADD COLUMN IF NOT EXISTS "endAt" timestamp,
            ADD COLUMN IF NOT EXISTS "allDay" boolean DEFAULT true,
            ADD COLUMN IF NOT EXISTS "reason" varchar(64),
            ADD COLUMN IF NOT EXISTS "reasonNotes" text,
            ADD COLUMN IF NOT EXISTS "scope" varchar(32),
            ADD COLUMN IF NOT EXISTS "scopeTarget" varchar(64),
            ADD COLUMN IF NOT EXISTS "createdByUserId" varchar(64),
            ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now();
        `);
        console.log("[apply-sql-migrations] inline DDL: portal_blocked_dates ready \u2705");
      } finally {
        earlyClient.release();
      }
    } finally {
      await earlyPool.end();
    }
  } catch (err) {
    console.error(
      `[apply-sql-migrations:error] inline DDL failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    if (err instanceof Error && (err as any).code) {
      console.error(`  pg code: ${(err as any).code}`);
    }
    // Continue \u2014 the file-based migrator below may still succeed.
  }

  // Resolve migrations directory. When bundled/transpiled to dist/, import.meta.url
  // points to the compiled dist location, so we resolve relative to that.
  // The build copies _core/db → dist/db, so migrations are at dist/db/migrations.
  let migrationsDir: string;
  try {
    const here = dirname(fileURLToPath((import.meta as any).url));
    // In bundled context, 'here' is the directory containing the compiled app.js.
    // Resolve relative to that directory (e.g., /dist → /dist/db/migrations).
    migrationsDir = resolve(here, "db", "migrations");
  } catch {
    // Fallback for development: resolve from project root.
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

      let succeeded = 0;
      let superseded = 0;
      let failed = 0;

      for (const file of files) {
        if (applied.has(file)) {
          continue;
        }
        const fullPath = join(migrationsDir, file);
        const sql = await readFile(fullPath, "utf8");
        const isSuperseded = KNOWN_SUPERSEDED_MIGRATIONS.has(file);

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
          succeeded++;
        } catch (err) {
          await client.query("ROLLBACK").catch(() => undefined);
          if (isSuperseded) {
            console.warn(
              `[apply-sql-migrations] \u26a0\ufe0f  ${file} failed (known to be superseded, continuing)`
            );
            console.warn(
              `[apply-sql-migrations]    ${
                err instanceof Error ? err.message : String(err)
              }`
            );
            if (err instanceof Error && (err as any).code) {
              console.warn(`[apply-sql-migrations]    pg code: ${(err as any).code}`);
            }
            superseded++;
          } else {
            console.error(
              `[apply-sql-migrations:error] unexpected migration failure on ${file}:`
            );
            console.error(
              `  ${err instanceof Error ? err.message : String(err)}`
            );
            if (err instanceof Error && (err as any).code) {
              console.error(`  pg code: ${(err as any).code}`);
            }
            failed++;
          }
        }
      }

      console.log(
        `[apply-sql-migrations] results: ${succeeded} succeeded, ${superseded} superseded, ${failed} failed`
      );

      if (failed > 0) {
        console.error(
          `[apply-sql-migrations] ABORT: ${failed} unexpected migration failure(s) \u2014 boot aborted`
        );
        process.exit(1);
      }

      if (superseded > 0) {
        console.warn(
          `[apply-sql-migrations] \u26a0\ufe0f  ${superseded} superseded migration(s) skipped \u2014 proceeding with caution`
        );
      }

      console.log("[apply-sql-migrations] done");
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
