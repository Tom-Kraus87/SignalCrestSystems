# M7B-G2-R1 — SQL Execution Packet (Owner / SQL Editor)

**Date:** 2026-11-24  
**Revision:** R1 (supersedes `M7B-G2-SQL-EXECUTION-PACKET-20261124.md` for apply guidance; prior G2 packet retained as historical)  
**Target project:** `scs-staging` · ref `kfclinlrzfwodmichmci` · region `us-east-2` · DB `postgres`  
**Nature:** Prepared SQL only — **do not execute until Owner issues `A-SQL` (staging)**  
**Production:** **HOLD**  
**Preferred apply surface:** Supabase Dashboard → **SQL Editor** (project admin)  
**Authoritative form:** this Markdown file (PDF is an Atlas upload copy)

---

## How to use this packet

1. Sections labeled **READ-ONLY** never create/alter roles, grants, tables, policies, or functions (except session-local `SET ROLE` / `RESET ROLE` / `BEGIN`/`ROLLBACK` probes explicitly labeled).  
2. Sections labeled **MUTATING** change the database. Run only under written `A-SQL` for staging.  
3. Sections labeled **TRANSACTIONAL MUTATION TEST** perform real DML inside an explicit transaction that **must** `ROLLBACK` (or use documented cleanup). They are **not** read-only smoke tests.  
4. Paste **one block at a time**. Stop on any error (fail closed).  
5. Never paste passwords into chat, AI context, committed files, or evidence logs.  
6. Do **not** reorder bootstrap → migrations 001–007.  
7. Data API is **Disabled** on this project — expected; this packet does not enable it.  
8. Do **not** grant `BYPASSRLS`, `SUPERUSER`, `CREATEROLE`, or `REPLICATION` to runtime or fixture roles.

---

## Execution phases (do not collapse)

| Phase | Class | Packet section | Auth |
|------:|-------|----------------|------|
| 0 | READ-ONLY | §A — Initial administrator discovery | Connect/SQL Editor OK when Owner authorizes inspection |
| 1 | MUTATING | §B.1 — Bootstrap + migrations 001–007 | `A-SQL` |
| 2 | MUTATING | §B.2 — SET ROLE memberships (version-aware) | `A-SQL` |
| 3 | MUTATING | §B.3 — Create `scs_test_admin` (no password in SQL) | `A-SQL` |
| 4 | Owner private | §B.5 — Password provisioning (Dashboard / private ALTER) | Owner only |
| 5 | MUTATING | §B.4 — Fixture column grants + staging RLS policies | `A-SQL` |
| 6 | READ-ONLY | §C — Post-apply verification | After §B |
| 7 | TRANSACTIONAL MUTATION TEST | §D — Positive/negative fixture tests (ROLLBACK) | `A-SQL` (staging) |
| 8 | Harness | §E — Real-PG cases 1–13 | Separate `A-DBTEST` (+ `A-DEP` if needed) |
| 9 | MUTATING cleanup | §F — Fixture teardown / privilege removal | `A-SQL` when retiring fixtures |

**G2 SQL execution remains unauthorized until Owner issues `A-SQL`.** This R1 packet is preparation only until that token exists.

---

# SECTION A — Initial READ-ONLY administrator discovery

> **Class: READ-ONLY**  
> Run as project admin in SQL Editor. Capture pass/fail + role names only (no passwords).

## A.0 PostgreSQL version + membership-option capability

```sql
-- READ-ONLY
SELECT
  current_setting('server_version') AS server_version,
  current_setting('server_version_num')::int AS server_version_num,
  (current_setting('server_version_num')::int / 10000) AS major_version,
  (current_setting('server_version_num')::int / 10000) >= 16
    AS supports_grant_inherit_set_admin_options;
```

**Expect:** major version recorded.  
**If `supports_grant_inherit_set_admin_options = true`:** use §B.2 **PG16+** grant form (`INHERIT FALSE`, `SET TRUE`, `ADMIN FALSE`).  
**If false:** use §B.2 **PG15-compatible** plain `GRANT` (roles remain `NOINHERIT`; `SET ROLE` still requires membership).  
**Stop if:** cannot read `server_version_num`.

## A.1 Session identity

```sql
-- READ-ONLY
SELECT current_user, session_user, current_database();

SELECT r.rolname, r.rolsuper, r.rolcreaterole, r.rolcanlogin, r.rolinherit,
       r.rolreplication, r.rolbypassrls
FROM pg_roles r
WHERE r.rolname = current_user;
```

