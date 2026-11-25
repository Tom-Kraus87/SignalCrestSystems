# M7B-G2 — Execution Readiness Procedure

**Date:** 2026-11-24  
**Nature:** Planning only — **do not execute** SQL, installs, connections, or tests in this pass  
**Baseline:** Frozen M7B candidate manifest SHA-256 `3c7cebb3f27ebf55d1d002e2d8c480a451932ff43d1b4f39f579956cb2ad4d0b` (59/59); local 265/265 PASS; G1 ELIGIBLE; **G2/G3 BLOCKED**; Production **HOLD**  
**Harness (read-only reference):** `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs`  
**Related:** `M7A-R7-DATABASE-EXECUTOR-DECISION-20261123.md`, `M7B-POSTGRES-CLIENT-WINDOWS-20261124.md`, `M7B-NETLIFY-CLI-PIN-PROCEDURE-20261124.md`

---

## 1. Why G2 is BLOCKED (Codex findings addressed here)

The real-PG harness (`cases 1–13`) uses a **project-admin pool** and calls `SET ROLE` into:

| Target role | Used by |
|-------------|---------|
| `scs_intake_runtime` | Case 1 privilege probes |
| `anon` | Case 1 denial probe |
| `authenticated` | Case 8 simulated JWT / allowlist |
| `scs_notify_worker` | Case 9 lease fencing |

`SET ROLE` succeeds only when the **session user** is a member of the target role (or is SUPERUSER). On Supabase staging, `postgres` is **not** SUPERUSER (`rolsuper=f`, typically `rolcreaterole=t`). Membership is therefore **required** and must be verified before the suite.

Separately, fixture mutations were moved off project-admin onto **`scs_test_admin`** (`DATABASE_TEST_ADMIN_URL`). That role is **not** created by bootstrap and needs staging-only LOGIN + narrow table DML.

This procedure prepares exact Owner/agent steps to clear those prerequisites. It does **not** authorize execution.

---

## 2. Actor separation (HARD)

| Actor | Code | May |
|-------|------|-----|
| **Owner** | O | Create staging project; hold passwords; set shell env; run/authorize SQL; create roles/grants; run real-PG suite; clear credentials; install tools when authorized |
| **Agent (Cursor)** | C | Draft SQL text; prepare checklists; observe Owner-run commands when invited; write sanitized evidence docs **after** Owner-authorized runs |
| **Codex** | X | Independent review of evidence — never holds credentials |

**Agent-executable in a future authorized G2 session (with Owner present):** run the harness **after** Owner has set session env vars and completed SQL preflight; write new sanitized result files.  
**Never agent-executable without Owner:** creating roles, `GRANT`/`REVOKE`, password setting, connecting with admin URLs, installing packages, deploying.

---

## 3. Ordering (reconciled — do not reorder)

```
G0 freeze verified
  → G1: staging project + SSL + CA
  → [O] Bootstrap 001 (project admin)
  → [O] CREATE ROLE scs_test_admin (LOGIN NOINHERIT) + password out of band
  → [O] Migrations 001 → 007 (same project admin)
  → [O] Privilege verify (ownership + 007 grants + scs_migration NOLOGIN)
  → [O] Narrow SET ROLE memberships (section 5)
  → [O] Fixture table grants to scs_test_admin (section 6)
  → [O] SET ROLE + fixture preflight (section 4) — FAIL CLOSED
  → [O] Session env (section 8) — no persistence
  → [O/C] Real-PG cases 1–13 under A-DBTEST
  → [O] Cleanup / unset / credential removal (section 7)
```

**Forbidden reorder:** fixture grants before migrations (tables may not exist); SET ROLE memberships before bootstrap (roles missing); testing before preflight; leaving env vars in User/Machine scope or `.env` files.

---

## 4. Preflight checks — effective `SET ROLE` capability

Run as project admin (`DATABASE_PROJECT_ADMIN_URL`) on the **trusted machine**, after bootstrap + migrations + memberships. Capture only pass/fail + role names (no passwords).

### 4.1 Session identity

```sql
SELECT current_user, session_user, current_database();
SELECT r.rolname, r.rolsuper, r.rolcreaterole, r.rolcanlogin
FROM pg_roles r
WHERE r.rolname = current_user;
```

