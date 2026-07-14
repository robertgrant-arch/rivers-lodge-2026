-- ═══════════════════════════════════════════════════════════════════════════════
-- IDEMPOTENT: Ensure core skill groups are properly seeded
-- ═══════════════════════════════════════════════════════════════════════════════
-- This migration ensures that the five core skill groups exist in the database
-- with the correct names, slugs, and settings. Idempotent: safe to re-run.
--
-- The five core skill groups are:
-- 1. Designated - Member tier (highest privilege)
-- 2. Silver     - Member tier
-- 3. Social     - Member tier (lowest privilege, default)
-- 4. Employee   - Staff role (operational staff)
-- 5. Admin      - Staff role (administrative staff, full control)

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
  active = EXCLUDED.active
WHERE
  skill_groups.name != EXCLUDED.name
  OR skill_groups.sort_order != EXCLUDED.sort_order
  OR skill_groups.active != EXCLUDED.active;
