-- Populate member_skill_groups with initial data
-- Assigns all active members to the Social skill group by default
-- This is idempotent: uses ON CONFLICT to skip duplicates

-- First, ensure we have the skill groups defined
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

-- Assign all existing members to the Social skill group (default tier)
INSERT INTO member_skill_groups (member_id, skill_group_id)
SELECT m.id, sg.id
FROM members m
CROSS JOIN skill_groups sg
WHERE sg.slug = 'social'
  AND m.active = true
  AND NOT EXISTS (
    SELECT 1 FROM member_skill_groups msg
    WHERE msg.member_id = m.id AND msg.skill_group_id = sg.id
  )
ON CONFLICT (member_id, skill_group_id) DO NOTHING;
