-- Seed skill_groups table with default activity groups
-- Idempotent: uses ON CONFLICT to allow re-running

INSERT INTO skill_groups (name, slug, sort_order, active)
VALUES
  ('Deer Hunting', 'deer_hunt', 0, true),
  ('Waterfowl Hunting', 'waterfowl', 1, true),
  ('Fishing', 'fishing', 2, true),
  ('Clays Shooting', 'clays', 3, true),
  ('Corporate Events', 'corporate', 4, true)
ON CONFLICT (slug) DO NOTHING;

-- Seed default role access matrix
-- Get role and skill_group IDs dynamically to avoid hardcoding IDs

INSERT INTO role_skill_group_access (role_id, skill_group_id, can_view, can_book)
SELECT
  (SELECT id FROM roles WHERE key = 'admin') as role_id,
  sg.id as skill_group_id,
  true, true
FROM skill_groups sg
WHERE sg.active = true
ON CONFLICT (role_id, skill_group_id) DO NOTHING;

INSERT INTO role_skill_group_access (role_id, skill_group_id, can_view, can_book)
SELECT
  (SELECT id FROM roles WHERE key = 'employee') as role_id,
  sg.id as skill_group_id,
  true, true
FROM skill_groups sg
WHERE sg.active = true
ON CONFLICT (role_id, skill_group_id) DO NOTHING;

INSERT INTO role_skill_group_access (role_id, skill_group_id, can_view, can_book)
SELECT
  (SELECT id FROM roles WHERE key = 'designated') as role_id,
  sg.id as skill_group_id,
  true, true
FROM skill_groups sg
WHERE sg.active = true
ON CONFLICT (role_id, skill_group_id) DO NOTHING;

-- Silver: all except corporate
INSERT INTO role_skill_group_access (role_id, skill_group_id, can_view, can_book)
SELECT
  (SELECT id FROM roles WHERE key = 'silver') as role_id,
  sg.id as skill_group_id,
  CASE WHEN sg.slug != 'corporate' THEN true ELSE false END as can_view,
  CASE WHEN sg.slug != 'corporate' THEN true ELSE false END as can_book
FROM skill_groups sg
WHERE sg.active = true
ON CONFLICT (role_id, skill_group_id) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_book = EXCLUDED.can_book;

-- Social: deny all
INSERT INTO role_skill_group_access (role_id, skill_group_id, can_view, can_book)
SELECT
  (SELECT id FROM roles WHERE key = 'social') as role_id,
  sg.id as skill_group_id,
  false, false
FROM skill_groups sg
WHERE sg.active = true
ON CONFLICT (role_id, skill_group_id) DO NOTHING;
