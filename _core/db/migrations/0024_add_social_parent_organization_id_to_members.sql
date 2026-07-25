-- Add social_parent_organization_id column to members table
-- This column links Social members to their parent organization for booking scoping

ALTER TABLE members
ADD COLUMN IF NOT EXISTS social_parent_organization_id INTEGER REFERENCES social_parent_organization(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_members_social_parent_org ON members(social_parent_organization_id);
