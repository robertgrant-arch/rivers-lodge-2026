-- Create property_activities table if it doesn't exist
-- This table links properties to their available activities (many-to-many join)

CREATE TABLE IF NOT EXISTS property_activities (
  "propertyId" integer NOT NULL REFERENCES hunting_properties(id) ON DELETE CASCADE,
  activity varchar(50) NOT NULL,
  PRIMARY KEY ("propertyId", activity)
);

-- Create index for activity lookups
CREATE INDEX IF NOT EXISTS pa_activity_idx ON property_activities(activity);

-- Create property_activities_property_idx if not exists
CREATE INDEX IF NOT EXISTS pa_property_idx ON property_activities("propertyId");
