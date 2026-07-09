-- Add index for efficient date range queries on portal_blocked_dates
-- Used by the calendar.events query to fetch events within a date range
-- This prevents full table scans and significantly improves calendar load performance

CREATE INDEX IF NOT EXISTS portal_blocked_dates_range_idx
ON portal_blocked_dates ("startDate", "endDate");
