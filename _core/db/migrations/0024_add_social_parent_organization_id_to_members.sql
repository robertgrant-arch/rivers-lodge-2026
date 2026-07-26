-- Add social_parent_organization_id column to members table (without FK constraint yet)
-- This column links Social members to their parent organization for booking scoping
-- The FK constraint is added in migration 0025 after the parent table is created

ALTER TABLE members
ADD COLUMN IF NOT EXISTS social_parent_organization_id INTEGER;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_members_social_parent_org ON members(social_parent_organization_id);
