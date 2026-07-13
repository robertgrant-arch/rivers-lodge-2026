-- Create role_property_skill_group_access table
-- Per-property overrides for role × skill-group access
-- Allows denying access to specific skill groups at specific properties

CREATE TABLE IF NOT EXISTS role_property_skill_group_access (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  skill_group_id INTEGER NOT NULL REFERENCES skill_groups(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_book BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(role_id, property_id, skill_group_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS rps_role_idx ON role_property_skill_group_access(role_id);
CREATE INDEX IF NOT EXISTS rps_property_idx ON role_property_skill_group_access(property_id);
CREATE INDEX IF NOT EXISTS rps_skill_group_idx ON role_property_skill_group_access(skill_group_id);
