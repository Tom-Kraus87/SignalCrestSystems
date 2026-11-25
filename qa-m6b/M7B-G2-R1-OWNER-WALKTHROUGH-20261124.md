# M7B-G2-R1 — Owner Walkthrough (SQL Editor)

**Date:** 2026-11-24  
**Audience:** Owner (Tom) executing staging DB initialization when authorized  
**Project:** `scs-staging` · `kfclinlrzfwodmichmci` · `us-east-2` · Data API **Disabled**  
**Companion (authoritative SQL):** `M7B-G2-R1-SQL-EXECUTION-PACKET-20261124.md`  
**This document does not authorize execution.** Require written tokens before mutating steps.  
**Production:** **HOLD**

---

## 0. Before you start

| Gate | Required |
|------|----------|
| Freeze | Accepted 59-file M7B candidate unchanged (`3c7cebb3…`) |
| G1 | Owner-verified Healthy staging project |
| Auth for SQL apply | Written **`A-SQL`** (staging only) |
| Auth for tool installs | Written **`A-DEP`** (if `psql` / `npm ci` still needed) |
| Auth for harness | Written **`A-DBTEST`** (after SQL + §D PASS) |
| Production | **HOLD** |

**Never** paste passwords or full secret connection URLs into chat, Cursor, or committed files.

**R1 changes vs prior G2 walkthrough:** fixture RLS policies (not grants alone); real transactional fixture tests (no `WHERE FALSE`); PG version/membership-option checks; no password literals in SQL; clearer phase order + teardown.

---

## 1. Open the correct SQL Editor

1. Sign in to Supabase as the organization owner.  
2. Open project **scs-staging** (confirm ref **`kfclinlrzfwodmichmci`**).  
3. Confirm region **East US (Ohio) / us-east-2**.  
4. Confirm **Data API = Disabled**. Leave it disabled.  
5. Open **SQL Editor** → New query.  
6. You are the project administrator. Agents do not run these steps.

**Stop if:** wrong project, wrong org, production project, or ref mismatch.

---

## 2. Phase 0 — READ-ONLY discovery (Packet §A)

Run in order:

| Step | Packet | Expect | Stop if |
|------|--------|--------|---------|
| Version | §A.0 | Note major version; whether PG16+ grant options exist | Cannot read version |
| Identity | §A.1 | DB `postgres`; CREATEROLE (typical) | Wrong DB / no CREATEROLE |
| Roles | §A.2 | Snapshot of existing `scs_*` / `anon` / `authenticated` | — |
| Memberships | §A.3 | Inspect before granting; note provider-managed edges | — |
| Baseline privs | §A.4 | Pre-apply snapshot | — |
| Migration role | §A.5 | After bootstrap: `scs_migration` NOLOGIN | Login enabled unexpectedly after bootstrap |

---

## 3. Phase 1 — Bootstrap + migrations (Packet §B.1)

Paste **one entire file at a time**. Confirm success before the next.

| Step | File | Stop if |
|-----:|------|---------|
| 1 | `db/bootstrap/001_m7a_r4_role_bootstrap.sql` | CREATEROLE exception / hard error |
| 2–8 | `db/migrations/001` … `007` in order | Any error → do not continue |

**Workspace root:**

```
C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC
```

**After step 1 (recommended):** create `scs_test_admin` (§4.1) without embedding a password. Fixture policies wait until after step 8.

---

## 4. Phases 2–5 — Memberships, fixture role, passwords, RLS overlay

### 4.1 Create `scs_test_admin` (Packet §B.3) — MUTATING

1. Paste §B.3 (creates `LOGIN NOINHERIT` **with no password clause**).  
2. Run.  
3. Confirm with §A.2.

### 4.2 SET ROLE memberships (Packet §B.2) — MUTATING

1. If §A.0 says PG16+: paste **§B.2a**. Else paste **§B.2b**.  
2. Required only: `scs_intake_runtime`, `scs_notify_worker`, `anon`, `authenticated`.  
3. Do **not** grant optional `scs_owner_admin` for SET ROLE (owner URL login covers case 8).  
4. Immediately run **§B.2c** (membership rows + SET ROLE probes).

| Expect | Stop if |
|--------|---------|
| Four membership rows; each `SET ROLE` matches; always `RESET ROLE` | GRANT fails (esp. anon/authenticated) → escalate; any probe fail → **G2 BLOCKED** |

### 4.3 Passwords (Packet §B.5) — Owner private

Use Dashboard role password UI or a private `ALTER ROLE … PASSWORD` you do **not** save. Store only in your password manager. Never paste into chat/AI/evidence.

### 4.4 Fixture RLS overlay (Packet §B.4) — MUTATING

