# M7B-G2 — Implementation Preparation Report

**Date:** 2026-11-24  
**Milestone:** M7B-G2 Database Initialization Preparation  
**Nature:** Preparation only — **no SQL executed, no DB connections, no installs, no source changes, no Git, no deploy**  
**Production:** **HOLD**  
**G2 execution:** Awaits separate Owner authorization (`A-SQL`, `A-DEP`, `A-DBTEST`)

---

## 1. Freeze integrity verification

| Check | Result |
|-------|--------|
| Authoritative candidate SHA-256 | `3c7cebb3f27ebf55d1d002e2d8c480a451932ff43d1b4f39f579956cb2ad4d0b` |
| Manifest file hash (`M7B-AUDIT-SNAPSHOT-MANIFEST-20261124.md`) | **MATCH** (identical digest) |
| Companion stamp (`_m7b-manifest-file-sha256.txt`) | **MATCH** (same digest; `entries=59`; snapshot `2026-11-24T05:14:22Z`) |
| Per-entry SHA-256 vs `_m7b-manifest-hashes.json` | **59 / 59 PASS** |
| Spot-check bootstrap 001 | PASS |
| Spot-check migration 001 | PASS |
| Spot-check migration 007 | PASS |
| Spot-check real-PG harness | PASS |
| Spot-check `.env.example` | PASS |
| Freeze files modified this pass | **NONE** (read-only verification) |

**Verdict: frozen candidate UNCHANGED. Freeze integrity PASS.**

Local evidence baseline (from freeze, not re-run this pass): mock/static **265 / 265 PASS**; real-PG **NOT RUN**.

---

## 2. Owner-verified G1 configuration (binding; not invented)

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

G1 configuration review: **PASS** (Owner-verified). Actual connectivity remains **NOT RUN**.

---

## 3. Assignment coverage map

| # | Assignment item | Where delivered |
|---|-----------------|-----------------|
| 1 | Freeze recompute / compare / spot-check | This report §1 |
| 2 | Administrator capability preflight queries | SQL packet §A (READ-ONLY) |
| 3 | SET ROLE membership grants (project admin → runtime roles) | SQL packet §B.2 (MUTATING) |
| 4 | Staging-only `scs_test_admin` + fixture permissions | SQL packet §B.3–B.4 (MUTATING) |
| 5 | Bootstrap + migrations 001–007 order | This report §4; SQL packet §B.1; Walkthrough §3 |
| 6 | Ownership / SECURITY DEFINER / RLS / grant verification | SQL packet §C (READ-ONLY after apply) |
| 7 | Disabled Data API compatibility | This report §5 |
| 8 | Secure credential creation/storage (Owner-only) | This report §6; Walkthrough §5 |
| 9 | Real-PG cases 1–13 checklist (commands/env only) | This report §7; Walkthrough §6 |
| 10 | `aws-1` vs docs `aws-0` pooler reconciliation | This report §8 |
| 11 | Owner walkthrough (SQL Editor steps, expect, stop) | `M7B-G2-OWNER-WALKTHROUGH-20261124.md` |

---

## 4. Exact bootstrap and migration execution order

**SOLE executor:** Supabase project administrator (`postgres` / Dashboard SQL Editor with `CREATEROLE`).  
**Do not** use `scs_migration` (reserved **NOLOGIN**).  
**Do not** use Function runtime URLs for DDL.

| Paste order | Relative path | Absolute path |
|------------:|---------------|---------------|
| 1 | `db/bootstrap/001_m7a_r4_role_bootstrap.sql` | `C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\db\bootstrap\001_m7a_r4_role_bootstrap.sql` |
| 2 | `db/migrations/001_m7a_leads_foundation.sql` | `C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\db\migrations\001_m7a_leads_foundation.sql` |
| 3 | `db/migrations/002_m7a_rls_least_privilege.sql` | `C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\db\migrations\002_m7a_rls_least_privilege.sql` |
| 4 | `db/migrations/003_m7a_retention_procedures.sql` | `C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\db\migrations\003_m7a_retention_procedures.sql` |
| 5 | `db/migrations/004_m7a_counters_idempotency.sql` | `C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\db\migrations\004_m7a_counters_idempotency.sql` |
| 6 | `db/migrations/005_m7a_insert_lead_bundle.sql` | `C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\db\migrations\005_m7a_insert_lead_bundle.sql` |
| 7 | `db/migrations/006_m7a_r2_security_hardening.sql` | `C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\db\migrations\006_m7a_r2_security_hardening.sql` |
| 8 | `db/migrations/007_m7a_r4_security_corrections.sql` | `C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC\db\migrations\007_m7a_r4_security_corrections.sql` |

