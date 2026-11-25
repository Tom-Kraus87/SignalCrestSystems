# M7B-G2 — SQL Execution Packet (Owner / SQL Editor)

**Date:** 2026-11-24  
**Target project:** `scs-staging` · ref `kfclinlrzfwodmichmci` · region `us-east-2` · DB `postgres`  
**Nature:** Prepared SQL only — **do not execute until Owner issues `A-SQL` (staging)**  
**Production:** **HOLD**  
**Preferred apply surface:** Supabase Dashboard → **SQL Editor** (project admin)

---

## How to use this packet

1. Sections labeled **READ-ONLY** never create/alter roles, grants, tables, or functions. Safe to run for inspection when authorized to connect.  
2. Sections labeled **MUTATING** change the database. Run only under written `A-SQL` for staging.  
3. Paste **one block at a time**. Stop on any error (fail closed).  
4. Never paste passwords into chat or into committed files. Replace placeholders out of band.  
5. Do **not** reorder bootstrap → migrations 001–007.  
6. Data API is **Disabled** on this project — expected; this packet does not enable it.

---

# SECTION A — READ-ONLY PREFLIGHT (administrator capability)

> **Class: READ-ONLY**  
> Run as project admin in SQL Editor. Capture pass/fail + role names only (no passwords).

## A.1 Session identity

```sql
-- READ-ONLY
SELECT current_user, session_user, current_database();

SELECT r.rolname, r.rolsuper, r.rolcreaterole, r.rolcanlogin, r.rolinherit
FROM pg_roles r
WHERE r.rolname = current_user;
```

**Expect:** `current_database() = postgres`; typically `rolsuper = f`, `rolcreaterole = t`; login role is project admin (usually `postgres`).  
**Stop if:** not on `postgres` database; no CREATEROLE and no SUPERUSER; wrong project (verify host/ref outside SQL).

## A.2 Role existence (before bootstrap = missing OK; after bootstrap = all four present)

```sql
-- READ-ONLY
SELECT rolname, rolcanlogin, rolinherit, rolsuper, rolcreaterole
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

**Expect after bootstrap:** four `scs_*` bootstrap roles exist; `scs_migration.rolcanlogin = false`; `scs_test_admin` may still be absent until §B.3.  
**Expect after §B.3:** `scs_test_admin` present with `rolcanlogin = true`, `rolinherit = false`.

## A.3 SET ROLE membership matrix (must be true before harness)

```sql
-- READ-ONLY
SELECT r.rolname AS member, m.rolname AS can_set_role
FROM pg_auth_members am
JOIN pg_roles r ON r.oid = am.member
JOIN pg_roles m ON m.oid = am.roleid
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

**Expect before §B.2:** often empty / incomplete → apply §B.2.  
**Expect after §B.2:** one row per target the harness switches into (`scs_intake_runtime`, `anon`, `authenticated`, `scs_notify_worker`; `scs_owner_admin` optional for SET ROLE).  
**Stop if:** rows still missing after §B.2 — escalate (do not force via undocumented superuser paths).

## A.4 Effective SET ROLE probes (mirrors harness `setRoleAndVerify`)

> Run **after** bootstrap + §B.2. Each probe is still non-DDL (session-local role switch). Treat failures as **BLOCKING**.

```sql
-- READ-ONLY capability probe (session-local; RESET immediately)
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

**Any failure = G2 BLOCKED.** Do not start the Node harness.

## A.5 Fixture identity probe (connect / SQL Editor as `scs_test_admin`)

> Requires login as `scs_test_admin` (separate session). Not project-admin SET ROLE.

```sql
-- READ-ONLY (as scs_test_admin)
SELECT current_user, session_user;

