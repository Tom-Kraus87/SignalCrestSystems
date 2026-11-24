-- M7A DRAFT MIGRATION — DO NOT EXECUTE without Atlas/Owner approval.
-- COST OPTIMIZATION (Owner M7A authorization): PostgreSQL atomic counters +
-- idempotency via UPSERT / UNIQUE constraints. Do NOT introduce Redis for
-- rate limits or usage counters unless a measured requirement is demonstrated.

BEGIN;

-- ---------------------------------------------------------------------------
-- usage_counters — atomic INCR/UPSERT for rate windows + future advisor credits
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usage_counters (
  counter_key   text PRIMARY KEY
                CHECK (char_length(counter_key) BETWEEN 1 AND 256),
  counter_value bigint NOT NULL DEFAULT 0,
  expires_at    timestamptz NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_counters_expires_idx
  ON usage_counters (expires_at)
  WHERE expires_at IS NOT NULL;

COMMENT ON TABLE usage_counters IS
  'Postgres-backed atomic counters (rate limits, credits, spend). Prefer over Redis at entry-level scale.';

-- Atomic increment with optional window reset when expired.
CREATE OR REPLACE FUNCTION public.atomic_counter_incr(
  p_key text,
  p_by bigint DEFAULT 1
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next bigint;
BEGIN
  INSERT INTO usage_counters (counter_key, counter_value, expires_at, updated_at)
  VALUES (p_key, p_by, NULL, now())
  ON CONFLICT (counter_key) DO UPDATE
  SET counter_value = CASE
        WHEN usage_counters.expires_at IS NOT NULL
             AND usage_counters.expires_at <= now()
          THEN p_by
        ELSE usage_counters.counter_value + p_by
      END,
      expires_at = CASE
        WHEN usage_counters.expires_at IS NOT NULL
             AND usage_counters.expires_at <= now()
          THEN NULL
        ELSE usage_counters.expires_at
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
SET search_path = public
AS $$
BEGIN
  UPDATE usage_counters
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
SET search_path = public
AS $$
DECLARE
  v_row usage_counters%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM usage_counters WHERE counter_key = p_key;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at <= now() THEN
    RETURN 0;
  END IF;
  RETURN v_row.counter_value;
END;
$$;

-- SET NX style string store for response-cache style idempotency keys (optional).
-- Primary lead idempotency remains UNIQUE(idempotency_key) on submission_requests.
CREATE TABLE IF NOT EXISTS idempotency_keys (
  idem_key      text PRIMARY KEY
                CHECK (char_length(idem_key) BETWEEN 8 AND 128),
  response_json text NOT NULL,
  expires_at    timestamptz NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idempotency_keys_expires_idx
  ON idempotency_keys (expires_at)
  WHERE expires_at IS NOT NULL;

COMMENT ON TABLE idempotency_keys IS
  'Optional response-cache idempotency. Lead persist uniqueness is on submission_requests.';

CREATE OR REPLACE FUNCTION public.idempotency_set_nx(
  p_key text,
  p_response_json text,
  p_ttl_seconds integer DEFAULT 86400
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear expired row so NX can succeed again
  DELETE FROM idempotency_keys
  WHERE idem_key = p_key
    AND expires_at IS NOT NULL
    AND expires_at <= now();

  BEGIN
    INSERT INTO idempotency_keys (idem_key, response_json, expires_at)
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
-- RLS — no anon/authenticated direct access; service_role Function only
-- ---------------------------------------------------------------------------
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE usage_counters FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE idempotency_keys FROM anon, authenticated, PUBLIC;

REVOKE ALL ON FUNCTION public.atomic_counter_incr(text, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.atomic_counter_expire(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.atomic_counter_get(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.idempotency_set_nx(text, text, integer) FROM PUBLIC;
-- GRANT EXECUTE … TO service_role; -- provision-time only

COMMIT;
