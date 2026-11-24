-- M7A DRAFT — retention / deletion procedures. DO NOT EXECUTE without Owner legal sign-off.
-- Align operational schedules with privacy.html after Owner approval.

BEGIN;

-- Soft-delete a lead (owner dashboard / support).
CREATE OR REPLACE FUNCTION public.soft_delete_lead(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_owner_aal2() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE leads
  SET status = 'deleted',
      deleted_at = now(),
      updated_at = now(),
      -- Scrub free-text on soft-delete to reduce residual exposure
      message = '[redacted]',
      advisor_brief = NULL,
      phone = NULL,
      company = NULL
  WHERE id = p_lead_id
    AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_lead(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_lead(uuid) TO authenticated;

-- Hard-purge soft-deleted leads older than N days (scheduled job / owner invoke).
-- Default suggestion: 365 days after soft-delete; test rows: 30 days.
CREATE OR REPLACE FUNCTION public.purge_deleted_leads(p_days integer DEFAULT 365)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF NOT public.is_owner_aal2() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Break FK order carefully: null submission refs, delete consent, delete leads
  WITH doomed AS (
    SELECT id FROM leads
    WHERE deleted_at IS NOT NULL
      AND deleted_at < now() - make_interval(days => p_days)
  ),
  clear_sub AS (
    UPDATE submission_requests s
    SET lead_id = NULL, consent_id = NULL
    WHERE lead_id IN (SELECT id FROM doomed)
    RETURNING 1
  ),
  del_consent AS (
    DELETE FROM consent_records c
    WHERE lead_id IN (SELECT id FROM doomed)
    RETURNING 1
  ),
  del_leads AS (
    DELETE FROM leads l
    WHERE id IN (SELECT id FROM doomed)
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM del_leads;

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_deleted_leads(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_deleted_leads(integer) TO authenticated;

-- Purge staging/test rows (is_test = true) older than N days (default 30).
CREATE OR REPLACE FUNCTION public.purge_test_leads(p_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF NOT public.is_owner_aal2() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  WITH doomed AS (
    SELECT id FROM leads
    WHERE is_test = true
      AND created_at < now() - make_interval(days => p_days)
  ),
  clear_sub AS (
    UPDATE submission_requests s
    SET lead_id = NULL, consent_id = NULL
    WHERE lead_id IN (SELECT id FROM doomed)
    RETURNING 1
  ),
  del_consent AS (
    DELETE FROM consent_records c
    WHERE lead_id IN (SELECT id FROM doomed)
    RETURNING 1
  ),
  del_leads AS (
    DELETE FROM leads l
    WHERE id IN (SELECT id FROM doomed)
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM del_leads;

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_test_leads(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_test_leads(integer) TO authenticated;

COMMENT ON FUNCTION public.soft_delete_lead(uuid) IS 'Owner soft-delete + free-text scrub.';
COMMENT ON FUNCTION public.purge_deleted_leads(integer) IS 'Hard purge soft-deleted leads after retention window.';
COMMENT ON FUNCTION public.purge_test_leads(integer) IS 'Hard purge is_test leads after short window.';

-- ---------------------------------------------------------------------------
-- Unconverted lead retention — DRAFT
-- Status: PENDING_FINAL_PRIVACY_APPROVAL
-- Proposed: 12 months (365 days) for leads that never converted (not 'won').
-- Do NOT schedule in production until Owner/legal final privacy approval.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_unconverted_leads(p_days integer DEFAULT 365)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- PENDING_FINAL_PRIVACY_APPROVAL — operational verification still required.
  IF NOT public.is_owner_aal2() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  WITH doomed AS (
    SELECT id FROM leads
    WHERE deleted_at IS NULL
      AND is_test = false
      AND status IN ('new', 'triaged', 'declined', 'spam')
      AND received_at < now() - make_interval(days => p_days)
  ),
  clear_sub AS (
    UPDATE submission_requests s
    SET lead_id = NULL, consent_id = NULL
    WHERE lead_id IN (SELECT id FROM doomed)
    RETURNING 1
  ),
  del_consent AS (
    DELETE FROM consent_records c
    WHERE lead_id IN (SELECT id FROM doomed)
    RETURNING 1
  ),
  del_leads AS (
    DELETE FROM leads l
    WHERE id IN (SELECT id FROM doomed)
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM del_leads;

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_unconverted_leads(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_unconverted_leads(integer) TO authenticated;

COMMENT ON FUNCTION public.purge_unconverted_leads(integer) IS
  'PENDING_FINAL_PRIVACY_APPROVAL: proposed 12-month purge for unconverted leads (status new/triaged/declined/spam).';

COMMIT;