**Expect:** `rolsuper = f`, `rolcreaterole = t` (or documented equivalent admin); database `postgres`.

### 4.2 Membership matrix (must be true before suite)

```sql
SELECT r.rolname AS member, m.rolname AS can_set_role
FROM pg_auth_members am
JOIN pg_roles r ON r.oid = am.member
JOIN pg_roles m ON m.oid = am.roleid
WHERE r.rolname = current_user
  AND m.rolname IN (
    'scs_intake_runtime', 'scs_notify_worker', 'scs_owner_admin',
    'anon', 'authenticated'
  )
ORDER BY 2;
```

**Expect:** one row per target the harness switches into. Missing rows → apply section 5; re-check.

### 4.3 Effective switch probe (mirrors harness `setRoleAndVerify`)

For each role in `{scs_intake_runtime, anon, authenticated, scs_notify_worker}`:

```sql
SET ROLE <role>;
SELECT current_user;   -- must equal <role>
RESET ROLE;
```

**Any failure = G2 BLOCKED.** Do not start the Node harness.

### 4.4 Fixture identity probe

Connect as `scs_test_admin` (separate URL):

```sql
SELECT current_user, session_user;
SELECT rolsuper, rolcreaterole, rolinherit, rolreplication, rolbypassrls
FROM pg_roles WHERE rolname = current_user;
```

**Expect:** `current_user = session_user = scs_test_admin`; all elevated attributes **false**; `rolinherit = f`.

### 4.5 Fixture DML probe (synthetic only)

```sql
-- Smoke only; roll back. Prefer a disposable key prefixed m7b-preflight-
BEGIN;
UPDATE public.idempotency_keys SET expires_at = now() WHERE FALSE;
UPDATE public.notification_outbox SET lease_expires_at = now() WHERE FALSE;
UPDATE public.leads SET deleted_at = now() WHERE FALSE;
INSERT INTO public.lead_deletion_markers (idempotency_key, lead_id, reason)
  SELECT 'm7b-preflight-deny', id, 'soft_delete' FROM public.leads WHERE FALSE;
ROLLBACK;
```

Permission errors on the empty `UPDATE`/`INSERT` still prove privilege presence; a hard `42501` on relation → grants missing (section 6).

### 4.6 `scs_migration` NOLOGIN

```sql
SELECT rolcanlogin FROM pg_roles WHERE rolname = 'scs_migration';
-- Expect: false
```

---

## 5. Narrowly scoped role memberships (project admin)

**Purpose:** Enable harness `SET ROLE` from project admin without making admin inherit runtime privileges during normal sessions.

Roles are created `NOINHERIT`. Grant membership **without** changing that:

```sql
-- Execute ONLY on staging, as project admin, after bootstrap created the roles.
GRANT scs_intake_runtime TO postgres;
GRANT scs_notify_worker TO postgres;
GRANT scs_owner_admin TO postgres;   -- optional for SET ROLE; owner URL login is preferred for case 8 identity
GRANT anon TO postgres;
GRANT authenticated TO postgres;
```

**Notes:**

1. Replace `postgres` with the actual project-admin role name if the login principal differs.  
2. Do **not** `GRANT postgres TO <runtime>`.  
3. Do **not** grant `SUPERUSER` / `BYPASSRLS` / `CREATEROLE` to runtime or fixture roles.  
4. Supabase-managed roles (`anon`, `authenticated`) may already have special grantors; if `GRANT` fails because `supabase_admin` owns the membership graph, stop and escalate to Atlas — do not force via dashboard superuser paths without authorization.  
5. Prefer `SET ROLE` only inside the harness transaction/session; always `RESET ROLE` (harness already does).

**Verification:** re-run section 4.2–4.3.

---

## 6. Staging-only `scs_test_admin` + fixture grants

### 6.1 Create (after bootstrap, before or after migrations — tables needed before grants)

```sql
CREATE ROLE scs_test_admin NOINHERIT LOGIN
  PASSWORD '<from password manager — never commit>';
-- Optionally: ALTER ROLE scs_test_admin CONNECTION LIMIT 2;
COMMENT ON ROLE scs_test_admin IS
  'Staging fixture setup/teardown only. Never Function runtime. Never production.';
```

