# M7B-G2-R4 — Targeted Harness Correction Proposal (Path A)

**Date:** 2026-11-24  
**Milestone:** M7B-G2-R4 Targeted Harness Correction Preparation  
**Status:** **PROPOSAL ONLY — NOT IMPLEMENTED**  
**Selected execution path:** **Path A** (direct DB host + bare role usernames)  
**Path B:** **NOT selected / NOT implemented** (R3 Path B proposal retained as historical contingency only)  
**Nature:** Preparation and read-only source inspection only  
**Production:** **HOLD**

---

## 0. Authorization boundary (this pass)

| Action | Status |
|--------|--------|
| Inspect frozen harness + TLS helpers (read-only) | **DONE** |
| Propose five-pool independent identity preflight | **DONE (docs)** |
| Modify frozen harness / 59-file candidate | **NOT DONE** |
| Implement Path B / pooler username mapping | **NOT DONE** |
| Connect to PostgreSQL / execute SQL | **NOT DONE** |
| Install deps / access credentials | **NOT DONE** |
| Git / deploy | **NOT DONE** |
| Production | **HOLD** |

**Preserve (spot-check this pass):**

| Object | Expected | Result |
|--------|----------|--------|
| 59-file freeze digest | `3c7cebb3f27ebf55d1d002e2d8c480a451932ff43d1b4f39f579956cb2ad4d0b` | **PRESERVE — do not overwrite** |
| Harness SHA-256 | `826bf5c3845c8d9068831a07e87aaaecfdb721f3a009115a7bdda41c96c3d0f9` | **MATCH / UNCHANGED** |

Successor candidate manifest is proposed **after** separately authorized implementation — never by mutating the historical freeze record.

---

## 1. Finding closed by this proposal (Codex P1)

**P1 — Independent database pool identity**

The frozen harness constructs **five** pools but does **not** prove independent login identity for every pool before fixture DML or cases 1–13:

| Pool (env) | Expected login role | Current proof timing | Gap |
|------------|---------------------|----------------------|-----|
| `DATABASE_PROJECT_ADMIN_URL` → `migration` | `postgres` | Case 1 uses `SET ROLE` on admin pool only | No dual `current_user`/`session_user` preflight; no CREATEROLE gate |
| `DATABASE_INTAKE_URL` → `intake` | `scs_intake_runtime` | Case 12 mid-suite | After fixture mutations may already have run |
| `DATABASE_NOTIFY_URL` → `notify` | `scs_notify_worker` | **Never** queried for identity | Unproven independent auth |
| `DATABASE_OWNER_URL` → `owner` | `scs_owner_admin` | Case 8 mid-suite | After earlier cases |
| `DATABASE_TEST_ADMIN_URL` → `fixture` | `scs_test_admin` | URL username check only (no connect) | Fixture DML in cases 2/5/9/13 can run without live dual-user proof |

**Hard rule restated:** `SET ROLE` is **not** independent authentication. Administrator `SET ROLE` probes prove switchability of the admin session only.

---

## 2. Path A selection (Owner-verified)

### 2.1 Connectivity evidence (Owner-verified — record)

| Field | Value |
|-------|-------|
| Project | `scs-staging` / `kfclinlrzfwodmichmci` |
| PostgreSQL | **17.12** / `server_version_num` **170012** |
| Direct DNS AAAA | **Successful** |
| Direct TCP `5432` | `TcpTestSucceeded=True` (**IPv6 confirmed**) |
| Session pooler TCP `5432` | `True` (available, **not selected**) |
| Transaction pooler `:6543` | **Forbidden** as unreviewed substitute |
| Tools | Node **v22.22.3**, npm **12.0.1**; **`psql` NOT on PATH** |
| TLS cert / hostname validation | **UNVERIFIED** (remaining blocker) |

### 2.2 Decision

| Path | Decision |
|------|----------|
| **A — Direct** `db.kfclinlrzfwodmichmci.supabase.co:5432` + exact bare usernames | **SELECTED** |
| **B — Session pooler** + project-qualified usernames | **NOT selected**; R3 proposal remains unimplemented |
| Transaction pooler | **Rejected** |

