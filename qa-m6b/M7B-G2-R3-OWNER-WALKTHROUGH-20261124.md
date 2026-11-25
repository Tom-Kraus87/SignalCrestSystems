# M7B-G2-R3 — Owner Walkthrough

**Date:** 2026-11-24  
**Audience:** Owner (Tom) executing staging DB initialization when authorized  
**Project:** `scs-staging` · `kfclinlrzfwodmichmci` · `us-east-2` · Data API **Disabled**  
**Companion (authoritative SQL):** `M7B-G2-R3-SQL-EXECUTION-PACKET-20261124.md`  
**This document does not authorize execution.** Require written tokens before mutating steps.  
**Production:** **HOLD**  
**G2 mutation authorization:** remains **withheld** until Owner issues `A-SQL`

---

## 0. Status board (read this first)

### Already completed (read-only — do not re-run)

| Item | Result |
|------|--------|
| PostgreSQL discovery | **17.12** / `server_version_num` **170012** |
| PG16+ version gate | **PASS** |
| Initial administrator identity | **PASS** (`postgres` / `postgres` on DB `postgres`; `rolcreaterole`=true; `rolsuper`=false) |

### Remaining read-only discovery (Owner)

| Item | Status |
|------|--------|
| DNS resolution for direct + pooler hosts | Pending |
| TCP reachability `:5432` (and do **not** treat `:6543` as substitute) | Pending |
| TLS hostname validation with a verifying client | Pending |
| Installed-tool inventory (`psql` / Node `pg`, versions, PATH) | Pending |

### External client prerequisites (before independent fixture auth)

| Prerequisite | Why |
|--------------|-----|
| TLS-verifying PostgreSQL client (prefer `psql` 15+) | Independent `scs_test_admin` login + dual user proof |
| CA trust / `sslmode=verify-full` (or equivalent verified TLS) | Hostname validation |
| **Not** Dashboard SQL Editor | Cannot independently authenticate as custom roles |

### Direct vs session pooler decision gate (choose exactly one)

| Path | When | Frozen harness |
|------|------|----------------|
| **A — Direct** `db.kfclinlrzfwodmichmci.supabase.co:5432` + bare role usernames | Connectivity + TLS succeed on direct host | **Compatible — proceed without freeze change** |
| **B — Session pooler** `aws-1-us-east-2.pooler.supabase.com:5432` + project-qualified usernames | Only if Path A blocked **and** Owner authorizes harness revision | **Incompatible** — see Path B proposal; **do not implement in this pass** |

**Stop if:** choosing Path B without a separate authorized harness revision + re-freeze.  
**Stop if:** attempting transaction pooler `:6543` as an unreviewed workaround.

### Required Owner authorization tokens

| Token | Required before |
|-------|-----------------|
| (Inspection already done for §A.0/A.1) | — |
| **`A-SQL`** | Any mutating §B / §D seed-cleanup / §F |
| **`A-DEP`** | Installing `psql` / `npm` packages if missing |
| **`A-DBTEST`** | Real-PG harness cases 1–13 |
| Path B revision + re-freeze tokens | Only if Path B chosen (separate from this packet) |

### Fixture isolation (mandatory)

- Dedicated staging project only  
- Synthetic data only  
- **Exclusive serial staging maintenance window** (no concurrent harness/admin fixture sessions)  
- STOP on unexpected fixture-visible baseline (`is_test`, all `r4%` / `it-%`, active seed token)  
- Baseline + post-test zero residual  
- Explicit fixture privilege teardown (§F)  
- Disclosure: prefix/`is_test` RLS is **not** per-run isolation  

**Never** paste passwords or full secret connection URLs into chat, Cursor, SQL Editor saved history, shell history, evidence, or committed files.

---

## 1. Open the correct SQL Editor (administrator operations only)

1. Sign in to Supabase as the organization owner.  
2. Open project **scs-staging** (confirm ref **`kfclinlrzfwodmichmci`**).  
3. Confirm region **East US (Ohio) / us-east-2**.  
4. Confirm **Data API = Disabled**. Leave it disabled.  
5. Open **SQL Editor** → New query.  
6. You are the **project administrator**. Agents do not run these steps.

