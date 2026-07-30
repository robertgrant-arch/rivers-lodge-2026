/**
 * Migration 0033: Repair cancelled OVERNIGHT booking inventory for property 1
 *
 * Issue: Migration 0032 attempted a repair but used faulty day-expansion logic
 * for OVERNIGHT bookings. It tried to decrement PM/ALL_DAY/AM per date, but
 * OVERNIGHT bookings actually store as overnightBookedCount on every date in
 * the range. Result: 7/30–8/1 remain stuck with overnightBookedCount=1.
 *
 * Fix: Correct the decrement logic — use booking.timeSlot directly without
 * day-expansion. OVERNIGHT cancellations decrement overnightBookedCount on
 * every date in [startDate, endDate].
 *
 * Scope: Property 1 only. Idempotent (safe to re-run).
 * Note: This is a NEW migration because 0032 was already applied. Editing 0032
 * in place does not cause re-execution; migration runner tracks filenames.
 */

-- Step 1: Decrement per-slot counts for all cancelled bookings (property 1 only)
-- Use booking.timeSlot directly; OVERNIGHT → overnightBookedCount on all dates
DO $$
DECLARE
  booking RECORD;
  v_current_date DATE;
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

    WHILE v_current_date <= booking.end_date LOOP
      -- Use the booking's timeSlot directly (no day-based expansion)
      -- OVERNIGHT bookings store as overnightBookedCount on every date in range
      slot_type := booking."timeSlot";

      -- Decrement the appropriate counter (with idempotency guard)
      UPDATE property_date_inventory
      SET
        "amBookedCount" = GREATEST(0, "amBookedCount" - CASE WHEN slot_type = 'AM' THEN 1 ELSE 0 END),
        "pmBookedCount" = GREATEST(0, "pmBookedCount" - CASE WHEN slot_type = 'PM' THEN 1 ELSE 0 END),
        "allDayBookedCount" = GREATEST(0, "allDayBookedCount" - CASE WHEN slot_type = 'ALL_DAY' THEN 1 ELSE 0 END),
        "overnightBookedCount" = GREATEST(0, "overnightBookedCount" - CASE WHEN slot_type = 'OVERNIGHT' THEN 1 ELSE 0 END),
        version = version + 1,
        "updatedAt" = EXTRACT(EPOCH FROM NOW())::bigint
      WHERE "propertyId" = 1 AND date = v_current_date;

      v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;
END $$;

-- Step 2: Recalculate bookedCount and status for property 1 (exclusive-slot model)
UPDATE property_date_inventory
SET
  "bookedCount" = "amBookedCount" + "pmBookedCount" + "allDayBookedCount" + "overnightBookedCount",
  status = CASE
    -- Full: ALL_DAY or OVERNIGHT exist, OR both AM and PM are booked
    WHEN "allDayBookedCount" > 0 OR "overnightBookedCount" > 0 THEN 'full'::inventory_status
    WHEN "amBookedCount" > 0 AND "pmBookedCount" > 0 THEN 'full'::inventory_status
    -- Open: no blockage
    ELSE 'open'::inventory_status
  END,
  version = version + 1,
  "updatedAt" = EXTRACT(EPOCH FROM NOW())::bigint
WHERE "propertyId" = 1;
