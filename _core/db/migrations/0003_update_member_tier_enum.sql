-- Update member_tier enum from (standard, premier, founding) to (Designated, Silver, Social)
-- This migration is idempotent: it checks if the enum already has the new values before making changes

DO $$
BEGIN
  -- Check if member_tier_new already exists (indicates this migration was partially completed)
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_tier_new') THEN
    -- Step 1: Create the new enum type
    CREATE TYPE member_tier_new AS ENUM ('Designated', 'Silver', 'Social');

    -- Step 2: Migrate existing data - map old values to new values
    -- Create a temporary column with the new type
    ALTER TABLE members
    ADD COLUMN tier_new member_tier_new;

    -- Copy data with mapping: standard -> Designated, premier -> Silver, founding -> Social
    UPDATE members
    SET tier_new = CASE
      WHEN tier::text = 'standard' THEN 'Designated'::member_tier_new
      WHEN tier::text = 'premier' THEN 'Silver'::member_tier_new
      WHEN tier::text = 'founding' THEN 'Social'::member_tier_new
      ELSE 'Designated'::member_tier_new
    END;

    -- Step 3: Drop the old column
    ALTER TABLE members DROP COLUMN tier;

    -- Step 4: Rename the new column to tier
    ALTER TABLE members RENAME COLUMN tier_new TO tier;

    -- Step 5: Drop the old enum type if it exists
    DROP TYPE IF EXISTS member_tier CASCADE;

    -- Step 6: Rename the new enum to the original name
    ALTER TYPE member_tier_new RENAME TO member_tier;
  END IF;
END $$;