Path A remains compatible with bare-role validators in the frozen harness and `pg-client.js`. The R4 correction is a **preflight addition**, not a Path B username rewrite.

### 2.3 Does missing `psql` block Path A?

**No — Path A selection is not blocked by missing `psql`.**

- Path A host reachability is already Owner-proven (IPv6 DNS + TCP 5432).
- Independent authentication for harness execution uses the Node `pg` client with the **existing** application TLS stack (`buildSslOptions` / `checkServerIdentity` / CA env). That is the intended A-DBTEST client path.
- Missing `psql` **does** block Owner §D fixture proofs **if** those proofs are run via `psql` specifically. Alternatives (when separately authorized): install `psql` under `A-DEP`, or run §D through a TLS-verifying Node client aligned with the harness. Do **not** fall back to Dashboard SQL Editor / `SET ROLE` as “independent” fixture auth.
- TLS certificate and hostname validation remain **UNVERIFIED** and still block authorized real-PG execution until Owner completes that proof.

---

## 3. Live catalog discovery (updated)

| Probe | Result | Notes |
|-------|--------|-------|
| §A.0 / §A.1 | **PASS** (prior Owner evidence) | `postgres`/`postgres`; `rolcreaterole`=true; `rolsuper`=false |
| §A.2 | **Recorded** | `anon` + `authenticated` exist; both **NOLOGIN**, INHERIT, NOSUPERUSER, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS. **All five `scs_*` roles ABSENT** |
| §A.3 | **Recorded** | `postgres` already holds `anon` and `authenticated` memberships; **ADMIN OPTION=true**, **INHERIT OPTION=true**, **SET OPTION=true**; grantor appears **`supabase_admin`** (confirm exact catalog value on next Owner §A.3 paste if required) |
| §A.4 | **Pending Owner** | Fresh-DB baseline privileges |
| §A.5 | **Pending Owner** | `scs_migration` status (expect NOT PROVISIONED until bootstrap) |

**Implication:** Bootstrap (§B.1 order 1) must create `scs_*` roles before any independent pool identity proof can pass. Preflight must fail closed if roles/credentials are absent.

---

## 4. Provider-managed membership reconciliation (§B.2)

### 4.1 Problem

R3 §B.2a issues:

```sql
GRANT anon TO CURRENT_USER WITH INHERIT FALSE, SET TRUE, ADMIN FALSE;
GRANT authenticated TO CURRENT_USER WITH INHERIT FALSE, SET TRUE, ADMIN FALSE;
```

Live §A.3 already shows provider-managed `anon` / `authenticated` edges on `postgres` with **ADMIN=true**, **INHERIT=true**, **SET=true**, grantor ≈ `supabase_admin`. Blind re-GRANT / revoke / option-downgrade risks fighting provider management.

### 4.2 R4 reconciliation rule (authoritative for apply)

| Membership | Action |
|------------|--------|
| Provider `anon` → `postgres` | **PRESERVE** — do **not** revoke, replace, or modify options |
| Provider `authenticated` → `postgres` | **PRESERVE** — do **not** revoke, replace, or modify options |
| `scs_intake_runtime` → `postgres` | **GRANT** only if absent after bootstrap: `WITH INHERIT FALSE, SET TRUE, ADMIN FALSE` |
| `scs_notify_worker` → `postgres` | **GRANT** only if absent after bootstrap: `WITH INHERIT FALSE, SET TRUE, ADMIN FALSE` |
| `scs_owner_admin` → `postgres` | **Do not add** (independent `DATABASE_OWNER_URL` login) |

### 4.3 Verification after reconcile

1. Re-run §A.3; confirm provider `anon`/`authenticated` edges unchanged (grantor/options preserved).  
2. Confirm `scs_intake_runtime` / `scs_notify_worker` edges exist with intended PG16+ options.  
3. Run §B.2c `SET ROLE` probes for all four targets (`scs_intake_runtime`, `scs_notify_worker`, `anon`, `authenticated`).  
4. If `SET ROLE anon|authenticated` fails despite preserved membership → **STOP / escalate** — do not invent option mutations.  
5. Reminder: successful admin `SET ROLE` ≠ independent pool authentication (harness preflight still required).