**Expect:** `current_database() = postgres`; typically `rolsuper = f`, `rolcreaterole = t`; login role is project admin (often `postgres`).  
**Stop if:** not on `postgres`; no `CREATEROLE` and no `SUPERUSER`; wrong project (verify host/ref outside SQL).

## A.2 Role existence

```sql
-- READ-ONLY
SELECT rolname, rolcanlogin, rolinherit, rolsuper, rolcreaterole,
       rolreplication, rolbypassrls
FROM pg_roles
WHERE rolname IN (
  'scs_intake_runtime',
  'scs_notify_worker',
  'scs_migration',
  'scs_owner_admin',
  'scs_test_admin',
  'anon',
  'authenticated'
)
ORDER BY rolname;
```

**Expect after bootstrap:** four bootstrap `scs_*` roles; `scs_migration.rolcanlogin = false`.  
**Expect after §B.3:** `scs_test_admin` with `rolcanlogin = true`, `rolinherit = false`, elevated attrs false.

## A.3 Existing memberships + options (inspect before granting)

> Do **not** blindly modify provider-managed memberships. Record grantor/options first.

**PG16+ (when §A.0 major ≥ 16):**

```sql
-- READ-ONLY (PostgreSQL 16+)
SELECT
  r.rolname AS member,
  m.rolname AS role_name,
  g.rolname AS grantor,
  am.admin_option,
  am.inherit_option,
  am.set_option
FROM pg_auth_members am
JOIN pg_roles r ON r.oid = am.member
JOIN pg_roles m ON m.oid = am.roleid
JOIN pg_roles g ON g.oid = am.grantor
WHERE r.rolname = current_user
  AND m.rolname IN (
    'scs_intake_runtime',
    'scs_notify_worker',
    'scs_owner_admin',
    'anon',
    'authenticated'
  )
ORDER BY 2;
```

**PG15-compatible:**

```sql
-- READ-ONLY (PostgreSQL 15 / columns without inherit_option/set_option)
SELECT
  r.rolname AS member,
  m.rolname AS role_name,
  g.rolname AS grantor,
  am.admin_option
FROM pg_auth_members am
JOIN pg_roles r ON r.oid = am.member
JOIN pg_roles m ON m.oid = am.roleid
JOIN pg_roles g ON g.oid = am.grantor
WHERE r.rolname = current_user
  AND m.rolname IN (
    'scs_intake_runtime',
    'scs_notify_worker',
    'scs_owner_admin',
    'anon',
    'authenticated'
  )
ORDER BY 2;
```

**Harness-required SET ROLE targets:** `scs_intake_runtime`, `anon`, `authenticated`, `scs_notify_worker`.  
**Not required for SET ROLE:** `scs_owner_admin` — case 8 uses independent `DATABASE_OWNER_URL` login. **Do not** add optional `GRANT scs_owner_admin TO …` unless a future authorized case needs admin `SET ROLE`.  
**Stop if:** `anon`/`authenticated` membership is owned exclusively by `supabase_admin` and cannot be granted — escalate to Atlas (do not improvise).

## A.4 Effective privilege snapshot (pre-apply baseline)

```sql
-- READ-ONLY
SELECT
  has_table_privilege('scs_intake_runtime', 'public.idempotency_keys', 'SELECT')
    AS intake_idem_select,
  has_function_privilege(
    'scs_intake_runtime',
    'public.lookup_idempotency_response(text, text)',
    'EXECUTE'
  ) AS intake_lookup_exec,
  has_table_privilege('scs_test_admin', 'public.idempotency_keys', 'UPDATE')
    AS fixture_idem_update_pre;
```

**Expect before §B:** often roles/tables missing → OK on fresh project. Record baseline only.

## A.5 `scs_migration` remains NOLOGIN

```sql
-- READ-ONLY
SELECT rolname, rolcanlogin, rolsuper, rolcreaterole
FROM pg_roles
WHERE rolname = 'scs_migration';
```

**Expect after bootstrap:** `rolcanlogin = false`.

---

# SECTION B — MUTATING SQL (Owner `A-SQL` only)

> **Class: MUTATING**  
> Staging `scs-staging` / `kfclinlrzfwodmichmci` only. Production HOLD.

