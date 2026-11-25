# M7B-G2-R3 — SQL Execution Packet (Owner / Admin SQL Editor + External Client)

**Date:** 2026-11-24  
**Revision:** R3 (supersedes `M7B-G2-R2-SQL-EXECUTION-PACKET-20261124.md` for apply guidance; R2/R1 and prior G2 packets retained as historical — do not delete/overwrite)  
**Target project:** `scs-staging` · ref `kfclinlrzfwodmichmci` · region `us-east-2` · DB `postgres`  
**Nature:** Prepared SQL only — **do not execute mutating sections until Owner issues `A-SQL` (staging)**  
**Production:** **HOLD**  
**Administrator apply surface:** Supabase Dashboard → **SQL Editor** (project admin only)  
**Independent fixture / custom-role surface:** **external TLS-verifying PostgreSQL client only** (not SQL Editor)  
**Authoritative form:** this Markdown file (PDF is an Atlas upload copy)

### Owner-verified live evidence (recorded; do not re-run)

| Field | Value |
|-------|-------|
| PostgreSQL | 17.12 / `server_version_num` 170012 |
| Admin identity | `current_user`=`postgres`, `session_user`=`postgres`, DB `postgres` |
| Role attrs | `rolsuper`=false, `rolcreaterole`=true, `rolinherit`=true, `rolcanlogin`=true |
| PG16+ gate | **PASS** |
| External connectivity | **UNVERIFIED** (Owner separate discovery) |

---

## How to use this packet

1. Sections labeled **READ-ONLY** never create/alter roles, grants, tables, policies, or functions (except session-local `SET ROLE` / `RESET ROLE` / `BEGIN`/`ROLLBACK` probes explicitly labeled).  
2. Sections labeled **MUTATING** change the database. Run only under written `A-SQL` for staging.  
3. Sections labeled **TRANSACTIONAL MUTATION TEST** perform real DML. Seed rows are **committed** then later **cleaned**; fixture mutations run in **rollback** transactions (or savepoints). They are **not** read-only smoke tests.  
4. Paste **one block at a time** in SQL Editor for **administrator** operations. For independent fixture-role operations, run blocks from an external TLS-verifying client logged in as that role. Stop on any error (fail closed), except where a block documents an expected denial that is isolated via savepoint / separate transaction.  
5. Never paste passwords into chat, AI context, committed files, shell history intentionally, SQL Editor saved queries, evidence logs, or command-line arguments.  
6. Do **not** reorder bootstrap → migrations 001–007.  
7. Data API is **Disabled** on this project — expected; this packet does not enable it.  
8. Do **not** grant `BYPASSRLS`, `SUPERUSER`, `CREATEROLE`, or `REPLICATION` to runtime or fixture roles.  
9. Do **not** alter the project administrator role’s inheritance attributes or provider-managed memberships beyond the explicit PG16+ `GRANT … WITH INHERIT FALSE, SET TRUE, ADMIN FALSE` memberships listed in §B.2.  
10. **`SET ROLE` alone is NOT independent authentication.** Administrator `SET ROLE` probes prove switchability only. Independent fixture proofs require a real login where **both** `current_user` and `session_user` equal the expected role.  
11. Dashboard SQL Editor authenticates as the project administrator. It **cannot** be used to independently authenticate as `scs_test_admin`.

---

## Direct vs session pooler decision (mutually exclusive)

Choose **exactly one** path before wiring harness URLs or running independent fixture logins.

### Path A — Direct DB host (compatible with frozen harness)

| Item | Requirement |
|------|-------------|
| Host | `db.kfclinlrzfwodmichmci.supabase.co:5432` |
| Usernames | Exact bare roles (`postgres`, `scs_intake_runtime`, `scs_notify_worker`, `scs_owner_admin`, `scs_test_admin`) |
| Harness | Existing frozen `verify-m7a-r2-postgres-integration-20261123.mjs` — **no change** |
| Prerequisites | Verified DNS/TCP connectivity; TLS hostname validation; independent role auth via external TLS-verifying client |
| Freeze | **No freeze break required** |

### Path B — Shared session pooler (requires separately authorized harness revision)

| Item | Requirement |
|------|-------------|
| Host | `aws-1-us-east-2.pooler.supabase.com:5432` (**session** pooler) |
| Usernames | Provider project-qualified (`<role>.kfclinlrzfwodmichmci`) |
| Harness | **Incompatible** with frozen exact-username validators |
| Action | See `M7B-G2-R3-HARNESS-CHANGE-PROPOSAL-PATH-B-20261124.md` — **DO NOT IMPLEMENT in this assignment** |
| Transaction pooler `:6543` | **Forbidden** as an unreviewed substitute |

**This packet’s default apply/harness path is Path A.** Stop if Path B is required and no authorized revision exists.

---

## Fixture isolation (mandatory conditions)

> Policies-only overlay; **frozen harness unchanged** (Path A).  
> Prefix / `is_test` RLS is **not** per-run isolation.

| Condition | Required |
|-----------|----------|
| Project | Dedicated staging only (`scs-staging` / `kfclinlrzfwodmichmci`) |
| Data | Synthetic records only — no production / customer PII |
| Window | **Exclusive serial staging maintenance window** for §D and harness |
| Concurrency | No concurrent harness sessions **and** no concurrent admin fixture seeding/cleanup sessions |
| Fixture-visible hygiene | No unexpected fixture-visible records across **all** relevant namespaces: `leads.is_test = true`, outbox rows for test leads, all `r4%` / `it-%` idempotency keys and deletion markers, plus active seed token |
| Baseline | Expanded inventory before seeds (§D.0); **STOP** if unexpected rows exist |
| Residuals | Post-cleanup zero residual for seed token **and** dependents (§D.6c) |
| Teardown | Explicit fixture privilege teardown (§F) when retiring fixtures |
| Production | **HOLD** — never apply this overlay |

---

## Execution phases (do not collapse)

