-- M7A DRAFT MIGRATION — DO NOT EXECUTE against external DB without Atlas/Owner approval.
-- Target: Supabase PostgreSQL (new project; never Factory plane).
-- Purpose: transactional lead intake foundation for public site + future owner dashboard.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ---------------------------------------------------------------------------
-- Enums / domain checks
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'new',
    'triaged',
    'in_conversation',
    'qualified',
    'declined',
    'won',
    'spam',
    'deleted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE submission_status AS ENUM (
    'accepted',
    'rejected',
    'honeypot',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- leads — PII + inquiry payload (service-role write; owner AAL2 read)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_name         text NOT NULL CHECK (form_name IN ('project-request', 'contact')),
  name              text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  email             citext NOT NULL,
  company           text NULL CHECK (company IS NULL OR char_length(company) <= 200),
  phone             text NULL CHECK (phone IS NULL OR char_length(phone) <= 40),
  service           text NULL,
  timeline          text NULL,
  budget            text NULL,
  message           text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 5000),
  source            text NOT NULL CHECK (source IN ('contact', 'advisor', 'project-request')),
  advisor_brief     text NULL CHECK (advisor_brief IS NULL OR char_length(advisor_brief) <= 8000),
  page_path         text NULL CHECK (page_path IS NULL OR char_length(page_path) <= 200),
  privacy_version   text NOT NULL,
  status            lead_status NOT NULL DEFAULT 'new',
  ip_hash           text NULL,
  user_agent        text NULL,
  honeypot_hit      boolean NOT NULL DEFAULT false,
  is_test           boolean NOT NULL DEFAULT false,
  received_at       timestamptz NOT NULL, -- server-generated at intake
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz NULL,
  CONSTRAINT leads_email_format CHECK (position('@' IN email) > 1)
);

CREATE INDEX IF NOT EXISTS leads_status_received_idx ON leads (status, received_at DESC);
CREATE INDEX IF NOT EXISTS leads_email_idx ON leads (email);
CREATE INDEX IF NOT EXISTS leads_source_idx ON leads (source);
CREATE INDEX IF NOT EXISTS leads_is_test_idx ON leads (is_test) WHERE is_test = true;
CREATE INDEX IF NOT EXISTS leads_deleted_at_idx ON leads (deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON TABLE leads IS 'Public lead records. No anonymous SELECT. Writes only via trusted Function service role.';

-- ---------------------------------------------------------------------------
-- consent_records — affirmative consent audit (immutable insert)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consent_records (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id               uuid NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  consent_given         boolean NOT NULL CHECK (consent_given = true),
  privacy_version       text NOT NULL,
  consent_text_version  text NOT NULL,
  captured_at           timestamptz NOT NULL,
  source                text NOT NULL,
  form_name             text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consent_records_lead_idx ON consent_records (lead_id);
CREATE INDEX IF NOT EXISTS consent_records_privacy_idx ON consent_records (privacy_version);

COMMENT ON TABLE consent_records IS 'Append-only affirmative consent evidence. consent_given must be true.';

-- ---------------------------------------------------------------------------
-- submission_requests — idempotency + intake receipt tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS submission_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid NULL REFERENCES leads(id) ON DELETE SET NULL,
  consent_id        uuid NULL REFERENCES consent_records(id) ON DELETE SET NULL,
  idempotency_key   text NULL,
  status            submission_status NOT NULL,
  form_name         text NOT NULL,
  received_at       timestamptz NOT NULL,
  error_code        text NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT submission_requests_idempotency_key_len
    CHECK (idempotency_key IS NULL OR char_length(idempotency_key) BETWEEN 8 AND 128)
);

CREATE UNIQUE INDEX IF NOT EXISTS submission_requests_idempotency_uidx
  ON submission_requests (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS submission_requests_received_idx
  ON submission_requests (received_at DESC);

COMMENT ON TABLE submission_requests IS 'Idempotent intake ledger. Unique idempotency_key prevents double persist.';

COMMIT;
