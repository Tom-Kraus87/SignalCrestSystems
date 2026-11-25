# M7B — Local Test Evidence (Pre-Execution Corrections)

**Date:** 2026-11-24  
**Freeze:** 2026-11-24T05:14:22Z  
**Evidence class legend:** (1) mock/static local · (2) real PostgreSQL · (3) hosted Auth/AAL2

## (1) Mock / static local — EXECUTED

| Suite | Result | Artifact |
|-------|--------|----------|
| Secure leads + M7B targeted checks | **265 / 265 PASS** | `qa-m6b/M7B-LOCAL-TEST-RESULTS-20261124.json` |
| Migration executor static | **PASS** (0 SQL) | `qa-m6b/M7B-MIGRATION-EXECUTOR-STATIC-20261124.json` |
| Theme / studio / forms static | PASS markers | `qa-m6b/_m7a-static-check.mjs` stdout |

### M7B-targeted checks included (subset)

- mixed-alias `sslmode`+`ssl-mode` rejection
- `ssl-mode=verify-full` positive parse
- harness rejects `DATABASE_MIGRATION_URL` presence
- harness requires exclusive `DATABASE_PROJECT_ADMIN_URL`
- fixture identity `scs_test_admin` + min-privilege documentation
- harness CA/TLS alignment (no `connectionString`)
- case 14 remains hosted-auth NOT RUN class
- Windows `psql` + Netlify CLI pin procedure docs present

## (2) Real PostgreSQL — NOT RUN

| Suite | Result | Artifact |
|-------|--------|----------|
| Cases 1–13 | **NOT RUN** | `qa-m6b/M7B-POSTGRES-INTEGRATION-NOT-RUN-20261124.json` |

Authorization flag `SCS_AUTHORIZE_REAL_PG_TESTS` was **not** set. No DB connection attempted.

Historical R4/R6/R7 NOT RUN JSON preserved unchanged.

## (3) Hosted Auth / AAL2 — NOT RUN

| Case | Result |
|------|--------|
| 14 — Genuine hosted Supabase Auth + AAL2 | **NOT RUN** (requires separate `SCS_AUTHORIZE_HOSTED_AUTH_TESTS`) |

Simulated JWT `set_config` (case 8) is **not** hosted Auth evidence.

## Production

**HOLD**