| Phase | Class | Packet section | Auth / surface |
|------:|-------|----------------|----------------|
| 0 | READ-ONLY | §A — Initial administrator discovery | SQL Editor OK; §A.0/A.1 already PASS (recorded) |
| 1 | MUTATING | §B.1 — Bootstrap + migrations 001–007 | `A-SQL` · SQL Editor (admin) |
| 2 | MUTATING | §B.2 — SET ROLE memberships (**PG16+ only**) | `A-SQL` · SQL Editor (admin) |
| 3 | MUTATING | §B.3 — Create `scs_test_admin` (no password in SQL) | `A-SQL` · SQL Editor (admin) |
| 4 | Owner private | §B.5 — Password provisioning (verified UI **or** authorized secure alternative) | Owner only |
| 5 | MUTATING | §B.4 — Fixture column grants + staging RLS policies | `A-SQL` · SQL Editor (admin) |
| 6 | READ-ONLY | §C — Post-apply verification | SQL Editor (admin) |
| 7 | TRANSACTIONAL MUTATION TEST | §D — Cross-session seed / fixture / cleanup | `A-SQL` · admin SQL Editor **+** external fixture client |
| 8 | Harness | §E — Real-PG cases 1–13 | Separate `A-DBTEST` (+ `A-DEP` if needed); **Path A** |
| 9 | MUTATING cleanup | §F — Fixture teardown / privilege removal | `A-SQL` when retiring fixtures |

**G2 SQL execution remains unauthorized until Owner issues `A-SQL`.** This R3 packet is preparation only until that token exists. **G2 mutation authorization remains withheld.**

---

# SECTION A — Initial READ-ONLY administrator discovery

> **Class: READ-ONLY**  
> Run as project admin in SQL Editor. Capture pass/fail + role names only (no passwords).

## A.0 PostgreSQL version gate (PG16+ required for G2)

> **Owner-verified live result (do not re-run as a blocker):** `server_version`=17.12, `server_version_num`=170012 → **PASS**.

```sql
-- READ-ONLY (re-confirm only if project was rebuilt)
SELECT
  current_setting('server_version') AS server_version,
  current_setting('server_version_num')::int AS server_version_num,
  (current_setting('server_version_num')::int / 10000) AS major_version,
  (current_setting('server_version_num')::int >= 160000)
    AS pg16_or_newer_required_for_g2;
```

**Expect:** `server_version_num >= 160000` and `pg16_or_newer_required_for_g2 = true`.  
**If `server_version_num < 160000`:** **STOP G2.** Do **not** run §B.2 or any later mutating G2 membership/fixture path. Do **not** use a bare `GRANT role TO user` compatibility shortcut. A separately reviewed PostgreSQL 15 (or earlier) compatibility design is required under a new authorization — out of scope for this packet.  
**Do not** change the project administrator’s `rolinherit` / other role attributes to compensate.  
**Stop if:** cannot read `server_version_num`.

## A.1 Session identity

> **Owner-verified live result (do not re-run as a blocker):** `current_user`=`postgres`, `session_user`=`postgres`, DB `postgres`; `rolsuper`=false; `rolcreaterole`=true; `rolcanlogin`=true → **PASS**.

```sql
-- READ-ONLY (re-confirm only if project was rebuilt)
SELECT current_user, session_user, current_database();

SELECT r.rolname, r.rolsuper, r.rolcreaterole, r.rolcanlogin, r.rolinherit,
       r.rolreplication, r.rolbypassrls
FROM pg_roles r
WHERE r.rolname = current_user;
```

**Expect:** `current_database() = postgres`; typically `rolsuper = f`, `rolcreaterole = t`; login role is project admin (often `postgres`); **both** `current_user` and `session_user` identify the administrator login.  
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
**On fresh DB before bootstrap:** zero/partial rows — record as not yet provisioned (OK for Phase 0).

## A.3 Existing memberships + options (inspect before granting)

> Do **not** blindly modify provider-managed memberships. Record grantor/options first.  
> Authorized G2 membership grants use **PostgreSQL 16+** options only (§B.2).  
> Do **not** alter project-admin inheritance attributes.

```sql
-- READ-ONLY (PostgreSQL 16+ — required for authorized G2)
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

**Harness-required SET ROLE targets:** `scs_intake_runtime`, `anon`, `authenticated`, `scs_notify_worker`.  
**Not required for SET ROLE:** `scs_owner_admin` — case 8 uses independent `DATABASE_OWNER_URL` login. **Do not** add optional `GRANT scs_owner_admin TO …` unless a future authorized case needs admin `SET ROLE`.  
**Stop if:** `anon`/`authenticated` membership is owned exclusively by `supabase_admin` and cannot be granted — escalate to Atlas (do not improvise).

## A.4 Effective privilege snapshot (pre-apply baseline — fresh-DB safe)

> Missing roles, relations, or functions on a fresh staging database must yield an explicit **`NOT PROVISIONED`** result — **not** an unhandled SQL error.

```sql
-- READ-ONLY — catalog-guarded; safe on empty / partial staging DB
WITH catalog AS (
  SELECT
    EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'scs_intake_runtime')
      AS role_intake_exists,
    EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'scs_test_admin')
      AS role_fixture_exists,
    to_regclass('public.idempotency_keys') IS NOT NULL
      AS rel_idem_exists,
    to_regprocedure('public.lookup_idempotency_response(text, text)') IS NOT NULL
      AS fn_lookup_exists
)
SELECT
  CASE
    WHEN NOT (
      role_intake_exists
      AND role_fixture_exists
      AND rel_idem_exists
      AND fn_lookup_exists
    ) THEN 'NOT PROVISIONED'
    ELSE 'OBJECTS PRESENT'
  END AS provision_status,
  role_intake_exists,
  role_fixture_exists,
  rel_idem_exists,
  fn_lookup_exists,
  CASE
    WHEN role_intake_exists AND rel_idem_exists
      THEN has_table_privilege('scs_intake_runtime', 'public.idempotency_keys', 'SELECT')
    ELSE NULL
  END AS intake_idem_select,
  CASE
    WHEN role_intake_exists AND fn_lookup_exists
      THEN has_function_privilege(
             'scs_intake_runtime',
             'public.lookup_idempotency_response(text, text)',
             'EXECUTE'
           )
    ELSE NULL
  END AS intake_lookup_exec,
  CASE
    WHEN role_fixture_exists AND rel_idem_exists
      THEN has_table_privilege('scs_test_admin', 'public.idempotency_keys', 'UPDATE')
    ELSE NULL
  END AS fixture_idem_update_pre