## B.0 SQL Editor paste instructions

1. Open Supabase Dashboard → project **scs-staging** → **SQL Editor**.  
2. Confirm project ref **`kfclinlrzfwodmichmci`**.  
3. Paste **one entire file** (or one labeled block) at a time; **Run**.  
4. On success, proceed. On error: **STOP** — do not continue.  
5. Do not use migration 006’s historical “swallowed insufficient_privilege NOTICE” as a provisioning path.

## B.1 Bootstrap + migrations 001–007 (ordered file paste)

| Order | Relative path |
|------:|---------------|
| 1 | `db/bootstrap/001_m7a_r4_role_bootstrap.sql` |
| 2 | `db/migrations/001_m7a_leads_foundation.sql` |
| 3 | `db/migrations/002_m7a_rls_least_privilege.sql` |
| 4 | `db/migrations/003_m7a_retention_procedures.sql` |
| 5 | `db/migrations/004_m7a_counters_idempotency.sql` |
| 6 | `db/migrations/005_m7a_insert_lead_bundle.sql` |
| 7 | `db/migrations/006_m7a_r2_security_hardening.sql` |
| 8 | `db/migrations/007_m7a_r4_security_corrections.sql` |

**Workspace root:**

```
C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC
```

**Optional between order 1 and 2:** create `scs_test_admin` (§B.3). Fixture policies/grants (§B.4) wait until after order 8.

## B.2 SET ROLE membership grants (version-aware)

> **Prerequisite:** §B.1 order 1 complete; §A.0/A.3 inspected.  
> Required targets only (no optional `scs_owner_admin`).

### B.2a PostgreSQL 16+ form

```sql
-- MUTATING — staging only — PG16+
-- Grants to CURRENT_USER (project admin session). INHERIT FALSE / SET TRUE / ADMIN FALSE.
GRANT scs_intake_runtime TO CURRENT_USER
  WITH INHERIT FALSE, SET TRUE, ADMIN FALSE;
GRANT scs_notify_worker TO CURRENT_USER
  WITH INHERIT FALSE, SET TRUE, ADMIN FALSE;
GRANT anon TO CURRENT_USER
  WITH INHERIT FALSE, SET TRUE, ADMIN FALSE;
GRANT authenticated TO CURRENT_USER
  WITH INHERIT FALSE, SET TRUE, ADMIN FALSE;
```

### B.2b PostgreSQL 15-compatible form

```sql
-- MUTATING — staging only — PG15 (no INHERIT/SET/ADMIN grant options)
GRANT scs_intake_runtime TO CURRENT_USER;
GRANT scs_notify_worker TO CURRENT_USER;
GRANT anon TO CURRENT_USER;
GRANT authenticated TO CURRENT_USER;
```

**Notes:**

1. Do **not** `GRANT postgres TO <runtime>`.  
2. Do **not** grant SUPERUSER / BYPASSRLS / CREATEROLE to runtime or fixture roles.  
3. If `GRANT anon|authenticated` fails due to provider-managed membership — **STOP**; escalate.  
4. Re-run §A.3 after grants. Then run §B.2c.

### B.2c Post-grant membership + SET ROLE verification

```sql
-- READ-ONLY verification immediately after §B.2a/b
-- 1) Membership rows for required targets must exist
SELECT m.rolname AS can_set_role
FROM pg_auth_members am
JOIN pg_roles r ON r.oid = am.member
JOIN pg_roles m ON m.oid = am.roleid
WHERE r.rolname = current_user
  AND m.rolname IN (
    'scs_intake_runtime', 'scs_notify_worker', 'anon', 'authenticated'
  )
ORDER BY 1;

-- 2) Effective SET ROLE probes (session-local; RESET immediately)
SET ROLE scs_intake_runtime;
SELECT current_user;  -- must equal scs_intake_runtime
RESET ROLE;

SET ROLE anon;
SELECT current_user;  -- must equal anon
RESET ROLE;

SET ROLE authenticated;
SELECT current_user;  -- must equal authenticated
RESET ROLE;

SET ROLE scs_notify_worker;
SELECT current_user;  -- must equal scs_notify_worker
RESET ROLE;
```

**Any SET ROLE failure = G2 BLOCKED.** Do not start the Node harness.

**PG16+ option expect (re-run §A.3 PG16 query):** `inherit_option = f`, `set_option = t`, `admin_option = f` for these four memberships when granted via §B.2a.