Set password out of band (dashboard or `\password`). Wire `DATABASE_TEST_ADMIN_URL` username **exactly** `scs_test_admin`.

### 6.2 Exact fixture permissions by real-PG case

Source: harness mutations on the `fixture` pool.

| Case | Fixture SQL / need | Required privileges on `scs_test_admin` |
|------|--------------------|----------------------------------------|
| 1 | None (SET ROLE via project admin) | — |
| 2 | `UPDATE idempotency_keys SET expires_at …` | `UPDATE` on `public.idempotency_keys` |
| 3 | None | — |
| 4 | None | — |
| 5 | `INSERT … lead_deletion_markers … ON CONFLICT DO UPDATE` | `INSERT`, `UPDATE` on `public.lead_deletion_markers` |
| 6 | None (intake denial of bootstrap DO) | — |
| 7 | None (TLS socket) | — |
| 8 | None for fixture pool (admin `INSERT owner_allowlist` + `SET ROLE authenticated`) | — |
| 9 | `UPDATE notification_outbox SET lease_expires_at …` | `UPDATE` on `public.notification_outbox` |
| 10 | None (handler unit with env) | — |
| 11 | None (local hashIp) | — |
| 12 | None (identity asserts + live intake SELECT) | — |
| 13 | `UPDATE leads SET deleted_at …` | `UPDATE` on `public.leads` |
| 14 | Hosted Auth — **not** G2 | — |

**Minimum grant bundle (staging only):**

```sql
GRANT UPDATE ON TABLE public.idempotency_keys TO scs_test_admin;
GRANT INSERT, UPDATE ON TABLE public.lead_deletion_markers TO scs_test_admin;
GRANT UPDATE ON TABLE public.notification_outbox TO scs_test_admin;
GRANT UPDATE ON TABLE public.leads TO scs_test_admin;
-- usage_counters: grant only if a future fixture mutates counters directly; harness currently uses RPCs via intake.
```

**Explicitly do not grant to `scs_test_admin`:** `SUPERUSER`, `CREATEROLE`, `REPLICATION`, `BYPASSRLS`, `EXECUTE` on purge/soft-delete RPCs unless a future case requires it, membership that enables Function-runtime impersonation in Netlify, or any production project access.

### 6.3 Project-admin table privileges used by harness (not fixture)

Cases 8 and 13 also `INSERT INTO owner_allowlist` and call `is_owner_aal2` / `purge_deleted_leads` as **project admin** (with `set_config` JWT simulation). After migrations, project admin owns these objects — no extra grant expected. If RLS blocks admin inserts, escalate (should not apply to table owner / BYPASS on owner).

---

## 7. Privilege verification, cleanup, credential removal

### 7.1 After grants / before tests

- Section 4 preflight PASS.  
- Confirm runtime roles remain least-privilege per migration 007 (intake cannot `SELECT idempotency_keys`; notify cannot run owner status RPC).  
- Confirm `scs_test_admin` ∉ Netlify Function env.

### 7.2 After G2 suite (same day)

1. Unset all shell variables (section 8.3).  
2. Do **not** leave `SCS_AUTHORIZE_REAL_PG_TESTS` set.  
3. Rotate `scs_test_admin` password if the URL was pasted into chat/logs.  
4. Optionally `REVOKE` fixture grants after G5 if staging is retained — or destroy project under `A-DESTROY`.  
5. Raw harness stdout stays on trusted machine only; commit only sanitized JSON/MD under separate authorization.

### 7.3 Destroy path (later)

Per Final Staging Runbook: delete whole staging Supabase project rather than hand-dropping memberships granted by `supabase_admin`.

---

## 8. Secure Windows environment-variable setup (no persistence)

**Goal:** credentials exist only in the **current PowerShell process** for the authorized run.

### 8.1 Do

```powershell
# New PowerShell window — do not use profiles that auto-load secrets
$env:SCS_AUTHORIZE_REAL_PG_TESTS = "true"
$env:DATABASE_PROJECT_ADMIN_URL = "<paste once from password manager>"
$env:DATABASE_INTAKE_URL = "<paste>"
$env:DATABASE_NOTIFY_URL = "<paste>"
$env:DATABASE_OWNER_URL = "<paste>"
$env:DATABASE_TEST_ADMIN_URL = "<paste>"  # username must be scs_test_admin
# Optional CA (same as app):
# $env:DATABASE_SSL_CA_PATH = "C:\path\to\staging-ca.crt"
# Prefer sslmode=verify-full inside URLs
```

