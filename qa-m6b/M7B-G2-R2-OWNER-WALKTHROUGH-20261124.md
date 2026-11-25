# M7B-G2-R2 — Owner Walkthrough (SQL Editor)

**Date:** 2026-11-24  
**Audience:** Owner (Tom) executing staging DB initialization when authorized  
**Project:** `scs-staging` · `kfclinlrzfwodmichmci` · `us-east-2` · Data API **Disabled**  
**Companion (authoritative SQL):** `M7B-G2-R2-SQL-EXECUTION-PACKET-20261124.md`  
**This document does not authorize execution.** Require written tokens before mutating steps.  
**Production:** **HOLD**  
**G2 mutation authorization:** remains **withheld** until Owner issues `A-SQL`

---

## 0. Before you start

| Gate | Required |
|------|----------|
| Freeze | Accepted 59-file M7B candidate unchanged (`3c7cebb3…`) |
| G1 | Owner-verified Healthy staging project |
| Auth for SQL apply | Written **`A-SQL`** (staging only) |
| Auth for tool installs | Written **`A-DEP`** (if `psql` / `npm ci` still needed) |
| Auth for harness | Written **`A-DBTEST`** (after SQL + §D PASS) |
| PG version | **PostgreSQL 16+** required for this G2 path |
| Production | **HOLD** |

**Never** paste passwords or full secret connection URLs into chat, Cursor, SQL Editor saved history, shell history, or committed files.

**R2 changes vs R1 walkthrough:** PG15 bare-GRANT path removed (stop if &lt;16); cross-session committed seeds + visibility + cleanup; Dashboard-only password provisioning; fixture isolation conditions; fresh-DB-safe §A.4. R1 artifacts retained unchanged.

### Fixture isolation (mandatory)

- Dedicated staging project only  
- Synthetic data only  
- Serial test execution  
- No concurrent harness sessions  
- No unrelated matching-prefix records (`r4%` / `it-%` / active seed token)  
- Baseline and post-test residual-data checks  
- Explicit fixture privilege teardown (§F)  
- Disclosure: prefix-based RLS is **not** per-run isolation  

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
| Version gate | §A.0 | `server_version_num >= 160000` | Version &lt; 16 → **STOP G2**; need separate compatibility design |
| Identity | §A.1 | DB `postgres`; CREATEROLE (typical) | Wrong DB / no CREATEROLE |
| Roles | §A.2 | Snapshot of existing `scs_*` / `anon` / `authenticated` | — |
| Memberships | §A.3 | Inspect before granting; note provider-managed edges; do not change admin inheritance attrs | — |
| Baseline privs | §A.4 | Fresh DB → `NOT PROVISIONED` (not a SQL error) | Unhandled error on missing objects |
| Migration role | §A.5 | After bootstrap: `scs_migration` NOLOGIN; before: `NOT PROVISIONED` OK | Login enabled unexpectedly after bootstrap |

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

### 4.2 SET ROLE memberships (Packet §B.2) — MUTATING — PG16+ only

1. Confirm §A.0 showed PG16+. If not, **STOP** — do not use any bare-GRANT path.  
2. Paste **§B.2a** only (`WITH INHERIT FALSE, SET TRUE, ADMIN FALSE`).  
3. Required only: `scs_intake_runtime`, `scs_notify_worker`, `anon`, `authenticated`.  
4. Do **not** grant optional `scs_owner_admin` for SET ROLE (owner URL login covers case 8).  
5. Do **not** change project-admin inheritance attributes.  
6. Immediately run **§B.2c** (membership options + SET ROLE probes).

| Expect | Stop if |
|--------|---------|
| Four memberships with inherit=f / set=t / admin=f; each `SET ROLE` matches; always `RESET ROLE` | GRANT fails (esp. anon/authenticated) → escalate; any probe fail → **G2 BLOCKED** |

### 4.3 Passwords (Packet §B.5) — Owner private — Dashboard UI only

1. Open Supabase Dashboard → **Database** → **Roles**.  
2. Set passwords in the UI for required login roles.  
3. Store only in your password manager.  
4. **Do not** paste `ALTER ROLE … PASSWORD` into SQL Editor.  
5. If the Dashboard role-password UI is unavailable: **STOP** — secure provisioning is a separate authorized prerequisite.

### 4.4 Fixture RLS overlay (Packet §B.4) — MUTATING

1. Confirm migrations finished and isolation conditions hold.  
2. Paste entire file `qa-m6b/M7B-G2-R2-staging-fixture-rls-policies-20261124.sql`.  
3. Run.  
4. Confirm §C.3 shows nine `scs_fixture_*` policies.

