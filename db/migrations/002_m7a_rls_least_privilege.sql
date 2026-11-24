-- M7A DRAFT — RLS + least privilege. DO NOT EXECUTE without Atlas/Owner approval.
-- Rule: anon has ZERO direct table access. Authenticated owner only after AAL2 (app + RLS).
-- Public inserts: Netlify Function using service_role only (bypasses RLS by design — keep key server-side).

BEGIN;

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_requests ENABLE ROW LEVEL SECURITY;

-- Revoke broad public grants (Supabase may grant anon/authenticated by default on public schema).
REVOKE ALL ON TABLE leads FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE consent_records FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE submission_requests FROM anon, authenticated, PUBLIC;

-- Owner allowlist table (single-owner V1)
CREATE TABLE IF NOT EXISTS owner_allowlist (
  user_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email     citext NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE owner_allowlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE owner_allowlist FROM anon, authenticated, PUBLIC;

CREATE OR REPLACE FUNCTION public.is_owner_aal2()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM owner_allowlist o
    WHERE o.user_id = auth.uid()
  )
  AND COALESCE(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

REVOKE ALL ON FUNCTION public.is_owner_aal2() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_owner_aal2() TO authenticated;

-- Owner policies (no INSERT from browser — Function uses service_role)
CREATE POLICY leads_owner_select ON leads
  FOR SELECT TO authenticated
  USING (public.is_owner_aal2() AND deleted_at IS NULL);

CREATE POLICY leads_owner_update ON leads
  FOR UPDATE TO authenticated
  USING (public.is_owner_aal2())
  WITH CHECK (public.is_owner_aal2());

CREATE POLICY consent_owner_select ON consent_records
  FOR SELECT TO authenticated
  USING (public.is_owner_aal2());

CREATE POLICY submission_owner_select ON submission_requests
  FOR SELECT TO authenticated
  USING (public.is_owner_aal2());

CREATE POLICY owner_allowlist_self_select ON owner_allowlist
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_owner_aal2());

-- Explicit deny notes:
-- * No policy for anon → no access
-- * No INSERT/DELETE policies for authenticated on leads/consent/submission
-- * Soft-delete via owner UPDATE setting deleted_at / status=deleted

COMMIT;
