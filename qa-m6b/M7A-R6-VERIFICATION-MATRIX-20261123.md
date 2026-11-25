# M7A-R6 — Verification Matrix

**Date:** 2026-11-23  
**Audit snapshot:** 2026-11-24T03:57:56Z  
**Mock/static:** **234 / 234 PASS**  
**Real PostgreSQL:** **NOT RUN**  
**Hosted:** **NOT RUN / HOLD**

## Commands executed this pass (authorized local only)

| Command | Exit | Notes |
|---------|-----:|-------|
| `node qa-m6b/verify-m7a-secure-leads-20261123.mjs` | 0 | 234/234 |
| `node qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs` | 0 | NOT RUN (14 cases) |
| `node db/scripts/m7a-migration-executor-static.mjs` | 0 | PASS; executedSql=false |
| `node qa-m6b/_m7a-static-check.mjs` | 0 | 30 themes; studio excluded |

**Not executed:** `npm ci`, `npm install`, any SQL, deploy, git commit/push.

## Evidence classes

| Class | Result | Claim |
|-------|--------|-------|
| (1) Static source / config | PASS | Local only |
| (2) Mock / in-memory | PASS (234) | Local only |
| (3) Real PostgreSQL | **NOT RUN** | Must not be reported as passed |
| (4) Hosted Netlify / Supabase Auth | **NOT RUN** | Must not be reported as passed |

## Methodology corrections (R5-C)

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Concurrent conflicting payloads | Mock `Promise.all`; PG case 4 `Promise.allSettled` + identical positive control | Local PASS / PG NOT RUN |
| Separate simulated JWT vs hosted Auth AAL2 | Case 8 = simulated `set_config`; case 14 = hosted Auth always NOT RUN | Separated |
| Actual notification handler auth | `notify-worker.exports.handler` missing/incorrect/correct | Local PASS |
| Unauthorized cannot initiate DB claims | Unauthorized stays 4xx; not 503 from DB client path | Local PASS |
| Rate-limit fixture isolation | Unique emails + `reset()` + uncontaminated positive control | Local PASS |
| `createPgQueryClient` TLS + identity | Insecure TLS / admin / test-admin reject; effective identity + positives | Local PASS |
| Positive controls on rejection tests | Present on conflict, rate-limit, handler, identity | Local PASS |
| Historical NOT RUN preserved | R4 JSON untouched; R6 NOT RUN written separately | Preserved |

## Real PostgreSQL case register (NOT RUN)

| ID | Name | Status |
|----|------|--------|
| 1 | Runtime identities and effective grants | NOT RUN |
| 2 | Warm-cache and cold-cache idempotency | NOT RUN |
| 3 | Concurrent same-key submissions | NOT RUN |
| 4 | Concurrent conflicting payloads | NOT RUN |
| 5 | Deleted-key replay with cached receipts | NOT RUN |
| 6 | Role-bootstrap failure conditions | NOT RUN |
| 7 | TLS certificate and hostname rejection | NOT RUN |
| 8 | Simulated JWT claims owner allowlist (set_config) — not hosted Auth | NOT RUN |
| 9 | Expired and reclaimed worker leases | NOT RUN |
| 10 | Unauthorized notification invocation | NOT RUN |
| 11 | Missing hosted IP-hash salt | NOT RUN |
| 12 | Administrative runtime credential rejection | NOT RUN |
| 13 | Retention purge and outbox foreign keys | NOT RUN |
| 14 | Genuine hosted Supabase Auth + AAL2 verification | NOT RUN (hosted-auth class) |

Historical record: `qa-m6b/M7A-R4-POSTGRES-INTEGRATION-NOT-RUN-20261123.json`  
Current R6 record: `qa-m6b/M7A-R6-POSTGRES-INTEGRATION-NOT-RUN-20261123.json`

## Hosted verification prerequisites (exact)

1. Owner authorizes isolated staging project (separate from production).  
2. Apply bootstrap + migrations 001–007 as project admin (see executor doc).  
3. Create `scs_test_admin` for fixtures; set passwords out of band.  
4. Configure Netlify context secrets: intake / notify URLs, salts, `NOTIFY_WORKER_INVOKE_SECRET`.  
5. Deploy uses `npm ci --prefix netlify/functions && node scripts/build-public.mjs`; confirm Functions log installs `pg@8.13.1`.  
6. Set `SCS_AUTHORIZE_REAL_PG_TESTS=true` with four DB URLs; run PG harness.  
7. Separately authorize hosted Auth: `SCS_AUTHORIZE_HOSTED_AUTH_TESTS=true` with live AAL2 session for case 14.  
8. Production remains HOLD until staging acceptance + Codex clearance.

**Mock PASS is not database integration evidence.**