**SQL Editor is for administrator apply/verify only.** It is **not** an independent `scs_test_admin` authentication surface.

**Stop if:** wrong project, wrong org, production project, or ref mismatch.

---

## 2. Phase 0 — Remaining READ-ONLY discovery

§A.0 / §A.1 already **PASS** (recorded). Still run (or re-confirm as needed) before mutating:

| Step | Packet | Expect | Stop if |
|------|--------|--------|---------|
| Roles | §A.2 | Snapshot of existing `scs_*` / `anon` / `authenticated` | — |
| Memberships | §A.3 | Inspect before granting; note provider-managed edges | Blind membership edits |
| Baseline privs | §A.4 | Fresh DB → `NOT PROVISIONED` (not a SQL error) | Unhandled error on missing objects |
| Migration role | §A.5 | After bootstrap: `scs_migration` NOLOGIN | Login enabled unexpectedly after bootstrap |
| Connectivity gate | Owner tools | Path A or Path B decision recorded | External connectivity still unknown **and** you are about to run harness |

---

## 3. Phase 1 — Bootstrap + migrations (Packet §B.1) — needs `A-SQL`

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
2. Run as project admin in SQL Editor.  
3. Confirm with §A.2.

### 4.2 SET ROLE memberships (Packet §B.2) — MUTATING — PG16+ only

1. PG16+ already PASS (170012).  
2. Paste **§B.2a** only.  
3. Required only: `scs_intake_runtime`, `scs_notify_worker`, `anon`, `authenticated`.  
4. Do **not** grant optional `scs_owner_admin` for SET ROLE.  
5. Do **not** change project-admin inheritance attributes.  
6. Immediately run **§B.2c**.

| Expect | Stop if |
|--------|---------|
| Four memberships inherit=f / set=t / admin=f; each admin `SET ROLE` matches; always `RESET ROLE` | GRANT/probe fail → **G2 BLOCKED** |

**Reminder:** successful admin `SET ROLE scs_test_admin` (if ever attempted) is **not** independent authentication and is **not** used for §D fixture proofs.

### 4.3 Passwords (Packet §B.5) — Owner private

1. **Verify** whether Dashboard → Database → Roles can set passwords for custom login roles on this project.  
2. If verified: set passwords in the UI for required login roles; store only in password manager.  
3. If UI **unverified or unavailable**: **do not** paste `ALTER ROLE … PASSWORD` into SQL Editor. Prefer separately authorized `psql` interactive `\password <role>` (prompted; no password on command line / in SQL history).  
4. If neither path is available: **STOP** — secure provisioning is a separate prerequisite.

### 4.4 Fixture RLS overlay (Packet §B.4) — MUTATING

1. Confirm migrations finished and isolation / maintenance-window conditions hold.  
2. Paste entire file `qa-m6b/M7B-G2-R3-staging-fixture-rls-policies-20261124.sql`.  
3. Run.  
4. Confirm §C.3 shows nine `scs_fixture_*` policies.

---

## 5. Phase 6 — Post-apply READ-ONLY verify (Packet §C)

Run §C.1–C.5 as project admin in SQL Editor.

| Expect | Stop if |
|--------|---------|
| Tables/functions owned by project admin | Owned by runtime/fixture/migration roles |
| RLS on; fixture policies present | Policies missing |
| Least-privilege matrix matches packet | Matrix broken |

---

## 6. Phase 7 — Cross-session fixture tests (Packet §D)

**Class: mutation tests.** Requires **exclusive serial staging maintenance window**.

1. As project admin → §D.0 **expanded baseline**. Expect zeros for all fixture-visible namespaces. **STOP** on unexpected existing fixture-visible records.  
2. Using an **external TLS-verifying client**, login independently as `scs_test_admin` (Path A bare username on direct host). Run §D.1 — require `current_user = session_user = scs_test_admin`.  
3. As project admin (SQL Editor OK) → §D.2 seed + **COMMIT**. Record IDs/keys.  
4. As independent fixture client → §D.3 visibility.  
5. As independent fixture client → §D.4 mutations in `BEGIN`/`ROLLBACK`.  
6. As independent fixture client → §D.5 denials in isolated txns/savepoints — including corrected consent probe (§D.5b).  
7. §D.6a elevated attrs still false.  
8. As project admin → §D.6b cleanup → §D.6c zero residual.

