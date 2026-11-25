# M7B-G2 — Owner Walkthrough (SQL Editor)

**Date:** 2026-11-24  
**Audience:** Owner (Tom) executing staging DB initialization when authorized  
**Project:** `scs-staging` · `kfclinlrzfwodmichmci` · `us-east-2` · Data API **Disabled**  
**Companion:** `M7B-G2-SQL-EXECUTION-PACKET-20261124.md` (exact SQL)  
**This document does not authorize execution.** Require written tokens before mutating steps.

---

## 0. Before you start

| Gate | Required |
|------|----------|
| Freeze integrity | PASS (`3c7cebb3…`, 59/59) — already verified in preparation report |
| G1 | Owner-verified Healthy staging project |
| Auth for SQL apply | Written **`A-SQL`** (staging only) |
| Auth for tool installs | Written **`A-DEP`** (if `psql` / `npm ci` still needed) |
| Auth for harness | Written **`A-DBTEST`** (after SQL preflight PASS) |
| Production | **HOLD** — do not open a production project |

**Never** paste passwords or full connection URLs into chat, Cursor, or committed files.

---

## 1. Open the correct SQL Editor

1. Sign in to Supabase as the organization owner.  
2. Open project **scs-staging** (confirm ref **`kfclinlrzfwodmichmci`** in the browser URL / project settings).  
3. Confirm region **East US (Ohio) / us-east-2**.  
4. Confirm **Data API = Disabled** (Settings → API). Leave it disabled for G2.  
5. Open **SQL Editor** → New query.  
6. You are the project administrator (`postgres` class). Agents do not run these steps.

**Stop if:** wrong project, wrong org, production project, or ref mismatch.

---

## 2. READ-ONLY capability check (Packet §A.1)

Paste **Section A.1** from the SQL packet. Run.

| Expect | Stop if |
|--------|---------|
| Database `postgres` | Wrong database |
| You are project admin with `rolcreaterole = t` (typical) or SUPERUSER | Cannot create roles → abort bootstrap |

Optional: run **§A.2** to see which `scs_*` roles already exist (fresh project → none yet).

---

## 3. Apply bootstrap + migrations (Packet §B.1)

Paste **one entire file at a time** from disk. After each Run, confirm success before the next.

| Step | File | Expect | Stop if |
|-----:|------|--------|---------|
| 1 | `db/bootstrap/001_m7a_r4_role_bootstrap.sql` | Roles `scs_intake_runtime`, `scs_notify_worker`, `scs_migration` (NOLOGIN), `scs_owner_admin` created | CREATEROLE exception; any hard error |
| 2 | `db/migrations/001_m7a_leads_foundation.sql` | Foundation tables/types created | Error → do not continue |
| 3 | `db/migrations/002_m7a_rls_least_privilege.sql` | RLS enabled; anon revoked | Error |
| 4 | `db/migrations/003_m7a_retention_procedures.sql` | Retention functions | Error |
| 5 | `db/migrations/004_m7a_counters_idempotency.sql` | Counters + idempotency | Error |
| 6 | `db/migrations/005_m7a_insert_lead_bundle.sql` | Outbox + insert bundle | Error |
| 7 | `db/migrations/006_m7a_r2_security_hardening.sql` | Hardening applied | Error (do not treat NOTICE swallow as success path for missing roles) |
| 8 | `db/migrations/007_m7a_r4_security_corrections.sql` | Corrections + least-privilege grants | Missing-role exception → bootstrap incomplete |

