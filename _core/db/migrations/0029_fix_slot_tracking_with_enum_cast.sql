-- Migration 0029: Fix slot tracking with proper ENUM casting
-- Fixes production failure where status column is inventory_status ENUM
-- Works on partially-migrated state (0027 & 0028 may have failed)
--
-- Key changes:
--   1. Casts ALL status assignments to ::inventory_status
--   2. Doesn't depend on 0027 or 0028 succeeding
--   3. Handles both INSERT and UPDATE with proper type casting

-- Ensure all four slot columns exist (IF NOT EXISTS in case partial failures)
ALTER TABLE property_date_inventory
  ADD COLUMN IF NOT EXISTS "amBookedCount" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pmBookedCount" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "allDayBookedCount" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "overnightBookedCount" integer NOT NULL DEFAULT 0;

-- Reset all slot counters and bookedCount to 0 for idempotency
UPDATE property_date_inventory
SET "amBookedCount" = 0,
    "pmBookedCount" = 0,
    "allDayBookedCount" = 0,
    "overnightBookedCount" = 0,
    "bookedCount" = 0,
    version = version + 1,
    "updatedAt" = EXTRACT(EPOCH FROM NOW())::bigint;

-- Backfill slot counts from property_bookings with correct capacity
-- Uses loop_date (not reserved) and sources real capacity from hunting_properties
-- CRITICAL: Cast status values to ::inventory_status to match ENUM type
DO $$
DECLARE
  booking RECORD;
  loop_date DATE;
  prop_capacity INTEGER;
  calculated_status inventory_status;
BEGIN
  -- Iterate over all bookings with confirmed or pending_approval status
  FOR booking IN
    SELECT pb.id, pb."propertyId", pb."startDate", pb."endDate", pb."timeSlot"
    FROM property_bookings pb
    WHERE pb.status IN ('confirmed', 'pending_approval')
  LOOP
    -- Get property capacity (use maxHunters as the per-slot capacity, default to 1)
    SELECT COALESCE(hp."maxHunters", 1)
    INTO prop_capacity
    FROM hunting_properties hp
    WHERE hp.id = booking."propertyId";

    -- For each date in the booking range
    loop_date := booking."startDate";
    WHILE loop_date <= booking."endDate" LOOP
      -- Upsert inventory row with correct capacity and increment the correct slot counter
      INSERT INTO property_date_inventory (
        "propertyId",
        date,
        capacity,
        "bookedCount",
        "amBookedCount",
        "pmBookedCount",
        "allDayBookedCount",
        "overnightBookedCount",
        status,
        version,
        "updatedAt"
      )
      VALUES (
        booking."propertyId",
        loop_date,
        COALESCE(prop_capacity, 1),
        0,
        CASE WHEN booking."timeSlot" = 'AM' THEN 1 ELSE 0 END,
        CASE WHEN booking."timeSlot" = 'PM' THEN 1 ELSE 0 END,
        CASE WHEN booking."timeSlot" = 'ALL_DAY' THEN 1 ELSE 0 END,
        CASE WHEN booking."timeSlot" = 'OVERNIGHT' THEN 1 ELSE 0 END,
        'open'::inventory_status,
        0,
        EXTRACT(EPOCH FROM NOW())::bigint
      )
      ON CONFLICT ("propertyId", date) DO UPDATE SET
        "amBookedCount" = property_date_inventory."amBookedCount" +
          CASE WHEN booking."timeSlot" = 'AM' THEN 1 ELSE 0 END,
        "pmBookedCount" = property_date_inventory."pmBookedCount" +
          CASE WHEN booking."timeSlot" = 'PM' THEN 1 ELSE 0 END,
        "allDayBookedCount" = property_date_inventory."allDayBookedCount" +
          CASE WHEN booking."timeSlot" = 'ALL_DAY' THEN 1 ELSE 0 END,
        "overnightBookedCount" = property_date_inventory."overnightBookedCount" +
          CASE WHEN booking."timeSlot" = 'OVERNIGHT' THEN 1 ELSE 0 END,
        "bookedCount" = property_date_inventory."bookedCount" + 1,
        capacity = COALESCE(prop_capacity, 1),
        version = property_date_inventory.version + 1,
        "updatedAt" = EXTRACT(EPOCH FROM NOW())::bigint;

      loop_date := loop_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;
END $$;

-- Recalculate status for all inventory rows based on corrected slot-aware logic
-- CRITICAL: Cast all status values to ::inventory_status ENUM type
UPDATE property_date_inventory
SET status = CASE
  -- Full: ALL_DAY or OVERNIGHT exists
  WHEN "allDayBookedCount" > 0 OR "overnightBookedCount" > 0 THEN 'full'::inventory_status
  -- Full: both AM and PM at capacity (but NOT if capacity is 0/unknown)
  WHEN capacity > 0 AND "amBookedCount" >= capacity AND "pmBookedCount" >= capacity THEN 'full'::inventory_status
  -- Partial: any slot booking exists
  WHEN "amBookedCount" > 0 OR "pmBookedCount" > 0 THEN 'partial'::inventory_status
  -- Open: no bookings
  ELSE 'open'::inventory_status
END,
version = version + 1,
"updatedAt" = EXTRACT(EPOCH FROM NOW())::bigint;

-- Ensure indexes exist on slot columns for efficient queries
CREATE INDEX IF NOT EXISTS pdi_ambookedcount_idx ON property_date_inventory("amBookedCount");
CREATE INDEX IF NOT EXISTS pdi_pmbookedcount_idx ON property_date_inventory("pmBookedCount");
CREATE INDEX IF NOT EXISTS pdi_alldaybookedcount_idx ON property_date_inventory("allDayBookedCount");
CREATE INDEX IF NOT EXISTS pdi_overnightbookedcount_idx ON property_date_inventory("overnightBookedCount");
