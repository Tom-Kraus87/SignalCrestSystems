# M7B-G2-R1 — Implementation Preparation Report

**Date:** 2026-11-24  
**Milestone:** M7B-G2-R1 Execution Packet Corrections (preparation)  
**Nature:** Preparation only — **no SQL executed, no DB connections, no installs that mutate the freeze, no source freeze changes, no Git, no deploy**  
**Production:** **HOLD**  
**G2 execution:** Awaits separate Owner authorization (`A-SQL`, `A-DEP`, `A-DBTEST`)  
**Supersedes for apply guidance:** G2 preparation report / SQL packet / walkthrough dated 20261124 (those files retained as historical)

---

## 1. Freeze integrity stance (this pass)

| Check | Result |
|-------|--------|
| Authoritative candidate SHA-256 (from accepted freeze) | `3c7cebb3f27ebf55d1d002e2d8c480a451932ff43d1b4f39f579956cb2ad4d0b` |
| Freeze files modified this pass | **NONE** |
| Harness `verify-m7a-r2-postgres-integration-20261123.mjs` | **UNCHANGED** (read-only inspection) |
| `db/bootstrap/*`, `db/migrations/*` | **UNCHANGED** |
| R1 packet manifest vs 59-file freeze | **Separate** — R1 manifest hashes packet docs/SQL only |

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

## 3. R1 assignment coverage map

| # | Assignment item | Where delivered |
|---|-----------------|-----------------|
| 1 | Fixture RLS compatibility (Codex P1) | SQL packet §B.4 + `M7B-G2-R1-staging-fixture-rls-policies-20261124.sql`; Correction Report §2–3 |
| 2 | Meaningful fixture verification | SQL packet §D (transactional mutation tests) |
| 3 | Role membership options + version discovery | SQL packet §A.0, §A.3, §B.2a/b/c |
| 4 | Credential handling | SQL packet §B.3 / §B.5; Walkthrough §5 |
| 5 | Execution order + cleanup | SQL packet phases 0–9; §F; stop + recovery tables |
| 6 | Revised R1 docs + PDFs + packet manifest | This report + sibling R1 artifacts |
| — | Freeze preserved; historical G2 docs retained | Correction Report §1, §5 |

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
| 9 | `qa-m6b/M7B-G2-R1-staging-fixture-rls-policies-20261124.sql` |

**Interleaved Owner steps:**

1. §A READ-ONLY discovery (version, memberships, identity) before mutating.  
2. After paste-order **1** → optionally §B.3 create `scs_test_admin` (**no password in SQL**).  
3. Paste-order **2–8** as project admin.  
4. §B.2 version-aware SET ROLE memberships (required four targets only).  
5. §B.5 Owner-only passwords.  
6. Paste-order **9** fixture policies/grants.  
7. §C READ-ONLY verify + §D transactional fixture tests (`ROLLBACK`).  
8. Only then (separate `A-DBTEST`) harness cases 1–13.  
9. §F teardown when retiring fixtures / clearing env.

---

## 5. Fixture RLS design summary (P1)

**Problem:** RLS default-deny on fixture tables; G2 grants alone insufficient; `WHERE FALSE` smoke inadequate.

**R1 fix:** Narrow staging policies + column grants for `scs_test_admin` aligned to frozen harness predicates (`is_test`, `r4*`/`it-*` keys, outbox→test lead).

**Rejected:** BYPASSRLS, SUPERUSER, unrestricted admin DML, broad production policies, frozen harness edits.

**Harness CHANGE PROPOSAL:** **Not required** (policies-only path).

---

## 6. Data API disabled — compatibility

**Finding unchanged: COMPATIBLE.** Prefer leave Disabled for staging G2. Functions + `pg` remain the runtime path. RLS still matters for harness `SET ROLE` probes and fixture policies.

---

## 7. Secure credential creation and storage (Owner-only)

**Hard rule:** Never paste passwords, secret URLs, service-role keys, or CA PEMs into chat, tickets, AI context, committed files, or evidence logs.

| Credential | Create how | Store where |
|------------|------------|-------------|
| Project admin | Dashboard | Password manager |
| `scs_intake_runtime` / `scs_notify_worker` / `scs_owner_admin` | Dashboard or private `ALTER ROLE` | Password manager |
| `scs_test_admin` | Role via §B.3 **without** password literal; password via §B.5 | Password manager; staging-only |

**Process-scoped harness env names only:**  
`SCS_AUTHORIZE_REAL_PG_TESTS`, `DATABASE_PROJECT_ADMIN_URL`, `DATABASE_INTAKE_URL`, `DATABASE_NOTIFY_URL`, `DATABASE_OWNER_URL`, `DATABASE_TEST_ADMIN_URL`, optional CA path vars.  
**Must be unset:** `DATABASE_MIGRATION_URL`.

---

## 8. Membership options (PostgreSQL 16+)

1. Discover `server_version_num` (§A.0).  
2. Inspect existing `pg_auth_members` (§A.3) — do not blindly alter provider-managed edges.  
3. If major ≥ 16: `GRANT … TO CURRENT_USER WITH INHERIT FALSE, SET TRUE, ADMIN FALSE` for **required** targets: `scs_intake_runtime`, `scs_notify_worker`, `anon`, `authenticated`.  
4. If major < 16: plain `GRANT` (roles already `NOINHERIT`).  
5. **Omit** optional `scs_owner_admin` membership — harness uses `DATABASE_OWNER_URL` login.  
6. Verify with membership query + live `SET ROLE` probes (§B.2c).

---

## 9. Real-PG cases 1–13 (NOT executed)

**Harness:** `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs` (frozen)  
**Auth:** `A-DEP` (if needed), `A-SQL` preflight PASS, `A-DBTEST`

| Case | Fixture need under R1 |
|-----:|------------------------|
| 2 | Policy allows `r4warm*` idempotency UPDATE |
| 5 | Policy allows `r4del*` marker INSERT/UPDATE |
| 9 | Policy allows outbox UPDATE for `is_test` lead |
| 13 | Policy allows `is_test` lead `deleted_at` UPDATE |
| 14 | NOT RUN (G4) |

---

## 10. Pooler hostname

Use Owner-verified **`aws-1-us-east-2.pooler.supabase.com`**. Docs `aws-0-…` remains illustrative only.

---

## 11. Authorization boundary confirmation

| Action | This preparation pass |
|--------|------------------------|
| SQL execution / DB connection | **NOT DONE** |
| Credential access | **NOT DONE** |
| Frozen source / harness changes | **NOT DONE** |
| Git / deploy | **NOT DONE** |
| Production | **HOLD** |
| G2 SQL apply | **Awaits `A-SQL`** |

---

## 12. Related artifacts

- Authoritative SQL: `qa-m6b/M7B-G2-R1-SQL-EXECUTION-PACKET-20261124.md`  
- Walkthrough: `qa-m6b/M7B-G2-R1-OWNER-WALKTHROUGH-20261124.md`  
- Corrections: `qa-m6b/M7B-G2-R1-CORRECTION-REPORT-20261124.md`  
- Packet SHA-256 manifest: `qa-m6b/M7B-G2-R1-EXECUTION-PACKET-MANIFEST-20261124.md`  
- Historical G2 procedure: `qa-m6b/M7B-G2-EXECUTION-READINESS-PROCEDURE-20261124.md` (retained)  
- Freeze: `qa-m6b/M7B-AUDIT-SNAPSHOT-MANIFEST-20261124.md`
