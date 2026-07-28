/**
 * Migration 0031: Fix Invalid Capacity in property_date_inventory
 *
 * Root cause: Some inventory rows have capacity=0 or NULL, causing getSlotStatus
 * to incorrectly mark dates as "full" even when bookedCount=0.
 *
 * Fix: For any inventory row where capacity IS NULL or capacity <= 0, set
 * capacity to the owning property's maxHunters. Also recalculate status for
 * affected rows to ensure consistency.
 *
 * This migration is idempotent: running multiple times has no additional effect.
 */

-- Fix capacity=NULL or capacity<=0 by setting to property's maxHunters
UPDATE property_date_inventory inv
SET
  capacity = COALESCE(hp.maxHunters, 2),
  status = CASE
    -- If capacity was invalid and bookedCount=0, set status to 'open'
    WHEN (inv.capacity IS NULL OR inv.capacity <= 0) AND inv."bookedCount" = 0 THEN 'open'::inventory_status
    -- If ALL_DAY or OVERNIGHT exists, keep as 'full'
    WHEN inv."allDayBookedCount" > 0 OR inv."overnightBookedCount" > 0 THEN 'full'::inventory_status
    -- If both AM and PM are at capacity, mark as 'full'
    WHEN COALESCE(hp.maxHunters, 2) > 0 AND inv."amBookedCount" >= COALESCE(hp.maxHunters, 2) AND inv."pmBookedCount" >= COALESCE(hp.maxHunters, 2) THEN 'full'::inventory_status
    -- If any AM or PM booking exists (without full condition), mark as 'partial'
    WHEN inv."amBookedCount" > 0 OR inv."pmBookedCount" > 0 THEN 'partial'::inventory_status
    -- No bookings = 'open'
    ELSE 'open'::inventory_status
  END,
  "updatedAt" = now()
FROM hunting_properties hp
WHERE
  inv."propertyId" = hp.id
  AND (inv.capacity IS NULL OR inv.capacity <= 0);
