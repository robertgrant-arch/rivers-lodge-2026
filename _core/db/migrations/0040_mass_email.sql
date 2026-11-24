-- ═══════════════════════════════════════════════════════════════════════════════
-- 0040 — Mass email (Ops Portal → Newsletter)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Extends the existing newsletters table so staff can send real bulk email via
-- Resend, and adds per-recipient delivery tracking, unsubscribes, delivery
-- events (bounces/complaints) and the employee-approval setting.
-- Additive and repeat-safe. (ADD VALUE inside a transaction needs PG 12+; the
-- new enum values are not used in this file.)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TYPE newsletter_status ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE newsletter_status ADD VALUE IF NOT EXISTS 'sending';

ALTER TABLE newsletters
  ADD COLUMN IF NOT EXISTS "bodyText"          text,
  ADD COLUMN IF NOT EXISTS "audience"          jsonb,
  ADD COLUMN IF NOT EXISTS "audienceLabel"     varchar(255),
  ADD COLUMN IF NOT EXISTS "senderName"        varchar(255),
  ADD COLUMN IF NOT EXISTS "replyTo"           varchar(320),
  ADD COLUMN IF NOT EXISTS "failedCount"       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "requestedSendMode" varchar(16),
  ADD COLUMN IF NOT EXISTS "sendStartedAt"     timestamp,
  ADD COLUMN IF NOT EXISTS "duplicatedFromId"  integer;

-- One row per recipient of a sent email.
CREATE TABLE IF NOT EXISTS email_recipients (
  id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  newsletter_id       integer      NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  email               varchar(320) NOT NULL,
  name                varchar(255),
  status              varchar(16)  NOT NULL DEFAULT 'queued',  -- queued | sent | failed | bounced | complained
  provider_message_id varchar(120),
  attempts            integer      NOT NULL DEFAULT 0,
  error               text,
  sent_at             timestamp,
  created_at          timestamp    NOT NULL DEFAULT now(),
  CONSTRAINT email_recipients_unique UNIQUE (newsletter_id, email)
);
CREATE INDEX IF NOT EXISTS email_recipients_status_idx ON email_recipients (newsletter_id, status);
CREATE INDEX IF NOT EXISTS email_recipients_msg_idx ON email_recipients (provider_message_id);

-- Addresses that must not receive bulk email (honoured by every bulk send).
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  email            varchar(320) PRIMARY KEY,      -- lower-case
  source           varchar(16)  NOT NULL,         -- link | one_click | complaint | bounce | admin
  newsletter_id    integer,
  created_at       timestamp    NOT NULL DEFAULT now()
);

-- Delivery events reported by Resend's webhook.
CREATE TABLE IF NOT EXISTS email_events (
  id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider_message_id varchar(120),
  email               varchar(320),
  type                varchar(40)  NOT NULL,      -- email.bounced | email.complained | ...
  detail              jsonb,
  created_at          timestamp    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_events_msg_idx ON email_events (provider_message_id);

-- Single-row settings for mass email.
CREATE TABLE IF NOT EXISTS email_settings (
  id                        integer PRIMARY KEY DEFAULT 1,
  require_employee_approval boolean NOT NULL DEFAULT true,
  updated_by                varchar(36),
  updated_at                timestamp NOT NULL DEFAULT now(),
  CONSTRAINT email_settings_single_row CHECK (id = 1)
);
INSERT INTO email_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
