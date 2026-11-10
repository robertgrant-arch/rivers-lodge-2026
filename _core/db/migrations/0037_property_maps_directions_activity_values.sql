-- ═══════════════════════════════════════════════════════════════════════════════
-- 0037 — Property maps & directions; approved activity values
-- ═══════════════════════════════════════════════════════════════════════════════
-- Additive only. No existing values are changed or removed.
--
-- 1. hunting_properties."directionsUrl": Google/Apple Maps link shown as
--    "Get Directions" on the member property page.
-- 2. Make sure the approved activity keys (waterfowl, fishing, camping, hiking,
--    shooting_permitted, upland_hunting, side_by_side_permitted) can be stored:
--    - property_activities.activity: only matters if the column is the
--      property_activity enum (Drizzle-created DBs); if it is varchar(50)
--      (migration 0008) nothing is needed.
--    - property_bookings.activity (property_booking_activity enum): new bookings
--      record the activity the member picked. Existing bookings are untouched.
-- 3. property_image_type gets 'map' if it is somehow missing (it is in the
--    Drizzle schema); maps are stored as property_images rows of type 'map'.
--
-- New enum values are not used in this file (Postgres requires the transaction
-- that adds them to commit first); 0038 is the first file that uses 'map'.
-- Requires PostgreSQL 12+ (ALTER TYPE … ADD VALUE inside a transaction).
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE hunting_properties ADD COLUMN IF NOT EXISTS "directionsUrl" varchar(500);

DO $$
DECLARE
  v text;
  approved text[] := ARRAY['waterfowl','fishing','camping','hiking','shooting_permitted','upland_hunting','side_by_side_permitted'];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_activity') THEN
    FOREACH v IN ARRAY approved LOOP
      EXECUTE format('ALTER TYPE property_activity ADD VALUE IF NOT EXISTS %L', v);
    END LOOP;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_booking_activity') THEN
    FOREACH v IN ARRAY approved LOOP
      EXECUTE format('ALTER TYPE property_booking_activity ADD VALUE IF NOT EXISTS %L', v);
    END LOOP;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_image_type') THEN
    ALTER TYPE property_image_type ADD VALUE IF NOT EXISTS 'map';
  END IF;
END $$;
