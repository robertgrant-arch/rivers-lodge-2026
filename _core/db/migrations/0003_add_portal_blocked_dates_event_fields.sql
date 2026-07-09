-- Add event metadata columns to portal_blocked_dates table
-- Supports storing title, kind (event type), start/end times, and all-day flag

ALTER TABLE portal_blocked_dates
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS kind portal_event_kind NOT NULL DEFAULT 'blocked',
ADD COLUMN IF NOT EXISTS startAt TIMESTAMP,
ADD COLUMN IF NOT EXISTS endAt TIMESTAMP,
ADD COLUMN IF NOT EXISTS allDay BOOLEAN DEFAULT true;