SELECT rolsuper, rolcreaterole, rolinherit, rolreplication, rolbypassrls, rolcanlogin
FROM pg_roles
WHERE rolname = current_user;
```

**Expect:** `current_user = session_user = scs_test_admin`; elevated attributes **false**; `rolinherit = f`; `rolcanlogin = t`.

## A.6 Fixture DML privilege smoke (synthetic; always ROLLBACK)

> Run as `scs_test_admin` after §B.4. Still classified READ-ONLY intent (no committed mutation).

```sql
-- READ-ONLY intent — ROLLBACK required
BEGIN;
UPDATE public.idempotency_keys SET expires_at = now() WHERE FALSE;
UPDATE public.notification_outbox SET lease_expires_at = now() WHERE FALSE;
UPDATE public.leads SET deleted_at = now() WHERE FALSE;
INSERT INTO public.lead_deletion_markers (idempotency_key, lead_id, reason)
  SELECT 'm7b-preflight-deny', id, 'soft_delete' FROM public.leads WHERE FALSE;
ROLLBACK;
```

**Expect:** no `42501` insufficient_privilege on the empty UPDATE/INSERT.  
**Stop if:** hard privilege error on relation → re-apply §B.4.

## A.7 `scs_migration` remains NOLOGIN

```sql
-- READ-ONLY
SELECT rolname, rolcanlogin, rolsuper, rolcreaterole
FROM pg_roles
WHERE rolname = 'scs_migration';
```

**Expect:** `rolcanlogin = false`. If true on a prior accidental apply: Owner may `ALTER ROLE scs_migration NOLOGIN` under `A-SQL` (mutating; not in §A).

---

# SECTION B — MUTATING SQL (Owner `A-SQL` only)

> **Class: MUTATING**  
> Staging `scs-staging` / `kfclinlrzfwodmichmci` only. Production HOLD.

## B.0 SQL Editor paste instructions (apply path)

1. Open Supabase Dashboard → project **scs-staging** → **SQL Editor**.  
2. Confirm project ref in the URL/UI is **`kfclinlrzfwodmichmci`**.  
3. Open each file below from disk; copy **entire file** contents; paste; **Run**.  
4. On success, proceed to the next file. On error: **STOP** — do not continue the sequence.  
5. Do not use migration 006’s historical “swallowed insufficient_privilege NOTICE” as a provisioning path; bootstrap must already have created roles before 007.

## B.1 Bootstrap + migrations 001–007 (ordered file paste)

| Order | Action | Relative path |
|------:|--------|---------------|
| 1 | Paste & Run entire file | `db/bootstrap/001_m7a_r4_role_bootstrap.sql` |
| 2 | Paste & Run entire file | `db/migrations/001_m7a_leads_foundation.sql` |
| 3 | Paste & Run entire file | `db/migrations/002_m7a_rls_least_privilege.sql` |
| 4 | Paste & Run entire file | `db/migrations/003_m7a_retention_procedures.sql` |
| 5 | Paste & Run entire file | `db/migrations/004_m7a_counters_idempotency.sql` |
| 6 | Paste & Run entire file | `db/migrations/005_m7a_insert_lead_bundle.sql` |
| 7 | Paste & Run entire file | `db/migrations/006_m7a_r2_security_hardening.sql` |
| 8 | Paste & Run entire file | `db/migrations/007_m7a_r4_security_corrections.sql` |

**Absolute paths (Windows):**

```
C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\db\bootstrap\001_m7a_r4_role_bootstrap.sql
C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\db\migrations\001_m7a_leads_foundation.sql
C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\db\migrations\002_m7a_rls_least_privilege.sql
C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\db\migrations\003_m7a_retention_procedures.sql
C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\db\migrations\004_m7a_counters_idempotency.sql
C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\db\migrations\005_m7a_insert_lead_bundle.sql
C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\db\migrations\006_m7a_r2_security_hardening.sql
C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\db\migrations\007_m7a_r4_security_corrections.sql
```

**Optional between order 1 and 2:** create `scs_test_admin` (§B.3). Tables for §B.4 do not exist until migrations complete — **fixture grants wait until after order 8**.

**Passwords for LOGIN roles:** set out of band after roles exist (Dashboard or `ALTER ROLE … PASSWORD` privately). Bootstrap does **not** set passwords.

## B.2 SET ROLE membership grants (project admin → harness targets)

> **Prerequisite:** §B.1 order 1 complete (roles exist).  
> Roles are `NOINHERIT`; membership enables `SET ROLE` without inheriting privileges in normal sessions.

```sql
-- MUTATING — staging only — replace postgres if project-admin login name differs
GRANT scs_intake_runtime TO postgres;
GRANT scs_notify_worker TO postgres;
GRANT scs_owner_admin TO postgres;   -- optional for SET ROLE; owner URL login preferred for case 8 identity
GRANT anon TO postgres;
GRANT authenticated TO postgres;
```

**Notes:**

1. Do **not** `GRANT postgres TO <runtime>`.  
2. Do **not** grant SUPERUSER / BYPASSRLS / CREATEROLE to runtime or fixture roles.  
3. If `GRANT anon|authenticated` fails because membership is owned by `supabase_admin`, **STOP** and escalate to Atlas — do not improvise.  
4. Re-run §A.3–A.4 after this block.

## B.3 Create staging-only `scs_test_admin`

> **Prerequisite:** project admin with CREATEROLE. Prefer after bootstrap; required before harness.  
> **Never** production. **Never** Netlify Function env.

```sql
-- MUTATING — staging only
-- Password: set out of band (Dashboard / ALTER ROLE). Do NOT commit or chat the password.
CREATE ROLE scs_test_admin NOINHERIT LOGIN
  PASSWORD 'REPLACE_OUT_OF_BAND_IN_PASSWORD_MANAGER';

