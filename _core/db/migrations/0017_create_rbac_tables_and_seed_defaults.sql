-- ═══════════════════════════════════════════════════════════════════════════════
-- RBAC Foundation: Create missing tables, seed defaults, add missing columns
-- ═══════════════════════════════════════════════════════════════════════════════
-- This migration idempotently creates the complete RBAC schema that was defined
-- in TypeScript but never deployed. Safe to re-run if previous deploys failed.
--
-- Tables created:
--   - roles (base RBAC roles)
--   - skill_groups (activity/skill categories for filtering)
--   - role_skill_group_access (master calendar: role × skill-group visibility)
--   - role_property_skill_group_access (per-property override)
--   - property_skill_groups (which skill groups apply to each property)
--
-- Columns added:
--   - members.roleId (FK to roles)
--
-- Defaults seeded:
--   - 5 roles: admin, employee, designated, silver, social
--   - 5 skill groups: deer_hunt, waterfowl, fishing, clays, corporate
--   - Default role × skill-group access matrix
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. CREATE ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS roles_key_idx ON roles(key);

-- 2. CREATE SKILL_GROUPS TABLE
CREATE TABLE IF NOT EXISTS skill_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS skill_groups_slug_idx ON skill_groups(slug);
CREATE INDEX IF NOT EXISTS skill_groups_active_idx ON skill_groups(active);

-- 3. CREATE ROLE × SKILL_GROUP ACCESS TABLE (master calendar visibility)
CREATE TABLE IF NOT EXISTS role_skill_group_access (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  skill_group_id INTEGER NOT NULL REFERENCES skill_groups(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_book BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, skill_group_id)
);

CREATE INDEX IF NOT EXISTS rsk_role_idx ON role_skill_group_access(role_id);
CREATE INDEX IF NOT EXISTS rsk_skill_group_idx ON role_skill_group_access(skill_group_id);

-- 4. CREATE ROLE × PROPERTY × SKILL_GROUP ACCESS TABLE (per-property overrides)
CREATE TABLE IF NOT EXISTS role_property_skill_group_access (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL,
  skill_group_id INTEGER NOT NULL REFERENCES skill_groups(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_book BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, property_id, skill_group_id)
);

CREATE INDEX IF NOT EXISTS rps_role_idx ON role_property_skill_group_access(role_id);
CREATE INDEX IF NOT EXISTS rps_property_idx ON role_property_skill_group_access(property_id);
CREATE INDEX IF NOT EXISTS rps_skill_group_idx ON role_property_skill_group_access(skill_group_id);

-- 5. CREATE PROPERTY × SKILL_GROUP JOIN TABLE
CREATE TABLE IF NOT EXISTS property_skill_groups (
  property_id INTEGER NOT NULL,
  skill_group_id INTEGER NOT NULL REFERENCES skill_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (property_id, skill_group_id)
);

CREATE INDEX IF NOT EXISTS psg_property_idx ON property_skill_groups(property_id);
CREATE INDEX IF NOT EXISTS psg_skill_group_idx ON property_skill_groups(skill_group_id);

-- 6. ADD ROLE_ID COLUMN TO MEMBERS (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'roleId'
  ) THEN
    ALTER TABLE members
      ADD COLUMN roleId INTEGER REFERENCES roles(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS mem_role_idx ON members(roleId);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DEFAULT DATA
-- ═══════════════════════════════════════════════════════════════════════════════

-- 7. SEED ROLES
INSERT INTO roles (key, label, sort_order, created_at, updated_at)
VALUES
  ('admin', 'Admin', 0, NOW(), NOW()),
  ('employee', 'Employee', 1, NOW(), NOW()),
  ('designated', 'Designated', 2, NOW(), NOW()),
  ('silver', 'Silver', 3, NOW(), NOW()),
  ('social', 'Social', 4, NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- 8. SEED SKILL_GROUPS with membership/employee types
-- These represent member tiers and staff roles, NOT activities
INSERT INTO skill_groups (name, slug, sort_order, active, created_at, updated_at)
VALUES
  ('Designated', 'designated', 0, true, NOW(), NOW()),
  ('Silver', 'silver', 1, true, NOW(), NOW()),
  ('Social', 'social', 2, true, NOW(), NOW()),
  ('Employee', 'employee', 3, true, NOW(), NOW()),
  ('Admin', 'admin', 4, true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 9. SEED DEFAULT ROLE × SKILL_GROUP ACCESS MATRIX
-- Admin: all skill groups, can view and book
INSERT INTO role_skill_group_access (role_id, skill_group_id, can_view, can_book, created_at, updated_at)
SELECT
  (SELECT id FROM roles WHERE key = 'admin') as role_id,
  sg.id as skill_group_id,
  true, true,
  NOW(), NOW()
FROM skill_groups sg
WHERE sg.active = true
ON CONFLICT (role_id, skill_group_id) DO NOTHING;

-- Employee: all skill groups, can view and book
INSERT INTO role_skill_group_access (role_id, skill_group_id, can_view, can_book, created_at, updated_at)
SELECT
  (SELECT id FROM roles WHERE key = 'employee') as role_id,
  sg.id as skill_group_id,
  true, true,
  NOW(), NOW()
FROM skill_groups sg
WHERE sg.active = true
ON CONFLICT (role_id, skill_group_id) DO NOTHING;

-- Designated: all skill groups, can view and book
INSERT INTO role_skill_group_access (role_id, skill_group_id, can_view, can_book, created_at, updated_at)
SELECT
  (SELECT id FROM roles WHERE key = 'designated') as role_id,
  sg.id as skill_group_id,
  true, true,
  NOW(), NOW()
FROM skill_groups sg
WHERE sg.active = true
ON CONFLICT (role_id, skill_group_id) DO NOTHING;

-- Silver: all except corporate, can view and book
INSERT INTO role_skill_group_access (role_id, skill_group_id, can_view, can_book, created_at, updated_at)
SELECT
  (SELECT id FROM roles WHERE key = 'silver') as role_id,
  sg.id as skill_group_id,
  CASE WHEN sg.slug != 'corporate' THEN true ELSE false END,
  CASE WHEN sg.slug != 'corporate' THEN true ELSE false END,
  NOW(), NOW()
FROM skill_groups sg
WHERE sg.active = true
ON CONFLICT (role_id, skill_group_id) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_book = EXCLUDED.can_book;

-- Social: no skill groups (deny all)
INSERT INTO role_skill_group_access (role_id, skill_group_id, can_view, can_book, created_at, updated_at)
SELECT
  (SELECT id FROM roles WHERE key = 'social') as role_id,
  sg.id as skill_group_id,
  false, false,
  NOW(), NOW()
FROM skill_groups sg
WHERE sg.active = true
ON CONFLICT (role_id, skill_group_id) DO NOTHING;
