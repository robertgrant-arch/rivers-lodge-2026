-- Create property_skill_groups table
-- Join table mapping properties to available skill groups

CREATE TABLE IF NOT EXISTS property_skill_groups (
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  skill_group_id INTEGER NOT NULL REFERENCES skill_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY (property_id, skill_group_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS psg_property_idx ON property_skill_groups(property_id);
CREATE INDEX IF NOT EXISTS psg_skill_group_idx ON property_skill_groups(skill_group_id);