## B.3 Create staging-only `scs_test_admin` (no password literal)

> **Prerequisite:** project admin with CREATEROLE.  
> **Never** production. **Never** Netlify Function env.  
> **Never** put a password placeholder in executable SQL.

```sql
-- MUTATING — staging only — NO password in this statement
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'scs_test_admin') THEN
    CREATE ROLE scs_test_admin NOINHERIT LOGIN;
  END IF;
END $$;

COMMENT ON ROLE scs_test_admin IS
  'Staging fixture setup/teardown only. Never Function runtime. Never production.';

-- Optional harden:
-- ALTER ROLE scs_test_admin CONNECTION LIMIT 2;
```

**Password:** Owner provisions out of band per §B.5. Do not embed `PASSWORD '…'` here.

## B.4 Fixture column grants + staging-only RLS policies

> **Prerequisite:** migrations 001–007 applied; `scs_test_admin` exists.  
> **Codex P1 fix:** table-level DML grants alone are insufficient under RLS. This step adds narrowly scoped policies so `scs_test_admin` can mutate **synthetic** fixtures only.  
> **Harness change:** **not required** — predicates match frozen harness (`is_test = true`, keys `r4*` / `it-*`, outbox→test lead).

**Paste entire file:**

```
qa-m6b/M7B-G2-R1-staging-fixture-rls-policies-20261124.sql
```

**Absolute path:**

```
C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\qa-m6b\M7B-G2-R1-staging-fixture-rls-policies-20261124.sql
```

**Exact privileges encoded in that file:**

| Table | SELECT columns | INSERT columns | UPDATE columns | RLS predicate |
|-------|----------------|----------------|----------------|---------------|
| `leads` | `id`, `is_test` | — | `deleted_at` | `is_test = true` |
| `idempotency_keys` | `idem_key` | — | `expires_at` | `idem_key LIKE 'r4%' OR LIKE 'it-%'` |
| `notification_outbox` | `id`, `lead_id` | — | `lease_expires_at` | EXISTS test lead |
| `lead_deletion_markers` | key/lead/reason/`deleted_at` | key/lead/`reason` | `deleted_at`, `reason` | key `r4*` / `it-*` |

**Explicitly not granted:** `usage_counters` direct DML; EXECUTE on purge/soft-delete RPCs; BYPASSRLS; broad `SELECT *` on PII tables beyond listed columns; Function-runtime membership.

## B.5 Owner-only password provisioning (no SQL password literals)

**Do not** put passwords in this packet, chat, AI context, shell history intentionally, committed files, or evidence logs.

**Safe method (Owner machine only):**

1. Open Supabase Dashboard → **Database** → **Roles** (or SQL Editor in a private Owner-only session).  
2. Set/reset passwords for: project admin (if rotating), `scs_intake_runtime`, `scs_notify_worker`, `scs_owner_admin`, `scs_test_admin`.  
3. Prefer Dashboard UI password set. If using SQL privately: `ALTER ROLE <role> PASSWORD '<from password manager>';` then close the tab; do not save the query.  
4. Store secrets **only** in the Owner password manager.  
5. Build connection URLs privately (never in repo):  
   - Direct: `db.kfclinlrzfwodmichmci.supabase.co:5432`  
   - Pooler: `aws-1-us-east-2.pooler.supabase.com` (session `5432` / transaction `6543`)  
   - Prefer `sslmode=verify-full`  
6. Wire username **exactly** `scs_test_admin` into process-scoped `DATABASE_TEST_ADMIN_URL` only when `A-DBTEST` is issued.

---

# SECTION C — Post-apply READ-ONLY verification

> **Class: READ-ONLY**  
> Run as project admin after §B.1–B.4.

## C.1 Table ownership

```sql
-- READ-ONLY
SELECT c.relname AS table_name, r.rolname AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_roles r ON r.oid = c.relowner
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'leads', 'consent_records', 'submission_requests', 'owner_allowlist',
    'usage_counters', 'idempotency_keys', 'notification_outbox',
    'lead_deletion_markers'
  )
ORDER BY 1;
```

**Expect:** owner = project admin — **not** runtime/fixture/`scs_migration`.

## C.2 SECURITY DEFINER owners