**Why this step exists:** table grants alone do not pass RLS. These policies limit `scs_test_admin` to synthetic `is_test` / `r4*` fixtures. Prefix RLS is not per-run isolation.

---

## 5. Phase 6 — Post-apply READ-ONLY verify (Packet §C)

Run §C.1–C.5 as project admin.

| Expect | Stop if |
|--------|---------|
| Tables/functions owned by project admin | Owned by runtime/fixture/migration roles |
| RLS on; fixture policies present | Policies missing |
| Intake cannot SELECT `idempotency_keys`; notify cannot run owner status RPC; fixture column UPDATE flags true; fixture purge EXECUTE false | Least-privilege matrix broken |

---

## 6. Phase 7 — Cross-session fixture tests (Packet §D)

**Class: mutation tests** (not read-only).

1. Choose a unique `SEED_TOKEN`. Run §D.0 baseline residual check (expect zeros).  
2. Login **independently** as `scs_test_admin` → §D.1 (identity + elevated attrs false).  
3. As project admin → §D.2 seed synthetic rows and **COMMIT**. Record IDs/keys.  
4. As `scs_test_admin` → §D.3 verify committed seed **visibility** (positives visible; controls hidden).  
5. As `scs_test_admin` → §D.4 positive/negative mutations inside `BEGIN`/`ROLLBACK` (rowcounts 1 / 0).  
6. As `scs_test_admin` → §D.5 expected permission errors in **separate transactions or savepoints**.  
7. §D.6a elevated attrs still false.  
8. As project admin → §D.6b **cleanup committed seeds** (COMMIT) → §D.6c zero residual.

| Expect | Stop if |
|--------|---------|
| Visibility + positives work; negatives zero-row/deny; residuals 0 | Positive fails → re-check §B.4; negative succeeds on non-fixture → **STOP**, §F teardown, escalate; residuals remain → clean before harness |

**Interrupted testing:** if you stop after §D.2 COMMIT, run §D.6b/c for that `SEED_TOKEN` before leaving the project.

---

## 7. Credentials for harness day (Owner-only)

Build URLs privately (password manager):

- Direct: `db.kfclinlrzfwodmichmci.supabase.co` port `5432`  
- Pooler: **`aws-1-us-east-2.pooler.supabase.com`**  
- DB: `postgres` · prefer `sslmode=verify-full`  
- Fixture username must be exactly `scs_test_admin`

Process-scoped PowerShell (values from password manager only — do not echo):

```powershell
$env:SCS_AUTHORIZE_REAL_PG_TESTS = "true"
$env:DATABASE_PROJECT_ADMIN_URL = "<from password manager>"
$env:DATABASE_INTAKE_URL = "<from password manager>"
$env:DATABASE_NOTIFY_URL = "<from password manager>"
$env:DATABASE_OWNER_URL = "<from password manager>"
$env:DATABASE_TEST_ADMIN_URL = "<username must be scs_test_admin>"
```

**Reject / unset:** `DATABASE_MIGRATION_URL`. Prefer unset `DATABASE_URL` during harness.  
**Do not:** `setx`, profile exports, `.env` writes, chat paste, SQL password statements.

---

## 8. Phase 8 — Real-PG cases 1–13 (when `A-DBTEST`)

**Prerequisite checklist:**

- [ ] §A discovery PASS (PG16+)  
- [ ] §B.2c SET ROLE PASS  
- [ ] §C PASS  
- [ ] §D cross-session tests PASS + zero residual  
- [ ] Fixture isolation conditions met  
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
| PG version &lt; 16 | STOP G2; do not bare-GRANT; escalate for separate design |
| Migration N fails | STOP; do not run N+1; escalate; optional project recreate |
| anon/authenticated GRANT fails | STOP; escalate to Atlas |
| Committed seeds left behind | §D.6b/c until residual counts are 0 |
| §D negative test mutates non-fixture row | STOP; §F.1 teardown; escalate (policies too broad) |
| Dashboard password UI missing | STOP; separate secure-provisioning authorization |
| Urge to grant BYPASSRLS | Refuse; stay on §B.4 policies |
| Production project open | Close it; HOLD |

---

## 11. End-state / handoff

1. Record sanitized pass/fail notes (role names / seed tokens, not secrets).  
2. Do not enable Data API.  
3. Do not deploy Netlify (G3).  
4. Keep historical G2 + R1 docs; use **R2** packet as authoritative apply guide.  
5. Independent Codex/Atlas review waits for sanitized evidence after authorized execution.

**G2 SQL remains unauthorized until you issue `A-SQL`.** Production **HOLD**.
