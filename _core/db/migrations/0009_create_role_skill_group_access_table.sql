-- Create role_skill_group_access table
-- Maps roles to skill groups with view/book permissions for master calendar

CREATE TABLE IF NOT EXISTS role_skill_group_access (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  skill_group_id INTEGER NOT NULL REFERENCES skill_groups(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_book BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(role_id, skill_group_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS rsk_role_idx ON role_skill_group_access(role_id);
CREATE INDEX IF NOT EXISTS rsk_skill_group_idx ON role_skill_group_access(skill_group_id);
