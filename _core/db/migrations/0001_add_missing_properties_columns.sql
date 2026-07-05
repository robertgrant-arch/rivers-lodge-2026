-- Add missing columns to hunting_properties table
-- Comprehensive migration that adds all columns defined in schema but missing from production DB

-- String columns
ALTER TABLE hunting_properties
ADD COLUMN IF NOT EXISTS "shortName" varchar(40),
ADD COLUMN IF NOT EXISTS "shortDescription" varchar(280),
ADD COLUMN IF NOT EXISTS "locationNotes" varchar(300),
ADD COLUMN IF NOT EXISTS "coverImageUrl" varchar(500),
ADD COLUMN IF NOT EXISTS "mapImageUrl" varchar(500),
ADD COLUMN IF NOT EXISTS "mapUrl" varchar(500),
ADD COLUMN IF NOT EXISTS "gateCode" varchar(255);

-- Decimal columns (GPS coordinates)
ALTER TABLE hunting_properties
ADD COLUMN IF NOT EXISTS "gpsLat" numeric(10, 7),
ADD COLUMN IF NOT EXISTS "gpsLng" numeric(10, 7),
ADD COLUMN IF NOT EXISTS "acreage" numeric(8, 2);

-- JSON columns for booking configuration
ALTER TABLE hunting_properties
ADD COLUMN IF NOT EXISTS "secondaryActivities" jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "bookingModes" jsonb DEFAULT '["AM","PM"]'::jsonb;

-- Boolean columns for amenities and features
ALTER TABLE hunting_properties
ADD COLUMN IF NOT EXISTS "hasHeatedBlind" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "hasAtvAccess" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "hasWaterAccess" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "hasElectricity" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "hasCellService" boolean DEFAULT true;

-- Integer capacity columns
ALTER TABLE hunting_properties
ADD COLUMN IF NOT EXISTS "maxWaterfowlHunters" integer,
ADD COLUMN IF NOT EXISTS "maxTotalPeople" integer;

-- Boolean configuration columns
ALTER TABLE hunting_properties
ADD COLUMN IF NOT EXISTS "overnightEnabled" boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS "featuredOnPublicSite" boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS "sortOrder" integer DEFAULT 0;
