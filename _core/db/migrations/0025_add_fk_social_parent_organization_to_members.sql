-- Add foreign key constraint for social_parent_organization_id
-- This references the social_parent_organization table created in migration 0023c
-- The column was created in migration 0024 without the constraint to avoid ordering issues

ALTER TABLE members
ADD CONSTRAINT fk_members_social_parent_org
FOREIGN KEY (social_parent_organization_id)
REFERENCES social_parent_organization(id)
ON DELETE SET NULL;
