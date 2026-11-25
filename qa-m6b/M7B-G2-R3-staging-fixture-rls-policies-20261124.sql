-- M7B-G2-R3 — Staging-only fixture RLS policies + column grants for scs_test_admin
-- MUTATING — run only under Owner A-SQL on scs-staging (kfclinlrzfwodmichmci).
-- Production: HOLD. Do NOT apply to production.
-- Does NOT grant BYPASSRLS, SUPERUSER, CREATEROLE, or REPLICATION.
-- Does NOT modify frozen migrations 001–007; staging overlay only.
-- Does NOT change the frozen harness verify-m7a-r2-postgres-integration-20261123.mjs.
-- Compatible with frozen harness fixture predicates:
--   * leads.is_test = true (insertArgs sets p_is_test true)
--   * idempotency / marker keys prefixed r4* (and legacy it-*)
--   * notification_outbox rows join to is_test leads
-- Isolation disclosure: prefix / is_test predicates are NOT per-run isolation.
--   Mandatory Owner conditions (R3): dedicated staging project; synthetic data only;
--   exclusive serial staging maintenance window; no concurrent harness/admin fixture
--   sessions; STOP on any unexpected fixture-visible baseline (all r4%, it-%, is_test
--   predicates and active seed token); baseline + post-test zero-residual checks;
--   explicit fixture privilege teardown (§F).
-- Prerequisite: migrations 001–007 applied; role scs_test_admin exists (LOGIN NOINHERIT).
-- Historical overlays retained unchanged:
--   qa-m6b/M7B-G2-R1-staging-fixture-rls-policies-20261124.sql
--   qa-m6b/M7B-G2-R2-staging-fixture-rls-policies-20261124.sql
-- Policy/grant bodies intentionally identical to R2; R3 changes are procedural
-- (baseline/isolation/auth client) in the SQL execution packet, not DDL widening.

BEGIN;

-- ---------------------------------------------------------------------------
-- Table privileges (exact columns used by harness fixture statements)
-- Case 2: UPDATE idempotency_keys SET expires_at … WHERE idem_key = $1
-- Case 5: INSERT/UPDATE lead_deletion_markers (idempotency_key, lead_id, reason)
-- Case 9: UPDATE notification_outbox SET lease_expires_at … WHERE id = $1
-- Case 13: UPDATE leads SET deleted_at … WHERE id = $1
-- SELECT needed for WHERE / RLS subquery evaluation (not broad table DML alone).
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO scs_test_admin;

GRANT SELECT (id, is_test) ON TABLE public.leads TO scs_test_admin;
GRANT UPDATE (deleted_at) ON TABLE public.leads TO scs_test_admin;

GRANT SELECT (idem_key) ON TABLE public.idempotency_keys TO scs_test_admin;
GRANT UPDATE (expires_at) ON TABLE public.idempotency_keys TO scs_test_admin;

GRANT SELECT (id, lead_id) ON TABLE public.notification_outbox TO scs_test_admin;
GRANT UPDATE (lease_expires_at) ON TABLE public.notification_outbox TO scs_test_admin;

GRANT SELECT (idempotency_key, lead_id, reason, deleted_at)
  ON TABLE public.lead_deletion_markers TO scs_test_admin;
GRANT INSERT (idempotency_key, lead_id, reason)
  ON TABLE public.lead_deletion_markers TO scs_test_admin;
GRANT UPDATE (deleted_at, reason)
  ON TABLE public.lead_deletion_markers TO scs_test_admin;

-- ---------------------------------------------------------------------------
-- Drop prior R1/R2/R3 policy names if re-applied (idempotent overlay)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS scs_fixture_leads_select ON public.leads;
DROP POLICY IF EXISTS scs_fixture_leads_update ON public.leads;
DROP POLICY IF EXISTS scs_fixture_idem_select ON public.idempotency_keys;
DROP POLICY IF EXISTS scs_fixture_idem_update ON public.idempotency_keys;
DROP POLICY IF EXISTS scs_fixture_outbox_select ON public.notification_outbox;
DROP POLICY IF EXISTS scs_fixture_outbox_update ON public.notification_outbox;
DROP POLICY IF EXISTS scs_fixture_markers_select ON public.lead_deletion_markers;
DROP POLICY IF EXISTS scs_fixture_markers_insert ON public.lead_deletion_markers;
DROP POLICY IF EXISTS scs_fixture_markers_update ON public.lead_deletion_markers;

-- ---------------------------------------------------------------------------
-- Narrow policies: synthetic fixtures only (no production/non-test rows)
-- ---------------------------------------------------------------------------
CREATE POLICY scs_fixture_leads_select ON public.leads
  FOR SELECT TO scs_test_admin
  USING (is_test = true);

CREATE POLICY scs_fixture_leads_update ON public.leads
  FOR UPDATE TO scs_test_admin
  USING (is_test = true)
  WITH CHECK (is_test = true);

CREATE POLICY scs_fixture_idem_select ON public.idempotency_keys
  FOR SELECT TO scs_test_admin
  USING (idem_key LIKE 'r4%' OR idem_key LIKE 'it-%');

CREATE POLICY scs_fixture_idem_update ON public.idempotency_keys
  FOR UPDATE TO scs_test_admin
  USING (idem_key LIKE 'r4%' OR idem_key LIKE 'it-%')
  WITH CHECK (idem_key LIKE 'r4%' OR idem_key LIKE 'it-%');

CREATE POLICY scs_fixture_outbox_select ON public.notification_outbox
  FOR SELECT TO scs_test_admin
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = notification_outbox.lead_id
        AND l.is_test = true
    )
  );

CREATE POLICY scs_fixture_outbox_update ON public.notification_outbox
  FOR UPDATE TO scs_test_admin
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = notification_outbox.lead_id
        AND l.is_test = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = notification_outbox.lead_id
        AND l.is_test = true
    )
  );

CREATE POLICY scs_fixture_markers_select ON public.lead_deletion_markers
  FOR SELECT TO scs_test_admin
  USING (idempotency_key LIKE 'r4%' OR idem_key LIKE 'it-%');

CREATE POLICY scs_fixture_markers_insert ON public.lead_deletion_markers
  FOR INSERT TO scs_test_admin
  WITH CHECK (idempotency_key LIKE 'r4%' OR idem_key LIKE 'it-%');

CREATE POLICY scs_fixture_markers_update ON public.lead_deletion_markers
  FOR UPDATE TO scs_test_admin
  USING (idempotency_key LIKE 'r4%' OR idem_key LIKE 'it-%')
  WITH CHECK (idempotency_key LIKE 'r4%' OR idem_key LIKE 'it-%');

COMMENT ON POLICY scs_fixture_leads_update ON public.leads IS
  'Staging fixture overlay (M7B-G2-R3): scs_test_admin may UPDATE is_test leads only.';
COMMENT ON POLICY scs_fixture_idem_update ON public.idempotency_keys IS
  'Staging fixture overlay (M7B-G2-R3): scs_test_admin may UPDATE r4*/it-* keys only.';
COMMENT ON POLICY scs_fixture_outbox_update ON public.notification_outbox IS
  'Staging fixture overlay (M7B-G2-R3): scs_test_admin may UPDATE outbox for is_test leads only.';
COMMENT ON POLICY scs_fixture_markers_insert ON public.lead_deletion_markers IS
  'Staging fixture overlay (M7B-G2-R3): scs_test_admin may INSERT r4*/it-* markers only.';

COMMIT;
