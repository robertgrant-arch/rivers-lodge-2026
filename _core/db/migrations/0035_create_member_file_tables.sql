-- ═══════════════════════════════════════════════════════════════════════════════
-- Member File: profile, family, health & safety, preferences, admin, staff notes
-- ═══════════════════════════════════════════════════════════════════════════════
-- Purely additive. Creates three NEW tables keyed to members(id); the existing
-- members table and its data are not altered in any way.
--
--   member_profiles     one optional row per member (created on first save —
--                       no row is created or guessed for existing members)
--   member_children     repeatable list of children per member
--   member_staff_notes  append-only, timestamped staff note log (author + date)
--
-- Membership number/type/status/join/renewal dates and the general notes field
-- stay in the existing members columns and are NOT duplicated here.
--
-- Idempotent: safe to re-run on every build (scripts/run-migrations.mjs re-runs
-- every file) and at boot (apply-sql-migrations.ts records it once).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS member_profiles (
  member_id                    INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,

  -- Profile & Contact
  photo_key                    TEXT,         -- private storage key; served only as a short-lived signed URL
  full_name                    VARCHAR(255),
  preferred_name               VARCHAR(120),
  cell_phone                   VARCHAR(50),
  work_phone                   VARCHAR(50),
  address_street               VARCHAR(255),
  address_city                 VARCHAR(120),
  address_state                VARCHAR(50),
  address_zip                  VARCHAR(20),
  birthday_month               SMALLINT CHECK (birthday_month BETWEEN 1 AND 12),
  birthday_day                 SMALLINT CHECK (birthday_day BETWEEN 1 AND 31),
  birthday_year                SMALLINT CHECK (birthday_year BETWEEN 1900 AND 2100),
  company                      VARCHAR(255),
  job_title                    VARCHAR(255),
  preferred_contact_method     VARCHAR(16) CHECK (preferred_contact_method IN ('text', 'email', 'phone')),
  comm_booking_notices         BOOLEAN,
  comm_newsletter              BOOLEAN,

  -- Family & Emergency
  spouse_name                  VARCHAR(255),
  spouse_phone                 VARCHAR(50),
  spouse_email                 VARCHAR(320),
  spouse_included              BOOLEAN,
  emergency_contact_name       VARCHAR(255),
  emergency_contact_relationship VARCHAR(120),
  emergency_contact_phone      VARCHAR(50),

  -- Health & Safety (staff-only)
  food_allergies               TEXT,
  other_allergies              TEXT,
  dietary_restrictions         TEXT,
  medical_notes                TEXT,
  accessibility_needs          TEXT,

  -- Preferences
  favorite_drink               VARCHAR(255),
  prefers_nonalcoholic         BOOLEAN,
  favorite_food                VARCHAR(255),
  favorite_activity            VARCHAR(255),
  activity_interests           JSONB,        -- [{ "activity": "Fishing", "level": "Beginner" }, ...]
  favorite_property_id         INTEGER,      -- hunting_properties.id (validated by the API)
  equipment_needs              TEXT,
  trip_styles                  JSONB,        -- ["Family outing", "Guided", ...]
  things_to_know               TEXT,

  -- Membership & Admin (staff-managed; core membership values stay on members)
  household_or_company         VARCHAR(255),
  referred_by                  VARCHAR(255),
  referral_source              VARCHAR(255),
  assigned_staff_employee_id   INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  orientation_completed        BOOLEAN,
  orientation_date             DATE,

  created_at                   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by_user_id           VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS member_children (
  id                     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id              INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  name                   VARCHAR(255) NOT NULL,
  preferred_name         VARCHAR(120),
  birth_month            SMALLINT CHECK (birth_month BETWEEN 1 AND 12),
  birth_year             SMALLINT CHECK (birth_year BETWEEN 1900 AND 2100),
  age_group              VARCHAR(32),
  included_in_membership BOOLEAN,           -- informational only; grants no booking or login rights
  sort_order             INTEGER NOT NULL DEFAULT 0,
  created_at             TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS member_children_member_idx ON member_children(member_id);

CREATE TABLE IF NOT EXISTS member_staff_notes (
  id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id        INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  body             TEXT NOT NULL,
  author_user_id   VARCHAR(36),
  author_email     VARCHAR(320),
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS member_staff_notes_member_idx ON member_staff_notes(member_id, created_at DESC);