---

## 5. Smallest harness revision (Path A) — design only

**Target file (future authorized edit):**  
`qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs`

**Helpers (read-only reuse — prefer no edit):**  
`netlify/functions/_lib/pg-client.js` — keep existing TLS (`rejectUnauthorized: true`, `checkServerIdentity`, CA via `DATABASE_SSL_CA` / `DATABASE_SSL_CA_PATH` / `PGSSLROOTCERT`), `parseApprovedConnectionFields`, `buildSslOptions`, `inspectEffectivePgSsl`.

### 5.1 Insertion point

After:

1. `resolveRealPgHarnessEnv` succeeds  
2. Fixture URL username asserted (`scs_test_admin`)  
3. All five `buildHarnessPoolConfig` calls succeed (TLS preserved)  
4. All five `Pool` instances constructed  

**Before:**

- Any fixture DML  
- Any integration case body (cases 1–13)  
- Any `SET ROLE` used as a substitute for login proof  

### 5.2 Path A host / username gates (fail closed, no credential logs)

For **each** of the five URLs, after parse:

| Check | Expect |
|-------|--------|
| Host | Exact `db.kfclinlrzfwodmichmci.supabase.co` (Path A) |
| Port | `5432` only |
| Reject | `*.pooler.supabase.com`, any host containing `pooler.supabase`, port `6543`, transaction-pooler configs |
| Username | Exact bare role (table below) — no `<role>.<ref>` |
| Logging | Never log passwords or complete connection URLs (errors: code + role label only) |

### 5.3 Independent identity matrix

On each pool, run a single read-only query (illustrative):

```sql
SELECT
  current_user AS current_user,
  session_user AS session_user,
  EXISTS (
    SELECT 1 FROM pg_roles r
    WHERE r.rolname = current_user
      AND (r.rolcreaterole OR r.rolsuper)
  ) AS admin_createrole_ok;
```

| Pool label | Require `current_user` | Require `session_user` | Extra |
|------------|------------------------|------------------------|-------|
| Project administrator | `postgres` | `postgres` | `admin_createrole_ok = true` |
| Intake | `scs_intake_runtime` | `scs_intake_runtime` | — |
| Notify | `scs_notify_worker` | `scs_notify_worker` | — |
| Owner | `scs_owner_admin` | `scs_owner_admin` | — |
| Fixture | `scs_test_admin` | `scs_test_admin` | — |

**Pass rule:** all five pools pass **before** cases 1–13 begin.  
**Fail closed on:** auth failure, connection failure, identity mismatch (`current_user` or `session_user`), admin lacking CREATEROLE (and not SUPERUSER), Path A host/port/username violations, TLS preflight failure.

**Forbidden behaviors:**

1. Falling back to administrator credentials for intake/notify/owner/fixture pools  
2. Treating `SET ROLE` as independent authentication  
3. Continuing into fixture DML / cases after any preflight failure  
4. Weakening TLS verification  
5. Accepting pooler / transaction-pooler configs under Path A  
6. Logging credentials or complete URLs  

### 5.4 Pool lifecycle on failure

```text
create pools
try {
  run five-pool identity preflight
  if any fail → throw / mark suite FAIL (no cases)
  else run cases 1–13 (assertions unchanged)
} finally {
  end all five pools (Promise.allSettled) — even on partial preflight failure
}
```

Today’s harness ends pools only after the case loop. The authorized revision must close pools in `finally` so a mid-preflight failure cannot leak clients.

### 5.5 Preserve cases 1–13

- Keep existing case bodies and assertions.  
- Case 1 may still use admin `SET ROLE` for **switchability / grant probes** — that remains distinct from preflight login proof.  
- Cases 8 and 12 mid-suite dual-user checks may remain as defense-in-depth; they do **not** replace preflight.  
- Case 7 TLS negative controls preserved.  
- Case 14 remains separate NOT RUN evidence class.

### 5.6 Suggested pure helpers (same file; smallest surface)

