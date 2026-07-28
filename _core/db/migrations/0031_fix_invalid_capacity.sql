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
 * Also recalculate status for affected rows to ensure consistency.
 *
 * This migration is idempotent: running multiple times has no additional effect.
 */

-- Fix capacity=NULL by setting to property's maxHunters
-- Preserves capacity=0 (legitimate: non-hunting property, still bookable)
UPDATE property_date_inventory inv
SET
  capacity = COALESCE(hp."maxHunters", 2),
  status = CASE
    -- If capacity was missing (NULL) and bookedCount=0, set status to 'open'
    WHEN inv.capacity IS NULL AND inv."bookedCount" = 0 THEN 'open'::inventory_status
    -- If ALL_DAY or OVERNIGHT exists, keep as 'full'
    WHEN inv."allDayBookedCount" > 0 OR inv."overnightBookedCount" > 0 THEN 'full'::inventory_status
    -- If both AM and PM are at capacity, mark as 'full'
    -- Note: capacity=0 properties treated as zero hunting slots (always open for AM/PM, via router guard)
    WHEN COALESCE(hp."maxHunters", 2) > 0 AND inv."amBookedCount" >= COALESCE(hp."maxHunters", 2) AND inv."pmBookedCount" >= COALESCE(hp."maxHunters", 2) THEN 'full'::inventory_status
    -- If any AM or PM booking exists (without full condition), mark as 'partial'
    WHEN inv."amBookedCount" > 0 OR inv."pmBookedCount" > 0 THEN 'partial'::inventory_status
    -- No bookings = 'open'
    ELSE 'open'::inventory_status
  END,
  "updatedAt" = EXTRACT(EPOCH FROM NOW())::bigint
FROM hunting_properties hp
WHERE
  inv."propertyId" = hp.id
  AND inv.capacity IS NULL;
