/**
 * Migration 0031: Fix NULL Capacity in property_date_inventory
 *
 * Root cause: Some inventory rows have capacity=NULL (missing configuration),
 * causing type mismatches and incorrect calculations.
 *
 * Note: capacity=0 is VALID (non-hunting properties are still bookable for
 * lodging/weddings/etc). Only NULL values are treated as invalid.
 *
 * Fix: For any inventory row where capacity IS NULL, set capacity to the
 * owning property's maxHunters (defaulting to 2 if also NULL).
 * Also recalculate status using exclusive-slot model: slots are 'full' if
 * ANY booking exists (since each slot accommodates one group only).
 *
 * This migration is idempotent: running multiple times has no additional effect.
 */

-- Fix capacity=NULL by setting to property's maxHunters
-- Preserves capacity=0 (legitimate: non-hunting property, still bookable)
UPDATE property_date_inventory inv
SET
  capacity = COALESCE(hp."maxHunters", 2),
  status = CASE
    -- If capacity was missing (NULL) and no bookings, mark 'open'
    WHEN inv.capacity IS NULL AND inv."bookedCount" = 0 THEN 'open'::inventory_status
    -- If ALL_DAY or OVERNIGHT exists, mark 'full' (entire day taken)
    WHEN inv."allDayBookedCount" > 0 OR inv."overnightBookedCount" > 0 THEN 'full'::inventory_status
    -- If both AM and PM have bookings, mark 'full' (both half-day slots taken)
    WHEN inv."amBookedCount" > 0 AND inv."pmBookedCount" > 0 THEN 'full'::inventory_status
    -- One or both half-day slots open = 'open' (day still bookable)
    ELSE 'open'::inventory_status
  END,
  "updatedAt" = EXTRACT(EPOCH FROM NOW())::bigint
FROM hunting_properties hp
WHERE
  inv."propertyId" = hp.id
  AND inv.capacity IS NULL;
