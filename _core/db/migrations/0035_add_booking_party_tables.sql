-- Migration 0035: Add booking party (adults & minors) tables for waiver workflow
-- Additive migration: introduces new tables for party management, does not alter existing booking tables

-- Create waiver_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'waiver_status') THEN
    CREATE TYPE waiver_status AS ENUM ('pending', 'sent', 'completed', 'overdue');
  END IF;
END $$;

-- Create booking_party_adults table
CREATE TABLE IF NOT EXISTS booking_party_adults (
  id serial PRIMARY KEY,
  "bookingId" integer NOT NULL,
  "fullName" varchar(255) NOT NULL,
  phone varchar(20),
  email varchar(255) NOT NULL,
  "isDesignatedMember" boolean NOT NULL DEFAULT false,
  "waiverStatus" waiver_status NOT NULL DEFAULT 'pending',
  "waiverProvider" text,
  "waiverEnvelopeId" varchar(255),
  "waiverSentAt" bigint,
  "waiverCompletedAt" bigint,
  "createdAt" bigint NOT NULL,
  "updatedAt" bigint NOT NULL
);

-- Create indexes on booking_party_adults
CREATE INDEX IF NOT EXISTS bpa_booking_idx ON booking_party_adults("bookingId");
CREATE INDEX IF NOT EXISTS bpa_email_idx ON booking_party_adults(email);
CREATE INDEX IF NOT EXISTS bpa_waiver_status_idx ON booking_party_adults("waiverStatus");

-- Create booking_party_minors table
CREATE TABLE IF NOT EXISTS booking_party_minors (
  id serial PRIMARY KEY,
  "bookingId" integer NOT NULL,
  "adultId" integer NOT NULL,
  "fullName" varchar(255) NOT NULL,
  "createdAt" bigint NOT NULL
);

-- Create indexes on booking_party_minors
CREATE INDEX IF NOT EXISTS bpm_booking_idx ON booking_party_minors("bookingId");
CREATE INDEX IF NOT EXISTS bpm_adult_idx ON booking_party_minors("adultId");

-- Note: Foreign keys (property_bookings, booking_party_adults) are intentionally not enforced
-- at DB level to allow flexible deletion/cleanup patterns in application code.
-- The application layer is responsible for maintaining referential integrity.
