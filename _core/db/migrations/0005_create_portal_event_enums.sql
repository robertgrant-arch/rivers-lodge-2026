-- Create ENUM types required by portal_blocked_dates.
-- These are defined in Drizzle schema (features/portal/schema.ts) as pgEnum,
-- but no CREATE TYPE migration existed, so INSERTs referencing the enum-typed
-- columns fail. Idempotent DO blocks: safe to run repeatedly.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'portal_event_kind') THEN
    CREATE TYPE portal_event_kind AS ENUM ('wedding', 'corporate', 'hunt_fish', 'blocked');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'portal_blocked_reason') THEN
    CREATE TYPE portal_blocked_reason AS ENUM ('maintenance', 'private_use', 'seasonal_closure', 'buffer', 'other');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'portal_blocked_scope') THEN
    CREATE TYPE portal_blocked_scope AS ENUM ('entire_property', 'specific_venue', 'specific_lodging');
  END IF;
END $$;

-- Backfill columns on portal_blocked_dates using the (now guaranteed) enum types.
-- If an ALTER TABLE from a prior migration failed silently because the enum type
-- did not yet exist, the column may be missing. IF NOT EXISTS makes this safe.
ALTER TABLE portal_blocked_dates
  ADD COLUMN IF NOT EXISTS "kind" portal_event_kind NOT NULL DEFAULT 'blocked',
  ADD COLUMN IF NOT EXISTS "reason" portal_blocked_reason DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS "scope" portal_blocked_scope NOT NULL DEFAULT 'entire_property',
  ADD COLUMN IF NOT EXISTS "scopeTarget" text,
  ADD COLUMN IF NOT EXISTS "startAt" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "endAt" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "allDay" BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "title" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "reasonNotes" text,
  ADD COLUMN IF NOT EXISTS "createdByUserId" text;
