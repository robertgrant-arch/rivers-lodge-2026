/**
 * Startup Schema Migration
 * ========================
 * Runs idempotent ALTER TABLE ADD COLUMN IF NOT EXISTS statements
 * before the tRPC server accepts requests.
 *
 * All columns are derived from the Drizzle schema definition in
 * _core/db/property-booking-schema.ts and matched exactly.
 */

export async function runStartupMigration() {
  if (!process.env.DATABASE_URL) {
    console.warn("[startup-migration] DATABASE_URL not set — skipping schema migration");
    return;
  }

  try {
    // Dynamically import pg to avoid type resolution issues
    // @ts-expect-error pg module installed at runtime
    const pgModule = await import("pg");
    const Pool = pgModule.Pool;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
          ADD COLUMN IF NOT EXISTS "maxWaterfowlHunters" integer,
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
        console.log("[startup-migration] ✅ schema migration completed successfully");
      } finally {
        client.release();
      }
    } finally {
      await pool.end();
    }
  } catch (error) {
    // Log the error prominently but don't block server startup
    console.error("[startup-migration] ⚠️  schema migration error (server will continue):");
    if (error instanceof Error) {
      console.error(`  ${error.message}`);
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
    "maxHunters", "maxWaterfowlHunters", "maxTotalPeople",
    "hasHeatedBlind", "hasAtvAccess", "hasWaterAccess", "hasElectricity",
    "hasCellService", "bookingModes", "overnightEnabled",
    "gpsLat", "gpsLng", "locationNotes", "coverImageUrl", "mapImageUrl",
    "mapUrl", "gateCode", "active", "featuredOnPublicSite", "sortOrder",
    "createdAt", "updatedAt",
  ];

  try {
    // @ts-expect-error pg module installed at runtime
    const pgModule = await import("pg");
    const Pool = pgModule.Pool;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'hunting_properties'
        `);

        const existingColumns = new Set(
          result.rows.map((r: any) => r.column_name)
        );
        const missing = expectedColumns.filter((col) => !existingColumns.has(col));

        return {
          ok: missing.length === 0,
          missing: missing.length > 0 ? missing : undefined,
          actual: Array.from(existingColumns).sort(),
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
