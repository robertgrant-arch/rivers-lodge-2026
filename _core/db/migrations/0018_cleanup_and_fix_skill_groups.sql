-- ═══════════════════════════════════════════════════════════════════════════════
-- CLEANUP: Deactivate stale activity-type skill groups and fix membership types
-- ═══════════════════════════════════════════════════════════════════════════════
-- This migration fixes the live database state where old activity-type skill groups
-- (Deer Hunting, Waterfowl, Fishing, Clays, Corporate) were seeded incorrectly.
-- Solution: Deactivate the stale rows and upsert the correct membership types.
-- Safe to re-run: uses UPDATE for idempotency.

-- 1. DEACTIVATE OLD ACTIVITY-TYPE SKILL GROUPS
-- These were seeded in error and must not appear in the UI dropdown.
UPDATE skill_groups
SET active = false
WHERE slug IN ('deer_hunt', 'waterfowl', 'fishing', 'clays', 'corporate');

-- 2. UPSERT CORRECT MEMBERSHIP/EMPLOYEE TYPE SKILL GROUPS
-- Use DO UPDATE to fix any existing rows and insert new ones.
INSERT INTO skill_groups (name, slug, sort_order, active)
VALUES
  ('Designated', 'designated', 0, true),
  ('Silver', 'silver', 1, true),
  ('Social', 'social', 2, true),
  ('Employee', 'employee', 3, true),
  ('Admin', 'admin', 4, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active;
