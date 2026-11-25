# M7B-G2-R4 — Local Regression Evidence

**Date:** 2026-11-24  
**Evidence class legend:** (1) mock/static local · (2) real PostgreSQL · (3) hosted Auth/AAL2  
**Production:** **HOLD**

---

## (1) Mock / static local — EXECUTED

| Suite | Command | Result | Artifact |
|-------|---------|--------|----------|
| R4 independent pool identity | `node qa-m6b/tests/m7b-g2-r4-independent-pool-identity-20261124.mjs` | **21 / 21 PASS** | `M7B-G2-R4-LOCAL-REGRESSION-RESULTS-20261124.json` |
| Secure leads + M7B targeted | `node qa-m6b/verify-m7a-secure-leads-20261123.mjs` | **265 / 265 PASS** | stdout + existing local results path |
| Theme / studio / forms static | `node qa-m6b/_m7a-static-check.mjs` | PASS (30 themes; studio excluded; forms bypass gone) | stdout |
| Migration executor static | `node db/scripts/m7a-migration-executor-static.mjs` | **PASS** (0 SQL; sole executor `project_admin`) | static JSON |

### R4 checks covered (mock doubles)

R1 all-five PASS · R2a–e per-pool auth FAIL · R3 current_user mismatch · R4 session_user mismatch · R5 SET ROLE masquerade · R6 admin without CREATEROLE · R7 notify credentials · R8 zero fixture DML · R9 all pools `end()` · R10 TLS negatives preserved · R11 pooler host · R12 port 6543 · R13 qualified username · R14 cases 1–13 + case 14 class preserved · R15 credential/URL redaction.

**These results are NOT real PostgreSQL evidence.**

---

## (2) Real PostgreSQL — NOT RUN

| Suite | Result | Notes |
|-------|--------|-------|
| Cases 1–13 | **NOT RUN** | `SCS_AUTHORIZE_REAL_PG_TESTS` unset; no DB connect |
| Five-pool preflight against live Path A | **NOT RUN** | Requires `A-DBTEST` + verified TLS + provisioned roles |

Artifact: `qa-m6b/M7B-POSTGRES-INTEGRATION-NOT-RUN-20261124.json`  
Historical R4/R6/R7 NOT RUN JSON: **preserved unchanged**.

---

## (3) Hosted Auth / AAL2 — NOT RUN

| Case | Result |
|------|--------|
| 14 — Genuine hosted Supabase Auth + AAL2 | **NOT RUN** |

Hosted staging: **NOT RUN**.

---

## Commands recorded (local only)

```text
node qa-m6b/tests/m7b-g2-r4-independent-pool-identity-20261124.mjs
node qa-m6b/verify-m7a-secure-leads-20261123.mjs
node qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs
node qa-m6b/_m7a-static-check.mjs
node db/scripts/m7a-migration-executor-static.mjs
```

No `npm install` / `npm ci`. No live DB. No credentials loaded for PostgreSQL.
