-- M7A-R4 additive correction. DRAFT — do not execute against a remote database
-- without a separate Owner authorization.
--
-- Preserves migrations 001–006 unchanged. Those files are unexecuted drafts.
-- Migration 006 defects this file corrects (006 itself is not rewritten):
--   * Role creation swallowed insufficient_privilege and continued.
--     007 refuses to continue unless db/bootstrap/001_m7a_r4_role_bootstrap.sql
--     has already created the four scs_* roles.
--   * GRANT SELECT on idempotency_keys to scs_intake_runtime.
--   * complete_notification_outbox accepted an expired or reclaimed lease
--     (worker id only; no claim token; no unexpired-lease check).
--   * No owner-only aggregate for notification status.
--
-- Apply order: bootstrap, then 001, 002, 003, 004, 005, 006, then this file.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'scs_intake_runtime')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'scs_notify_worker')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'scs_migration')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'scs_owner_admin') THEN
    RAISE EXCEPTION
      'role bootstrap prerequisite failed: scs_* roles are missing. Run db/bootstrap/001_m7a_r4_role_bootstrap.sql and stop if it fails. Do not continue this migration.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
END $$;

ALTER TABLE public.notification_outbox
  ADD COLUMN IF NOT EXISTS claim_token uuid NULL;

-- ---------------------------------------------------------------------------
-- R3-01 — narrow idempotency lookup. No table SELECT for the intake role.
-- Deleted keys return no cached body. Expired keys return no body.
-- A supplied payload fingerprint must match or the body is withheld.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lookup_idempotency_response(
  p_key text,
  p_payload_hash text DEFAULT NULL
)
RETURNS TABLE (
  found boolean,
  expired boolean,
  deleted boolean,
  fingerprint_match boolean,
  response_json text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_json text;
  v_expires timestamptz;
  v_stored_hash text;
BEGIN
  deleted := EXISTS (
    SELECT 1
    FROM public.lead_deletion_markers m
    WHERE m.idempotency_key = p_key
  );
  IF deleted THEN
    found := false;
    expired := false;
    fingerprint_match := false;
    response_json := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT k.response_json, k.expires_at
    INTO v_json, v_expires
  FROM public.idempotency_keys k
  WHERE k.idem_key = p_key;

  IF NOT FOUND THEN
    found := false;
    expired := false;
    fingerprint_match := false;
    response_json := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_expires IS NOT NULL AND v_expires <= now() THEN
    found := false;
    expired := true;
    fingerprint_match := false;
    response_json := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  found := true;
  expired := false;

  BEGIN
    v_stored_hash := v_json::jsonb ->> 'payloadHash';
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_stored_hash := NULL;
  END;

  IF p_payload_hash IS NOT NULL AND length(btrim(p_payload_hash)) > 0 THEN
    fingerprint_match := v_stored_hash IS NOT NULL AND v_stored_hash = p_payload_hash;
    response_json := CASE WHEN fingerprint_match THEN v_json ELSE NULL END;
  ELSE
    fingerprint_match := v_stored_hash IS NOT NULL;
    response_json := v_json;
  END IF;

  RETURN NEXT;
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
  IF EXISTS (
    SELECT 1 FROM public.lead_deletion_markers m WHERE m.idempotency_key = p_key
  ) THEN
    DELETE FROM public.idempotency_keys WHERE idem_key = p_key;
    RETURN false;
  END IF;

  DELETE FROM public.idempotency_keys
  WHERE idem_key = p_key
    AND expires_at IS NOT NULL
    AND expires_at <= now();

  BEGIN
    INSERT INTO public.idempotency_keys (idem_key, response_json, expires_at)
    VALUES (
      p_key,
      p_response_json,
      CASE
        WHEN p_ttl_seconds IS NULL THEN NULL
        ELSE now() + make_interval(secs => p_ttl_seconds)
      END
    );
    RETURN true;
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;
END;
$$;

-- Drop the cache row when a lead key is tombstoned (006 did not).
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
    RAISE EXCEPTION 'not authorized' USING ERRCODE = 'insufficient_privilege';
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

    DELETE FROM public.idempotency_keys WHERE idem_key = v_key;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- R3-02 — owner-only status aggregate. No row payloads. No worker SELECT.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notification_outbox_status_counts()
RETURNS TABLE (
  pending_count integer,
  failed_count integer,
  dead_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (COUNT(*) FILTER (WHERE o.status = 'pending'))::integer,
    (COUNT(*) FILTER (WHERE o.status = 'failed'))::integer,
    (COUNT(*) FILTER (WHERE o.status = 'dead'))::integer
  FROM public.notification_outbox o;
END;
$$;

-- ---------------------------------------------------------------------------
-- R3-04 — claim token + unexpired lease required to complete or fail a job.
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
  IF p_worker_id IS NULL OR length(btrim(p_worker_id)) = 0 THEN
    RAISE EXCEPTION 'worker id required' USING ERRCODE = 'invalid_parameter_value';
  END IF;

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
      claim_token = gen_random_uuid(),
      lease_expires_at = now() + make_interval(secs => GREATEST(10, LEAST(COALESCE(p_lease_seconds, 60), 300))),
      attempts = o.attempts + 1,
      updated_at = now()
  WHERE o.id IN (SELECT c.id FROM candidates c)
  RETURNING o.*;
END;
$$;

DROP FUNCTION IF EXISTS public.complete_notification_outbox(uuid, text, boolean, text);

CREATE OR REPLACE FUNCTION public.complete_notification_outbox(
  p_id uuid,
  p_worker_id text,
  p_claim_token uuid,
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
  v_updated integer;
BEGIN
  IF p_id IS NULL OR p_worker_id IS NULL OR p_claim_token IS NULL THEN
    RETURN false;
  END IF;

  SELECT o.attempts INTO v_attempts
  FROM public.notification_outbox o
  WHERE o.id = p_id
    AND o.lease_owner = p_worker_id
    AND o.claim_token = p_claim_token
    AND o.lease_expires_at IS NOT NULL
    AND o.lease_expires_at > now();

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF p_ok THEN
    UPDATE public.notification_outbox
    SET status = 'sent',
        delivered_at = now(),
        lease_owner = NULL,
        lease_expires_at = NULL,
        claim_token = NULL,
        last_error = NULL,
        updated_at = now()
    WHERE id = p_id
      AND lease_owner = p_worker_id
      AND claim_token = p_claim_token
      AND lease_expires_at > now();
  ELSE
    UPDATE public.notification_outbox
    SET status = CASE WHEN COALESCE(v_attempts, 0) >= 8 THEN 'dead' ELSE 'failed' END,
        last_error = left(COALESCE(p_error, 'delivery_failed'), 500),
        lease_owner = NULL,
        lease_expires_at = NULL,
        claim_token = NULL,
        next_attempt_at = now() + make_interval(secs => LEAST(3600, 15 * power(2, LEAST(COALESCE(v_attempts, 1), 8))::integer)),
        updated_at = now()
    WHERE id = p_id
      AND lease_owner = p_worker_id
      AND claim_token = p_claim_token
      AND lease_expires_at > now();
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants. Failures abort the migration. Broad table reads stay revoked.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.lookup_idempotency_response(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notification_outbox_status_counts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_notification_outbox(uuid, text, uuid, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.idempotency_set_nx(text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_notification_outbox(text, integer, integer) FROM PUBLIC;

REVOKE ALL ON TABLE public.idempotency_keys FROM scs_intake_runtime;
REVOKE ALL ON TABLE public.idempotency_keys FROM scs_notify_worker;
REVOKE ALL ON TABLE public.notification_outbox FROM scs_notify_worker;
REVOKE ALL ON TABLE public.notification_outbox FROM scs_intake_runtime;

GRANT EXECUTE ON FUNCTION public.lookup_idempotency_response(text, text) TO scs_intake_runtime;
GRANT EXECUTE ON FUNCTION public.idempotency_set_nx(text, text, integer) TO scs_intake_runtime;
GRANT EXECUTE ON FUNCTION public.claim_notification_outbox(text, integer, integer) TO scs_notify_worker;
GRANT EXECUTE ON FUNCTION public.complete_notification_outbox(uuid, text, uuid, boolean, text) TO scs_notify_worker;
GRANT EXECUTE ON FUNCTION public.notification_outbox_status_counts() TO scs_owner_admin;

REVOKE ALL ON FUNCTION public.notification_outbox_status_counts() FROM scs_notify_worker;
REVOKE ALL ON FUNCTION public.notification_outbox_status_counts() FROM scs_intake_runtime;
REVOKE ALL ON FUNCTION public.lookup_idempotency_response(text, text) FROM scs_notify_worker;
REVOKE ALL ON FUNCTION public.claim_notification_outbox(text, integer, integer) FROM scs_intake_runtime;
REVOKE ALL ON FUNCTION public.complete_notification_outbox(uuid, text, uuid, boolean, text) FROM scs_intake_runtime;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.lookup_idempotency_response(text, text) FROM anon;
    REVOKE ALL ON FUNCTION public.notification_outbox_status_counts() FROM anon;
    REVOKE ALL ON FUNCTION public.complete_notification_outbox(uuid, text, uuid, boolean, text) FROM anon;
    REVOKE ALL ON FUNCTION public.claim_notification_outbox(text, integer, integer) FROM anon;
    REVOKE ALL ON TABLE public.idempotency_keys FROM anon;
    REVOKE ALL ON TABLE public.notification_outbox FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.lookup_idempotency_response(text, text) FROM authenticated;
    REVOKE ALL ON FUNCTION public.notification_outbox_status_counts() FROM authenticated;
    REVOKE ALL ON FUNCTION public.complete_notification_outbox(uuid, text, uuid, boolean, text) FROM authenticated;
    REVOKE ALL ON FUNCTION public.claim_notification_outbox(text, integer, integer) FROM authenticated;
    REVOKE ALL ON TABLE public.idempotency_keys FROM authenticated;
    REVOKE ALL ON TABLE public.notification_outbox FROM authenticated;
  END IF;
END $$;

COMMENT ON FUNCTION public.lookup_idempotency_response(text, text) IS
  'Intake-only idempotency cache lookup. Enforces expiry, fingerprint, and deletion markers. Does not grant table SELECT.';
COMMENT ON FUNCTION public.notification_outbox_status_counts() IS
  'Owner-only pending/failed/dead counts. Workers are not granted EXECUTE.';
COMMENT ON FUNCTION public.complete_notification_outbox(uuid, text, uuid, boolean, text) IS
  'Complete or fail a notification job only for the current unexpired claim token.';

COMMIT;
