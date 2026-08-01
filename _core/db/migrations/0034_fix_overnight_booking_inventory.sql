-- Migration 0034: Fix OVERNIGHT booking inventory miscount
-- Fixes misallocated OVERNIGHT bookings that were being counted as PM/AM/ALL_DAY
-- instead of overnightBookedCount, causing days to incorrectly show as "full"
--
-- Root cause: booking creation logic remapped OVERNIGHT to PM (first date),
-- ALL_DAY (middle dates), AM (last date) instead of using overnightBookedCount.
-- This migration corrects all existing OVERNIGHT bookings to use proper counters.

DO $$
DECLARE
  booking RECORD;
  loop_date DATE;
BEGIN
  -- Find all OVERNIGHT bookings with confirmed/pending/completed status
  -- that might have been miscounted
  FOR booking IN
    SELECT pb.id, pb."propertyId", pb."startDate", pb."endDate"
    FROM property_bookings pb
    WHERE pb."timeSlot" = 'OVERNIGHT'
      AND pb.status IN ('confirmed', 'pending_approval', 'checked_in', 'completed', 'pending_payment')
  LOOP
    -- For each date in the OVERNIGHT booking range
    loop_date := booking."startDate";
    WHILE loop_date <= booking."endDate" LOOP
      -- Reset the incorrectly allocated counts and set overnightBookedCount = 1
      UPDATE property_date_inventory
      SET
        "amBookedCount" = CASE
          WHEN "amBookedCount" > 0 THEN "amBookedCount" - 1
          ELSE "amBookedCount"
        END,
        "pmBookedCount" = CASE
          WHEN "pmBookedCount" > 0 THEN "pmBookedCount" - 1
          ELSE "pmBookedCount"
        END,
        "allDayBookedCount" = CASE
          WHEN "allDayBookedCount" > 0 THEN "allDayBookedCount" - 1
          ELSE "allDayBookedCount"
        END,
        "overnightBookedCount" = 1,
        "bookedCount" = GREATEST(0, "bookedCount" - 1) + 1,
        version = version + 1,
        "updatedAt" = EXTRACT(EPOCH FROM NOW())::bigint
      WHERE "propertyId" = booking."propertyId"
        AND date = loop_date;

      loop_date := loop_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;
END $$;

-- Recalculate status for all property_date_inventory rows
-- FULL rule: ALL_DAY or OVERNIGHT exists, OR both AM and PM at capacity
-- Special case: if capacity = 0, treat as unknown (never mark full due to 0 >= 0)
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
"updatedAt" = EXTRACT(EPOCH FROM NOW())::bigint
WHERE "allDayBookedCount" > 0 OR "overnightBookedCount" > 0 OR "amBookedCount" > 0 OR "pmBookedCount" > 0;
