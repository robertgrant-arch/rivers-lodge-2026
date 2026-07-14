-- Create member_skill_groups join table for member-to-skill-group relationships
-- This replaces the legacy tier enum approach with a many-to-many join table
-- allowing members to be associated with multiple skill groups

CREATE TABLE IF NOT EXISTS member_skill_groups (
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  skill_group_id INTEGER NOT NULL REFERENCES skill_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (member_id, skill_group_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS member_skill_groups_member_idx ON member_skill_groups(member_id);
CREATE INDEX IF NOT EXISTS member_skill_groups_skill_group_idx ON member_skill_groups(skill_group_id);
