# M7B-G2-R2 — Implementation Preparation Report

**Date:** 2026-11-24  
**Milestone:** M7B-G2-R2 Targeted Execution Packet Closure (preparation)  
**Nature:** Preparation only — **no SQL executed, no DB connections, no installs that mutate the freeze, no source freeze changes, no Git, no deploy**  
**Production:** **HOLD**  
**G2 execution:** Awaits separate Owner authorization (`A-SQL`, `A-DEP`, `A-DBTEST`); **G2 mutation authorization remains withheld**  
**Supersedes for apply guidance:** R1 packet set dated 20261124 (R1 and prior G2 files retained as historical — not deleted/overwritten)

---

## 1. Freeze integrity stance (this pass)

| Check | Result |
|-------|--------|
| Authoritative candidate SHA-256 (from accepted freeze) | `3c7cebb3f27ebf55d1d002e2d8c480a451932ff43d1b4f39f579956cb2ad4d0b` |
| Freeze files modified this pass | **NONE** |
| Harness `verify-m7a-r2-postgres-integration-20261123.mjs` | **UNCHANGED** (read-only inspection) |
| `db/bootstrap/*`, `db/migrations/*` | **UNCHANGED** |
| R1 packet artifacts | **RETAINED** (not overwritten) |
| R2 packet manifest vs 59-file freeze | **Separate** — R2 manifest hashes packet docs/SQL only |

**Verdict: frozen 59-file M7B candidate treated as UNTOUCHED. No re-freeze performed or required for documentation corrections.**

Local evidence baseline (from freeze, not re-run): mock/static **265 / 265 PASS**; real-PG **NOT RUN**.

---

## 2. Owner-verified G1 configuration (binding; unchanged)

| Field | Value |
|-------|-------|
| Project | `scs-staging` |
| Organization | Signal Crest Systems LLC |
| Plan | Free |
| Project reference | `kfclinlrzfwodmichmci` |
| Region | East US (Ohio), `us-east-2` |
| Compute | Nano |
| Status | Healthy |
| GitHub | Disconnected |
| Data API | **Disabled** |
| Direct host | `db.kfclinlrzfwodmichmci.supabase.co` |
| Shared pooler host | `aws-1-us-east-2.pooler.supabase.com` |
| Direct port | `5432` |
| Session Pooler port | `5432` |
| Transaction Pooler port | `6543` |
| Database | `postgres` |

G1 configuration review remains **PASS** (Owner-verified). Connectivity remains **NOT RUN**.

---

## 3. R2 assignment coverage map

| # | Finding / item | Where delivered |
|---|----------------|-----------------|
| P1 | PostgreSQL version compatibility | SQL packet §A.0 gate; §B.2 PG16+ only; PG15 bare-GRANT removed |
| P1 | Cross-session fixture visibility | SQL packet §D.0–D.6; Walkthrough §6 |
| P2 | Credential handling | SQL packet §B.5 Dashboard-only; no ALTER ROLE password templates |
| P2 | Fixture isolation | SQL packet isolation table; Walkthrough §0; R2 overlay header comments |
| Atlas | Fresh database preflight | SQL packet §A.4 / §A.5 catalog-guarded `NOT PROVISIONED` |
| — | Freeze preserved; R1 retained | Correction Report §1, §5 |

---

## 4. Exact bootstrap / migration / overlay order

**SOLE DDL executor:** Supabase project administrator (Dashboard SQL Editor with `CREATEROLE`).  
**Do not** use `scs_migration` (NOLOGIN).  
**Do not** use Function runtime URLs for DDL.

| Paste order | Relative path |
|------------:|---------------|
| 1 | `db/bootstrap/001_m7a_r4_role_bootstrap.sql` |
| 2 | `db/migrations/001_m7a_leads_foundation.sql` |
| 3 | `db/migrations/002_m7a_rls_least_privilege.sql` |
| 4 | `db/migrations/003_m7a_retention_procedures.sql` |
| 5 | `db/migrations/004_m7a_counters_idempotency.sql` |
| 6 | `db/migrations/005_m7a_insert_lead_bundle.sql` |
| 7 | `db/migrations/006_m7a_r2_security_hardening.sql` |
| 8 | `db/migrations/007_m7a_r4_security_corrections.sql` |
| 9 | `qa-m6b/M7B-G2-R2-staging-fixture-rls-policies-20261124.sql` |

**Interleaved Owner steps:**

1. §A READ-ONLY discovery (**PG16+ gate** + fresh-DB-safe baseline) before mutating.  
2. After paste-order **1** → optionally §B.3 create `scs_test_admin` (**no password in SQL**).  
3. Paste-order **2–8** as project admin.  
4. §B.2a PG16+ SET ROLE memberships only (required four targets).  
5. §B.5 Owner Dashboard password UI only.  
6. Paste-order **9** fixture policies/grants.  
7. §C READ-ONLY verify + §D cross-session committed-seed tests + cleanup.  
8. Only then (separate `A-DBTEST`) harness cases 1–13.  
9. §F teardown when retiring fixtures / clearing env.

---

## 5. Fixture RLS design summary (unchanged path; isolation clarified)

**Problem:** RLS default-deny on fixture tables; grants alone insufficient.

**R2 fix path:** Retain policies-only staging overlay for `scs_test_admin` aligned to frozen harness predicates (`is_test`, `r4*`/`it-*` keys, outbox→test lead). **No harness change.**

