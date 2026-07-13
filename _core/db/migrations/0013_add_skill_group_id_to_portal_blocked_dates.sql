-- Add skill_group_id column to portal_blocked_dates table
-- Links calendar events to specific skill groups for filtering

ALTER TABLE portal_blocked_dates
ADD COLUMN IF NOT EXISTS skill_group_id INTEGER REFERENCES skill_groups(id) ON DELETE SET NULL;

-- Index for filtering by skill group
CREATE INDEX IF NOT EXISTS pbd_skill_group_idx ON portal_blocked_dates(skill_group_id);
