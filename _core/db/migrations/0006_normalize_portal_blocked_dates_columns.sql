-- Normalize portal_blocked_dates columns to quoted camelCase names.
-- Migration 0003 created columns using unquoted identifiers (e.g. startAt),
-- which Postgres folds to lowercase (startat). The Drizzle schema and
-- migration 0005 use quoted "startAt", causing 42703 undefined_column on insert.
-- This migration renames any legacy lowercase columns to their proper
-- quoted camelCase names. Idempotent: safe to run on any state.

DO $$
BEGIN
  -- startat -> "startAt"
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='startat')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='startAt') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates RENAME COLUMN startat TO "startAt"';
  END IF;

  -- endat -> "endAt"
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='endat')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='endAt') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates RENAME COLUMN endat TO "endAt"';
  END IF;

  -- allday -> "allDay"
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='allday')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='allDay') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates RENAME COLUMN allday TO "allDay"';
  END IF;

  -- reasonnotes -> "reasonNotes"
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='reasonnotes')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='reasonNotes') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates RENAME COLUMN reasonnotes TO "reasonNotes"';
  END IF;

  -- scopetarget -> "scopeTarget"
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='scopetarget')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='scopeTarget') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates RENAME COLUMN scopetarget TO "scopeTarget"';
  END IF;

  -- createdbyuserid -> "createdByUserId"
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='createdbyuserid')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='createdByUserId') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates RENAME COLUMN createdbyuserid TO "createdByUserId"';
  END IF;

  -- startdate -> "startDate"
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='startdate')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='startDate') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates RENAME COLUMN startdate TO "startDate"';
  END IF;

  -- enddate -> "endDate"
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='enddate')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='endDate') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates RENAME COLUMN enddate TO "endDate"';
  END IF;

  -- createdat -> "createdAt"
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='createdat')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portal_blocked_dates' AND column_name='createdAt') THEN
    EXECUTE 'ALTER TABLE portal_blocked_dates RENAME COLUMN createdat TO "createdAt"';
  END IF;
END $$;

-- Ensure all required columns exist with proper quoted camelCase names.
-- This re-runs the additive part of migration 0005 defensively.
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
