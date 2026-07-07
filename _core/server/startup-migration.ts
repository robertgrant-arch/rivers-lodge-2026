/**
 * Startup Schema Migration
 * ========================
 * Runs idempotent DDL statements before the tRPC server accepts requests.
 *
 * All columns/tables are derived from the Drizzle schema definition in
 * _core/db/property-booking-schema.ts and matched exactly.
 */
export async function runStartupMigration() {
  if (!process.env.DATABASE_URL) {
    console.warn("[startup-migration] DATABASE_URL not set — skipping schema migration");
    return;
  }

  try {
    // Dynamically import pg to avoid type resolution issues
    const pgModule = await import("pg");
    const Pool = pgModule.Pool;

    // Always enable SSL for Postgres connections (Render requires it).
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    try {
      console.log("[startup-migration] connecting to database...");
      const client = await pool.connect();

      try {
        console.log("[startup-migration] running idempotent ALTER TABLE ADD COLUMN IF NOT EXISTS...");

        // hunting_properties columns derived from property-booking-schema.ts
        const migration = `
          ALTER TABLE hunting_properties
          ADD COLUMN IF NOT EXISTS "shortName" varchar(40),
          ADD COLUMN IF NOT EXISTS "secondaryActivities" jsonb DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS "shortDescription" varchar(280),
          ADD COLUMN IF NOT EXISTS "acreage" numeric(8, 2),
          ADD COLUMN IF NOT EXISTS "maxDeerHunters" integer DEFAULT 0,
          ADD COLUMN IF NOT EXISTS "maxWaterfowlHunters" integer,
          ADD COLUMN IF NOT EXISTS "maxUplandHunters" integer DEFAULT 0,
          ADD COLUMN IF NOT EXISTS "maxGuests" integer DEFAULT 0,
          ADD COLUMN IF NOT EXISTS "maxTotalPeople" integer,
          ADD COLUMN IF NOT EXISTS "hasHeatedBlind" boolean DEFAULT false,
          ADD COLUMN IF NOT EXISTS "hasAtvAccess" boolean DEFAULT false,
          ADD COLUMN IF NOT EXISTS "hasWaterAccess" boolean DEFAULT false,
          ADD COLUMN IF NOT EXISTS "hasElectricity" boolean DEFAULT false,
          ADD COLUMN IF NOT EXISTS "hasCellService" boolean DEFAULT true,
          ADD COLUMN IF NOT EXISTS "bookingModes" jsonb DEFAULT '["AM","PM"]'::jsonb,
          ADD COLUMN IF NOT EXISTS "overnightEnabled" boolean DEFAULT true,
          ADD COLUMN IF NOT EXISTS "gpsLat" numeric(10, 7),
          ADD COLUMN IF NOT EXISTS "gpsLng" numeric(10, 7),
          ADD COLUMN IF NOT EXISTS "locationNotes" varchar(300),
          ADD COLUMN IF NOT EXISTS "coverImageUrl" varchar(500),
          ADD COLUMN IF NOT EXISTS "mapImageUrl" varchar(500),
          ADD COLUMN IF NOT EXISTS "mapUrl" varchar(500),
          ADD COLUMN IF NOT EXISTS "gateCode" varchar(255),
          ADD COLUMN IF NOT EXISTS "featuredOnPublicSite" boolean DEFAULT true,
          ADD COLUMN IF NOT EXISTS "sortOrder" integer DEFAULT 0;
        `;
        await client.query(migration);

        // Backfill new capacity columns from legacy columns (idempotent — only backfills when new value is 0/null)
        const backfillMigration = `
          UPDATE hunting_properties
          SET
            "maxDeerHunters" = CASE WHEN "maxDeerHunters" = 0 OR "maxDeerHunters" IS NULL THEN COALESCE("maxHunters", 0) ELSE "maxDeerHunters" END,
            "maxGuests" = CASE WHEN "maxGuests" = 0 OR "maxGuests" IS NULL THEN COALESCE("maxHunters", 0) ELSE "maxGuests" END
          WHERE ("maxDeerHunters" = 0 OR "maxDeerHunters" IS NULL)
            AND ("maxHunters" IS NOT NULL AND "maxHunters" > 0);
        `;
        await client.query(backfillMigration);

        // property_activity enum + property_activities join table (idempotent).
        // Create enum type if missing, then table if missing. Both are safe to re-run.
        const activitiesMigration = `
          DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_activity') THEN
              CREATE TYPE property_activity AS ENUM (
                'deer','duck','turkey','quail','dove','hog','bass','catfish','crappie','mixed_hunt','mixed_fish','hunt_and_fish'
              );
            END IF;
          END $$;

          CREATE TABLE IF NOT EXISTS property_activities (
            "propertyId" integer NOT NULL REFERENCES hunting_properties(id) ON DELETE CASCADE,
            "activity" property_activity NOT NULL,
            PRIMARY KEY ("propertyId", "activity")
          );
        `;
        await client.query(activitiesMigration);

        // Make primaryActivity column nullable (idempotent — dropping NOT NULL constraint if it exists)
        const primaryActivityMigration = `
          ALTER TABLE hunting_properties
          ALTER COLUMN "primaryActivity" DROP NOT NULL;
        `;
        await client.query(primaryActivityMigration);

        // Clean up orphan test properties from failed create attempts
        // (one-time cleanup of: Test Alpha, Test Bravo, Test 1 Minimal, 69 highway, Test - delete me, etc.)
        const cleanupTestProperties = `
          DELETE FROM hunting_properties
          WHERE name ILIKE 'test%' OR name ILIKE '%delete%' OR name = '69 highway' OR slug LIKE 'test-%'
          AND id NOT IN (SELECT DISTINCT propertyId FROM property_bookings);
        `;
        const cleanupResult = await client.query(cleanupTestProperties);
        if ((cleanupResult.rowCount ?? 0) > 0) {
          console.log(`[startup-migration] 🧹 cleaned up ${cleanupResult.rowCount} orphan test properties`);
        }

        console.log("[startup-migration] ✅ schema migration completed successfully");
      } finally {
        client.release();
      }
    } finally {
      await pool.end();
    }
  } catch (error) {
    console.error("[startup-migration:error] schema migration failed (server will continue):");
    if (error instanceof Error) {
      console.error(`  message: ${error.message}`);
      if ((error as any).code) {
        console.error(`  code: ${(error as any).code}`);
      }
      console.error(`  stack: ${error.stack}`);
    } else {
      console.error(`  ${String(error)}`);
    }
  }
}

