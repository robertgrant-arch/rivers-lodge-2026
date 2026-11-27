-- ═══════════════════════════════════════════════════════════════════════════════
-- 0042 — Hunting Groups: new event type (features/hunting-groups)
-- ═══════════════════════════════════════════════════════════════════════════════
-- * New enum hunting_group_status and table hunting_group_bookings.
-- * inquiry_type gains 'hunting_group' (public inquiry form → Inquiry booking).
-- Additive and repeat-safe. (ADD VALUE inside a transaction needs PG 12+; the
-- new enum value is not used in this file.)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE hunting_group_status AS ENUM (
    'inquiry', 'contacted', 'proposal_sent', 'contract_out',
    'confirmed', 'completed', 'cancelled', 'lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS hunting_group_bookings (
  id                    integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  status                hunting_group_status NOT NULL DEFAULT 'inquiry',
  "groupName"           varchar(255) NOT NULL,
  "contactName"         varchar(255) NOT NULL,
  "contactEmail"        varchar(320) NOT NULL,
  "contactPhone"        varchar(50),
  "mailingStreet"       varchar(255),
  "mailingCity"         varchar(120),
  "mailingState"        varchar(50),
  "mailingZip"          varchar(20),
  "arrivalDate"         date,
  "departureDate"       date,
  "partySize"           integer,
  species               text[] NOT NULL DEFAULT '{}',
  "propertyIds"         integer[] NOT NULL DEFAULT '{}',
  "guideUserIds"        varchar(36)[] NOT NULL DEFAULT '{}',
  "lodgingRequired"     boolean NOT NULL DEFAULT false,
  "lodgingNotes"        text,
  "mealsRequired"       boolean NOT NULL DEFAULT false,
  "cateringNotes"       text,
  "licensesConfirmed"   boolean NOT NULL DEFAULT false,
  "linkedMemberId"      integer,
  "contractValue"       numeric(10, 2),
  "depositAmount"       numeric(10, 2),
  "depositReceivedDate" date,
  "balanceDueDate"      date,
  "balanceReceivedDate" date,
  source                varchar(50) DEFAULT 'website',
  "referredBy"          varchar(255),
  "repeatClient"        boolean NOT NULL DEFAULT false,
  "assignedUserId"      varchar(36),
  notes                 text,
  "createdAt"           timestamp NOT NULL DEFAULT now(),
  "updatedAt"           timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hgb_status_idx        ON hunting_group_bookings (status);
CREATE INDEX IF NOT EXISTS hgb_arrival_date_idx  ON hunting_group_bookings ("arrivalDate");
CREATE INDEX IF NOT EXISTS hgb_contact_email_idx ON hunting_group_bookings ("contactEmail");
CREATE INDEX IF NOT EXISTS hgb_created_at_idx    ON hunting_group_bookings ("createdAt");

-- Public inquiry form: "Hunting Group" inquiries.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inquiry_type') THEN
    ALTER TYPE inquiry_type ADD VALUE IF NOT EXISTS 'hunting_group';
  END IF;
END $$;
