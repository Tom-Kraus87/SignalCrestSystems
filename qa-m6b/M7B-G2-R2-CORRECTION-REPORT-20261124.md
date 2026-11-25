# M7B-G2-R2 — Correction Report

**Date:** 2026-11-24  
**Milestone:** M7B-G2-R2 Targeted Execution Packet Closure  
**Nature:** Local documentation / packet corrections only — **no SQL executed, no DB connections, no installs, no Git, no deploy**  
**Production:** **HOLD**  
**G2 SQL / mutation authorization:** still **unauthorized / withheld** pending Owner `A-SQL`

---

## 1. Scope and constraints honored

| Constraint | Status |
|------------|--------|
| Local preparation and documentation only | PASS |
| No database connections / SQL execution | PASS |
| No credential access | PASS |
| No dependency installation | PASS |
| No Git operations | PASS |
| No infrastructure / deploy changes | PASS |
| Frozen 59-file M7B candidate unchanged | PASS (not modified) |
| Prior G2 + R1 packet docs preserved (not deleted/overwritten) | PASS |
| Frozen harness / app / migrations unchanged | PASS |
| No BYPASSRLS / SUPERUSER / broad admin grants proposed | PASS |
| G2 mutation authorization withheld | PASS |
| Production HOLD | PASS |

---

## 2. Finding dispositions (Acceptance)

| # | Finding | Disposition | How closed |
|---|---------|-------------|------------|
| P1 | PostgreSQL version compatibility | **CLOSED** | Removed executable PG15 bare-GRANT branch (§B.2b). §A.0 now **STOP G2** when `server_version_num < 160000` and requires a separately reviewed compatibility design. Retained explicit PG16+ `INHERIT FALSE, SET TRUE, ADMIN FALSE` grants + §B.2c option/SET ROLE verification. Explicitly forbids changing project-admin inheritance attributes or improvising on provider-managed memberships. |
| P1 | Cross-session fixture visibility | **CLOSED** | Rewrote §D.0–D.6: unique committed admin seeds → independent fixture visibility → rollback mutations with rowcounts → isolated denial probes (separate txn/savepoints) → admin cleanup → zero residual + dependents. Interrupted-test recovery table added. Seed SQL validated against migrations 001/004/005/006 (read-only). Walkthrough §6 aligned. |
| P2 | Credential handling | **CLOSED** | Removed executable-looking `ALTER ROLE … PASSWORD` templates. §B.5 documents Dashboard Roles UI as the verified Owner-only method that avoids SQL/shell/AI/evidence exposure. If UI unavailable → separate authorized prerequisite (no SQL password fallback). |
| P2 | Fixture isolation | **CLOSED** | Policies-only R2 overlay retained; frozen harness unchanged. Packet + walkthrough + SQL header document mandatory staging/synthetic/serial/no-concurrency/prefix-hygiene/baseline+residual/teardown conditions and disclose prefix RLS is not per-run isolation. |
| Atlas | Fresh database preflight (§A.4) | **CLOSED** | §A.4 (and §A.5) use catalog existence checks + guarded privilege evaluation; missing objects yield explicit `NOT PROVISIONED` rather than unhandled SQL errors. |

---

## 3. R1 defects corrected (detail)

### 3.1 PG15 bare-GRANT path

R1 authorized §B.2b plain `GRANT role TO CURRENT_USER` when major &lt; 16. That executable compatibility branch is removed. Below PG16, G2 stops.

### 3.2 Uncommitted / ambiguous seed visibility

R1 §D.2 seeded inside a transaction intended to roll back later, which cannot prove cross-session fixture visibility under RLS. R2 requires **COMMIT**, independent-session visibility checks, then explicit cleanup of committed seeds.

### 3.3 Permission-error isolation

R1 packed expected `42501` probes into one transaction with successful DML, so the first denial could abort the suite. R2 isolates denials via separate transactions/savepoints.

### 3.4 Password SQL templates

R1 §B.5 still described private `ALTER ROLE … PASSWORD '<from password manager>'` as an option — executable-looking and history-risking. R2 forbids it in-packet and points only at Dashboard UI (or a separately authorized secure tool).

### 3.5 Fresh-DB §A.4

R1 §A.4 called `has_table_privilege` / `has_function_privilege` directly, which errors when roles/relations/functions are missing. R2 guards with catalog checks.

---

## 4. Seed SQL validation (migrations read; not executed)

| Seed object | Source migration constraints checked |
|-------------|--------------------------------------|
| `leads` inserts | 001: `form_name`/`source` enums, message length, email `@`, `received_at`, `is_test` |
| `idempotency_keys` | 004: key length 8–128, `response_json` NOT NULL |
| `submission_requests` | 001: status enum, `form_name`, `received_at`, FK to leads |
| `notification_outbox` | 005/006: `lead_id` + `submission_id` FKs; `lease_expires_at` nullable |
| `lead_deletion_markers` | 006: key length 8–128; `reason` ≤ 64 |

Cleanup order respects `ON DELETE RESTRICT` on outbox→leads.

---

## 5. Deliverables produced (R2)

| Document | Path |
|----------|------|
| Implementation Preparation Report | `qa-m6b/M7B-G2-R2-IMPLEMENTATION-PREPARATION-REPORT-20261124.md` (+ PDF) |
| SQL Execution Packet (authoritative) | `qa-m6b/M7B-G2-R2-SQL-EXECUTION-PACKET-20261124.md` (+ PDF) |
| Owner Walkthrough | `qa-m6b/M7B-G2-R2-OWNER-WALKTHROUGH-20261124.md` (+ PDF) |
| Correction Report | `qa-m6b/M7B-G2-R2-CORRECTION-REPORT-20261124.md` (+ PDF) |
| Execution Packet Manifest | `qa-m6b/M7B-G2-R2-EXECUTION-PACKET-MANIFEST-20261124.md` (+ PDF) |
| Staging fixture SQL overlay | `qa-m6b/M7B-G2-R2-staging-fixture-rls-policies-20261124.sql` |

**Historical retained (unchanged):** all `M7B-G2-R1-*` and prior `M7B-G2-*` packet files + PDFs.

---

## 6. Unresolved dependencies / authorization still required

| Item | Status |
|------|--------|
| Owner written `A-SQL` (staging) | **Required** before any §B/§D/§F SQL |
| Owner Dashboard password provisioning (§B.5) | **Required** before login probes / harness |
| Secure provisioning alternative if Dashboard UI unavailable | Separate authorization prerequisite |
| Owner written `A-DEP` | If `pg` / tools missing for harness |
| Owner written `A-DBTEST` | Before real-PG cases 1–13 |
| Live PG version on `scs-staging` | Discovered at §A.0 — must be ≥ 160000 for this packet |
| Provider-managed `anon`/`authenticated` membership grantability | Verified only at §A.3/§B.2 apply time |
| G3 Netlify deploy | Out of scope; not authorized |
| Production | **HOLD** |
| Case 14 hosted Auth / AAL2 | Remains NOT RUN (G4) |

---

## 7. Authorization boundary confirmation (this pass)

| Action | This R2 pass |
|--------|----------------|
| SQL execution / DB connection | **NOT DONE** |
| Credential access / secret capture | **NOT DONE** |
| Package installation | **NOT DONE** (PDF converter uses existing local tooling only) |
| Frozen candidate / harness / app / migration edits | **NOT DONE** |
| Git operations | **NOT DONE** |
| Deploy | **NOT DONE** |
| Production | **HOLD** |

**STOP for Atlas/Codex review.** G2 SQL remains unauthorized. Production **HOLD**.
