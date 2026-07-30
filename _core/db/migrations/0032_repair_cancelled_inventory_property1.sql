/**
 * Migration 0032: Repair cancelled booking inventory for Ohana (property 1)
 *
 * Issue: Cancelled bookings (RL-2026-00005 AM on 7/29, RL-2026-00009 Overnight 7/30–8/1)
 * left stale booked slot counts. Migration 0030 ran earlier but these cancellations
 * drifted after.
 *
 * Scope: Property 1 only. Idempotent (safe to re-run).
 *
 * Logic: For each cancelled booking in property 1, decrement the appropriate slot
 * counter for each date in its range. Then recalculate status using exclusive-slot model.
 */

-- Step 1: Decrement per-slot counts for all cancelled bookings (property 1 only)
DO $$
DECLARE
  booking RECORD;
  v_current_date DATE;
  day_count INTEGER;
  total_days INTEGER;
  slot_type TEXT;
BEGIN
  FOR booking IN
    SELECT
      "startDate"::DATE as start_date,
      "endDate"::DATE as end_date,
      "timeSlot"
    FROM property_bookings
    WHERE "propertyId" = 1 AND status = 'cancelled'
  LOOP
    v_current_date := booking.start_date;
    day_count := 0;
    total_days := (booking.end_date - booking.start_date) + 1;

    WHILE v_current_date <= booking.end_date LOOP
      -- Determine slot type for this date
      IF booking."timeSlot" = 'OVERNIGHT' AND total_days > 1 THEN
        IF day_count = 0 THEN
          slot_type := 'PM';
        ELSIF day_count = (total_days - 1) THEN
          slot_type := 'AM';
        ELSE
          slot_type := 'ALL_DAY';
        END IF;
      ELSE
        slot_type := booking."timeSlot";
      END IF;

      -- Decrement the appropriate counter (with idempotency guard)
      UPDATE property_date_inventory
      SET
        "amBookedCount" = GREATEST(0, "amBookedCount" - CASE WHEN slot_type = 'AM' THEN 1 ELSE 0 END),
        "pmBookedCount" = GREATEST(0, "pmBookedCount" - CASE WHEN slot_type = 'PM' THEN 1 ELSE 0 END),
        "allDayBookedCount" = GREATEST(0, "allDayBookedCount" - CASE WHEN slot_type = 'ALL_DAY' THEN 1 ELSE 0 END),
        "overnightBookedCount" = GREATEST(0, "overnightBookedCount" - CASE WHEN slot_type = 'OVERNIGHT' THEN 1 ELSE 0 END),
        "updatedAt" = EXTRACT(EPOCH FROM NOW())::bigint
      WHERE "propertyId" = 1 AND date = v_current_date;

      v_current_date := v_current_date + INTERVAL '1 day';
      day_count := day_count + 1;
    END LOOP;
  END LOOP;
END $$;

-- Step 2: Recalculate bookedCount and all status fields (property 1 only)
UPDATE property_date_inventory
SET
  "bookedCount" = "amBookedCount" + "pmBookedCount" + "allDayBookedCount" + "overnightBookedCount",
  status = CASE
    WHEN "allDayBookedCount" > 0 OR "overnightBookedCount" > 0 THEN 'full'::inventory_status
    WHEN "amBookedCount" > 0 AND "pmBookedCount" > 0 THEN 'full'::inventory_status
    ELSE 'open'::inventory_status
  END,
  "amStatus" = CASE
    WHEN "allDayBookedCount" > 0 OR "overnightBookedCount" > 0 THEN 'full'::inventory_status
    WHEN "amBookedCount" > 0 THEN 'full'::inventory_status
    ELSE 'open'::inventory_status
  END,
  "pmStatus" = CASE
    WHEN "allDayBookedCount" > 0 OR "overnightBookedCount" > 0 THEN 'full'::inventory_status
    WHEN "pmBookedCount" > 0 THEN 'full'::inventory_status
    ELSE 'open'::inventory_status
  END,
  "allDayStatus" = CASE
    WHEN "allDayBookedCount" > 0 THEN 'full'::inventory_status
    ELSE 'open'::inventory_status
  END,
  "overnightStatus" = CASE
    WHEN "overnightBookedCount" > 0 THEN 'full'::inventory_status
    ELSE 'open'::inventory_status
  END,
  version = version + 1,
  "updatedAt" = EXTRACT(EPOCH FROM NOW())::bigint
WHERE "propertyId" = 1;