FROM catalog;
```

**Expect before §B:** often `provision_status = NOT PROVISIONED` / privilege columns `NULL` — OK on fresh project. Record baseline only.  
**Do not** treat `NOT PROVISIONED` as a SQL failure.

## A.5 `scs_migration` remains NOLOGIN

```sql
-- READ-ONLY — guarded
SELECT
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'scs_migration')
      THEN 'NOT PROVISIONED'
    ELSE 'PRESENT'
  END AS migration_role_status,
  (SELECT rolcanlogin FROM pg_roles WHERE rolname = 'scs_migration') AS rolcanlogin,
  (SELECT rolsuper FROM pg_roles WHERE rolname = 'scs_migration') AS rolsuper,
  (SELECT rolcreaterole FROM pg_roles WHERE rolname = 'scs_migration') AS rolcreaterole;
```

**Expect after bootstrap:** `PRESENT` and `rolcanlogin = false`.  
**Expect before bootstrap:** `NOT PROVISIONED` (OK).

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

## B.2 SET ROLE membership grants (PostgreSQL 16+ only)

> **Prerequisite:** §B.1 order 1 complete; §A.0 returned `server_version_num >= 160000`; §A.3 inspected.  
> Required targets only (no optional `scs_owner_admin`).  
> **Executable PG15 bare-GRANT branch removed in R2 (retained removed in R3).** If version &lt; 16, G2 remains stopped pending a separately reviewed compatibility design. Live staging is PG17 — gate already PASS.

### B.2a PostgreSQL 16+ form (authorized)

```sql
-- MUTATING — staging only — PG16+ REQUIRED
-- Grants to CURRENT_USER (project admin session). INHERIT FALSE / SET TRUE / ADMIN FALSE.
-- Does NOT alter project-admin role attributes (rolinherit etc.).
GRANT scs_intake_runtime TO CURRENT_USER
  WITH INHERIT FALSE, SET TRUE, ADMIN FALSE;
GRANT scs_notify_worker TO CURRENT_USER
  WITH INHERIT FALSE, SET TRUE, ADMIN FALSE;
GRANT anon TO CURRENT_USER
  WITH INHERIT FALSE, SET TRUE, ADMIN FALSE;
GRANT authenticated TO CURRENT_USER
  WITH INHERIT FALSE, SET TRUE, ADMIN FALSE;
```

**Notes:**

1. Do **not** `GRANT postgres TO <runtime>`.  
2. Do **not** grant SUPERUSER / BYPASSRLS / CREATEROLE to runtime or fixture roles.  
3. If `GRANT anon|authenticated` fails due to provider-managed membership — **STOP**; escalate.  
4. Do **not** invent a PG15 bare-GRANT workaround in this packet.  
5. Re-run §A.3 after grants. Then run §B.2c.

### B.2c Post-grant membership + SET ROLE verification

```sql
-- READ-ONLY verification immediately after §B.2a
-- 1) Membership rows for required targets must exist
SELECT m.rolname AS can_set_role,
       am.inherit_option,
       am.set_option,
       am.admin_option
FROM pg_auth_members am
JOIN pg_roles r ON r.oid = am.member
JOIN pg_roles m ON m.oid = am.roleid
WHERE r.rolname = current_user
  AND m.rolname IN (
    'scs_intake_runtime', 'scs_notify_worker', 'anon', 'authenticated'
  )
ORDER BY 1;

-- Expect for each of the four: inherit_option = f, set_option = t, admin_option = f

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

## B.3 Create staging-only `scs_test_admin` (no password literal)

> **Prerequisite:** project admin with CREATEROLE.  
> **Never** production. **Never** Netlify Function env.  
> **Never** put a password placeholder or `ALTER ROLE … PASSWORD` in executable SQL.

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