-- Optionally tighten:
-- ALTER ROLE scs_test_admin CONNECTION LIMIT 2;

COMMENT ON ROLE scs_test_admin IS
  'Staging fixture setup/teardown only. Never Function runtime. Never production.';
```

**After create:** immediately replace the placeholder password via Owner password manager workflow; do not leave the placeholder string. Wire username **exactly** `scs_test_admin` into `DATABASE_TEST_ADMIN_URL` when harness runs.

## B.4 Fixture table grants (minimum for cases 2, 5, 9, 13)

> **Prerequisite:** migrations 001–007 applied (tables exist). Staging only.

```sql
-- MUTATING — staging only — minimum fixture privileges
GRANT UPDATE ON TABLE public.idempotency_keys TO scs_test_admin;
GRANT INSERT, UPDATE ON TABLE public.lead_deletion_markers TO scs_test_admin;
GRANT UPDATE ON TABLE public.notification_outbox TO scs_test_admin;
GRANT UPDATE ON TABLE public.leads TO scs_test_admin;
```

**Do not grant to `scs_test_admin`:** SUPERUSER, CREATEROLE, REPLICATION, BYPASSRLS, EXECUTE on purge/soft-delete RPCs (unless a future authorized case requires it), Function-runtime membership, or any production access.

**Optional later:** `usage_counters` DML only if a future fixture mutates counters directly (current harness uses intake RPCs).

## B.5 Out-of-band password setting (mutating; Owner private)

Not pasted here with real secrets. Owner actions only:

1. Set/reset passwords for `scs_intake_runtime`, `scs_notify_worker`, `scs_owner_admin`, `scs_test_admin` in Dashboard or private SQL.  
2. Store in password manager.  
3. Build connection URLs privately (never in repo). Host patterns:  
   - Direct: `db.kfclinlrzfwodmichmci.supabase.co:5432`  
   - Pooler: `aws-1-us-east-2.pooler.supabase.com` (session `5432` / transaction `6543`)  
4. Prefer `sslmode=verify-full`. Pooler usernames often embed `.kfclinlrzfwodmichmci`.

---

# SECTION C — READ-ONLY VERIFICATION (after §B apply)

> **Class: READ-ONLY**  
> Run as project admin after bootstrap + migrations + grants.

## C.1 Table ownership (expect project admin / `postgres`)

```sql
-- READ-ONLY
SELECT c.relname AS table_name, r.rolname AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_roles r ON r.oid = c.relowner
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'leads',
    'consent_records',
    'submission_requests',
    'owner_allowlist',
    'usage_counters',
    'idempotency_keys',
    'notification_outbox',
    'lead_deletion_markers'
  )
