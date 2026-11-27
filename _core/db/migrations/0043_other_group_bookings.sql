-- ═══════════════════════════════════════════════════════════════════════════════
-- 0043 — Other Groups: family, social and other group bookings (features/other-groups)
-- ═══════════════════════════════════════════════════════════════════════════════
-- * New enums other_group_status, other_group_event_type and table
--   other_group_bookings (modelled on hunting_group_bookings, 0042).
-- * inquiry_type gains 'other_group' (public inquiry form → Inquiry booking).
-- Additive and repeat-safe. (ADD VALUE inside a transaction needs PG 12+; the
-- new enum value is not used in this file.)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE other_group_status AS ENUM (
    'inquiry', 'contacted', 'proposal_sent', 'contract_out',
    'confirmed', 'completed', 'cancelled', 'lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE other_group_event_type AS ENUM (
    'family_reunion', 'birthday_anniversary', 'holiday_party',
    'church_nonprofit', 'school_youth', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS other_group_bookings (
  id                    integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  status                other_group_status NOT NULL DEFAULT 'inquiry',
  "groupName"           varchar(255) NOT NULL,
  "contactName"         varchar(255) NOT NULL,
  "contactEmail"        varchar(320) NOT NULL,
  "contactPhone"        varchar(50),
  "mailingStreet"       varchar(255),
  "mailingCity"         varchar(120),
  "mailingState"        varchar(50),
  "mailingZip"          varchar(20),
  "eventType"           other_group_event_type,
  "eventTypeOther"      varchar(255),
  "arrivalDate"         date,
  "departureDate"       date,
  "guestCount"          integer,
  "propertyIds"         integer[] NOT NULL DEFAULT '{}',
  "lodgingRequired"     boolean NOT NULL DEFAULT false,
  "lodgingNotes"        text,
  "mealsRequired"       boolean NOT NULL DEFAULT false,
  "cateringNotes"       text,
  "hostingMemberId"     integer,
  source                varchar(50) DEFAULT 'website',
  "referredBy"          varchar(255),
  "contractValue"       numeric(10, 2),
  "depositAmount"       numeric(10, 2),
  "depositReceivedDate" date,
  "balanceDueDate"      date,
  "balanceReceivedDate" date,
  notes                 text,
  "createdAt"           timestamp NOT NULL DEFAULT now(),
  "updatedAt"           timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ogb_status_idx        ON other_group_bookings (status);
CREATE INDEX IF NOT EXISTS ogb_arrival_date_idx  ON other_group_bookings ("arrivalDate");
CREATE INDEX IF NOT EXISTS ogb_event_type_idx    ON other_group_bookings ("eventType");
CREATE INDEX IF NOT EXISTS ogb_contact_email_idx ON other_group_bookings ("contactEmail");
CREATE INDEX IF NOT EXISTS ogb_created_at_idx    ON other_group_bookings ("createdAt");

-- Public inquiry form: "Other Group" inquiries.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inquiry_type') THEN
    ALTER TYPE inquiry_type ADD VALUE IF NOT EXISTS 'other_group';
  END IF;
END $$;
