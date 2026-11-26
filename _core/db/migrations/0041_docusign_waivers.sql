-- ═══════════════════════════════════════════════════════════════════════════════
-- 0041 — DocuSign waivers: Master waiver per member + Booking waiver per booking
-- ═══════════════════════════════════════════════════════════════════════════════
-- * waiver_templates gets a kind ('master' | 'booking').
-- * Party roster tables (booking_party_adults / booking_party_minors) are created
--   if an older environment never got them, and gain removedAt / dateOfBirth.
-- * New: waiver_settings, member_master_waivers, booking_waiver_envelopes,
--   booking_waiver_signers, booking_waiver_acceptances.
-- * property_booking_status gains 'pending_waiver' and 'expired_waiver'.
-- Additive and repeat-safe. (ADD VALUE inside a transaction needs PG 12+; the
-- new enum values are not used in this file.)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TYPE property_booking_status ADD VALUE IF NOT EXISTS 'pending_waiver';
ALTER TYPE property_booking_status ADD VALUE IF NOT EXISTS 'expired_waiver';

ALTER TABLE property_bookings
  ADD COLUMN IF NOT EXISTS "waiverSummarySentAt" bigint;

-- ── Waiver templates (guarded: older environments may predate drizzle push) ────
DO $$ BEGIN
  CREATE TYPE waiver_template_type AS ENUM ('general', 'hunt', 'fish', 'sporting_clays', 'event');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS waiver_templates (
  id                integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "templateName"    varchar(255) NOT NULL,
  "templateType"    waiver_template_type DEFAULT 'general',
  description       text,
  "bodyText"        text NOT NULL,
  "fileKey"         varchar(500),
  "fileName"        varchar(255),
  "expiresInDays"   integer,
  version           integer NOT NULL DEFAULT 1,
  active            boolean NOT NULL DEFAULT true,
  archived          boolean NOT NULL DEFAULT false,
  "createdByUserId" varchar(36),
  "createdAt"       timestamp NOT NULL DEFAULT now(),
  "updatedAt"       timestamp NOT NULL DEFAULT now()
);

ALTER TABLE waiver_templates
  ADD COLUMN IF NOT EXISTS "waiverKind" varchar(16) NOT NULL DEFAULT 'booking';