ORDER BY 1;
```

**Expect:** owner = project admin (`postgres`), **not** `scs_intake_runtime`, `scs_notify_worker`, `scs_test_admin`, or `scs_migration`.  
**Stop if:** any runtime/fixture/migration role owns these tables.

## C.2 SECURITY DEFINER function owners + search_path sanity

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
    'insert_lead_bundle',
    'lookup_idempotency_response',
    'idempotency_set_nx',
    'atomic_counter_incr',
    'atomic_counter_get',
    'atomic_counter_expire',
    'claim_notification_outbox',
    'complete_notification_outbox',
    'notification_outbox_status_counts',
    'soft_delete_lead',
    'purge_deleted_leads',
    'purge_test_leads',
    'purge_unconverted_leads',
    'is_owner_aal2'
  )
ORDER BY 1, 2;
```

**Expect:** `security_definer = true` where designed; owner = project admin; `search_path` hardened via `proconfig` (migration 006/007 pattern).  
**Stop if:** owned by runtime/fixture roles.

## C.3 RLS enabled on sensitive tables

```sql
-- READ-ONLY
SELECT c.relname, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'leads',
    'consent_records',
    'submission_requests',
    'owner_allowlist'
  )
ORDER BY 1;
```

**Expect:** `rls_enabled = true` for the listed tables (per migration 002).

## C.4 Effective grants — intake must not SELECT idempotency_keys; notify must not run owner status RPC

```sql
-- READ-ONLY
SELECT
  has_table_privilege('scs_intake_runtime', 'public.idempotency_keys', 'SELECT') AS intake_idem_select,
  has_table_privilege('scs_notify_worker', 'public.notification_outbox', 'SELECT') AS notify_outbox_select,
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
  has_table_privilege('scs_test_admin', 'public.idempotency_keys', 'UPDATE') AS fixture_idem_update,
  has_table_privilege('scs_test_admin', 'public.leads', 'UPDATE') AS fixture_leads_update,
  has_table_privilege('scs_test_admin', 'public.notification_outbox', 'UPDATE') AS fixture_outbox_update,
  has_table_privilege('scs_test_admin', 'public.lead_deletion_markers', 'INSERT') AS fixture_markers_insert;
```

**Expect:**

| Check | Value |
|-------|------:|
| `intake_idem_select` | false |
| `notify_outbox_select` | false (worker uses claim RPC) |
| `intake_lookup_exec` | true |
| `notify_claim_exec` | true |
| `notify_status_exec` | false |
| `owner_status_exec` | true |
| fixture UPDATE/INSERT flags | true after §B.4 |

## C.5 anon / authenticated denial snapshot (Data API Disabled — still verify DB grants)

```sql
-- READ-ONLY
-- Signature matches harness INSERT_SIGNATURE / migration 005–006.
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

> OID-based fallback if privilege check by signature fails to resolve:

```sql
-- READ-ONLY fallback — list EXECUTE grants for insert_lead_bundle
SELECT r.rolname, has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN (VALUES ('anon'), ('authenticated'), ('scs_intake_runtime')) AS q(rolname)
JOIN pg_roles r ON r.rolname = q.rolname
WHERE n.nspname = 'public' AND p.proname = 'insert_lead_bundle';
```

**Expect:** `anon` has no lead table SELECT / no insert EXECUTE; intake runtime has EXECUTE. Data API Disabled means PostgREST will not serve these objects over HTTP even if mis-granted — still treat bad grants as **STOP**.

---

## Stop conditions (global)

| Condition | Action |
|-----------|--------|
| Wrong project ref / region / database | Abort; do not paste SQL |
| Bootstrap fails CREATEROLE check | Abort; do not run migrations |
| Any migration errors | Abort sequence; do not continue to next file |
| SET ROLE GRANT fails for `anon`/`authenticated` | Abort; escalate |
| SET ROLE probe fails | G2 BLOCKED — no harness |
| Fixture DML `42501` after grants | Re-check §B.4; no harness |
| Ownership by runtime/fixture role | Abort; escalate |
| Urge to enable Data API for G2 | Not required — leave Disabled |
| Production project | **HOLD — never use this packet** |

---

## Explicit non-actions in preparation

This Markdown was authored without executing any block above. G2 apply awaits separate Owner `A-SQL` / `A-DBTEST` authorization.