| Helper | Responsibility |
|--------|----------------|
| `assertPathAConnectionShape(url, expectedUser)` | Host/port/bare-username gates; no connect; no URL logging |
| `assertIndependentPoolIdentity(client, expected)` | Query dual users (+ CREATEROLE for admin); throw typed codes |
| `runIndependentPoolIdentityPreflight(pools)` | Ordered checks; aggregate failures; fail closed |
| `endPoolsQuietly(pools)` | `finally` cleanup |

Optional new unit-test file (authorized implementation):  
`qa-m6b/tests/m7b-g2-r4-independent-pool-identity-20261124.mjs` (or adjacent existing test runner pattern).

---

## 6. Exact proposed file-change allowlist

See also: `qa-m6b/M7B-G2-R4-FILE-CHANGE-ALLOWLIST-20261124.md`

| Path | Change under future authorization | This pass |
|------|-----------------------------------|-----------|
| `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs` | Add Path A gates + five-pool preflight + `finally` pool cleanup | **UNCHANGED** |
| `qa-m6b/tests/m7b-g2-r4-independent-pool-identity-20261124.mjs` (**new**) | Regression tests listed in §7 | **NOT CREATED** |
| R4 proposal / amendment / allowlist / regression docs (+ PDFs) | Documentation only | **THIS PASS** |
| `netlify/functions/_lib/pg-client.js` | **Out of allowlist** for Path A (reuse as-is) | **UNCHANGED** |
| `db/bootstrap/*`, `db/migrations/*` | **Out of allowlist** | **UNCHANGED** |
| Path B proposal / pooler mapping | **Out of scope** | **NOT IMPLEMENTED** |
| Historical freeze manifest | **Never overwrite**; emit **successor** manifest after authorized impl | **PRESERVED** |

---

## 7. Regression test plan

Companion detail: `qa-m6b/M7B-G2-R4-REGRESSION-TEST-PLAN-20261124.md`

| ID | Scenario | Expect |
|----|----------|--------|
| R1 | All five pools correct identities + admin CREATEROLE | Preflight PASS; cases may proceed |
| R2 | Each pool independently failing auth (×5) | Suite FAIL before any fixture DML; that pool’s error surfaced; no admin fallback |
| R3 | Incorrect `current_user` (session matches expected) | FAIL closed |
| R4 | Incorrect `session_user` (current matches expected) | FAIL closed |
| R5 | Correct `current_user` via `SET ROLE` while `session_user` remains another login | FAIL closed (proves SET ROLE ≠ independent auth) |
| R6 | Admin connects but `rolcreaterole=false` and not SUPERUSER | FAIL closed |
| R7 | Invalid notification credentials (`DATABASE_NOTIFY_URL`) | FAIL at preflight; notify identity never “skipped” |
| R8 | Preflight failure before fixture mutations | Zero fixture DML observed / cases 2+ not started |
| R9 | Partial preflight failure (e.g. pass admin+intake, fail notify) | All constructed pools closed in `finally` |
| R10 | Existing TLS negative controls (case 7 + `buildHarnessPoolConfig` rejectUnauthorized/checkServerIdentity) | Still FAIL closed; no TLS weakening |
| R11 | Pooler host or port `6543` in any of five URLs | Reject before connect |
| R12 | Project-qualified username under Path A | Reject |
| R13 | Cases 1–13 assertion text/behavior unchanged when preflight PASS | No unintended assertion drift |

---

## 8. Updated Owner execution sequence (R4 delta)

Full R3 walkthrough remains base. R4 inserts/amends:

| Step | Action | Auth |
|------|--------|------|
| 0 | Record Path A selection (this packet) | — |
| 1 | Complete §A.4 / §A.5 (pending) | Read-only |
| 2 | Complete TLS cert/hostname validation on direct host | Owner tools |
| 3 | Provision client path: Node/`pg` for harness; `psql` or Node for §D (`A-DEP` if install needed) | `A-DEP` if needed |
| 4 | Issue `A-SQL` → §B.1 bootstrap/migrations | `A-SQL` |
| 5 | §B.2 **reconciled**: grant only missing `scs_intake_runtime` / `scs_notify_worker`; **preserve** provider `anon`/`authenticated` | `A-SQL` |
| 6 | §B.3–B.5 fixture role + passwords (no secrets in evidence) | `A-SQL` + Owner private |
| 7 | §B.4 overlay + §C verify | `A-SQL` |
| 8 | §D independent fixture proofs via external TLS client | External client |
| 9 | Separate authorization to **implement** this harness preflight (allowlist only) | **`A-HARNESS`** (new) |
| 10 | Freeze successor manifest (do not overwrite historical `3c7cebb3…`) | Owner |
| 11 | Real-PG cases 1–13 with five-pool preflight | `A-DBTEST` |
| — | Production | **HOLD** |