-- ── Party roster ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE waiver_status AS ENUM ('pending', 'sent', 'completed', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS booking_party_adults (
  id                   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "bookingId"          integer NOT NULL,
  "fullName"           varchar(255) NOT NULL,
  phone                varchar(20),
  email                varchar(255) NOT NULL,
  "isDesignatedMember" boolean NOT NULL DEFAULT false,
  "waiverStatus"       waiver_status NOT NULL DEFAULT 'pending',
  "waiverProvider"     text,
  "waiverEnvelopeId"   varchar(255),
  "waiverSentAt"       bigint,
  "waiverCompletedAt"  bigint,
  "createdAt"          bigint NOT NULL,
  "updatedAt"          bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS bpa_booking_idx ON booking_party_adults ("bookingId");
CREATE INDEX IF NOT EXISTS bpa_email_idx ON booking_party_adults (email);
CREATE INDEX IF NOT EXISTS bpa_waiver_status_idx ON booking_party_adults ("waiverStatus");
ALTER TABLE booking_party_adults ADD COLUMN IF NOT EXISTS "removedAt" bigint;

CREATE TABLE IF NOT EXISTS booking_party_minors (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "bookingId" integer NOT NULL,
  "adultId"   integer NOT NULL,
  "fullName"  varchar(255) NOT NULL,
  "createdAt" bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS bpm_booking_idx ON booking_party_minors ("bookingId");
CREATE INDEX IF NOT EXISTS bpm_adult_idx ON booking_party_minors ("adultId");
ALTER TABLE booking_party_minors
  ADD COLUMN IF NOT EXISTS "dateOfBirth" date,
  ADD COLUMN IF NOT EXISTS "removedAt"   bigint;

-- ── Ops settings (single row, id = 1) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waiver_settings (
  id                         integer PRIMARY KEY,
  "masterRenewsEvery12Months" boolean NOT NULL DEFAULT false,
  "autoSendMasterOnNewMember" boolean NOT NULL DEFAULT true,
  "memberSignHoldHours"       integer NOT NULL DEFAULT 24,
  "updatedByUserId"           varchar(36),
  "updatedAt"                 bigint NOT NULL DEFAULT 0
);
INSERT INTO waiver_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── Master waiver (one current record per member; history kept) ─────────────────
CREATE TABLE IF NOT EXISTS member_master_waivers (
  id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "memberId"          integer NOT NULL,
  "userId"            varchar(36),
  "templateId"        integer,
  "templateVersion"   integer,
  status              varchar(16) NOT NULL DEFAULT 'queued', -- queued|sent|viewed|signed|declined|expired|voided|failed
  "signerName"        varchar(255) NOT NULL,
  "signerEmail"       varchar(320) NOT NULL,
  "signerPhone"       varchar(20),
  "deliveryMethod"    varchar(16) NOT NULL DEFAULT 'email_sms', -- email_sms | email
  "envelopeId"        varchar(64),
  "recipientId"       varchar(16),
  attempts            integer NOT NULL DEFAULT 0,
  "nextAttemptAt"     bigint,
  "firstFailureAt"    bigint,
  "opsAlertedAt"      bigint,
  "lastError"         text,
  "sentAt"            bigint,
  "viewedAt"          bigint,
  "signedAt"          bigint,
  "declinedAt"        bigint,
  "lastPolledAt"      bigint,
  "signedPdfKey"      varchar(500),
  "certificatePdfKey" varchar(500),
  "invalidatedAt"     bigint,
  "invalidatedReason" varchar(255),
  "invalidatedByUserId" varchar(36),
  "createdAt"         bigint NOT NULL,
  "updatedAt"         bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS mmw_member_idx ON member_master_waivers ("memberId");
CREATE INDEX IF NOT EXISTS mmw_envelope_idx ON member_master_waivers ("envelopeId");
CREATE INDEX IF NOT EXISTS mmw_status_idx ON member_master_waivers (status);

-- ── Booking waiver envelopes (one per booking; split when >10 SMS signers) ──────
CREATE TABLE IF NOT EXISTS booking_waiver_envelopes (
  id               integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "bookingId"      integer NOT NULL,
  "envelopeId"     varchar(64),
  status           varchar(16) NOT NULL DEFAULT 'queued', -- queued|sent|completed|voided|failed
  "emailOnly"      boolean NOT NULL DEFAULT false,
  attempts         integer NOT NULL DEFAULT 0,
  "nextAttemptAt"  bigint,
  "firstFailureAt" bigint,
  "opsAlertedAt"   bigint,
  "lastError"      text,
  "sentAt"         bigint,
  "completedAt"    bigint,
  "voidedAt"       bigint,
  "lastPolledAt"   bigint,
  "certificatePdfKey" varchar(500),
  "createdAt"      bigint NOT NULL,
  "updatedAt"      bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS bwe_booking_idx ON booking_waiver_envelopes ("bookingId");
CREATE INDEX IF NOT EXISTS bwe_envelope_idx ON booking_waiver_envelopes ("envelopeId");
CREATE INDEX IF NOT EXISTS bwe_status_idx ON booking_waiver_envelopes (status);

-- ── Booking waiver signers (one per adult per booking: member + adult guests) ──
CREATE TABLE IF NOT EXISTS booking_waiver_signers (
  id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "bookingId"         integer NOT NULL,
  "partyAdultId"      integer,
  "envelopeRowId"     integer,
  role                varchar(16) NOT NULL, -- member | guest
  "fullName"          varchar(255) NOT NULL,
  email               varchar(320) NOT NULL,
  phone               varchar(20),
  minors              jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{fullName, dateOfBirth}]
  "templateId"        integer,
  "templateVersion"   integer,
  "documentId"        varchar(16),
  status              varchar(16) NOT NULL DEFAULT 'queued', -- queued|sent|viewed|signed|declined|expired|voided|failed|removed
  "deliveryMethod"    varchar(16) NOT NULL DEFAULT 'email_sms',
  "lastError"         text,
  "sentAt"            bigint,
  "viewedAt"          bigint,
  "signedAt"          bigint,
  "declinedAt"        bigint,
  "declineReason"     text,
  "reminder72SentAt"  bigint,
  "reminder24SentAt"  bigint,
  "removedAt"         bigint,
  "signedPdfKey"      varchar(500),
  "certificatePdfKey" varchar(500),
  "createdAt"         bigint NOT NULL,
  "updatedAt"         bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS bws_booking_idx ON booking_waiver_signers ("bookingId");
CREATE INDEX IF NOT EXISTS bws_envelope_row_idx ON booking_waiver_signers ("envelopeRowId");
CREATE INDEX IF NOT EXISTS bws_status_idx ON booking_waiver_signers (status);

-- ── Checkbox acceptance at booking ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_waiver_acceptances (
  id                integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "userId"          varchar(36) NOT NULL,
  "bookingId"       integer NOT NULL,
  "waiverTemplateId" integer,
  "waiverVersion"   integer,
  "acceptanceText"  text NOT NULL,
  "acceptedAt"      bigint NOT NULL,
  "ipAddress"       varchar(64),
  "userAgent"       varchar(512)
);
CREATE INDEX IF NOT EXISTS bwa_booking_idx ON booking_waiver_acceptances ("bookingId");
