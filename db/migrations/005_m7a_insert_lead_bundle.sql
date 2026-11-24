-- M7A-R1 MIGRATION 005 — ordered executable draft.
-- DO NOT EXECUTE against remote/hosted DB without Atlas/Owner authorization.
-- Moves insert_lead_bundle into the migration sequence with:
--   * payload_hash for idempotency conflict detection
--   * notification_outbox row in the same transaction
--   * advisory xact lock + UNIQUE idempotency handling (concurrent-safe)
--   * least-privilege REVOKE from PUBLIC / anon / authenticated

BEGIN;

-- ---------------------------------------------------------------------------
-- Schema extensions for conflict detection + durable notify outbox
-- ---------------------------------------------------------------------------
ALTER TABLE submission_requests
  ADD COLUMN IF NOT EXISTS payload_hash text
    CHECK (payload_hash IS NULL OR char_length(payload_hash) = 64);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  submission_id   uuid NOT NULL REFERENCES submission_requests(id) ON DELETE RESTRICT,
  channel         text NOT NULL DEFAULT 'owner_email',
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'sent', 'failed', 'dead')),
  -- Non-PII notify envelope only (receipt + form metadata). Never store email/message.
  payload_json    jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts        integer NOT NULL DEFAULT 0,
  last_error      text NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_outbox_status_idx
  ON notification_outbox (status, created_at);

COMMENT ON TABLE notification_outbox IS
  'Durable owner-notify outbox. Commit atomically with lead/consent/submission. Replay integrity still requires hosted verification — do not claim near-zero recovery.';

ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE notification_outbox FROM anon, authenticated, PUBLIC;

-- ---------------------------------------------------------------------------
-- insert_lead_bundle — SECURITY DEFINER, fixed search_path, service_role only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_lead_bundle(
  p_form_name text,
  p_name text,
  p_email citext,
  p_company text,
  p_phone text,
  p_service text,
  p_timeline text,
  p_budget text,
  p_message text,
  p_source text,
  p_advisor_brief text,
  p_page_path text,
  p_privacy_version text,
  p_ip_hash text,
  p_user_agent text,
  p_is_test boolean,
  p_idempotency_key text,
  p_received_at timestamptz,
  p_payload_hash text DEFAULT NULL
)
RETURNS TABLE (
  lead_id uuid,
  consent_id uuid,
  submission_id uuid,
  outbox_id uuid,
  duplicate boolean,
  received_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_lead uuid;
  v_consent uuid;
  v_sub uuid;
  v_outbox uuid;
  v_prior_hash text;
  v_prior_received timestamptz;
BEGIN
  -- Serialize concurrent same-key attempts within this transaction.
  -- Canonical body superseded/hardened further by migration 006.
  IF p_idempotency_key IS NOT NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_idempotency_key));

    SELECT s.lead_id, s.consent_id, s.id, s.payload_hash, s.received_at
      INTO v_lead, v_consent, v_sub, v_prior_hash, v_prior_received
    FROM public.submission_requests s
    WHERE s.idempotency_key = p_idempotency_key
      AND s.status = 'accepted'
    LIMIT 1;

    IF v_sub IS NOT NULL THEN
      IF p_payload_hash IS NOT NULL
         AND v_prior_hash IS NOT NULL
         AND v_prior_hash <> p_payload_hash THEN
        RAISE EXCEPTION 'idempotency_payload_conflict'
          USING ERRCODE = 'P0001';
      END IF;

      SELECT o.id INTO v_outbox
      FROM public.notification_outbox o
      WHERE o.submission_id = v_sub
      LIMIT 1;

      lead_id := v_lead;
      consent_id := v_consent;
      submission_id := v_sub;
      outbox_id := v_outbox;
      duplicate := true;
      received_at := v_prior_received;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.leads (
    form_name, name, email, company, phone, service, timeline, budget,
    message, source, advisor_brief, page_path, privacy_version,
    ip_hash, user_agent, is_test, received_at
  ) VALUES (
    p_form_name, p_name, p_email, p_company, p_phone, p_service, p_timeline, p_budget,
    p_message, p_source, p_advisor_brief, p_page_path, p_privacy_version,
    p_ip_hash, p_user_agent, COALESCE(p_is_test, false), p_received_at
  ) RETURNING id INTO v_lead;

  INSERT INTO public.consent_records (
    lead_id, consent_given, privacy_version, consent_text_version,
    captured_at, source, form_name
  ) VALUES (
    v_lead, true, p_privacy_version, p_privacy_version,
    p_received_at, p_source, p_form_name
  ) RETURNING id INTO v_consent;

  BEGIN
    INSERT INTO public.submission_requests (
      lead_id, consent_id, idempotency_key, payload_hash, status, form_name, received_at
    ) VALUES (
      v_lead, v_consent, p_idempotency_key, p_payload_hash, 'accepted', p_form_name, p_received_at
    ) RETURNING id INTO v_sub;
  EXCEPTION WHEN unique_violation THEN
    -- Concurrent loser: abort for client retry (advisory lock normally prevents this).
    RAISE EXCEPTION 'idempotency_race_retry'
      USING ERRCODE = '40001'; -- serialization_failure
  END;

  INSERT INTO public.notification_outbox (
    lead_id, submission_id, channel, status, payload_json
  ) VALUES (
    v_lead,
    v_sub,
    'owner_email',
    'pending',
    jsonb_build_object(
      'receipt', left(v_sub::text, 8),
      'formName', p_form_name,
      'source', p_source,
      'receivedAt', p_received_at,
      'isTest', COALESCE(p_is_test, false)
    )
  ) RETURNING id INTO v_outbox;

  lead_id := v_lead;
  consent_id := v_consent;
  submission_id := v_sub;
  outbox_id := v_outbox;
  duplicate := false;
  received_at := p_received_at;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.insert_lead_bundle IS
  'Atomic lead+consent+submission+outbox insert with idempotency key reservation. SERVICE ROLE ONLY.';

-- ---------------------------------------------------------------------------
-- Least privilege — revoke unintended executors; grant service_role only
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.insert_lead_bundle(
  text, text, citext, text, text, text, text, text, text, text, text, text, text,
  text, text, boolean, text, timestamptz, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.insert_lead_bundle(
  text, text, citext, text, text, text, text, text, text, text, text, text, text,
  text, text, boolean, text, timestamptz, text
) FROM anon, authenticated;

-- Executable grants for dedicated runtime roles live in migration 006
-- (scs_intake_runtime). Do NOT grant to administrative postgres or anon.
-- Supabase service_role JWT is NOT interchangeable with node-postgres DB roles.

-- Harden related SECURITY DEFINER helpers from prior migrations (idempotent).
DO $$
BEGIN
  BEGIN
    REVOKE ALL ON FUNCTION public.atomic_counter_incr(text, bigint) FROM PUBLIC, anon, authenticated;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
  BEGIN
    REVOKE ALL ON FUNCTION public.atomic_counter_expire(text, integer) FROM PUBLIC, anon, authenticated;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
  BEGIN
    REVOKE ALL ON FUNCTION public.atomic_counter_get(text) FROM PUBLIC, anon, authenticated;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
  BEGIN
    REVOKE ALL ON FUNCTION public.idempotency_set_nx(text, text, integer) FROM PUBLIC, anon, authenticated;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
END $$;

COMMIT;