Confirm **absence** of unsupported legacy var:

```powershell
if ($null -ne $env:DATABASE_MIGRATION_URL) { throw "Unset DATABASE_MIGRATION_URL" }
if ($null -ne $env:DATABASE_URL) { Write-Warning "DATABASE_URL should be unset for harness clarity" }
```

### 8.2 Do not

- `setx`, System/User environment UI, or PowerShell profile exports  
- Write URLs into `.env`, `.env.local`, repo files, OneDrive notes, or chat  
- Persist in Windows Credential Manager for this gate (password manager only)  
- Echo full URLs into logs/transcripts

### 8.3 Clear

```powershell
Remove-Item Env:SCS_AUTHORIZE_REAL_PG_TESTS -ErrorAction SilentlyContinue
Remove-Item Env:DATABASE_PROJECT_ADMIN_URL, Env:DATABASE_INTAKE_URL, Env:DATABASE_NOTIFY_URL, Env:DATABASE_OWNER_URL, Env:DATABASE_TEST_ADMIN_URL -ErrorAction SilentlyContinue
Remove-Item Env:DATABASE_SSL_CA, Env:DATABASE_SSL_CA_PATH, Env:PGSSLROOTCERT -ErrorAction SilentlyContinue
exit   # close the shell
```

---

## 9. Tool install procedures (prepare only — incorporate existing M7B docs)

### 9.1 PostgreSQL client (Windows)

Follow **`qa-m6b/M7B-POSTGRES-CLIENT-WINDOWS-20261124.md`** exactly:

- PostgreSQL **15+** client tools (`psql`); full server optional  
- Options: EDB installer (Command Line Tools) or winget when authorized  
- Verify: `Get-Command psql`; `psql --version` ≥ 15  
- **Do not install in this planning pass**

Dashboard SQL editor remains an allowed alternate for apply if Owner elects it; document that choice in evidence.

### 9.2 Netlify CLI pin (G3 prerequisite; prepare with G2 tools)

Follow **`qa-m6b/M7B-NETLIFY-CLI-PIN-PROCEDURE-20261124.md`**:

- Pin artifact: `tools/netlify-cli-pin/package.json` → `netlify-cli@26.2.0` (exact)  
- Later authorized: `npm install --package-lock-only` then `npm ci` under that folder; `npx netlify --version` → `26.2.0`  
- Deploy via project-local `npx`, not unpinned global  
- **Do not install in this planning pass**

### 9.3 Functions `pg` for harness

Before G2: Owner-authorized `npm ci --prefix netlify/functions` so `pg@8.13.1` matches lockfile (`A-DEP`).

---

## 10. Owner vs agent checklist (G2 execution day)

| Step | Actor | Auth token |
|------|-------|------------|
| Confirm G1 exit criteria | O | G1 complete |
| Install `psql` / pin Netlify CLI if still missing | O | `A-DEP` |
| `npm ci --prefix netlify/functions` | O | `A-DEP` |
| Apply memberships + `scs_test_admin` + fixture grants | O | `A-SQL` |
| Run section 4 preflight | O | `A-SQL` / `A-DBTEST` prep |
| Set process-scoped env vars | O | — |
| Run `node qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs` | O or C (Owner present) | `A-DBTEST` |
| Sanitize + save **new** evidence files | C/O | — |
| Unset env; close shell | O | — |
| Independent review | X | after evidence |

---

## 11. G2 exit criteria (when later executed)

- Preflight 4.1–4.6 PASS  
- Cases **1–13** PASS with positive controls as designed  
- Case **14** remains **NOT RUN** (hosted Auth class; G4)  
- Historical R7/M7B NOT RUN JSON **unchanged**  
- Shell credentials cleared  
- Production remains **HOLD**

---

## 12. Explicit non-actions this planning document

No SQL executed · no DB connections · no installs · no harness run · no Git · no deploy · frozen M7B/R7 candidate untouched.
