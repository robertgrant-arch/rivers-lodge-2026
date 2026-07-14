-- Add 'employee' value to user_role enum (idempotent)
-- Must be a separate migration from the data migration because Postgres requires
-- ALTER TYPE to be committed before the new value can be used in the same transaction.
DO $$
BEGIN
  -- Check if 'employee' already exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'employee'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    -- Add the new enum value
    ALTER TYPE user_role ADD VALUE 'employee';
  END IF;
END $$;