```sql
-- READ-ONLY
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       r.rolname AS owner,
       p.prosecdef AS security_definer,
       p.proconfig AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles r ON r.oid = p.proowner
WHERE n.nspname = 'public'
  AND p.proname IN (
    'insert_lead_bundle', 'lookup_idempotency_response', 'idempotency_set_nx',
    'atomic_counter_incr', 'atomic_counter_get', 'atomic_counter_expire',
    'claim_notification_outbox', 'complete_notification_outbox',
    'notification_outbox_status_counts', 'soft_delete_lead',
    'purge_deleted_leads', 'purge_test_leads', 'purge_unconverted_leads',
    'is_owner_aal2'
  )
ORDER BY 1, 2;
```

**Expect:** designed SECURITY DEFINER functions owned by project admin; `search_path` hardened via `proconfig`.

## C.3 RLS enabled + fixture policies present

```sql
-- READ-ONLY
SELECT c.relname, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'leads', 'consent_records', 'submission_requests', 'owner_allowlist',
    'idempotency_keys', 'usage_counters', 'notification_outbox',
    'lead_deletion_markers'
  )
ORDER BY 1;

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'scs_fixture_%'
ORDER BY tablename, policyname;
```

**Expect:** RLS enabled on listed tables; nine `scs_fixture_*` policies present after §B.4.

## C.4 Effective grants matrix

```sql
-- READ-ONLY
SELECT
  has_table_privilege('scs_intake_runtime', 'public.idempotency_keys', 'SELECT')
    AS intake_idem_select,
  has_table_privilege('scs_notify_worker', 'public.notification_outbox', 'SELECT')
    AS notify_outbox_select,
  has_function_privilege(
    'scs_intake_runtime',
    'public.lookup_idempotency_response(text, text)',
    'EXECUTE'
  ) AS intake_lookup_exec,
  has_function_privilege(
    'scs_notify_worker',
    'public.claim_notification_outbox(text, integer, integer)',
    'EXECUTE'
  ) AS notify_claim_exec,
  has_function_privilege(
    'scs_notify_worker',
    'public.notification_outbox_status_counts()',
    'EXECUTE'
  ) AS notify_status_exec,
  has_function_privilege(
    'scs_owner_admin',
    'public.notification_outbox_status_counts()',
    'EXECUTE'
  ) AS owner_status_exec,
  has_column_privilege('scs_test_admin', 'public.idempotency_keys', 'expires_at', 'UPDATE')
    AS fixture_idem_expires_update,
  has_column_privilege('scs_test_admin', 'public.leads', 'deleted_at', 'UPDATE')
    AS fixture_leads_deleted_update,
  has_column_privilege('scs_test_admin', 'public.notification_outbox', 'lease_expires_at', 'UPDATE')
    AS fixture_outbox_lease_update,
  has_table_privilege('scs_test_admin', 'public.lead_deletion_markers', 'INSERT')
    AS fixture_markers_insert,
  has_function_privilege(
    'scs_test_admin',
    'public.purge_deleted_leads(integer)',
    'EXECUTE'
  ) AS fixture_purge_exec;
```

| Check | Expect |
|-------|--------|
| `intake_idem_select` | false |
| `notify_outbox_select` | false |
| `intake_lookup_exec` | true |
| `notify_claim_exec` | true |
| `notify_status_exec` | false |
| `owner_status_exec` | true |
| fixture column UPDATE / markers INSERT | true |
| `fixture_purge_exec` | false |

## C.5 anon / authenticated denial snapshot

```sql
-- READ-ONLY
SELECT
  has_table_privilege('anon', 'public.leads', 'SELECT') AS anon_leads_select,
  has_table_privilege('authenticated', 'public.leads', 'SELECT') AS auth_leads_select_table,
  has_function_privilege(
    'anon',
    'public.insert_lead_bundle(text, text, citext, text, text, text, text, text, text, text, text, text, text, text, text, boolean, text, timestamptz, text)',
    'EXECUTE'
  ) AS anon_insert_exec,
  has_function_privilege(
    'scs_intake_runtime',
    'public.insert_lead_bundle(text, text, citext, text, text, text, text, text, text, text, text, text, text, text, text, boolean, text, timestamptz, text)',
    'EXECUTE'
  ) AS intake_insert_exec;
```

**Expect:** anon denied; intake EXECUTE true.

---

# SECTION D — Authorized transactional fixture mutation tests