**Interleaved Owner steps (after bootstrap, around migrations):**

1. After paste-order **1** succeeds → optionally create `scs_test_admin` (LOGIN NOINHERIT); password **out of band**.  
2. Apply paste-order **2–8** as the same project admin.  
3. Apply SET ROLE memberships + fixture table grants (SQL packet §B.2–B.4).  
4. Run READ-ONLY verification (§C) and SET ROLE preflight (§A.3–A.5) — **fail closed**.  
5. Only then (separate `A-DBTEST`) set process-scoped env and run harness cases 1–13.

**Forbidden:** fixture grants before tables exist; SET ROLE memberships before bootstrap roles exist; harness before preflight PASS; leaving secrets in User/Machine env or `.env` files.

---

## 5. Data API disabled — compatibility finding

**Finding: COMPATIBLE with G2 design. Prefer leave Disabled for staging G2.**

| Surface | Implication with Data API Disabled |
|---------|--------------------------------------|
| PostgREST (`anon` / `authenticated` REST) | Not exposed for table/RPC HTTP access. G2 does **not** require it. |
| Netlify Functions + `pg` | Intended path. Direct/pooler Postgres URLs with `scs_intake_runtime` / `scs_notify_worker`. Unaffected. |
| SQL Editor / Dashboard | Continues to work (project admin). Primary apply path for this packet. |
| RLS policies on `anon`/`authenticated` | Still applied by migrations 002/007; relevant for harness `SET ROLE anon|authenticated` probes and future G4. Not dependent on Data API being on. |
| G4 hosted Auth (later) | Spec keeps Data API closed for lead tables; Auth sessions are separate. Do not enable Data API solely for G2. |

**Stop condition:** If Owner enables Data API before G2, pause and re-confirm that `anon`/`authenticated` still have **zero** direct lead-table access and no unintended EXECUTE on intake/notify RPCs (SQL packet §C.4). Enabling is **not** required for G2.

---

## 6. Secure credential creation and storage (Owner-only)

**Hard rule:** Never paste passwords, connection strings with secrets, service-role keys, or CA PEMs into chat, tickets, or AI agent context. Agents draft SQL text and checklists only.

| Credential | Create how | Store where | Wire when |
|------------|------------|-------------|-----------|
| Project admin (`postgres`) DB password | Supabase Dashboard → Database settings (reset/set) | Owner password manager only | SQL Editor session / optional `DATABASE_PROJECT_ADMIN_URL` process env for harness |
| `scs_intake_runtime` password | Dashboard role password or `\password` / `ALTER ROLE … PASSWORD` out of band | Password manager | Later Netlify Function secret + harness `DATABASE_INTAKE_URL` |
| `scs_notify_worker` password | Same | Password manager | Later Function + `DATABASE_NOTIFY_URL` |
| `scs_owner_admin` password | Same | Password manager | Harness `DATABASE_OWNER_URL` only (never Function runtime) |
| `scs_test_admin` password | Created with role; set out of band | Password manager; staging-only | Harness `DATABASE_TEST_ADMIN_URL` only |
| Staging CA | Dashboard SSL/CA download (G1) | Trusted machine path (not repo) | Optional `DATABASE_SSL_CA_PATH` / `PGSSLROOTCERT` |

**Do not:** `setx`; User/Machine env UI; PowerShell profile; `.env` / `.env.local` in repo or OneDrive notes; Windows Credential Manager for this gate; commit secrets; put admin / test-admin / owner URLs in Netlify Functions.

**Process-scoped harness env (names only):**  
`SCS_AUTHORIZE_REAL_PG_TESTS`, `DATABASE_PROJECT_ADMIN_URL`, `DATABASE_INTAKE_URL`, `DATABASE_NOTIFY_URL`, `DATABASE_OWNER_URL`, `DATABASE_TEST_ADMIN_URL`, optional `DATABASE_SSL_CA_PATH` / `DATABASE_SSL_CA` / `PGSSLROOTCERT`.  
**Must be unset:** `DATABASE_MIGRATION_URL`. Prefer unset `DATABASE_URL` during harness for clarity.

---

## 7. Real-PG cases 1–13 execution checklist (NOT executed)

**Harness:** `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs`  
**Auth required:** `A-DEP` (if `pg` missing), `A-SQL` (preflight already PASS), `A-DBTEST`  
**Command (when authorized):**

```powershell
node qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs
```