| Expect | Stop if |
|--------|---------|
| Dual-user identity match; visibility + rowcounts correct; consent = privilege deny; residuals 0 | SQL Editor used as “fixture login”; `SET ROLE` used as fixture auth; `session_user` ≠ role; unexpected baseline rows; consent rows visible; residuals remain |

**Interrupted testing:** if you stop after §D.2 COMMIT, run §D.6b/c for that `SEED_TOKEN` before leaving the project.

---

## 7. Credentials for harness day (Owner-only) — Path A assumed

Build URLs privately (password manager) **only after Path A decision**:

- Host: `db.kfclinlrzfwodmichmci.supabase.co` port `5432`  
- DB: `postgres` · prefer `sslmode=verify-full`  
- Usernames exactly: project admin, `scs_intake_runtime`, `scs_notify_worker`, `scs_owner_admin`, `scs_test_admin`

```powershell
$env:SCS_AUTHORIZE_REAL_PG_TESTS = "true"
$env:DATABASE_PROJECT_ADMIN_URL = "<from password manager>"
$env:DATABASE_INTAKE_URL = "<from password manager>"
$env:DATABASE_NOTIFY_URL = "<from password manager>"
$env:DATABASE_OWNER_URL = "<from password manager>"
$env:DATABASE_TEST_ADMIN_URL = "<username must be exactly scs_test_admin>"
```

**Reject / unset:** `DATABASE_MIGRATION_URL`. Prefer unset `DATABASE_URL` during harness.  
**Do not:** `setx`, profile exports, `.env` writes, chat paste, SQL password statements, Path B qualified usernames against the frozen harness.

---

## 8. Phase 8 — Real-PG cases 1–13 (when `A-DBTEST`)

**Prerequisite checklist:**

- [ ] §A.0/A.1 already PASS (PG17)  
- [ ] Path A selected (or Path B revision accepted — not this packet)  
- [ ] External connectivity + TLS verified  
- [ ] §B.2c SET ROLE PASS  
- [ ] §C PASS  
- [ ] §D PASS + zero residual (external fixture client)  
- [ ] Fixture isolation / maintenance window held  
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

Use Packet §F.1. Prefer destroying the staging project over fighting provider-managed membership graphs.

---

## 10. Exact stop conditions

| Condition | Action |
|-----------|--------|
| Wrong project / production | Abort; HOLD |
| External connectivity unverified and harness about to run | STOP |
| Path B chosen without authorized harness revision | STOP |
| Transaction pooler used as shortcut | STOP |
| Attempt to use SQL Editor / `SET ROLE` as independent fixture auth | STOP |
| `current_user` or `session_user` ≠ expected role on fixture login | STOP |
| Unexpected fixture-visible baseline rows | STOP — clear/resolve before seeds |
| Consent SELECT returns any row for fixture role | STOP — escalate |
| Consent SELECT succeeds with 0 rows while proving “deny” | STOP — wrong contract (filtering ≠ denial) |
| PG&lt;16 (not applicable here; already 17) | STOP G2 |
| Dashboard password UI assumed without verification | STOP — verify or use authorized alternative |
| Residual ≠ 0 after cleanup | STOP before harness |
| Urge to grant BYPASSRLS / edit frozen harness in this pass | Refuse |

---

## 11. End-state / handoff

1. Record sanitized pass/fail notes (role names / seed tokens, not secrets).  
2. Do not enable Data API.  
3. Do not deploy Netlify (G3).  
4. Keep historical G2 + R1 + R2 docs; use **R3** packet as authoritative apply guide.  
5. Path B proposal remains documentation-only until separately authorized.

**G2 SQL remains unauthorized until you issue `A-SQL`.** Production **HOLD**.
