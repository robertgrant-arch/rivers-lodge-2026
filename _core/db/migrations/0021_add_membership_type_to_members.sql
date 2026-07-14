-- Add membership_type enum and column to members table
-- A member has exactly ONE membership type: Designated, Silver, or Social
-- This replaces the multi-valued skill group approach for members

-- Create the enum type
CREATE TYPE member_type AS ENUM ('Designated', 'Silver', 'Social');

-- Add the column with default
ALTER TABLE members
ADD COLUMN IF NOT EXISTS membership_type member_type DEFAULT 'Social';

-- Populate membership_type based on current skill group assignments
-- Precedence: Designated > Silver > Social
-- If no assignment, default to Social (already set)
UPDATE members
SET membership_type = CASE
  WHEN EXISTS (
    SELECT 1 FROM member_skill_groups msg
    JOIN skill_groups sg ON msg.skill_group_id = sg.id
    WHERE msg.member_id = members.id
    AND sg.slug = 'designated'
  ) THEN 'Designated'::member_type
  WHEN EXISTS (
    SELECT 1 FROM member_skill_groups msg
    JOIN skill_groups sg ON msg.skill_group_id = sg.id
    WHERE msg.member_id = members.id
    AND sg.slug = 'silver'
  ) THEN 'Silver'::member_type
  WHEN EXISTS (
    SELECT 1 FROM member_skill_groups msg
    JOIN skill_groups sg ON msg.skill_group_id = sg.id
    WHERE msg.member_id = members.id
    AND sg.slug = 'social'
  ) THEN 'Social'::member_type
  ELSE 'Social'::member_type
END
WHERE membership_type = 'Social';