| Case | Name | Env / pools used | Fixture need |
|-----:|------|------------------|--------------|
| 1 | Runtime identities and effective grants | Project admin (`SET ROLE` intake + anon) | — |
| 2 | Warm/cold idempotency | Intake + fixture | `UPDATE idempotency_keys` |
| 3 | Concurrent same-key | Intake | — |
| 4 | Concurrent conflicting payloads | Intake | — |
| 5 | Deleted-key replay | Intake + fixture | `INSERT/UPDATE lead_deletion_markers` |
| 6 | Role-bootstrap failure conditions | Project admin as intake | — |
| 7 | TLS cert/hostname rejection | Local TLS probe (config) | — |
| 8 | Simulated JWT allowlist (`set_config`) — **not** hosted Auth | Project admin + `SET ROLE authenticated` | Admin `INSERT owner_allowlist` |
| 9 | Expired/reclaimed leases | Notify + fixture | `UPDATE notification_outbox` |
| 10 | Unauthorized notify invocation | Local handler + notify env | — |
| 11 | Missing IP-hash salt | Local `hashIp` | — |
| 12 | Administrative runtime credential rejection | Identity asserts + live intake | — |
| 13 | Retention purge / FK | Intake + fixture + admin | `UPDATE leads`; admin purge RPC |
| 14 | Hosted Auth + AAL2 | — | **NOT RUN** (G4 / separate auth) |

**Exit criteria (later):** cases 1–13 PASS; case 14 remains NOT RUN; historical NOT RUN JSON unchanged; env cleared; Production HOLD.

---

## 8. Pooler hostname reconciliation (`aws-1` vs docs `aws-0`)

| Source | What it says |
|--------|----------------|
| Owner-verified G1 | Shared pooler host = **`aws-1-us-east-2.pooler.supabase.com`** |
| `.env.example` / local test fixtures | Illustrative pattern `aws-0-<REGION>.pooler.supabase.com` |
| `pg-client.js` | Accepts host via URL parse + TLS hostname verification; **no** hard allowlist of `aws-0` only |

**Finding: COMPATIBLE.** Use the **actual** G1 host `aws-1-us-east-2.pooler.supabase.com`. Documentation `aws-0-…` is a template example, not a project constraint. Pooler usernames typically embed the project ref (e.g. `postgres.kfclinlrzfwodmichmci` or `scs_intake_runtime.kfclinlrzfwodmichmci`). Transaction mode: port **6543** (+ `pgbouncer=true` when using that URL shape). Session mode: port **5432**. Direct: `db.kfclinlrzfwodmichmci.supabase.co:5432`.

**Prefer for SQL Editor / DDL:** Dashboard SQL Editor (or direct host). Prefer direct or session pooler for `SET ROLE` / multi-statement admin work; transaction pooler can be awkward for role switching.

---

## 9. SQL packet structure (summary)

Deliverable: `qa-m6b/M7B-G2-SQL-EXECUTION-PACKET-20261124.md` (+ PDF).

| Section | Class | Purpose |
|---------|-------|---------|
| **A** | **READ-ONLY** | Admin capability, membership matrix, SET ROLE probes, fixture identity, `scs_migration` NOLOGIN — run before/after mutating steps as labeled; never creates objects |
| **B** | **MUTATING** | Bootstrap/migration paste order pointers; SET ROLE membership `GRANT`s; `CREATE ROLE scs_test_admin`; fixture table grants; password guidance (out of band) |
| **C** | **READ-ONLY** | Ownership, SECURITY DEFINER owners, RLS enabled, effective grants after apply |

Read-only queries are physically separated from all mutating SQL. Do not paste §B until Owner issues `A-SQL` for staging `scs-staging` / `kfclinlrzfwodmichmci`.

---

## 10. Authorization boundary confirmation

| Action | This preparation pass |
|--------|------------------------|
| SQL execution / DB connection | **NOT DONE** |
| Credential access / secret capture | **NOT DONE** |
| Package installation | **NOT DONE** |
| Source changes to frozen candidate / harness / app | **NOT DONE** |
| Git operations | **NOT DONE** |
| Netlify / deploy | **NOT DONE** |
| Production changes | **HOLD** |
| G2 execution | **Awaits separate Owner authorization** |

---

## 11. Related artifacts

- `qa-m6b/M7B-G2-SQL-EXECUTION-PACKET-20261124.md` (+ PDF)  
- `qa-m6b/M7B-G2-OWNER-WALKTHROUGH-20261124.md` (+ PDF)  
- Adapted from: `qa-m6b/M7B-G2-EXECUTION-READINESS-PROCEDURE-20261124.md` (unchanged)  
- Auth matrix: `qa-m6b/M7B-OWNER-AUTHORIZATION-MATRIX-20261124.md`  
- Executor decision: `qa-m6b/M7A-R7-DATABASE-EXECUTOR-DECISION-20261123.md`  
- Freeze: `qa-m6b/M7B-AUDIT-SNAPSHOT-MANIFEST-20261124.md`
