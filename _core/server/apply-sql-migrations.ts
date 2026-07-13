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

  // ============================================================
  // RESOLVE MIGRATIONS DIRECTORY (robust, multi-candidate)
  // ============================================================
  // After esbuild bundling, __dirname and relative paths become unreliable.
  // Try multiple candidates and use the first one that exists.
  // Candidates:
  //   (a) sibling of import.meta.url + /db/migrations (bundled at dist/db)
  //   (b) __dirname + /../db/migrations (source layout _core/server → _core/db)
  //   (c) process.cwd() + /_core/db/migrations (source root)
  //   (d) process.cwd() + /dist/db/migrations (built artifact)

  const cwd = process.cwd();
  const importMetaUrl = (import.meta as any).url;
  const importMetaDirname = dirname(fileURLToPath(importMetaUrl));

  console.log("[apply-sql-migrations] cwd:", cwd);
  console.log("[apply-sql-migrations] import.meta.url:", importMetaUrl);

  const candidates = [
    join(importMetaDirname, "db", "migrations"),              // (a) sibling of bundled file
    resolve(importMetaDirname, "..", "db", "migrations"),     // (b) relative from current file
    resolve(cwd, "_core", "db", "migrations"),                // (c) source root
    resolve(cwd, "dist", "db", "migrations"),                 // (d) built artifact
  ];

  console.log("[apply-sql-migrations] candidates tried:", candidates);

  let migrationsDir: string | null = null;
  for (const candidate of candidates) {
    try {
      const stat = await import("node:fs/promises").then(fs => fs.stat(candidate));
      if (stat.isDirectory()) {
        migrationsDir = candidate;
        console.log("[apply-sql-migrations] resolved migrationsDir:", migrationsDir);
        break;
      }
    } catch {
      // Candidate doesn't exist; try next
    }
  }

  if (!migrationsDir) {
    const error = `[apply-sql-migrations:FATAL] No migrations directory found. Tried: ${candidates.join(", ")}`;
    console.error(error);
    process.exit(1);
  }

  let files: string[];
  try {
    const entries = await readdir(migrationsDir);
    files = entries.filter((f) => f.endsWith(".sql")).sort();
  } catch (err) {
    const error = `[apply-sql-migrations:FATAL] could not read ${migrationsDir}: ${
      err instanceof Error ? err.message : String(err)
    }`;
    console.error(error);
    process.exit(1);
  }

  if (files.length === 0) {
    const error = `[apply-sql-migrations:FATAL] no .sql files found in ${migrationsDir}`;
    console.error(error);
    process.exit(1);
  }

  console.log("[apply-sql-migrations] found", files.length, "migration files");

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
      const appliedFilenames = Array.from(applied).sort();
      const pending = files.filter((f) => !applied.has(f));

      console.log("[apply-sql-migrations] previously applied:", appliedFilenames.length > 0 ? appliedFilenames : "(none)");
      console.log("[apply-sql-migrations] pending:", pending.length > 0 ? pending : "(none)");

      let appliedCount = 0;
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
          appliedCount++;
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

      console.log(
        `[apply-sql-migrations] all migrations applied successfully (${appliedCount} pending executed, ${appliedFilenames.length} already applied)`
      );
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