-- Optional harden (no password):
-- ALTER ROLE scs_test_admin CONNECTION LIMIT 2;
```

**Password:** Owner provisions out of band per §B.5. Do not embed `PASSWORD '…'` here.

## B.4 Fixture column grants + staging-only RLS policies

> **Prerequisite:** migrations 001–007 applied; `scs_test_admin` exists.  
> Table-level DML grants alone are insufficient under RLS. This step adds narrowly scoped policies so `scs_test_admin` can mutate **synthetic** fixtures only.  
> **Harness change:** **not required** — predicates match frozen harness (`is_test = true`, keys `r4*` / `it-*`, outbox→test lead).  
> **Isolation:** prefix/`is_test` RLS is not per-run isolation — obey Fixture isolation table above.

**Paste entire file:**

```
qa-m6b/M7B-G2-R3-staging-fixture-rls-policies-20261124.sql
```

**Absolute path:**

```
C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\qa-m6b\M7B-G2-R3-staging-fixture-rls-policies-20261124.sql
```

**Exact privileges encoded in that file:**

| Table | SELECT columns | INSERT columns | UPDATE columns | RLS predicate |
|-------|----------------|----------------|----------------|---------------|
| `leads` | `id`, `is_test` | — | `deleted_at` | `is_test = true` |
| `idempotency_keys` | `idem_key` | — | `expires_at` | `idem_key LIKE 'r4%' OR LIKE 'it-%'` |
| `notification_outbox` | `id`, `lead_id` | — | `lease_expires_at` | EXISTS test lead |
| `lead_deletion_markers` | key/lead/reason/`deleted_at` | key/lead/`reason` | `deleted_at`, `reason` | key `r4*` / `it-*` |

**Explicitly not granted:** `usage_counters` direct DML; EXECUTE on purge/soft-delete RPCs; BYPASSRLS; broad `SELECT *` on PII tables beyond listed columns; Function-runtime membership.

**Historical overlays retained (do not delete):**  
`qa-m6b/M7B-G2-R1-staging-fixture-rls-policies-20261124.sql`  
`qa-m6b/M7B-G2-R2-staging-fixture-rls-policies-20261124.sql`

## B.5 Owner-only password provisioning (no SQL password literals)

**Hard rule:** Never put passwords in this packet, chat, AI context, shell history intentionally, committed files, SQL Editor saved history, evidence logs, or command-line arguments.

**Do not assume** the Dashboard Roles UI can provision passwords for custom login roles until the Owner has **verified** that capability on this project.

### Method 1 — Dashboard Roles UI (only if Owner-verified)

1. Open Supabase Dashboard → project **scs-staging** → **Database** → **Roles**.  
2. Confirm the UI exposes password set/reset for custom login roles (not only built-in roles).  
3. If confirmed, set/reset passwords for: project admin (if rotating), `scs_intake_runtime`, `scs_notify_worker`, `scs_owner_admin`, `scs_test_admin`.  
4. Store secrets **only** in the Owner password manager.  
5. If the UI cannot set custom-role passwords: **do not improvise** — go to Method 2 / STOP.

### Method 2 — Secure Owner-only alternative (`psql` interactive password prompt)

> Requires separately authorized availability of a TLS-verifying `psql` (or equivalent) client and, if not already installed, Owner `A-DEP`.  
> Connect as project admin with verified TLS. **Do not** place the new password on the shell command line or in a SQL file.

1. Connect with verified TLS to the **Path A** direct host as project admin (password supplied by prompt / trusted secret store integration — not echoed).  
2. At the `psql` prompt, run interactive password assignment for each login role, e.g. `\password scs_test_admin` (and similarly for other required login roles). Enter the password only at the interactive prompt.  
3. Store secrets **only** in the Owner password manager.  
4. Disconnect.

Other provider-native secure tools under Owner control are acceptable **only** when separately authorized and operated so secrets never enter SQL Editor history, shell arguments, AI context, or evidence logs.

### Connection URL construction (after passwords exist)

Build URLs privately in the password manager / ephemeral Owner notes (never in repo):

- **Path A (default):** `db.kfclinlrzfwodmichmci.supabase.co:5432` with **exact bare** usernames  
- **Path B:** session pooler host + project-qualified usernames — **only** with authorized harness revision (not this packet)  
- Prefer `sslmode=verify-full`  
- Wire username **exactly** `scs_test_admin` into process-scoped `DATABASE_TEST_ADMIN_URL` only when `A-DBTEST` is issued **and Path A is selected**

### Explicitly forbidden

- Executable-looking `ALTER ROLE … PASSWORD '…'` templates (including placeholders) in this packet or SQL Editor.  
- Pasting password SQL into SQL Editor (durable SQL history risk).  
- Echoing passwords into PowerShell/`psql` command lines (shell history risk).  
- Logging connection strings with embedded passwords into evidence files.  
- Assuming Dashboard UI works without Owner verification.

---

# SECTION C — Post-apply READ-ONLY verification

> **Class: READ-ONLY**  
> Run as project admin after §B.1–B.4. Objects are expected to exist after apply; unexpected missing objects → STOP / escalate (not “fresh baseline”).

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

# SECTION D — Authorized transactional fixture mutation tests (cross-session)

> **Class: TRANSACTIONAL MUTATION TEST** (not read-only)  
> Retains R2 committed-seed / cross-session design; R3 hardens authentication, baseline isolation, and consent denial semantics.  
> Requires: (1) project-admin session (SQL Editor OK) for committed seeds + cleanup, (2) **independently authenticated** `scs_test_admin` session via an **external TLS-verifying PostgreSQL client** for visibility + mutations.  
> **SQL Editor cannot authenticate independently as `scs_test_admin`.**  
> **`SET ROLE scs_test_admin` from an admin session is NOT independent authentication.**  
> Require exclusive serial staging maintenance window.  
> **Always** isolate expected permission errors with separate transactions or savepoints.

### Seed SQL validation note (migrations read-only; not executed this pass)

Validated against:

| Object | Migration | Constraints used by seeds |
|--------|-----------|---------------------------|
| `leads` | 001 | `form_name` ∈ {`contact`,`project-request`}; `source` ∈ {`contact`,`advisor`,`project-request`}; `message` 1–5000; email `@` check; `received_at` NOT NULL; `is_test` boolean |
| `idempotency_keys` | 004 | `idem_key` PK length 8–128; `response_json` NOT NULL; `expires_at` nullable |
| `submission_requests` | 001 (+005 `payload_hash`) | `status` enum; `form_name`; `received_at`; optional `lead_id` FK |
| `notification_outbox` | 005 (+006 lease cols) | `lead_id` FK RESTRICT; `submission_id` FK RESTRICT; `lease_expires_at` nullable |
| `lead_deletion_markers` | 006 | `idempotency_key` PK 8–128; `lead_id` nullable; `reason` ≤ 64 |

## D.0 Baseline residual + fixture-visible inventory (project admin)

> Run before seeding under the exclusive maintenance window.  
> Inventory **all fixture-visible** namespaces the overlay / harness can touch — not only the upcoming seed token.  
> **STOP** on any unexpected existing fixture-visible records.

```sql
-- READ-ONLY baseline — project admin
-- Replace <SEED_TOKEN> with the token you will use in §D.2 (example: 20261124184500)
SELECT
  -- Full fixture-visible namespaces (STOP if unexpected non-zero)
  (SELECT count(*) FROM public.leads WHERE is_test = true)
    AS fixture_visible_test_leads,
  (SELECT count(*) FROM public.notification_outbox o
     WHERE EXISTS (
       SELECT 1 FROM public.leads l
       WHERE l.id = o.lead_id AND l.is_test = true
     )) AS fixture_visible_test_outbox,
  (SELECT count(*) FROM public.idempotency_keys
     WHERE idem_key LIKE 'r4%' OR idem_key LIKE 'it-%')
    AS fixture_visible_r4_or_it_idem,
  (SELECT count(*) FROM public.lead_deletion_markers
     WHERE idempotency_key LIKE 'r4%' OR idempotency_key LIKE 'it-%')
    AS fixture_visible_r4_or_it_markers,
  -- Active / prior R3 seed-token residuals
  (SELECT count(*) FROM public.leads
     WHERE email LIKE 'r3g2-seed-%@example.invalid'
        OR message LIKE 'M7B-G2-R3 seed%'
        OR name LIKE 'R3G2 Seed%') AS residual_leads_like,
  (SELECT count(*) FROM public.idempotency_keys
     WHERE idem_key LIKE 'r4r3g2seed-%'
        OR idem_key LIKE 'ctrl-r3g2seed-%') AS residual_idem_like,
  (SELECT count(*) FROM public.lead_deletion_markers
     WHERE idempotency_key LIKE 'r4r3g2mark-%'
        OR idempotency_key LIKE 'ctrl-r3g2mark-%') AS residual_markers_like,
  (SELECT count(*) FROM public.submission_requests
     WHERE idempotency_key LIKE 'r3g2-sub-%') AS residual_subs_like;
