-- Add role_id column to members table for role-based access control

ALTER TABLE members
ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL;

-- Index for role lookups
CREATE INDEX IF NOT EXISTS mem_role_idx ON members(role_id);