> **Class: TRANSACTIONAL MUTATION TEST** (not read-only)  
> Replaces G2 `WHERE FALSE` smoke tests.  
> Run after §B.4 + §C. Always `ROLLBACK` unless a step documents explicit cleanup.  
> Requires: (1) project-admin session for seed rows, (2) independent login as `scs_test_admin`.

## D.1 Fixture identity via independent login

Connect / open SQL Editor **as `scs_test_admin`** (not project-admin `SET ROLE`).

```sql
-- TRANSACTIONAL MUTATION TEST — identity (no DML yet)
SELECT current_user, session_user;

SELECT rolsuper, rolcreaterole, rolinherit, rolreplication, rolbypassrls, rolcanlogin
FROM pg_roles
WHERE rolname = current_user;
```

**Expect:** `current_user = session_user = scs_test_admin`; all elevated attrs **false**; `rolinherit = f`; `rolcanlogin = t`.  
**Stop if:** identity mismatch or any elevated attr true.

## D.2 Seed synthetic rows as project admin (ROLLBACK later)

> Run as **project admin**. Seeds are synthetic and rolled back at end of §D.3–D.4 sequence **or** use a single admin transaction that you leave open only if your SQL Editor supports multi-connection testing. Preferred pattern: admin seeds in a named transaction you control, fixture tests in the `scs_test_admin` session, then admin `ROLLBACK`.

```sql
-- TRANSACTIONAL MUTATION TEST — project admin seed (MUST ROLLBACK or cleanup)
BEGIN;

-- Authorized / synthetic test lead
INSERT INTO public.leads (
  form_name, name, email, message, source, privacy_version,
  status, is_test, received_at
) VALUES (
  'contact', 'R1 Fixture', 'r1-fixture@example.com',
  'Synthetic R1 fixture lead — safe to discard.',
  'contact', 'privacy-2026-11-23', 'new', true, now()
) RETURNING id AS test_lead_id;

-- Unrelated non-test lead (must remain immutable to fixture role)
INSERT INTO public.leads (
  form_name, name, email, message, source, privacy_version,
  status, is_test, received_at
) VALUES (
  'contact', 'R1 NonFixture', 'r1-nonfixture@example.com',
  'Non-fixture control row — must not be mutable by scs_test_admin.',
  'contact', 'privacy-2026-11-23', 'new', false, now()
) RETURNING id AS nontest_lead_id;

-- Synthetic idempotency keys
INSERT INTO public.idempotency_keys (idem_key, response_json, expires_at)
VALUES
  ('r4r1fix' || to_char(now(), 'YYYYMMDDHH24MISS'), '{"ok":true}', now() + interval '1 day'),
  ('prodlike-control-key-001', '{"ok":false}', now() + interval '1 day');

-- Keep this transaction open for correlated outbox seed if needed, or capture IDs
-- into session notes, then continue §D.3 as scs_test_admin before ROLLBACK.
```

**Record:** `test_lead_id`, `nontest_lead_id`, and the `r4r1fix…` key for §D.3.  
**If SQL Editor auto-commits:** delete these rows explicitly in §F / end of §D (do not leave non-test control rows).

Optional outbox seed (admin), using captured `test_lead_id` and a throwaway submission id if FK requires it — prefer creating via intake RPC under harness day. For pre-harness policy proof, admin may insert minimal related rows **only if** FKs are satisfied; otherwise skip outbox positive UPDATE until harness case 9 (still covered by policy EXISTS predicate once a test lead+outbox exist).

## D.3 Positive + negative mutation tests as `scs_test_admin`

> **Independent session as `scs_test_admin`.** Replace UUID/key placeholders from §D.2. Always wrap in `BEGIN`/`ROLLBACK`.

