-- M7A-R2 MIGRATION 006 — local draft only.
-- DO NOT EXECUTE against remote/hosted DB without Atlas/Owner authorization.
--
-- Covers:
--   A2  Dedicated runtime principals (intake / notify / migration / owner)
--   A3  Executable grants + SECURITY DEFINER search_path hardening (ALL privileged RPCs)
--   A5  Durable idempotency: return persisted received_at; require payload_hash
--   A7  Retention/purge integrity across outbox + deletion markers
--   B   Notification worker claim/lease columns + claim RPC
--
-- node-postgres DB roles are NOT interchangeable with Supabase service_role JWT.

BEGIN;

-- ---------------------------------------------------------------------------
-- A2 — Dedicated principals (no-op if roles already exist / not creatable)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'scs_intake_runtime') THEN
    CREATE ROLE scs_intake_runtime NOINHERIT LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'scs_notify_worker') THEN
    CREATE ROLE scs_notify_worker NOINHERIT LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'scs_migration') THEN
    CREATE ROLE scs_migration NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'scs_owner_admin') THEN
    CREATE ROLE scs_owner_admin NOINHERIT;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'scs_* role creation skipped (insufficient privilege) — create at provision time';
  WHEN OTHERS THEN
    RAISE NOTICE 'scs_* role creation skipped: %', SQLERRM;
END $$;

COMMENT ON ROLE scs_intake_runtime IS
  'Minimum-privilege Function identity for lead intake (insert_lead_bundle + counters). NOT postgres admin.';
COMMENT ON ROLE scs_notify_worker IS
  'Minimum-privilege worker for notification_outbox claim/complete. Separate from intake.';
COMMENT ON ROLE scs_migration IS
  'Migration/DDL executor only. Never used as Function runtime identity.';
COMMENT ON ROLE scs_owner_admin IS
  'Owner administration RPCs (soft_delete / purge). Requires AAL2 app gate + RLS.';

-- Revoke schema CREATE from untrusted roles
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
DO $$
BEGIN
  REVOKE CREATE ON SCHEMA public FROM anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- A7 — Deletion markers (prevent stale replay recreating deleted leads)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lead_deletion_markers (
  idempotency_key   text PRIMARY KEY
                    CHECK (char_length(idempotency_key) BETWEEN 8 AND 128),
  lead_id           uuid NULL,
  deleted_at        timestamptz NOT NULL DEFAULT now(),
  reason            text NOT NULL DEFAULT 'soft_delete'
                    CHECK (char_length(reason) <= 64)
);

ALTER TABLE lead_deletion_markers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE lead_deletion_markers FROM PUBLIC;
DO $$
BEGIN
  REVOKE ALL ON TABLE lead_deletion_markers FROM anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

COMMENT ON TABLE lead_deletion_markers IS
  'Minimal tombstones so deleted leads are not recreated by stale idempotent replay.';

-- ---------------------------------------------------------------------------
-- B — Outbox worker columns (atomic claim / lease / retry)
-- ---------------------------------------------------------------------------
ALTER TABLE notification_outbox
  ADD COLUMN IF NOT EXISTS lease_owner text NULL,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz NULL;

-- ---------------------------------------------------------------------------
-- A5 — Harden insert_lead_bundle: return received_at; block deleted-key replay;
--      require non-null payload_hash when idempotency key present
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
  IF p_idempotency_key IS NOT NULL AND (p_payload_hash IS NULL OR char_length(p_payload_hash) <> 64) THEN
    RAISE EXCEPTION 'idempotency_payload_hash_required'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_idempotency_key));

    IF EXISTS (
      SELECT 1 FROM public.lead_deletion_markers m
      WHERE m.idempotency_key = p_idempotency_key
    ) THEN
      RAISE EXCEPTION 'idempotency_key_deleted'
        USING ERRCODE = 'P0001';
    END IF;

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
    RAISE EXCEPTION 'idempotency_race_retry'
      USING ERRCODE = '40001';
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
  'Atomic lead+consent+submission+outbox. Returns persisted received_at. scs_intake_runtime ONLY.';

