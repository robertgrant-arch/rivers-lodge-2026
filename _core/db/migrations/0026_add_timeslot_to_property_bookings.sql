-- Migration 0026: Add timeSlot column to property_bookings
-- Adds slot-aware booking tracking: AM, PM, ALL_DAY, OVERNIGHT

-- Create the enum type
CREATE TYPE booking_time_slot AS ENUM (
  'AM', 'PM', 'ALL_DAY', 'OVERNIGHT'
);

-- Add timeSlot column to property_bookings with default ALL_DAY
ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS "timeSlot" booking_time_slot NOT NULL DEFAULT 'ALL_DAY';

-- Backfill all existing rows to ALL_DAY (safe default for legacy bookings)
UPDATE property_bookings
SET "timeSlot" = 'ALL_DAY'
WHERE "timeSlot" IS NULL;

-- Create index for querying by timeSlot
CREATE INDEX IF NOT EXISTS pb_timeslot_idx ON property_bookings("timeSlot");