```sql
-- TRANSACTIONAL MUTATION TEST — as scs_test_admin — MUST ROLLBACK
BEGIN;

-- D.3a Authorized fixture UPDATE on test lead (expect rowcount = 1)
UPDATE public.leads
SET deleted_at = now() - interval '400 days'
WHERE id = '<test_lead_id>'::uuid
  AND is_test = true;
-- Expect: UPDATE 1

-- D.3b Unrelated non-test lead denied by RLS (expect rowcount = 0)
UPDATE public.leads
SET deleted_at = now()
WHERE id = '<nontest_lead_id>'::uuid;
-- Expect: UPDATE 0 (RLS deny / zero rows) — NOT a committed mutation

-- D.3c Authorized idempotency fixture UPDATE (expect 1)
UPDATE public.idempotency_keys
SET expires_at = now() - interval '1 minute'
WHERE idem_key = '<r4r1fix… key from seed>';
-- Expect: UPDATE 1

-- D.3d Unrelated key denied (expect 0)
UPDATE public.idempotency_keys
SET expires_at = now() - interval '1 minute'
WHERE idem_key = 'prodlike-control-key-001';
-- Expect: UPDATE 0

-- D.3e Authorized marker INSERT (expect 1)
INSERT INTO public.lead_deletion_markers (idempotency_key, lead_id, reason)
VALUES ('r4r1mark' || to_char(now(), 'YYYYMMDDHH24MISS'), '<test_lead_id>'::uuid, 'soft_delete');
-- Expect: INSERT 1

-- D.3f Unauthorized marker prefix denied (expect error or 0 insert)
INSERT INTO public.lead_deletion_markers (idempotency_key, lead_id, reason)
VALUES ('prodlike-marker-001', '<test_lead_id>'::uuid, 'soft_delete');
-- Expect: fail WITH CHECK / insufficient_privilege — do not proceed if this SUCCEEDS

ROLLBACK;
```

**Classification:** transactional mutation tests. Success criteria = authorized statements affect expected rows; unauthorized statements affect **zero** rows or raise denial; final state restored via `ROLLBACK`.

## D.4 Unauthorized table / function access (as `scs_test_admin`)

```sql
-- TRANSACTIONAL MUTATION TEST / denial probes — as scs_test_admin
BEGIN;

-- Expect permission denied (42501) or zero visibility
SELECT count(*) FROM public.consent_records;

-- Expect 42501
SELECT public.purge_deleted_leads(365);

-- Expect 42501 (intake-only RPC)
SELECT public.insert_lead_bundle(
  'contact', 'x', 'x@example.com', null, null, null, null, null,
  'deny', 'contact', null, '/', 'privacy-2026-11-23', null, null,
  true, 'r4deny0001', now(), repeat('a', 64)
);

ROLLBACK;
```

**Expect:** denials (`42501`) for purge/insert; no broad PII read capability beyond fixture column grants.

## D.5 Elevated attributes remain disabled

```sql
-- READ-ONLY confirmation (may run in same scs_test_admin session)
SELECT rolsuper, rolcreaterole, rolreplication, rolbypassrls
FROM pg_roles
WHERE rolname = 'scs_test_admin';
```

**Expect:** all false.

## D.6 Admin seed cleanup

If §D.2 transaction still open as project admin: `ROLLBACK;`.  
If auto-committed: delete synthetic rows by recorded IDs/keys (admin only), including any accidental `prodlike-*` controls.

---

# SECTION E — Real-PG cases 1–13 (separate authorization)

> **Not part of SQL Editor apply.** Requires `A-DBTEST` (and `A-DEP` if `pg` missing).  
> Harness: `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs` (frozen — do not modify).

**Prerequisites:** §A discovery PASS; §B apply PASS; §B.2c SET ROLE PASS; §C PASS; §D transactional tests PASS; passwords provisioned privately; process-scoped env only.

**Command (when authorized):**

```powershell
node qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs
```

Cases 1–13 must PASS; case 14 remains NOT RUN. Then unset env (§F.3).

---

# SECTION F — Fixture teardown and privilege removal

> **Class: MUTATING cleanup** — staging only, when Owner retires fixture access or after failed partial apply that must be unwound.

## F.1 Drop staging fixture policies + revoke grants

```sql
-- MUTATING cleanup — staging only
BEGIN;

DROP POLICY IF EXISTS scs_fixture_leads_select ON public.leads;
DROP POLICY IF EXISTS scs_fixture_leads_update ON public.leads;
DROP POLICY IF EXISTS scs_fixture_idem_select ON public.idempotency_keys;
DROP POLICY IF EXISTS scs_fixture_idem_update ON public.idempotency_keys;
DROP POLICY IF EXISTS scs_fixture_outbox_select ON public.notification_outbox;
DROP POLICY IF EXISTS scs_fixture_outbox_update ON public.notification_outbox;
DROP POLICY IF EXISTS scs_fixture_markers_select ON public.lead_deletion_markers;
DROP POLICY IF EXISTS scs_fixture_markers_insert ON public.lead_deletion_markers;
DROP POLICY IF EXISTS scs_fixture_markers_update ON public.lead_deletion_markers;

REVOKE ALL ON TABLE public.leads FROM scs_test_admin;
REVOKE ALL ON TABLE public.idempotency_keys FROM scs_test_admin;
REVOKE ALL ON TABLE public.notification_outbox FROM scs_test_admin;
REVOKE ALL ON TABLE public.lead_deletion_markers FROM scs_test_admin;

COMMIT;
```