```

**Expect before first seed:** all counts **0**.  
**Stop if:** any fixture-visible count is non-zero and unexpected — resolve isolation (cleanup or abort window) before continuing. Do not seed over unknown `r4%` / `it-%` / `is_test` rows.

## D.1 Fixture identity via independent login (external client only)

> **Required client:** external TLS-verifying PostgreSQL client (`psql` preferred) connected with Path A bare username `scs_test_admin` to the direct host (unless an authorized Path B revision exists).  
> **Forbidden for this step:** Supabase Dashboard SQL Editor “as scs_test_admin”; project-admin `SET ROLE scs_test_admin`.

```sql
-- TRANSACTIONAL MUTATION TEST — identity (no DML yet)
-- Run only after a real login as scs_test_admin
SELECT current_user, session_user,
       (current_user = 'scs_test_admin' AND session_user = 'scs_test_admin')
         AS independent_fixture_auth_ok;

SELECT rolsuper, rolcreaterole, rolinherit, rolreplication, rolbypassrls, rolcanlogin
FROM pg_roles
WHERE rolname = current_user;
```

**Expect:** `current_user = session_user = scs_test_admin` and `independent_fixture_auth_ok = true`; all elevated attrs **false**; `rolinherit = f`; `rolcanlogin = t`.  
**Stop if:** either user mismatches; `SET ROLE` was used to obtain the name; SQL Editor admin session is being used; any elevated attr true.

## D.2 Seed synthetic rows as project administrator — COMMIT required

> Run as **project admin**.  
> Choose a unique `<SEED_TOKEN>` (letters/digits only, e.g. `20261124180122`).  
> Seeds **must be COMMITted** so an independent fixture session can see them.  
> Do **not** leave seeds in an open uncommitted transaction across sessions.

```sql
-- MUTATING seed — project admin — MUST COMMIT
-- Replace every <SEED_TOKEN> below with the same unique token.
BEGIN;

-- Authorized / synthetic test lead (is_test = true)
INSERT INTO public.leads (
  form_name, name, email, message, source, privacy_version,
  status, is_test, received_at
) VALUES (
  'contact',
  'R3G2 Seed Test <SEED_TOKEN>',
  'r3g2-seed-test-<SEED_TOKEN>@example.invalid',
  'M7B-G2-R3 seed test lead <SEED_TOKEN> — synthetic; discard after §D.6.',
  'contact',
  'privacy-2026-11-23',
  'new',
  true,
  now()
) RETURNING id AS test_lead_id;

-- Negative-control non-test lead (must remain immutable to fixture role)
INSERT INTO public.leads (
  form_name, name, email, message, source, privacy_version,
  status, is_test, received_at
) VALUES (
  'contact',
  'R3G2 Seed Control <SEED_TOKEN>',
  'r3g2-seed-ctrl-<SEED_TOKEN>@example.invalid',
  'M7B-G2-R3 seed control lead <SEED_TOKEN> — non-test; must not be mutable by scs_test_admin.',
  'contact',
  'privacy-2026-11-23',
  'new',
  false,
  now()
) RETURNING id AS nontest_lead_id;

-- Capture IDs into a one-row helper for the rest of this transaction
-- (re-select if your SQL Editor shows RETURNING separately)
-- Assume variables below are replaced with returned UUIDs after first run if needed.

-- Synthetic idempotency keys (positive r4* + negative control)
INSERT INTO public.idempotency_keys (idem_key, response_json, expires_at)
VALUES
  ('r4r3g2seed-<SEED_TOKEN>', '{"ok":true,"seed":"r3"}', now() + interval '1 day'),
  ('ctrl-r3g2seed-<SEED_TOKEN>', '{"ok":false,"seed":"ctrl"}', now() + interval '1 day');

-- Submission + outbox chain for positive outbox UPDATE proof
-- (FK: notification_outbox.lead_id → leads; submission_id → submission_requests)
INSERT INTO public.submission_requests (
  lead_id, idempotency_key, status, form_name, received_at
) VALUES (
  (SELECT id FROM public.leads
     WHERE email = 'r3g2-seed-test-<SEED_TOKEN>@example.invalid'),
  'r3g2-sub-<SEED_TOKEN>',
  'accepted',
  'contact',
  now()
) RETURNING id AS seed_submission_id;

INSERT INTO public.notification_outbox (
  lead_id, submission_id, channel, status, payload_json, lease_expires_at
) VALUES (
  (SELECT id FROM public.leads
     WHERE email = 'r3g2-seed-test-<SEED_TOKEN>@example.invalid'),
  (SELECT id FROM public.submission_requests
     WHERE idempotency_key = 'r3g2-sub-<SEED_TOKEN>'),
  'owner_email',
  'pending',
  jsonb_build_object('seed', 'r3g2', 'token', '<SEED_TOKEN>'),
  now() + interval '10 minutes'
) RETURNING id AS seed_outbox_id;