-- ---------------------------------------------------------------------------
-- A3 — Re-harden ALL SECURITY DEFINER helpers with safe search_path
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_owner_aal2()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.owner_allowlist o
    WHERE o.user_id = auth.uid()
  )
  AND COALESCE(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

CREATE OR REPLACE FUNCTION public.atomic_counter_incr(
  p_key text,
  p_by bigint DEFAULT 1
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_next bigint;
BEGIN
  INSERT INTO public.usage_counters (counter_key, counter_value, expires_at, updated_at)
  VALUES (p_key, p_by, NULL, now())
  ON CONFLICT (counter_key) DO UPDATE
  SET counter_value = CASE
        WHEN public.usage_counters.expires_at IS NOT NULL
             AND public.usage_counters.expires_at <= now()
          THEN p_by
        ELSE public.usage_counters.counter_value + p_by
      END,
      expires_at = CASE
        WHEN public.usage_counters.expires_at IS NOT NULL
             AND public.usage_counters.expires_at <= now()
          THEN NULL
        ELSE public.usage_counters.expires_at
      END,
      updated_at = now()
  RETURNING counter_value INTO v_next;
  RETURN v_next;
END;
$$;

CREATE OR REPLACE FUNCTION public.atomic_counter_expire(
  p_key text,
  p_ttl_seconds integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.usage_counters
  SET expires_at = now() + make_interval(secs => p_ttl_seconds),
      updated_at = now()
  WHERE counter_key = p_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.atomic_counter_get(p_key text)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_row public.usage_counters%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.usage_counters WHERE counter_key = p_key;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at <= now() THEN
    RETURN 0;
  END IF;
  RETURN v_row.counter_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.idempotency_set_nx(
  p_key text,
  p_response_json text,
  p_ttl_seconds integer DEFAULT 86400
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  DELETE FROM public.idempotency_keys
  WHERE idem_key = p_key
    AND expires_at IS NOT NULL
    AND expires_at <= now();

  BEGIN
    INSERT INTO public.idempotency_keys (idem_key, response_json, expires_at)
    VALUES (
      p_key,
      p_response_json,
      CASE WHEN p_ttl_seconds IS NULL THEN NULL
           ELSE now() + make_interval(secs => p_ttl_seconds) END
    );
    RETURN true;
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;
END;
$$;

-- ---------------------------------------------------------------------------
-- A7 — Soft-delete + purge with outbox FK handling + deletion markers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.soft_delete_lead(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_key text;
BEGIN
  IF NOT public.is_owner_aal2() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT s.idempotency_key INTO v_key
  FROM public.submission_requests s
  WHERE s.lead_id = p_lead_id
    AND s.idempotency_key IS NOT NULL
  ORDER BY s.received_at DESC
  LIMIT 1;

  UPDATE public.leads
  SET status = 'deleted',
      deleted_at = now(),
      updated_at = now(),
      message = '[redacted]',
      advisor_brief = NULL,
      phone = NULL,
      company = NULL
  WHERE id = p_lead_id
    AND deleted_at IS NULL;

  IF v_key IS NOT NULL THEN
    INSERT INTO public.lead_deletion_markers (idempotency_key, lead_id, reason)
    VALUES (v_key, p_lead_id, 'soft_delete')
    ON CONFLICT (idempotency_key) DO UPDATE
      SET deleted_at = now(), lead_id = EXCLUDED.lead_id, reason = EXCLUDED.reason;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_deleted_leads(p_days integer DEFAULT 365)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF NOT public.is_owner_aal2() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- PENDING_FINAL_PRIVACY_APPROVAL for automated schedules.
  -- Order: outbox → consent → null submission refs → leads (outbox FK RESTRICT).
  WITH doomed AS (
    SELECT id FROM public.leads
    WHERE deleted_at IS NOT NULL
      AND deleted_at < now() - make_interval(days => p_days)
  ),
  del_outbox AS (
    DELETE FROM public.notification_outbox o
    WHERE o.lead_id IN (SELECT id FROM doomed)
    RETURNING 1
  ),
  clear_sub AS (
    UPDATE public.submission_requests s
    SET lead_id = NULL, consent_id = NULL
    WHERE lead_id IN (SELECT id FROM doomed)
    RETURNING 1
  ),
  del_consent AS (
    DELETE FROM public.consent_records c
    WHERE lead_id IN (SELECT id FROM doomed)
    RETURNING 1
  ),
  del_leads AS (
    DELETE FROM public.leads l
    WHERE id IN (SELECT id FROM doomed)
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM del_leads;

  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_test_leads(p_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF NOT public.is_owner_aal2() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  WITH doomed AS (
    SELECT id FROM public.leads
    WHERE is_test = true
      AND created_at < now() - make_interval(days => p_days)
  ),
  del_outbox AS (
    DELETE FROM public.notification_outbox o
    WHERE o.lead_id IN (SELECT id FROM doomed)
    RETURNING 1
  ),
  clear_sub AS (
    UPDATE public.submission_requests s
    SET lead_id = NULL, consent_id = NULL
    WHERE lead_id IN (SELECT id FROM doomed)
    RETURNING 1
  ),
  del_consent AS (
    DELETE FROM public.consent_records c
    WHERE lead_id IN (SELECT id FROM doomed)
    RETURNING 1
  ),
  del_leads AS (
    DELETE FROM public.leads l
    WHERE id IN (SELECT id FROM doomed)
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM del_leads;

  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_unconverted_leads(p_days integer DEFAULT 365)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- PENDING_FINAL_PRIVACY_APPROVAL — do not schedule until Owner/legal sign-off.
  IF NOT public.is_owner_aal2() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  WITH doomed AS (
    SELECT id FROM public.leads
    WHERE deleted_at IS NULL
      AND is_test = false
      AND status IN ('new', 'triaged', 'declined', 'spam')
      AND received_at < now() - make_interval(days => p_days)
  ),
  del_outbox AS (
    DELETE FROM public.notification_outbox o
    WHERE o.lead_id IN (SELECT id FROM doomed)
    RETURNING 1
  ),
  clear_sub AS (
    UPDATE public.submission_requests s
    SET lead_id = NULL, consent_id = NULL
    WHERE lead_id IN (SELECT id FROM doomed)
    RETURNING 1
  ),
  del_consent AS (
    DELETE FROM public.consent_records c
    WHERE lead_id IN (SELECT id FROM doomed)
    RETURNING 1
  ),
  del_leads AS (
    DELETE FROM public.leads l
    WHERE id IN (SELECT id FROM doomed)
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM del_leads;

  RETURN deleted_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- B — Atomic outbox claim (lease) + complete / fail
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_notification_outbox(
  p_worker_id text,
  p_limit integer DEFAULT 10,
  p_lease_seconds integer DEFAULT 60
)
RETURNS SETOF public.notification_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT o.id
    FROM public.notification_outbox o
    WHERE o.status IN ('pending', 'failed')
      AND o.next_attempt_at <= now()
      AND (o.lease_expires_at IS NULL OR o.lease_expires_at < now())
    ORDER BY o.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 50))
  )
  UPDATE public.notification_outbox o
  SET lease_owner = p_worker_id,
      lease_expires_at = now() + make_interval(secs => GREATEST(10, COALESCE(p_lease_seconds, 60))),
      attempts = o.attempts + 1,
      updated_at = now()
  WHERE o.id IN (SELECT id FROM candidates)
  RETURNING o.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_notification_outbox(
  p_id uuid,
  p_worker_id text,
  p_ok boolean,
  p_error text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_attempts integer;
BEGIN
  SELECT attempts INTO v_attempts
  FROM public.notification_outbox
  WHERE id = p_id AND lease_owner = p_worker_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF p_ok THEN
    UPDATE public.notification_outbox
    SET status = 'sent',
        delivered_at = now(),
        lease_owner = NULL,
        lease_expires_at = NULL,
        last_error = NULL,
        updated_at = now()
    WHERE id = p_id AND lease_owner = p_worker_id;
  ELSE
    UPDATE public.notification_outbox
    SET status = CASE WHEN COALESCE(v_attempts, 0) >= 8 THEN 'dead' ELSE 'failed' END,
        last_error = left(COALESCE(p_error, 'delivery_failed'), 500),
        lease_owner = NULL,
        lease_expires_at = NULL,
        next_attempt_at = now() + make_interval(secs => LEAST(3600, 15 * power(2, LEAST(COALESCE(v_attempts, 1), 8))::integer)),
        updated_at = now()
    WHERE id = p_id AND lease_owner = p_worker_id;
  END IF;
  RETURN true;
END;
$$;

-- ---------------------------------------------------------------------------
-- A3 — Executable least-privilege grants (actual principals, not comments)
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.insert_lead_bundle(
  text, text, citext, text, text, text, text, text, text, text, text, text, text,
  text, text, boolean, text, timestamptz, text
) FROM PUBLIC;
DO $$ BEGIN
  REVOKE ALL ON FUNCTION public.insert_lead_bundle(
    text, text, citext, text, text, text, text, text, text, text, text, text, text,
    text, text, boolean, text, timestamptz, text
  ) FROM anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

REVOKE ALL ON FUNCTION public.atomic_counter_incr(text, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.atomic_counter_expire(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.atomic_counter_get(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.idempotency_set_nx(text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_notification_outbox(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_notification_outbox(uuid, text, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_lead(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_deleted_leads(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_test_leads(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_unconverted_leads(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_owner_aal2() FROM PUBLIC;

DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.atomic_counter_incr(text, bigint) FROM anon, authenticated;
  REVOKE ALL ON FUNCTION public.atomic_counter_expire(text, integer) FROM anon, authenticated;
  REVOKE ALL ON FUNCTION public.atomic_counter_get(text) FROM anon, authenticated;
  REVOKE ALL ON FUNCTION public.idempotency_set_nx(text, text, integer) FROM anon, authenticated;
  REVOKE ALL ON FUNCTION public.claim_notification_outbox(text, integer, integer) FROM anon, authenticated;
  REVOKE ALL ON FUNCTION public.complete_notification_outbox(uuid, text, boolean, text) FROM anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Grant to dedicated runtime roles when present
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.insert_lead_bundle(
    text, text, citext, text, text, text, text, text, text, text, text, text, text,
    text, text, boolean, text, timestamptz, text
  ) TO scs_intake_runtime;
  GRANT EXECUTE ON FUNCTION public.atomic_counter_incr(text, bigint) TO scs_intake_runtime;
  GRANT EXECUTE ON FUNCTION public.atomic_counter_expire(text, integer) TO scs_intake_runtime;
  GRANT EXECUTE ON FUNCTION public.atomic_counter_get(text) TO scs_intake_runtime;
  GRANT EXECUTE ON FUNCTION public.idempotency_set_nx(text, text, integer) TO scs_intake_runtime;
  GRANT SELECT ON TABLE public.idempotency_keys TO scs_intake_runtime;

  GRANT EXECUTE ON FUNCTION public.claim_notification_outbox(text, integer, integer) TO scs_notify_worker;
  GRANT EXECUTE ON FUNCTION public.complete_notification_outbox(uuid, text, boolean, text) TO scs_notify_worker;

  GRANT EXECUTE ON FUNCTION public.is_owner_aal2() TO scs_owner_admin, authenticated;
  GRANT EXECUTE ON FUNCTION public.soft_delete_lead(uuid) TO scs_owner_admin, authenticated;
  GRANT EXECUTE ON FUNCTION public.purge_deleted_leads(integer) TO scs_owner_admin, authenticated;
  GRANT EXECUTE ON FUNCTION public.purge_test_leads(integer) TO scs_owner_admin, authenticated;
  GRANT EXECUTE ON FUNCTION public.purge_unconverted_leads(integer) TO scs_owner_admin, authenticated;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'Role grants skipped — create scs_* roles at provision time';
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Role grants skipped (insufficient privilege)';
END $$;

-- Table privileges: no direct DML for intake/notify beyond SECURITY DEFINER RPCs
REVOKE ALL ON TABLE public.leads FROM PUBLIC;
REVOKE ALL ON TABLE public.consent_records FROM PUBLIC;
REVOKE ALL ON TABLE public.submission_requests FROM PUBLIC;
REVOKE ALL ON TABLE public.notification_outbox FROM PUBLIC;
REVOKE ALL ON TABLE public.usage_counters FROM PUBLIC;
REVOKE ALL ON TABLE public.idempotency_keys FROM PUBLIC;
DO $$
BEGIN
  REVOKE ALL ON TABLE public.leads FROM anon, authenticated;
  REVOKE ALL ON TABLE public.consent_records FROM anon, authenticated;
  REVOKE ALL ON TABLE public.submission_requests FROM anon, authenticated;
  REVOKE ALL ON TABLE public.notification_outbox FROM anon, authenticated;
  REVOKE ALL ON TABLE public.usage_counters FROM anon, authenticated;
  REVOKE ALL ON TABLE public.idempotency_keys FROM anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Staging effective-privilege probes (run AFTER migrate; expect DENY for anon)
-- ---------------------------------------------------------------------------
-- SET ROLE anon;
-- SELECT public.insert_lead_bundle(...);           -- expect ERROR: permission denied
-- SELECT * FROM public.leads;                      -- expect ERROR / zero rows
-- RESET ROLE;
-- SET ROLE scs_intake_runtime;
-- SELECT has_function_privilege('scs_intake_runtime',
--   'public.insert_lead_bundle(text,text,citext,text,text,text,text,text,text,text,text,text,text,text,text,boolean,text,timestamptz,text)',
--   'EXECUTE');                                    -- expect true
-- RESET ROLE;