**Isolation disclosure:** prefix / `is_test` predicates are **not** per-run isolation. Mandatory: dedicated staging; synthetic data; serial execution; no concurrent harness; no unrelated matching-prefix rows; baseline + residual checks; explicit §F teardown.

**Rejected:** BYPASSRLS, SUPERUSER, unrestricted admin DML, broad production policies, frozen harness edits, PG15 bare-GRANT workaround.

**Harness CHANGE PROPOSAL:** **Not required** (policies-only path).

---

## 6. Data API disabled — compatibility

**Finding unchanged: COMPATIBLE.** Prefer leave Disabled for staging G2. Functions + `pg` remain the runtime path. RLS still matters for harness `SET ROLE` probes and fixture policies.

---

## 7. Secure credential creation and storage (Owner-only)

**Hard rule:** Never paste passwords, secret URLs, service-role keys, or CA PEMs into chat, tickets, AI context, committed files, SQL history, shell history, or evidence logs.

| Credential | Create how | Store where |
|------------|------------|-------------|
| Project admin | Dashboard Roles UI | Password manager |
| `scs_intake_runtime` / `scs_notify_worker` / `scs_owner_admin` | Dashboard Roles UI | Password manager |
| `scs_test_admin` | Role via §B.3 **without** password literal; password via §B.5 Dashboard UI | Password manager; staging-only |

**Removed in R2:** executable-looking `ALTER ROLE … PASSWORD` templates.  
**If Dashboard UI unavailable:** identify secure provider-native provisioning as a **separate authorized prerequisite** — do not fall back to packet password SQL.

**Process-scoped harness env names only:**  
`SCS_AUTHORIZE_REAL_PG_TESTS`, `DATABASE_PROJECT_ADMIN_URL`, `DATABASE_INTAKE_URL`, `DATABASE_NOTIFY_URL`, `DATABASE_OWNER_URL`, `DATABASE_TEST_ADMIN_URL`, optional CA path vars.  
**Must be unset:** `DATABASE_MIGRATION_URL`.

---

## 8. Membership options (PostgreSQL 16+ only)

1. Discover `server_version_num` (§A.0).  
2. If `< 160000`: **STOP G2** — separately reviewed compatibility design required.  
3. Inspect existing `pg_auth_members` (§A.3) — do not blindly alter provider-managed edges; do not change project-admin inheritance attributes.  
4. Grant with `INHERIT FALSE, SET TRUE, ADMIN FALSE` for **required** targets: `scs_intake_runtime`, `scs_notify_worker`, `anon`, `authenticated`.  
5. **Omit** optional `scs_owner_admin` membership — harness uses `DATABASE_OWNER_URL` login.  
6. Verify membership options + live `SET ROLE` probes (§B.2c).

**R2 removal:** executable PG15 bare-GRANT branch (§B.2b in R1).

---

## 9. Cross-session §D design (R2)

1. Baseline residual check.  
2. Admin seeds uniquely tagged synthetic rows → **COMMIT**.  
3. Independent `scs_test_admin` login verifies visibility.  
4. Fixture mutations in rollback transactions with positive/negative rowcounts.  
5. Expected denials isolated via separate transactions/savepoints.  
6. Admin cleans committed seeds → verify zero residual + dependents.  
7. Interrupted-test recovery documented.

Seed SQL validated against migrations 001/004/005/006 (read-only; not executed).

---

## 10. Real-PG cases 1–13 (NOT executed)

**Harness:** `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs` (frozen)  
**Auth:** `A-DEP` (if needed), `A-SQL` preflight PASS, `A-DBTEST`

| Case | Fixture need under R2 |
|-----:|------------------------|
| 2 | Policy allows `r4warm*` idempotency UPDATE |
| 5 | Policy allows `r4del*` marker INSERT/UPDATE |
| 9 | Policy allows outbox UPDATE for `is_test` lead |
| 13 | Policy allows `is_test` lead `deleted_at` UPDATE |
| 14 | NOT RUN (G4) |

---

## 11. Pooler hostname

Use Owner-verified **`aws-1-us-east-2.pooler.supabase.com`**. Docs `aws-0-…` remains illustrative only.

---

## 12. Authorization boundary confirmation

| Action | This preparation pass |
|--------|------------------------|
| SQL execution / DB connection | **NOT DONE** |
| Credential access | **NOT DONE** |
| Frozen source / harness changes | **NOT DONE** |
| Git / deploy | **NOT DONE** |
| Production | **HOLD** |
| G2 SQL apply / mutation auth | **Withheld — awaits `A-SQL`** |

---

## 13. Related artifacts

- Authoritative SQL: `qa-m6b/M7B-G2-R2-SQL-EXECUTION-PACKET-20261124.md`  
- Walkthrough: `qa-m6b/M7B-G2-R2-OWNER-WALKTHROUGH-20261124.md`  
- Corrections: `qa-m6b/M7B-G2-R2-CORRECTION-REPORT-20261124.md`  
- Packet SHA-256 manifest: `qa-m6b/M7B-G2-R2-EXECUTION-PACKET-MANIFEST-20261124.md`  
- Overlay SQL: `qa-m6b/M7B-G2-R2-staging-fixture-rls-policies-20261124.sql`  
- Historical R1 (retained): `qa-m6b/M7B-G2-R1-*`  
- Freeze: `qa-m6b/M7B-AUDIT-SNAPSHOT-MANIFEST-20261124.md`