/**
 * Check if hunting_properties has all required columns
 * Used by GET /api/health/schema endpoint for diagnosing schema issues
 */
export async function checkHuntingPropertiesSchema() {
  if (!process.env.DATABASE_URL) {
    return { ok: false, missing: ["DATABASE_URL not set"] };
  }

  const expectedColumns = [
    "id", "name", "slug", "shortName", "type", "primaryActivity",
    "secondaryActivities", "description", "shortDescription", "acreage",
    "maxHunters", "maxDeerHunters", "maxWaterfowlHunters", "maxUplandHunters", "maxGuests", "maxTotalPeople",
    "hasHeatedBlind", "hasAtvAccess", "hasWaterAccess", "hasElectricity",
    "hasCellService", "bookingModes", "overnightEnabled",
    "gpsLat", "gpsLng", "locationNotes", "coverImageUrl", "mapImageUrl",
    "mapUrl", "gateCode", "active", "featuredOnPublicSite", "sortOrder",
    "createdAt", "updatedAt",
  ];

  try {
    const pgModule = await import("pg");
    const Pool = pgModule.Pool;

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'hunting_properties'
        `);
        const existingColumns = new Set(
          result.rows.map((r: any) => r.column_name)
        );
        const missing = expectedColumns.filter((col) => !existingColumns.has(col));

        // Also check property_activities table existence
        const activitiesResult = await client.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'property_activities'
        `);
        const activitiesCols = activitiesResult.rows.map((r: any) => r.column_name);
        const activitiesOk = activitiesCols.includes("propertyId") && activitiesCols.includes("activity");

        return {
          ok: missing.length === 0 && activitiesOk,
          missing: missing.length > 0 ? missing : undefined,
          actual: Array.from(existingColumns).sort(),
          propertyActivitiesTable: { ok: activitiesOk, columns: activitiesCols },
        };
      } finally {
        client.release();
      }
    } finally {
      await pool.end();
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
