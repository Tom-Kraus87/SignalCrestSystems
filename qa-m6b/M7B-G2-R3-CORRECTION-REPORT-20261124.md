# M7B-G2-R3 — Correction Report

**Date:** 2026-11-24  
**Milestone:** M7B-G2-R3 Connectivity and Execution Packet Closure  
**Nature:** Local documentation / packet corrections only — **no SQL executed, no DB connections, no credential access, no installs, no Git, no deploy, no frozen harness edits**  
**Production:** **HOLD**  
**G2 SQL / mutation authorization:** still **unauthorized / withheld** pending Owner `A-SQL`

---

## 1. Scope and constraints honored

| Constraint | Status |
|------------|--------|
| Local packet preparation only | PASS |
| No database connections / SQL execution | PASS |
| No credential access | PASS |
| No dependency installation | PASS (PDF converter uses existing local tooling only) |
| No Git operations | PASS |
| No infrastructure / deploy changes | PASS |
| Frozen 59-file M7B candidate unchanged | PASS |
| Frozen harness / application / migrations unchanged | PASS |
| R2 artifacts preserved unchanged | PASS (not overwritten) |
| Path B harness proposal separate / not implemented | PASS |
| Production HOLD | PASS |

---

## 2. Owner-verified live evidence recorded (not re-run)

| Field | Value |
|-------|-------|
| Project | `scs-staging` |
| PostgreSQL | 17.12 |
| `server_version_num` | 170012 |
| `current_user` / `session_user` | `postgres` / `postgres` |
| `current_database` | `postgres` |
| `rolsuper` | false |
| `rolcreaterole` | true |
| `rolinherit` | true |
| `rolcanlogin` | true |
| PG16+ gate | **PASS** |
| Initial administrator identity | **PASS** |
| External connectivity (DNS/TCP/TLS/tools) | **UNVERIFIED** (Owner conducting separately) |

---

## 3. Correction dispositions (1–6)

| # | Required correction | Disposition | How closed in R3 |
|---|---------------------|-------------|------------------|
| 1 | Independent custom-role authentication | **CLOSED (docs)** | Removed all guidance that SQL Editor can authenticate independently as `scs_test_admin`. §D.1 / walkthrough require an **external TLS-verifying PostgreSQL client**. Administrator SQL Editor ops vs independent fixture-role ops are separated. Both `current_user` **and** `session_user` must match. Explicit: `SET ROLE` alone is **not** independent authentication. |
| 2 | Direct vs session pooler decision | **CLOSED (docs + proposal)** | Packet documents mutually exclusive **Path A** (direct host; frozen harness; bare usernames) vs **Path B** (session pooler; project-qualified usernames; separately authorized harness revision). Transaction pooler forbidden as unreviewed substitute. All frozen harness + `pg-client.js` validators inspected read-only; Path B proposal lists every affected point. **Path B not implemented.** |
| 3 | Fixture isolation | **CLOSED (docs + R3 SQL header)** | Baseline expanded to **all fixture-visible** namespaces (`is_test` leads/outbox, all `r4%` / `it-%` keys/markers, active seed token). Requires exclusive serial staging maintenance window. **STOP** on unexpected existing fixture-visible records. Exact cleanup + zero-residual retained. |
| 4 | Consent-read negative control | **CLOSED (docs)** | §D.5b rewritten: intended contract from frozen schema is **table privilege denial** (`42501`) — `scs_test_admin` has no GRANT and no policy on `consent_records`. Explicitly **FAIL** if any consent row becomes visible. Distinguishes permission denial vs zero-row RLS filtering vs unauthorized successful access. |
| 5 | Credential provisioning | **CLOSED (docs)** | Does **not** assume Dashboard Roles UI supports custom-role password provisioning without Owner verification. Documents secure Owner-only alternatives including `psql` interactive password prompting (`\password`) when separately authorized and available. Forbids passwords in SQL Editor history, shell args, logs, evidence, AI context. |
| 6 | Owner execution workflow | **CLOSED (docs)** | Walkthrough identifies completed read-only PG17 discovery; remaining read-only discovery; external client prerequisites; Path A/B decision gate; required tokens (`A-SQL`, `A-DEP`, `A-DBTEST`, plus Path B tokens if chosen); exact stop conditions. |

---

## 4. R2 defects corrected (detail)

### 4.1 Independent fixture authentication via SQL Editor

R2 §D.1 / walkthrough §6 instructed connecting or opening SQL Editor **as** `scs_test_admin`. Dashboard SQL Editor does not provide independent custom-role authentication. R3 requires an external TLS-verifying client and dual `current_user`/`session_user` proof.

### 4.2 Ambiguous pooler guidance

R2 listed pooler hosts alongside direct host without a hard Path A vs Path B gate, and did not surface frozen-harness username exact-match breakage for project-qualified pooler logins. R3 makes the paths mutually exclusive and issues a separate Path B proposal.

### 4.3 Incomplete fixture baseline

R2 §D.0 checked seed-token residuals but did not require a full fixture-visible inventory (`is_test`, all `r4%`/`it-%`) under an exclusive maintenance window with hard STOP on unexpected rows.

### 4.4 Consent denial ambiguity

