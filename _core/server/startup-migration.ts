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

        // property_activity enum (idempotent).
        // property_activities table is managed by Drizzle and already exists with camelCase "propertyId".
        // Only create the enum type if missing.
        const activitiesMigration = `
          DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_activity') THEN
              CREATE TYPE property_activity AS ENUM (
                'deer','duck','turkey','quail','dove','hog','bass','catfish','crappie','mixed_hunt','mixed_fish','hunt_and_fish'
              );
            END IF;
          END $$;
        `;
        await client.query(activitiesMigration);

        // Make primaryActivity column nullable (idempotent — dropping NOT NULL constraint if it exists)
        const primaryActivityMigration = `
          ALTER TABLE hunting_properties
          ALTER COLUMN "primaryActivity" DROP NOT NULL;
        `;
        await client.query(primaryActivityMigration);

        // Skill-group access control migration: Create new tables for skill-group-only access model
        const skillGroupAccessMigration = `
          -- Create member_skill_groups join table if not exists
          CREATE TABLE IF NOT EXISTS member_skill_groups (
            member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
            skill_group_id INTEGER NOT NULL REFERENCES skill_groups(id) ON DELETE CASCADE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            PRIMARY KEY (member_id, skill_group_id)
          );

          CREATE INDEX IF NOT EXISTS msg_member_idx ON member_skill_groups(member_id);
          CREATE INDEX IF NOT EXISTS msg_skill_group_idx ON member_skill_groups(skill_group_id);

          -- Create skill_group_calendar_access table if not exists
          CREATE TABLE IF NOT EXISTS skill_group_calendar_access (
            id SERIAL PRIMARY KEY,
            skill_group_id INTEGER NOT NULL UNIQUE REFERENCES skill_groups(id) ON DELETE CASCADE,
            can_view_master_calendar BOOLEAN NOT NULL DEFAULT false,
            can_manage_master_calendar BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );

          CREATE UNIQUE INDEX IF NOT EXISTS sgca_skill_group_idx ON skill_group_calendar_access(skill_group_id);

          -- property_skill_group_access table is managed by Drizzle ORM (see features/membership/schema.ts)
          -- Do not create redundant DDL here to avoid schema conflicts.

          -- Drop legacy tier column if it exists
          ALTER TABLE members DROP COLUMN IF EXISTS tier;
          ALTER TABLE members DROP COLUMN IF EXISTS "roleId";
        `;
        await client.query(skillGroupAccessMigration);

        // Backfill member_skill_groups from existing members
        const backfillMembersSkillGroups = `
          -- For each member, ensure they have skill group assignments
          -- This is idempotent - only inserts if not already present
          INSERT INTO member_skill_groups (member_id, skill_group_id)
          SELECT DISTINCT m.id, sg.id
          FROM members m
          CROSS JOIN skill_groups sg
          WHERE NOT EXISTS (
            SELECT 1 FROM member_skill_groups msg
            WHERE msg.member_id = m.id AND msg.skill_group_id = sg.id
          )
          AND sg.name IN ('Designated', 'Silver', 'Social', 'Admin', 'Employee')
          AND m.active = true
          ON CONFLICT (member_id, skill_group_id) DO NOTHING;
        `;
        try {
          await client.query(backfillMembersSkillGroups);
        } catch (err) {
          console.log("[startup-migration] backfill member_skill_groups completed or skipped");
        }

        // Initialize skill_group_calendar_access with default settings
        const initCalendarAccess = `
          INSERT INTO skill_group_calendar_access (skill_group_id, can_view_master_calendar, can_manage_master_calendar)
          SELECT sg.id, sg.name = 'Admin', sg.name = 'Admin'
          FROM skill_groups sg
          WHERE NOT EXISTS (
            SELECT 1 FROM skill_group_calendar_access sgca
            WHERE sgca.skill_group_id = sg.id
          )
          ON CONFLICT (skill_group_id) DO NOTHING;
        `;
        try {
          await client.query(initCalendarAccess);
        } catch (err) {
          console.log("[startup-migration] initialize skill_group_calendar_access completed or skipped");
        }

        // Calendar access settings table for skill-group-based calendar visibility
        // Column names must match Drizzle schema (portal/schema.ts): camelCase "createdAt"/"updatedAt"
        const calendarAccessMigration = `
          CREATE TABLE IF NOT EXISTS calendar_access_settings (
            id SERIAL PRIMARY KEY,
            setting_key VARCHAR(255) UNIQUE NOT NULL,
            setting_value JSONB NOT NULL,
            "createdAt" TIMESTAMP DEFAULT NOW(),
            "updatedAt" TIMESTAMP DEFAULT NOW()
          );

          INSERT INTO calendar_access_settings (setting_key, setting_value)
          VALUES
            ('master_calendar_access', '{"Designated": true, "Silver": false, "Social": false, "Admin": true, "Employee": true}'::JSONB),
            ('property_calendar_access', '{}'::JSONB)
          ON CONFLICT (setting_key) DO NOTHING;

          -- Fix any existing tables created with wrong column names (snake_case)
          ALTER TABLE calendar_access_settings ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT NOW();
          ALTER TABLE calendar_access_settings ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();
        `;
        await client.query(calendarAccessMigration);

        // Clean up orphan test properties from failed create attempts
        // (one-time cleanup of: Test Alpha, Test Bravo, Test 1 Minimal, 69 highway, Test - delete me, etc.)
        const cleanupTestProperties = `
          DELETE FROM hunting_properties
          WHERE name ILIKE 'test%' OR name ILIKE '%delete%' OR name = '69 highway' OR slug LIKE 'test-%'
          AND id NOT IN (SELECT DISTINCT "propertyId" FROM property_bookings);
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
