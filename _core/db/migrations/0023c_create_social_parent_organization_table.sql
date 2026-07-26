-- Create social_parent_organization table for organizing Social tier members
-- Social members belong to organizations (e.g., clubs, groups) with booking allowances

CREATE TABLE IF NOT EXISTS social_parent_organization (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(255) NOT NULL,
  annual_booking_allowance INTEGER NOT NULL,
  period_start_date DATE NOT NULL,
  notes TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_social_parent_org_name ON social_parent_organization(name);
CREATE INDEX IF NOT EXISTS idx_social_parent_org_period ON social_parent_organization(period_start_date);