COMMIT;
```

**Record (Owner notes, no secrets):** `SEED_TOKEN`, `test_lead_id`, `nontest_lead_id`, `seed_submission_id`, `seed_outbox_id`, keys `r4r3g2seed-<SEED_TOKEN>` / `ctrl-r3g2seed-<SEED_TOKEN>`.

**Admin visibility confirm (same admin session, after COMMIT):**

```sql
-- READ-ONLY — project admin
SELECT id, is_test, email FROM public.leads
WHERE email LIKE 'r3g2-seed-%-<SEED_TOKEN>@example.invalid'
ORDER BY is_test DESC;

SELECT idem_key FROM public.idempotency_keys
WHERE idem_key IN ('r4r3g2seed-<SEED_TOKEN>', 'ctrl-r3g2seed-<SEED_TOKEN>');

SELECT id, lead_id FROM public.notification_outbox
WHERE lead_id = (
  SELECT id FROM public.leads
  WHERE email = 'r3g2-seed-test-<SEED_TOKEN>@example.invalid'
);
```

**Expect:** two leads; two idem keys; one outbox row.

## D.3 Cross-session seed visibility (as `scs_test_admin`)

> Independent authenticated fixture session via **external TLS-verifying client** (Path A). No mutations yet. Not SQL Editor. Not `SET ROLE`.

```sql
-- READ-ONLY visibility — as scs_test_admin (independent login; external client)
SELECT count(*) AS visible_test_leads
FROM public.leads
WHERE id = '<test_lead_id>'::uuid;
-- Expect: 1 (is_test policy)

SELECT count(*) AS visible_nontest_leads
FROM public.leads
WHERE id = '<nontest_lead_id>'::uuid;
-- Expect: 0 (RLS hides non-test)

SELECT count(*) AS visible_r4_keys
FROM public.idempotency_keys
WHERE idem_key = 'r4r3g2seed-<SEED_TOKEN>';
-- Expect: 1

SELECT count(*) AS visible_ctrl_keys
FROM public.idempotency_keys
WHERE idem_key = 'ctrl-r3g2seed-<SEED_TOKEN>';
-- Expect: 0 (prefix policy)

SELECT count(*) AS visible_outbox
FROM public.notification_outbox
WHERE id = '<seed_outbox_id>'::uuid;
-- Expect: 1 (linked is_test lead)
```

**Stop if:** positive visibility counts are 0 — committed seeds missing, wrong session, or policies/grants incomplete. Do not proceed to mutations.

## D.4 Positive fixture mutations (rollback transaction)

> As `scs_test_admin` on the external client. Wrap in `BEGIN`/`ROLLBACK`. Verify **row counts**.

```sql
-- TRANSACTIONAL MUTATION TEST — as scs_test_admin (external client) — MUST ROLLBACK
BEGIN;

-- D.4a Authorized fixture UPDATE on test lead (expect rowcount = 1)
UPDATE public.leads
SET deleted_at = now() - interval '400 days'
WHERE id = '<test_lead_id>'::uuid
  AND is_test = true;
-- Expect: UPDATE 1

-- D.4b Unrelated non-test lead denied by RLS (expect rowcount = 0)
UPDATE public.leads
SET deleted_at = now()
WHERE id = '<nontest_lead_id>'::uuid;
-- Expect: UPDATE 0

-- D.4c Authorized idempotency fixture UPDATE (expect 1)
UPDATE public.idempotency_keys
SET expires_at = now() - interval '1 minute'
WHERE idem_key = 'r4r3g2seed-<SEED_TOKEN>';
-- Expect: UPDATE 1

-- D.4d Unrelated key denied (expect 0)
UPDATE public.idempotency_keys
SET expires_at = now() - interval '1 minute'
WHERE idem_key = 'ctrl-r3g2seed-<SEED_TOKEN>';
-- Expect: UPDATE 0

-- D.4e Authorized outbox lease UPDATE (expect 1)
UPDATE public.notification_outbox
SET lease_expires_at = now() - interval '1 minute'
WHERE id = '<seed_outbox_id>'::uuid;
-- Expect: UPDATE 1

-- D.4f Authorized marker INSERT (expect 1)
INSERT INTO public.lead_deletion_markers (idempotency_key, lead_id, reason)
VALUES ('r4r3g2mark-<SEED_TOKEN>', '<test_lead_id>'::uuid, 'soft_delete');
-- Expect: INSERT 1

ROLLBACK;
```

**Success:** positives = 1 row each; negatives = 0 rows; final `ROLLBACK` restores mutation side-effects from this transaction (committed seeds from §D.2 remain until §D.6).

## D.5 Negative / permission-error probes (isolated transactions or savepoints)

> As `scs_test_admin` on the external client. Each expected error is isolated so one denial cannot abort the whole suite.

### D.5a Unauthorized marker prefix (WITH CHECK / RLS denial)

```sql
-- Expect denial — isolated transaction
BEGIN;
INSERT INTO public.lead_deletion_markers (idempotency_key, lead_id, reason)
VALUES ('ctrl-r3g2mark-<SEED_TOKEN>', '<test_lead_id>'::uuid, 'soft_delete');
-- Expect: ERROR (WITH CHECK / RLS) — must NOT succeed
ROLLBACK;
```

If your client aborts the whole script on error, run this block alone. **Stop if INSERT succeeds.**

### D.5b Unauthorized `consent_records` read (negative control)

> **Intended denial contract (frozen schema + overlay, read-only verified):**  
> Migrations 002/006 `REVOKE ALL` on `public.consent_records` from non-owner paths; only `consent_owner_select` for `authenticated` + `is_owner_aal2()`.  
> R3 overlay grants **no** privilege and creates **no** policy on `consent_records` for `scs_test_admin`.  
> Therefore independent fixture login must receive **table privilege denial** (`42501` / `insufficient_privilege`) — **not** a successful query filtered to zero rows by RLS.

**Outcome classification (mandatory):**

| Outcome | Meaning | Result |
|---------|---------|--------|
| Error `42501` / `insufficient_privilege` (or equivalent privilege denial) **and** no row data returned | Permission denial (intended) | **PASS** |
| Statement succeeds with `count = 0` (or empty result) without privilege error | Zero-row RLS filtering / unexpected GRANT+RLS path | **FAIL** — not the intended deny contract |
| Statement succeeds with `count >= 1` **or any consent row becomes visible** | Unauthorized successful access | **FAIL — STOP** — escalate; teardown §F |

```sql
-- Expect privilege denial — isolated transaction — as scs_test_admin (external client)
BEGIN;
SAVEPOINT sp_consent;
DO $$
DECLARE
  visible_count bigint;
