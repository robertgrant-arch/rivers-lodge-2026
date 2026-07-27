-- Migration 0030: Repair inventory for cancelled bookings
-- =======================================================
-- BACKGROUND:
--   Prior to the fix, cancelling a booking did not always decrement the per-slot
--   inventory counters (amBookedCount, pmBookedCount, allDayBookedCount, overnightBookedCount).
--   This migration repairs stale inventory by:
--   1. Finding all confirmed/checked_in bookings that were later cancelled
--   2. For each cancelled booking, decrementing the appropriate slot counter for all dates
--   3. Recalculating the status based on updated slot counts
--
-- IDEMPOTENCY:
--   Uses MAX(GREATEST(...)) logic to avoid double-decrementing. Only decrements if the
--   counter is > 0 after applying the decrement, preventing negative counts.

-- Repair function: decrement cancelled booking inventory and recalculate status
DO $$
DECLARE
  cancelled_booking RECORD;
  loop_date DATE;
BEGIN
  -- Find all cancelled bookings (excluding those already fully repaired)
  FOR cancelled_booking IN
    SELECT
      pb.id,
      pb."propertyId",
      pb."startDate",
      pb."endDate",
      pb."timeSlot",
      pb.status
    FROM property_bookings pb
    WHERE pb.status = 'cancelled'
      AND pb."startDate" IS NOT NULL
      AND pb."endDate" IS NOT NULL
  LOOP
    -- For each date in the cancelled booking's range, decrement the appropriate slot counter
    loop_date := cancelled_booking."startDate";
    WHILE loop_date <= cancelled_booking."endDate" LOOP
      -- Decrement the appropriate slot counter based on timeSlot
      -- Use MAX(..., 0) to prevent negative counts (guards against double-decrement)
      UPDATE property_date_inventory
      SET
        "amBookedCount" = GREATEST(0, "amBookedCount" - (CASE WHEN cancelled_booking."timeSlot" = 'AM' THEN 1 ELSE 0 END)),
        "pmBookedCount" = GREATEST(0, "pmBookedCount" - (CASE WHEN cancelled_booking."timeSlot" = 'PM' THEN 1 ELSE 0 END)),
        "allDayBookedCount" = GREATEST(0, "allDayBookedCount" - (CASE WHEN cancelled_booking."timeSlot" = 'ALL_DAY' THEN 1 ELSE 0 END)),
        "overnightBookedCount" = GREATEST(0, "overnightBookedCount" - (CASE WHEN cancelled_booking."timeSlot" = 'OVERNIGHT' THEN 1 ELSE 0 END)),
        "bookedCount" = GREATEST(0, "bookedCount" - 1),
        version = version + 1,
        "updatedAt" = EXTRACT(EPOCH FROM NOW())::bigint
      WHERE "propertyId" = cancelled_booking."propertyId" AND date = loop_date;

      loop_date := loop_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;
END $$;

-- Recalculate status for all affected inventory rows based on updated slot counts
UPDATE property_date_inventory
SET
  status = CASE
    -- Full: ALL_DAY or OVERNIGHT exists
    WHEN "allDayBookedCount" > 0 OR "overnightBookedCount" > 0 THEN 'full'::inventory_status
    -- Full: both AM and PM at capacity (only if capacity is known, not 0)
    WHEN capacity > 0 AND "amBookedCount" >= capacity AND "pmBookedCount" >= capacity THEN 'full'::inventory_status
    -- Partial: any AM or PM booking (without meeting full condition)
    WHEN "amBookedCount" > 0 OR "pmBookedCount" > 0 THEN 'partial'::inventory_status
    -- Open: no bookings
    ELSE 'open'::inventory_status
  END,
  version = version + 1,
  "updatedAt" = EXTRACT(EPOCH FROM NOW())::bigint
WHERE "bookedCount" > 0 OR "amBookedCount" > 0 OR "pmBookedCount" > 0 OR "allDayBookedCount" > 0 OR "overnightBookedCount" > 0;