**Absolute folder:**  
`C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\db\`

**After step 1 (recommended):** create `scs_test_admin` (§4) and set runtime passwords out of band (§5). Fixture **table** grants wait until after step 8.

---

## 4. Create `scs_test_admin` + SET ROLE memberships + fixture grants

### 4.1 Create fixture role (Packet §B.3) — MUTATING

1. Paste §B.3.  
2. Replace the password placeholder **in the Editor only** with a password from your password manager (or create role then set password via Dashboard).  
3. Run.  
4. Confirm with §A.2 that `scs_test_admin` exists (`LOGIN`, `NOINHERIT`).

### 4.2 Membership grants for harness SET ROLE (Packet §B.2) — MUTATING

1. Paste §B.2 (`GRANT … TO postgres`).  
2. Run.  
3. Immediately run **§A.3** (membership matrix) and **§A.4** (SET ROLE probes).

| Expect | Stop if |
|--------|---------|
| Membership rows for intake, notify, anon, authenticated | GRANT fails (especially anon/authenticated) → escalate; do not force |
| Each `SET ROLE` returns matching `current_user`; always `RESET ROLE` | Any probe fails → **G2 BLOCKED**; no harness |

### 4.3 Fixture grants (Packet §B.4) — MUTATING

1. Confirm migrations finished (tables exist).  
2. Paste §B.4. Run.  
3. Open a session as `scs_test_admin` (Dashboard role switch / private URL — Owner only).  
4. Run §A.5–A.6. Always `ROLLBACK` on the smoke block.

| Expect | Stop if |
|--------|---------|
| Elevated attrs false; identity = `scs_test_admin` | Role too privileged → revoke/recreate |
| Empty UPDATE/INSERT do not raise `42501` | Grants missing |

### 4.4 Post-apply verification (Packet §C) — READ-ONLY

Run §C.1–C.5 as project admin.

| Expect | Stop if |
|--------|---------|
| Tables/functions owned by project admin | Owned by runtime/fixture/migration roles |
| RLS enabled on leads stack | RLS off |
| Intake cannot SELECT `idempotency_keys`; notify cannot EXECUTE owner status counts; fixture UPDATE flags true | Least-privilege matrix broken |

Also run §A.7: `scs_migration.rolcanlogin = false`.

---

## 5. Credentials (Owner-only; never share with AI)

1. Generate strong unique passwords for: project admin (if rotating), `scs_intake_runtime`, `scs_notify_worker`, `scs_owner_admin`, `scs_test_admin`.  
2. Store **only** in your password manager.  
3. Build URLs privately using:  
   - Direct host: `db.kfclinlrzfwodmichmci.supabase.co` port `5432`  
   - Pooler host: **`aws-1-us-east-2.pooler.supabase.com`** (not the docs example `aws-0-…`)  
   - DB name: `postgres`  
   - Prefer `sslmode=verify-full`  
   - Pooler username often `role.kfclinlrzfwodmichmci`  
4. Optional CA path on the trusted machine only.  
5. For harness day: set **process-scoped** PowerShell env vars (names only — values from password manager):

```powershell
$env:SCS_AUTHORIZE_REAL_PG_TESTS = "true"
$env:DATABASE_PROJECT_ADMIN_URL = "<from password manager>"
$env:DATABASE_INTAKE_URL = "<from password manager>"
$env:DATABASE_NOTIFY_URL = "<from password manager>"
$env:DATABASE_OWNER_URL = "<from password manager>"
$env:DATABASE_TEST_ADMIN_URL = "<username must be scs_test_admin>"
# optional: $env:DATABASE_SSL_CA_PATH = "C:\path\to\staging-ca.crt"
```

**Reject / unset:** `DATABASE_MIGRATION_URL`. Prefer unset `DATABASE_URL` during harness.  
**Do not:** `setx`, profile exports, `.env` writes, chat paste.

Clear after run:

```powershell
Remove-Item Env:SCS_AUTHORIZE_REAL_PG_TESTS -ErrorAction SilentlyContinue
Remove-Item Env:DATABASE_PROJECT_ADMIN_URL, Env:DATABASE_INTAKE_URL, Env:DATABASE_NOTIFY_URL, Env:DATABASE_OWNER_URL, Env:DATABASE_TEST_ADMIN_URL -ErrorAction SilentlyContinue
Remove-Item Env:DATABASE_SSL_CA, Env:DATABASE_SSL_CA_PATH, Env:PGSSLROOTCERT -ErrorAction SilentlyContinue
exit
```

---

## 6. Real-PG cases 1–13 (when `A-DBTEST` issued) — NOT run in preparation

**Prerequisite checklist:**

- [ ] §A.1–A.7 and §C PASS  
- [ ] §A.4 SET ROLE probes PASS  
- [ ] Fixture identity + DML smoke PASS  
- [ ] `A-DEP`: `npm ci --prefix netlify/functions` if needed (`pg@8.13.1`)  
- [ ] Process env set in a fresh PowerShell window  
- [ ] Written `A-DBTEST`

**Command:**

```powershell
node qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs
```

| Cases | Expect |
|-------|--------|
| 1–13 | PASS |
| 14 | Remains **NOT RUN** (hosted Auth / G4) |

Sanitized evidence only under separate authorization. Historical R7/M7B NOT RUN JSON must stay unchanged. Then unset env and close the shell.

---

## 7. Compatibility reminders

| Topic | Owner action |
|-------|----------------|
| Data API Disabled | Compatible — keep Disabled for G2; Functions+`pg` is the path |
| Pooler `aws-1-…` | Use dashboard host; docs `aws-0` is illustrative only |
| SQL Editor vs `psql` | SQL Editor preferred for this packet; `psql` optional under `A-DEP` |
| GitHub Disconnected | Expected for G2 DB init; no deploy in this gate |

---

## 8. End-state / handoff

When SQL + preflight PASS (still before or after harness, depending on authorization):

1. Record sanitized pass/fail notes (role names, not secrets).  
2. Do not enable Data API.  
3. Do not deploy Netlify (G3).  
4. Do not touch production.  
5. G2 harness remains blocked until `A-DBTEST`.  
6. Independent Codex review waits for sanitized evidence after execution.

---

## Explicit confirmation

This walkthrough was prepared without executing SQL, connecting to the database, installing packages, modifying frozen candidate sources, running Git, or deploying. **Production HOLD. G2 execution awaits separate Owner authorization.**
