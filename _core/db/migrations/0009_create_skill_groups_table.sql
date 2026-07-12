-- Create skill_groups table
-- Catalog of skill-based activity groups (deer hunting, waterfowl, fishing, etc.)

CREATE TABLE IF NOT EXISTS skill_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS skill_groups_slug_idx ON skill_groups(slug);
CREATE INDEX IF NOT EXISTS skill_groups_active_idx ON skill_groups(active);
