# M7B-G2-R1 — Correction Report

**Date:** 2026-11-24  
**Milestone:** M7B-G2-R1 Final Execution Packet Corrections  
**Nature:** Local documentation / packet corrections only — **no SQL executed, no DB connections, no installs, no Git, no deploy**  
**Production:** **HOLD**  
**G2 SQL:** still **unauthorized** pending Owner `A-SQL`

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
| Prior G2 packet docs preserved (not deleted) | PASS |
| Frozen harness / app code unchanged | PASS |
| No BYPASSRLS / SUPERUSER / broad admin grants proposed | PASS |
| Production HOLD | PASS |

---

## 2. Codex P1 root cause (fixture RLS)

**Finding:** Table-level `GRANT UPDATE/INSERT` to `scs_test_admin` does **not** authorize mutations when RLS is enabled and no policy allows the role/command. Under default-deny RLS, `UPDATE`/`INSERT` from a non-owner role either affects **zero rows** or fails `WITH CHECK` — silent harness failures on cases 2, 5, 9, 13.

**Evidence (read-only inspection):**

| Table | RLS enabled by | Policies for `scs_test_admin` (pre-R1) |
|-------|----------------|----------------------------------------|
| `leads` | migration 002 | Owner/`authenticated` only (`is_owner_aal2`) |
| `idempotency_keys` | migration 004 | None |
| `notification_outbox` | migration 005 | None |
| `lead_deletion_markers` | migration 006 | None |
| `usage_counters` | migration 004 | None (harness does not fixture-DML this table) |

**Harness fixture statements (frozen file):**

| Case | Statement | Predicate / columns |
|-----:|-----------|---------------------|
| 2 | `UPDATE idempotency_keys SET expires_at … WHERE idem_key = $1` | keys `r4warm…`; needs SELECT(`idem_key`), UPDATE(`expires_at`) |
| 5 | `INSERT … lead_deletion_markers … ON CONFLICT DO UPDATE` | keys `r4del…`; INSERT + UPDATE(`deleted_at`,`reason`) |
| 9 | `UPDATE notification_outbox SET lease_expires_at … WHERE id = $1` | outbox for intake-created lead with `is_test=true` |
| 13 | `UPDATE leads SET deleted_at … WHERE id = $1` | `insertArgs` sets `p_is_test = true` |

**G2 packet defect corrected:** §A.6 used `WHERE FALSE` empty DML — proves grant absence of `42501` only, **not** RLS row visibility or meaningful mutation success.

---

## 3. R1 solution: policies-only (no harness change)

**Decision:** Staging-only RLS policies + column grants for `scs_test_admin`, applied as a post-migration overlay SQL artifact — **not** a frozen migration edit, **not** BYPASSRLS, **not** SECURITY DEFINER fixture procedures.

**Artifact:** `qa-m6b/M7B-G2-R1-staging-fixture-rls-policies-20261124.sql`

**Policy predicates (synthetic only):**

| Object | Restriction |
|--------|-------------|
| `leads` | `is_test = true` |
| `idempotency_keys` | `idem_key LIKE 'r4%' OR LIKE 'it-%'` |
| `notification_outbox` | EXISTS linked `leads.is_test = true` |
| `lead_deletion_markers` | key `r4*` / `it-*` |

**Harness change proposal:** **NOT REQUIRED.** Predicates match the frozen harness without code changes.

**Fallback (documented only, not implemented):** If staging overlay were ever insufficient, a separate CHANGE PROPOSAL would be required for non-public SECURITY DEFINER fixture procedures **and** any harness call-site updates — stop and escalate; do not edit the freeze in this pass.

---

## 4. Corrections checklist vs assignment

| # | Required correction | R1 disposition |
|---|---------------------|----------------|
| 1 | Fixture RLS compatibility | Policies + column grants; no BYPASSRLS |
| 2 | Meaningful fixture verification | §D transactional positive/negative tests; `WHERE FALSE` removed |
| 3 | Role membership options | §A.0 version discovery; PG16+ `INHERIT FALSE, SET TRUE, ADMIN FALSE`; inspect before grant; drop optional `scs_owner_admin` SET ROLE membership |
| 4 | Credential handling | Removed executable password placeholders; §B.5 Owner-only provisioning |
| 5 | Execution order + cleanup | Phases 0–9; stop conditions; partial-failure recovery; §F teardown |
| 6 | Freeze + documentation | R1 MD+PDF set; prior G2 docs retained; packet manifest (not 59-file freeze) |

---

## 5. Deliverables produced (R1)

| Document | Path |
|----------|------|
| Implementation Preparation Report | `qa-m6b/M7B-G2-R1-IMPLEMENTATION-PREPARATION-REPORT-20261124.md` (+ PDF) |
| SQL Execution Packet (authoritative) | `qa-m6b/M7B-G2-R1-SQL-EXECUTION-PACKET-20261124.md` (+ PDF) |
| Owner Walkthrough | `qa-m6b/M7B-G2-R1-OWNER-WALKTHROUGH-20261124.md` (+ PDF) |
| Correction Report | `qa-m6b/M7B-G2-R1-CORRECTION-REPORT-20261124.md` (+ PDF) |
| Execution Packet Manifest | `qa-m6b/M7B-G2-R1-EXECUTION-PACKET-MANIFEST-20261124.md` (+ PDF) |
| Staging fixture SQL overlay | `qa-m6b/M7B-G2-R1-staging-fixture-rls-policies-20261124.sql` |

**Historical G2 packets retained (unchanged):**

- `M7B-G2-SQL-EXECUTION-PACKET-20261124.md`
- `M7B-G2-OWNER-WALKTHROUGH-20261124.md`
- `M7B-G2-IMPLEMENTATION-PREPARATION-REPORT-20261124.md`
- `M7B-G2-EXECUTION-READINESS-PROCEDURE-20261124.md`
- related G2 PDFs under `qa-m6b/pdf/`

---

## 6. Unresolved dependencies / authorization still required

| Item | Status |
|------|--------|
| Owner written `A-SQL` (staging) | **Required** before any §B/§D/§F SQL |
| Owner password provisioning (§B.5) | **Required** before login probes / harness |
| Owner written `A-DEP` | If `pg` / tools missing for harness |
| Owner written `A-DBTEST` | Before real-PG cases 1–13 |
| Live PG version on `scs-staging` | Discovered at §A.0 apply time (packet branches 15 vs 16+) |
| Provider-managed `anon`/`authenticated` membership grantability | Verified only at §A.3/§B.2 apply time |
| G3 Netlify deploy | Out of scope; not authorized |
| Production | **HOLD** |
| Case 14 hosted Auth / AAL2 | Remains NOT RUN (G4) |

---

## 7. Authorization boundary confirmation (this pass)

| Action | This R1 pass |
|--------|----------------|
| SQL execution / DB connection | **NOT DONE** |
| Credential access / secret capture | **NOT DONE** |
| Package installation | **NOT DONE** (PDF converter uses existing local tooling only) |
| Frozen candidate / harness / app edits | **NOT DONE** |
| Git operations | **NOT DONE** |
| Deploy | **NOT DONE** |
| Production | **HOLD** |

**STOP for Atlas/Codex review.** G2 SQL remains unauthorized.