BEGIN
  SELECT count(*) INTO visible_count FROM public.consent_records;
  -- If we reach here, SELECT was authorized at the privilege layer.
  IF visible_count > 0 THEN
    RAISE EXCEPTION 'consent_unauthorized_rows_visible count=%', visible_count;
  END IF;
  RAISE EXCEPTION 'consent_unexpected_zero_row_success';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'expected_deny_consent_select_privilege';
  WHEN OTHERS THEN
    IF SQLERRM LIKE 'consent_unauthorized_rows_visible%' THEN
      RAISE; -- fail closed: rows visible
    END IF;
    IF SQLERRM = 'consent_unexpected_zero_row_success' THEN
      RAISE; -- fail closed: filtering ≠ denial
    END IF;
    RAISE;
END $$;
ROLLBACK TO SAVEPOINT sp_consent;
ROLLBACK;
```

**PASS only on** `expected_deny_consent_select_privilege`.  
**FAIL / STOP if** any unauthorized consent row is visible, or if the SELECT succeeds with zero rows without a privilege error.

### D.5c Unauthorized purge EXECUTE

```sql
BEGIN;
SAVEPOINT sp_purge;
DO $$
BEGIN
  PERFORM public.purge_deleted_leads(365);
  RAISE EXCEPTION 'unexpected_purge_success';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'expected_deny_purge';
END $$;
ROLLBACK TO SAVEPOINT sp_purge;
ROLLBACK;
```

**Expect:** `42501` / `expected_deny_purge`. **Stop if** purge executes successfully.

### D.5d Unauthorized intake RPC EXECUTE

```sql
BEGIN;
SAVEPOINT sp_insert;
DO $$
BEGIN
  PERFORM public.insert_lead_bundle(
    'contact', 'x', 'x@example.com', null, null, null, null, null,
    'deny', 'contact', null, '/', 'privacy-2026-11-23', null, null,
    true, 'r4deny0001', now(), repeat('a', 64)
  );
  RAISE EXCEPTION 'unexpected_insert_exec_success';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'expected_deny_insert_bundle';
END $$;
ROLLBACK TO SAVEPOINT sp_insert;
ROLLBACK;
```

**Expect:** `42501` / `expected_deny_insert_bundle`.

## D.6 Elevated attributes + committed-seed cleanup + zero residual

### D.6a Elevated attributes remain disabled

```sql
-- READ-ONLY confirmation (may run in scs_test_admin or admin session)
SELECT rolsuper, rolcreaterole, rolreplication, rolbypassrls
FROM pg_roles
WHERE rolname = 'scs_test_admin';
```

**Expect:** all false.

### D.6b Cleanup committed seeds (project admin)

> Explicit cleanup of **committed** §D.2 seeds and any dependent rows. FK order matters (`notification_outbox` → `submission_requests` / markers / idem keys → `leads`).

```sql
-- MUTATING cleanup — project admin — MUST COMMIT
BEGIN;

DELETE FROM public.notification_outbox
WHERE lead_id IN (
  SELECT id FROM public.leads
  WHERE email LIKE 'r3g2-seed-%-<SEED_TOKEN>@example.invalid'
);

DELETE FROM public.lead_deletion_markers
WHERE idempotency_key IN (
  'r4r3g2mark-<SEED_TOKEN>',
  'ctrl-r3g2mark-<SEED_TOKEN>'
)
OR lead_id IN (
  SELECT id FROM public.leads
  WHERE email LIKE 'r3g2-seed-%-<SEED_TOKEN>@example.invalid'
);

DELETE FROM public.submission_requests
WHERE idempotency_key = 'r3g2-sub-<SEED_TOKEN>'
   OR lead_id IN (
        SELECT id FROM public.leads
        WHERE email LIKE 'r3g2-seed-%-<SEED_TOKEN>@example.invalid'
      );

DELETE FROM public.idempotency_keys
WHERE idem_key IN (
  'r4r3g2seed-<SEED_TOKEN>',
  'ctrl-r3g2seed-<SEED_TOKEN>'
);

DELETE FROM public.leads
WHERE email LIKE 'r3g2-seed-%-<SEED_TOKEN>@example.invalid';

COMMIT;
```

### D.6c Verify zero residual seed / dependent records

```sql
-- READ-ONLY — project admin — expect all zeros
SELECT
  (SELECT count(*) FROM public.leads
     WHERE email LIKE 'r3g2-seed-%-<SEED_TOKEN>@example.invalid') AS residual_leads,
  (SELECT count(*) FROM public.idempotency_keys
     WHERE idem_key IN (
       'r4r3g2seed-<SEED_TOKEN>', 'ctrl-r3g2seed-<SEED_TOKEN>'
     )) AS residual_idem,
  (SELECT count(*) FROM public.lead_deletion_markers
     WHERE idempotency_key IN (
       'r4r3g2mark-<SEED_TOKEN>', 'ctrl-r3g2mark-<SEED_TOKEN>'
     )) AS residual_markers,
  (SELECT count(*) FROM public.submission_requests
     WHERE idempotency_key = 'r3g2-sub-<SEED_TOKEN>') AS residual_subs,
  (SELECT count(*) FROM public.notification_outbox o
     WHERE o.payload_json->>'token' = '<SEED_TOKEN>') AS residual_outbox;
