-- Add discrete capacity fields to hunting_properties
-- Replaces the legacy single maxHunters field with four capacity types

ALTER TABLE hunting_properties
ADD COLUMN IF NOT EXISTS "maxDeerHunters" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "maxWaterfowlHunters" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "maxUplandHunters" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "maxGuests" integer DEFAULT 0;

-- Backfill maxDeerHunters from maxHunters where it looks like a deer property
UPDATE hunting_properties
SET "maxDeerHunters" = "maxHunters"
WHERE "maxDeerHunters" = 0
  AND "maxHunters" > 0
  AND ("primaryActivity" = 'deer' OR "primaryActivity" LIKE '%deer%');

-- Backfill maxWaterfowlHunters from the old column if it exists
UPDATE hunting_properties
SET "maxWaterfowlHunters" = "maxWaterfowlHunters"
WHERE "maxWaterfowlHunters" IS NULL;

-- Note: Keep maxHunters and maxTotalPeople columns for backward compatibility,
-- but the app should now use the four discrete capacity fields instead.
