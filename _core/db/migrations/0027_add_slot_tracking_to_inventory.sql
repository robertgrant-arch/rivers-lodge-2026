-- Migration 0027: Add per-slot tracking to property_date_inventory
-- Tracks AM, PM, ALL_DAY, and OVERNIGHT bookings separately

-- Add slot booking count columns
ALTER TABLE property_date_inventory
  ADD COLUMN IF NOT EXISTS "amBookedCount" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pmBookedCount" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "allDayBookedCount" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "overnightBookedCount" integer NOT NULL DEFAULT 0;

-- Backfill slot counts from property_bookings
-- For each date in each booking, increment the appropriate slot counter based on timeSlot
DO $$
DECLARE
  booking RECORD;
  current_date DATE;
BEGIN
  -- Iterate over all bookings with confirmed or pending_approval status
  FOR booking IN
    SELECT id, "propertyId", "startDate", "endDate", "timeSlot"
    FROM property_bookings
    WHERE status IN ('confirmed', 'pending_approval')
  LOOP
    -- For each date in the booking range
    current_date := booking."startDate";
    WHILE current_date <= booking."endDate" LOOP
      -- Upsert inventory row and increment the correct slot counter
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
        current_date,
        0, -- capacity will be set later; we only increment counters here
        0,
        CASE WHEN booking."timeSlot" = 'AM' THEN 1 ELSE 0 END,
        CASE WHEN booking."timeSlot" = 'PM' THEN 1 ELSE 0 END,
        CASE WHEN booking."timeSlot" = 'ALL_DAY' THEN 1 ELSE 0 END,
        CASE WHEN booking."timeSlot" = 'OVERNIGHT' THEN 1 ELSE 0 END,
        'open',
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
        version = property_date_inventory.version + 1,
        "updatedAt" = EXTRACT(EPOCH FROM NOW())::bigint;

      current_date := current_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;
END $$;

-- Recalculate status for all inventory rows based on new slot-aware logic
UPDATE property_date_inventory
SET status = CASE
  -- Full: ALL_DAY or OVERNIGHT exists, OR both AM and PM are at capacity
  WHEN "allDayBookedCount" > 0 OR "overnightBookedCount" > 0 THEN 'full'
  WHEN "amBookedCount" >= capacity AND "pmBookedCount" >= capacity THEN 'full'
  -- Partial: any booking exists
  WHEN "amBookedCount" > 0 OR "pmBookedCount" > 0 THEN 'partial'
  -- Open: no bookings
  ELSE 'open'
END,
version = version + 1,
"updatedAt" = EXTRACT(EPOCH FROM NOW())::bigint;

-- Create indexes on slot columns for efficient queries
CREATE INDEX IF NOT EXISTS pdi_ambookedcount_idx ON property_date_inventory("amBookedCount");
CREATE INDEX IF NOT EXISTS pdi_pmbookedcount_idx ON property_date_inventory("pmBookedCount");
CREATE INDEX IF NOT EXISTS pdi_alldaybookedcount_idx ON property_date_inventory("allDayBookedCount");
CREATE INDEX IF NOT EXISTS pdi_overnightbookedcount_idx ON property_date_inventory("overnightBookedCount");
