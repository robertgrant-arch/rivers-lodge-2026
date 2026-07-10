-- Add missing columns to portal_blocked_dates.
-- Root cause: prod DB was missing "title" (and possibly other) columns that the
-- Drizzle schema in features/portal/schema.ts expects. The 42703 undefined_column
-- error surfaced by router.ts diagnostics was: column "title" of relation
-- "portal_blocked_dates" does not exist.
-- This migration idempotently ADDs any column that is defined in the schema but
-- missing in the DB. Safe to run repeatedly.

DO $$
BEGIN
  -- title varchar(255)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='title') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates ADD COLUMN "title" varchar(255)';
  END IF;

  -- kind portal_event_kind (enum) default 'blocked'
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='kind') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates ADD COLUMN "kind" portal_event_kind DEFAULT ''blocked''';
  END IF;

  -- startAt timestamp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='startAt') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates ADD COLUMN "startAt" timestamp';
  END IF;

  -- endAt timestamp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='endAt') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates ADD COLUMN "endAt" timestamp';
  END IF;

  -- allDay boolean default true
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='allDay') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates ADD COLUMN "allDay" boolean DEFAULT true';
  END IF;

  -- reason portal_blocked_reason (enum) default 'other'
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='reason') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates ADD COLUMN "reason" portal_blocked_reason DEFAULT ''other''';
  END IF;

  -- reasonNotes text
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='reasonNotes') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates ADD COLUMN "reasonNotes" text';
  END IF;

  -- scope portal_blocked_scope (enum) default 'entire_property'
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='scope') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates ADD COLUMN "scope" portal_blocked_scope DEFAULT ''entire_property''';
  END IF;

  -- scopeTarget varchar(100)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='scopeTarget') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates ADD COLUMN "scopeTarget" varchar(100)';
  END IF;

  -- createdByUserId varchar(36)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='createdByUserId') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates ADD COLUMN "createdByUserId" varchar(36)';
  END IF;

  -- createdAt timestamp default now not null
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='createdAt') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates ADD COLUMN "createdAt" timestamp NOT NULL DEFAULT now()';
  END IF;
END $$;