1. Confirm migrations finished.  
2. Paste entire file `qa-m6b/M7B-G2-R1-staging-fixture-rls-policies-20261124.sql`.  
3. Run.  
4. Confirm §C.3 shows nine `scs_fixture_*` policies.

**Why this step exists:** table grants alone do not pass RLS. These policies limit `scs_test_admin` to synthetic `is_test` / `r4*` fixtures.

---

## 5. Phase 6 — Post-apply READ-ONLY verify (Packet §C)

Run §C.1–C.5 as project admin.

| Expect | Stop if |
|--------|---------|
| Tables/functions owned by project admin | Owned by runtime/fixture/migration roles |
| RLS on; fixture policies present | Policies missing |
| Intake cannot SELECT `idempotency_keys`; notify cannot run owner status RPC; fixture column UPDATE flags true; fixture purge EXECUTE false | Least-privilege matrix broken |

---

## 6. Phase 7 — Transactional fixture tests (Packet §D)

**Class: mutation tests** (not read-only). Always `ROLLBACK` (or explicit cleanup).

1. Login **independently** as `scs_test_admin` → §D.1 (identity + elevated attrs false).  
2. As project admin → §D.2 seed synthetic test + non-test rows (record IDs/keys).  
3. As `scs_test_admin` → §D.3:  
   - Authorized test-lead / `r4*` updates succeed (rowcount 1)  
   - Non-test / `prodlike-*` updates affect **0** rows (or deny)  
   - Unauthorized marker prefix fails  
   - `ROLLBACK`  
4. §D.4 unauthorized table/function access denied (`42501`).  
5. §D.5 elevated attrs still false.  
6. §D.6 admin `ROLLBACK` / cleanup seeds.

| Expect | Stop if |
|--------|---------|
| Positive mutations work; negatives are zero-row/deny; ROLLBACK restores | Positive fails → re-check §B.4; negative succeeds on non-fixture → **STOP**, run §F teardown, escalate |

---

## 7. Credentials for harness day (Owner-only)

Build URLs privately:

- Direct: `db.kfclinlrzfwodmichmci.supabase.co` port `5432`  
- Pooler: **`aws-1-us-east-2.pooler.supabase.com`**  
- DB: `postgres` · prefer `sslmode=verify-full`  
- Fixture username must be exactly `scs_test_admin`

Process-scoped PowerShell (values from password manager only):

```powershell
$env:SCS_AUTHORIZE_REAL_PG_TESTS = "true"
$env:DATABASE_PROJECT_ADMIN_URL = "<from password manager>"
$env:DATABASE_INTAKE_URL = "<from password manager>"
$env:DATABASE_NOTIFY_URL = "<from password manager>"
$env:DATABASE_OWNER_URL = "<from password manager>"
$env:DATABASE_TEST_ADMIN_URL = "<username must be scs_test_admin>"
```

**Reject / unset:** `DATABASE_MIGRATION_URL`. Prefer unset `DATABASE_URL` during harness.  
**Do not:** `setx`, profile exports, `.env` writes, chat paste.

---

## 8. Phase 8 — Real-PG cases 1–13 (when `A-DBTEST`)

**Prerequisite checklist:**

- [ ] §A discovery PASS  
- [ ] §B.2c SET ROLE PASS  
- [ ] §C PASS  
- [ ] §D transactional tests PASS  
- [ ] `A-DEP` if needed  
- [ ] Process env set in a fresh PowerShell window  
- [ ] Written `A-DBTEST`

```powershell
node qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs
```

| Cases | Expect |
|-------|--------|
| 1–13 | PASS |
| 14 | Remains **NOT RUN** |

Then clear env (Packet §F.3) and close the shell.

---

## 9. Phase 9 — Teardown (when retiring fixtures)

Use Packet §F.1 to drop `scs_fixture_*` policies and revoke fixture table grants. Optional role drop only after revoke. Prefer destroying the staging project over fighting provider-managed membership graphs.

---

## 10. Partial failure — what to do

| Failure | Owner action |
|---------|--------------|
| Migration N fails | STOP; do not run N+1; escalate; optional project recreate |
| anon/authenticated GRANT fails | STOP; escalate to Atlas |
| §D negative test mutates non-fixture row | STOP; §F.1 teardown; escalate (policies too broad) |
| Urge to grant BYPASSRLS | Refuse; stay on §B.4 policies |
| Production project open | Close it; HOLD |

---

## 11. End-state / handoff

1. Record sanitized pass/fail notes (role names, not secrets).  
2. Do not enable Data API.  
3. Do not deploy Netlify (G3).  
4. Keep historical G2 docs; use **R1** packet as authoritative apply guide.  
5. Independent Codex/Atlas review waits for sanitized evidence after authorized execution.

**G2 SQL remains unauthorized until you issue `A-SQL`.**