## F.2 Optional role drop / membership revoke

```sql
-- MUTATING cleanup — only if Owner intends to remove fixture login
-- REVOKE scs_intake_runtime, scs_notify_worker, anon, authenticated FROM CURRENT_USER;
-- Do NOT revoke provider-critical memberships you did not grant.
-- DROP ROLE scs_test_admin;  -- only after REVOKE and no dependent objects
```

Prefer deleting the whole staging project per Final Staging Runbook over hand-editing `supabase_admin`-owned membership graphs.

## F.3 Process env cleanup (Owner shell — not SQL)

```powershell
Remove-Item Env:SCS_AUTHORIZE_REAL_PG_TESTS -ErrorAction SilentlyContinue
Remove-Item Env:DATABASE_PROJECT_ADMIN_URL, Env:DATABASE_INTAKE_URL, Env:DATABASE_NOTIFY_URL, Env:DATABASE_OWNER_URL, Env:DATABASE_TEST_ADMIN_URL -ErrorAction SilentlyContinue
Remove-Item Env:DATABASE_SSL_CA, Env:DATABASE_SSL_CA_PATH, Env:PGSSLROOTCERT -ErrorAction SilentlyContinue
exit
```

---

## Stop conditions (global)

| Condition | Action |
|-----------|--------|
| Wrong project ref / region / database | Abort; do not paste SQL |
| Bootstrap fails CREATEROLE check | Abort; do not run migrations |
| Any migration errors | Abort sequence; do not continue |
| SET ROLE GRANT fails for `anon`/`authenticated` | Abort; escalate |
| SET ROLE probe fails | G2 BLOCKED — no harness |
| Fixture policy/grant missing; §D positive UPDATE returns 0 on test row | Re-apply §B.4; no harness |
| §D negative UPDATE returns >0 on non-test / non-r4 row | **STOP** — policies too broad; teardown §F; escalate |
| Unauthorized purge/insert EXECUTE succeeds for `scs_test_admin` | **STOP** — revoke; escalate |
| Ownership by runtime/fixture role | Abort; escalate |
| Urge to enable Data API for G2 | Not required — leave Disabled |
| Production project | **HOLD — never use this packet** |
| Request for BYPASSRLS / SUPERUSER fixture path | **Rejected** — use §B.4 policies only |

---

## Partial-failure recovery

| Failure point | Recovery |
|---------------|----------|
| Bootstrap fails | Fix CREATEROLE / identity; re-run bootstrap only; do not start migrations |
| Migration *N* fails | STOP. Do not run *N+1*. Capture error (no secrets). Escalate. Do not hand-edit frozen SQL. Optional: destroy staging project and restart under new `A-SQL` |
| §B.2 grant fails mid-list | Re-run §A.3; grant only missing **required** roles; do not force provider-managed edges |
| §B.3 role exists with bad attrs | `ALTER ROLE scs_test_admin NOINHERIT LOGIN NOSUPERUSER NOCREATEROLE NOREPLICATION NOBYPASSRLS;` then §B.5 password |
| §B.4 policy error | `ROLLBACK` if in txn; re-paste full overlay file; or §F.1 then retry §B.4 |
| §D left committed seeds | Admin delete by recorded IDs/keys; verify counts |
| Harness fails mid-suite | Unset env; leave DB; capture sanitized case results; do not widen privileges |
| Need alternate fixture path (SECURITY DEFINER procs) | **STOP** — submit separate change proposal; do not modify frozen harness/app |

---

## Explicit non-actions in this R1 preparation

This Markdown was authored without executing any block above. No DB connection, no SQL apply, no credential access, no installs, no Git, no deploy. Frozen 59-file M7B candidate untouched. G2 SQL awaits separate Owner `A-SQL`. Production **HOLD**.

### Harness / app change proposal status

**Not required.** Policies-only staging overlay (§B.4) is compatible with the frozen harness fixture statements. No CHANGE PROPOSAL file issued for harness edits.