R2 §D.5b caught `insufficient_privilege` but did not fail closed on a successful SELECT that returned rows, nor distinguish empty RLS filtering from true privilege denial. Frozen contract (migrations 002/006): REVOKE ALL on `consent_records` from non-owner paths; no fixture GRANT/policy → expect `42501`, not a zero-row success.

### 4.5 Dashboard-only password assumption

R2 treated Dashboard Roles UI as the verified method. R3 requires Owner verification that the UI can set custom-role passwords; otherwise use a separately authorized secure alternative (e.g. `psql` `\password` with prompt — never password literals in SQL/shell).

### 4.6 Walkthrough sequencing

R2 did not separate completed PG17 discovery from remaining connectivity/client discovery or the Path A/B gate before harness env wiring.

---

## 5. Consent denial contract (read-only verification)

| Source | Finding |
|--------|---------|
| `db/migrations/002_m7a_rls_least_privilege.sql` | RLS enabled; `REVOKE ALL` from `anon`/`authenticated`/`PUBLIC`; only `consent_owner_select` for `authenticated` + `is_owner_aal2()` |
| `db/migrations/006_m7a_r2_security_hardening.sql` | Re-affirms `REVOKE ALL` on `consent_records` |
| R3 staging overlay | **No** GRANT / policy on `consent_records` for `scs_test_admin` |
| Frozen harness | Does not grant fixture SELECT on consent |

**Intended independent-fixture result:** privilege denial (`42501`).  
**Not acceptable:** successful SELECT with ≥1 row.  
**Also not acceptable as “deny proof”:** successful SELECT with 0 rows due to RLS filtering while table privilege exists.

---

## 6. Path A vs frozen candidate

**Path A can proceed without changing the frozen 59-file candidate**, subject to remaining external blockers (connectivity, TLS-verifying client, credential provisioning verification, Owner tokens). Path B cannot.

---

## 7. Deliverables produced (R3)

| Document | Path |
|----------|------|
| Implementation Preparation Report | `qa-m6b/M7B-G2-R3-IMPLEMENTATION-PREPARATION-REPORT-20261124.md` (+ PDF) |
| SQL Execution Packet (authoritative) | `qa-m6b/M7B-G2-R3-SQL-EXECUTION-PACKET-20261124.md` (+ PDF) |
| Owner Walkthrough | `qa-m6b/M7B-G2-R3-OWNER-WALKTHROUGH-20261124.md` (+ PDF) |
| Correction Report | `qa-m6b/M7B-G2-R3-CORRECTION-REPORT-20261124.md` (+ PDF) |
| Execution Packet Manifest | `qa-m6b/M7B-G2-R3-EXECUTION-PACKET-MANIFEST-20261124.md` (+ PDF) |
| Path B harness change proposal (not implemented) | `qa-m6b/M7B-G2-R3-HARNESS-CHANGE-PROPOSAL-PATH-B-20261124.md` (+ PDF) |
| Staging fixture SQL overlay | `qa-m6b/M7B-G2-R3-staging-fixture-rls-policies-20261124.sql` |

**Historical retained unchanged:** all `M7B-G2-R2-*`, `M7B-G2-R1-*`, and prior `M7B-G2-*` packet files + PDFs + R2 SQL.

---

## 8. Remaining blockers (exact)

| Blocker | Status |
|---------|--------|
| External DNS / TCP reachability to chosen host | Unverified (Owner) |
| TLS hostname validation proof to chosen host | Unverified (Owner) |
| External TLS-verifying PostgreSQL client installed/available | Unverified (Owner; `psql` historically MISSING) |
| Path A vs Path B decision after connectivity evidence | Pending Owner |
| If Path B chosen: harness/app revision + re-freeze | Not authorized; proposal only |
| Owner verification of password provisioning method | Pending |
| Written `A-SQL` (staging) | Required before mutating §B/§D/§F |
| Written `A-DEP` | If client/`pg` install needed |
| Written `A-DBTEST` | Before real-PG cases 1–13 |
| G3 Netlify deploy | Out of scope |
| Production | **HOLD** |
| Case 14 hosted Auth / AAL2 | Remains NOT RUN (G4) |

---

## 9. Freeze integrity (this pass)

| Object | Result |
|--------|--------|
| Freeze manifest SHA-256 | MATCH `3c7cebb3f27ebf55d1d002e2d8c480a451932ff43d1b4f39f579956cb2ad4d0b` |
| Harness SHA-256 | MATCH `826bf5c3845c8d9068831a07e87aaaecfdb721f3a009115a7bdda41c96c3d0f9` |
| Freeze files edited for R3 | **NONE** |
| R2 artifacts edited | **NONE** |

---

## 10. Authorization boundary confirmation (this pass)

| Action | This R3 pass |
|--------|----------------|
| SQL execution / DB connection | **NOT DONE** |
| Credential access / secret capture | **NOT DONE** |
| Package installation | **NOT DONE** |
| Frozen candidate / harness / app / migration edits | **NOT DONE** |
| Path B proposal implementation | **NOT DONE** |
| Git operations | **NOT DONE** |
| Deploy | **NOT DONE** |
| Production | **HOLD** |

**STOP for Atlas/Codex review.** G2 SQL remains unauthorized. Production **HOLD**.