---

## 9. Remaining blockers before authorized implementation

| # | Blocker | Blocks |
|---|---------|--------|
| 1 | TLS certificate + hostname validation still **UNVERIFIED** | Real-PG / §D / A-DBTEST confidence |
| 2 | §A.4 and §A.5 not yet Owner-executed | Apply readiness completeness |
| 3 | All `scs_*` roles **ABSENT** | Independent pool identity cannot pass until bootstrap |
| 4 | Password provisioning method not Owner-verified | Login roles |
| 5 | Written **`A-HARNESS`** (implement preflight allowlist) | Code change |
| 6 | Written **`A-SQL`** | Mutating §B |
| 7 | Written **`A-DEP`** if installing `psql` / packages | Tooling |
| 8 | Written **`A-DBTEST`** | Cases 1–13 |
| 9 | Successor freeze manifest after impl | Audit continuity |
| 10 | Production | **HOLD** (unchanged) |

**Non-blockers for Path A selection:** session pooler TCP success; missing `psql` on PATH (see §2.3).

---

## 10. Independent Codex audit checklist

Auditor should verify **without** relying on implementer narrative:

- [ ] Historical freeze digest `3c7cebb3…` untouched; harness hash `826bf5c3…` unchanged until `A-HARNESS`
- [ ] Path A selected; Path B / transaction pooler not implemented
- [ ] Preflight runs for **all five** pools before any fixture DML / cases 1–13
- [ ] Each pool requires **both** `current_user` and `session_user` equal expected bare role
- [ ] Admin pool additionally proves CREATEROLE (or SUPERUSER)
- [ ] Auth / connect / mismatch failures fail closed with no admin credential fallback
- [ ] `SET ROLE`-only session cannot satisfy preflight (R5)
- [ ] Path A host/port gates reject pooler and `:6543`
- [ ] Bare usernames only; qualified `<role>.<ref>` rejected under Path A
- [ ] Existing TLS verification path preserved (`rejectUnauthorized`, `checkServerIdentity`, CA env)
- [ ] No credentials / full URLs in logs or evidence
- [ ] `finally` closes all pools after partial preflight failure
- [ ] Cases 1–13 assertions preserved; case 14 still separate NOT RUN
- [ ] §B.2 reconcile preserves provider `anon`/`authenticated` membership edges
- [ ] Allowlist contains only authorized files; `pg-client.js` / migrations not silently edited
- [ ] Production remains HOLD

---

## 11. Related artifacts

| Artifact | Path |
|----------|------|
| File-change allowlist | `qa-m6b/M7B-G2-R4-FILE-CHANGE-ALLOWLIST-20261124.md` |
| Regression test plan | `qa-m6b/M7B-G2-R4-REGRESSION-TEST-PLAN-20261124.md` |
| R3 amendment (delta only) | `qa-m6b/M7B-G2-R4-AMENDMENT-TO-R3-PACKET-20261124.md` |
| R3 Path B proposal (not selected) | `qa-m6b/M7B-G2-R3-HARNESS-CHANGE-PROPOSAL-PATH-B-20261124.md` |
| Frozen harness (read-only) | `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs` |
| TLS/identity helper (read-only) | `netlify/functions/_lib/pg-client.js` |
| Freeze | `qa-m6b/M7B-AUDIT-SNAPSHOT-MANIFEST-20261124.md` |

---

## 12. Verdict

**Path A confirmed.** Smallest closed correction is a fail-closed **five-pool independent identity + admin CREATEROLE preflight** with Path A host gates and `finally` pool cleanup, implemented only after `A-HARNESS`, without Path B, without weakening TLS, and without overwriting the historical freeze.