```

**Expect:** all counts **0**. If any residual remains, re-run targeted deletes; do not start harness.

---

# SECTION E — Real-PG cases 1–13 (separate authorization)

> **Not part of SQL Editor apply.** Requires `A-DBTEST` (and `A-DEP` if `pg` missing).  
> Harness: `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs` (frozen — do not modify).  
> **Path A only** unless a separately authorized Path B harness revision + re-freeze is complete.

**Prerequisites:** §A.0/A.1 PASS (recorded PG17); Path A connectivity + TLS verified; §B apply PASS; §B.2c SET ROLE PASS; §C PASS; §D cross-session tests PASS via external fixture client + zero residual; passwords provisioned privately via §B.5; process-scoped Path A env only; fixture isolation / exclusive window met.

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
-- Review §A.3 before any REVOKE. Do NOT revoke provider-critical memberships you did not grant.
-- Do NOT alter project-admin inheritance attributes as a teardown shortcut.
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
| `server_version_num < 160000` | **STOP G2** — require separately reviewed PG&lt;16 compatibility design |
| Bootstrap fails CREATEROLE check | Abort; do not run migrations |
| Any migration errors | Abort sequence; do not continue |
| SET ROLE GRANT fails for `anon`/`authenticated` | Abort; escalate |
| SET ROLE probe fails | G2 BLOCKED — no harness |
| Fixture policy/grant missing; §D positive UPDATE returns 0 on test row | Re-apply §B.4; no harness |
| §D negative UPDATE returns &gt;0 on non-test / non-r4 row | **STOP** — policies too broad; teardown §F; escalate |
| Unauthorized purge/insert EXECUTE succeeds for `scs_test_admin` | **STOP** — revoke; escalate |
| Cross-session visibility of committed seeds fails | STOP — do not trust RLS proof; fix session/policies |
| Residual seed counts ≠ 0 after §D.6 | STOP — clean before harness |
| Ownership by runtime/fixture role | Abort; escalate |
| Urge to enable Data API for G2 | Not required — leave Disabled |
| Production project | **HOLD — never use this packet** |
| Request for BYPASSRLS / SUPERUSER fixture path | **Rejected** — use §B.4 policies only |
| Urge to paste `ALTER ROLE … PASSWORD` | **Rejected** — use §B.5 verified UI or authorized interactive `\password` |
| SQL Editor / `SET ROLE` used as independent `scs_test_admin` auth | **Rejected** — use external TLS-verifying client; dual user proof |
| `current_user` or `session_user` ≠ expected fixture role | **STOP** |
| Unexpected fixture-visible baseline (`is_test` / `r4%` / `it-%`) | **STOP** — resolve before seeding |
| Consent SELECT succeeds with rows **or** zero-row success without `42501` | **STOP** — escalate |
| Path B / transaction pooler without authorized revision | **STOP** |
| External connectivity still unverified and harness about to run | **STOP** |

---

## Partial-failure / interrupted-test recovery

| Failure point | Recovery |
|---------------|----------|
| Bootstrap fails | Fix CREATEROLE / identity; re-run bootstrap only; do not start migrations |
| Migration *N* fails | STOP. Do not run *N+1*. Capture error (no secrets). Escalate. Do not hand-edit frozen SQL. Optional: destroy staging project and restart under new `A-SQL` |
| §A.0 version &lt; 16 | STOP G2; do not apply §B.2; open separately reviewed compatibility design |
| §B.2 grant fails mid-list | Re-run §A.3; grant only missing **required** roles via §B.2a; do not force provider-managed edges; do not bare-GRANT |
| §B.3 role exists with bad attrs | `ALTER ROLE scs_test_admin NOINHERIT LOGIN NOSUPERUSER NOCREATEROLE NOREPLICATION NOBYPASSRLS;` then §B.5 password provisioning |
| §B.4 policy error | `ROLLBACK` if in txn; re-paste full **R3** overlay file; or §F.1 then retry §B.4 |
| §D.0 unexpected fixture-visible rows | Do not seed; clean or abort maintenance window; re-run §D.0 until zeros |
| §D.1 independent auth unavailable | Install/authorize external client (`A-DEP` if needed); do **not** fall back to SQL Editor/`SET ROLE` |
| §D.2 seed committed; testing interrupted before §D.6 | As project admin, run §D.6b cleanup for the recorded `SEED_TOKEN`, then §D.6c until all residual counts are 0 |
| §D.4/`D.5` left an open transaction | `ROLLBACK;` in that session; then verify residuals; clean committed seeds via §D.6 if needed |
| §D.5 denial probe aborted the client script | Re-run the remaining denial blocks individually; do not widen privileges |
| §D.5b consent rows visible | **STOP**; §F.1 teardown; escalate |
| Harness fails mid-suite | Unset env; leave DB; capture sanitized case results; run residual checks; do not widen privileges |
| Need alternate fixture path (SECURITY DEFINER procs) | **STOP** — submit separate change proposal; do not modify frozen harness/app |
| Dashboard password UI unverified/unavailable | Use §B.5 Method 2 (`psql` `\password`) under separate authorization, or STOP |
| Path A connectivity fails | Record evidence; evaluate Path B only via separate proposal — do not improvise against frozen harness |

---

## Explicit non-actions in this R3 preparation

This Markdown was authored without executing any mutating block above and without opening new DB connections in this pass. No SQL apply, no credential access, no installs, no Git, no deploy. Frozen 59-file M7B candidate untouched. R2/R1 artifacts retained unchanged. G2 SQL awaits separate Owner `A-SQL`. G2 mutation authorization remains withheld. Production **HOLD**.

### Harness / app change proposal status

**Path A:** harness change **not required** — policies-only staging overlay (§B.4) remains compatible with the frozen harness.  
**Path B:** separate conditional proposal issued — `qa-m6b/M7B-G2-R3-HARNESS-CHANGE-PROPOSAL-PATH-B-20261124.md` — **NOT IMPLEMENTED**.
