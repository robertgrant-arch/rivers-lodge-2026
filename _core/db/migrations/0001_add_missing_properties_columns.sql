-- Add missing columns to hunting_properties table
-- This migration adds all columns that were defined in the schema but not yet in the production database

-- Add JSON columns for booking configuration
ALTER TABLE hunting_properties
ADD COLUMN IF NOT EXISTS "secondaryActivities" jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "bookingModes" jsonb DEFAULT '["AM","PM"]'::jsonb;

-- Add boolean columns for amenities and features
ALTER TABLE hunting_properties
ADD COLUMN IF NOT EXISTS "hasHeatedBlind" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "hasAtvAccess" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "hasWaterAccess" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "hasElectricity" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "hasCellService" boolean DEFAULT true;

-- Add capacity and configuration columns
ALTER TABLE hunting_properties
ADD COLUMN IF NOT EXISTS "maxWaterfowlHunters" integer,
ADD COLUMN IF NOT EXISTS "maxTotalPeople" integer;

-- Add overnight configuration
ALTER TABLE hunting_properties
ADD COLUMN IF NOT EXISTS "overnightEnabled" boolean DEFAULT true;

-- Add media and access columns
ALTER TABLE hunting_properties
ADD COLUMN IF NOT EXISTS "mapImageUrl" varchar(500),
ADD COLUMN IF NOT EXISTS "mapUrl" varchar(500),
ADD COLUMN IF NOT EXISTS "gateCode" varchar(255);

-- Add display configuration
ALTER TABLE hunting_properties
ADD COLUMN IF NOT EXISTS "featuredOnPublicSite" boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS "sortOrder" integer DEFAULT 0;
