# M7A-R4 — Implementation Report

**Date:** 2026-11-23  
**Audit snapshot timestamp:** 2026-11-24T03:21:43Z  
**Prior R4 freeze (historical):** 2026-11-24T03:09:40Z — preserved at `M7A-R4-AUDIT-SNAPSHOT-MANIFEST-20261123-FROZEN-030940Z.md`  
**Scope:** Narrow correction of Codex M7A-R3 findings R3-01..R3-08 + verification methodology repair + Owner-authorized dependency lockfile completion  
**Backend redesign:** NOT performed  
**Production:** **HOLD**  
**Isolated staging:** **BLOCKED**  
**Git commit / push / deploy / remote migrations / paid provisioning / Docker / live AI:** **NOT PERFORMED**

## Per-finding corrections

### R3-01 — Idempotency cache permissions

| | |
|--|--|
| Status | **CORRECTED LOCALLY** |
| Correction | SECURITY DEFINER `lookup_idempotency_response`; intake table SELECT revoked; expiry/fingerprint/deletion enforced. |
| Affected files | db/migrations/007_m7a_r4_security_corrections.sql; netlify/functions/_lib/postgres-adapters.js |
| Test evidence | Mock/static in 215 suite; PG cases 2/5 NOT RUN |
| Remaining hosted verification | Staging apply 007; probe intake lacks table SELECT |

### R3-02 — Notification worker status

| | |
|--|--|
| Status | **CORRECTED LOCALLY** |
| Correction | Owner-only `notification_outbox_status_counts`; worker EXECUTE revoked; no outbox table SELECT. |
| Affected files | 007 migration; _lib/notify-worker.js |
| Test evidence | Static grants + aggregate helper |
| Remaining hosted verification | Confirm worker cannot EXECUTE status_counts |

### R3-03 — Notification worker invocation

| | |
|--|--|
| Status | **CORRECTED LOCALLY** |
| Correction | Bearer `NOTIFY_WORKER_INVOKE_SECRET` before DB; scheduler headers ignored; live delivery disabled. |
| Affected files | notify-worker.js; _lib/worker-auth.js; .env.example |
| Test evidence | Spoofed header / placeholder secret fail-closed |
| Remaining hosted verification | Hosted 401 without Bearer before DB |

### R3-04 — Expired worker leases

| | |
|--|--|
| Status | **CORRECTED LOCALLY** |
| Correction | claim_token + unexpired lease required; false ack = failure; retries preserved. |
| Affected files | 007 migration; _lib/notify-worker.js |
| Test evidence | False ack / missing token mocks; PG case 9 NOT RUN |
| Remaining hosted verification | Expire/reclaim fencing on staging |

### R3-05 — Role bootstrap

| | |
|--|--|
| Status | **CORRECTED LOCALLY (draft)** |
| Correction | Separate bootstrap fail-closed; 007 aborts without roles; 001–006 preserved. |
| Affected files | db/bootstrap/001_m7a_r4_role_bootstrap.sql; 007 |
| Test evidence | Static prerequisite checks; PG case 6 NOT RUN |
| Remaining hosted verification | Run bootstrap then ordered migrations |

### R3-06 — Administrative database override

| | |
|--|--|
| Status | **CORRECTED LOCALLY** |
| Correction | `SCS_ALLOW_ADMIN_DB_USER` not honored; effective current_user+session_user checked. |
| Affected files | _lib/pg-client.js; .env.example |
| Test evidence | Admin URL/session rejected in mock |
| Remaining hosted verification | Staging Function with postgres URL must fail |

### R3-07 — IP-hash salt

| | |
|--|--|
| Status | **CORRECTED LOCALLY** |
| Correction | No development-salt fallback; missing/invalid → null; never raw IP. |
| Affected files | _lib/process-lead.js; .env.example |
| Test evidence | Missing/placeholder/short/valid salt mocks |
| Remaining hosted verification | Unset salt on staging; confirm no raw IP |

### R3-08 — Dependency reproducibility

| | |
|--|--|
| Status | **CORRECTED LOCALLY** (lockfile generated under Owner network authorization) |
| Correction | Exact `pg@8.13.1` pin + DEPENDENCY-LOCKING.md + legitimate `package-lock.json` (lockfileVersion 3) from `npm install --package-lock-only --ignore-scripts`. Integrity hashes are npm-registry values (not invented). All `resolved` URLs are `https://registry.npmjs.org/`. |
| Affected files | netlify/functions/package.json; package-lock.json; DEPENDENCY-LOCKING.md; harness R3-08 assertions |
| Test evidence | Lockfile presence, `pg@8.13.1` integrity, registry cleanliness in 215 suite |
| Remaining hosted verification | Commit + staging Functions build log confirms install of `pg@8.13.1` from lockfile |


## Verification methodology repair

Repaired `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs`: actual signatures; SET ROLE failure fails; effective role verified; SQLSTATE 42501 only for denial; positive controls; 13 cases prepared — **NOT RUN**.

## Local evidence summary

| Evidence class | Result |
|----------------|--------|
| (1)+(2) Static + mock | **215 / 215 PASS** |
| (3) Real PostgreSQL | **NOT RUN** (13 cases) |
| (4) Hosted | **NOT RUN / HOLD** |

## Dependency lock completion (this pass)

| Item | Value |
|------|-------|
| Command | `cd netlify/functions && npm install --package-lock-only --ignore-scripts` |
| Exit code | 0 |
| Resolved driver | `pg@8.13.1` |
| Lockfile path | `netlify/functions/package-lock.json` |
| Lockfile SHA-256 | `af04592c207523715df668df866bc1fb901b7110d11fb1a90896f7e25e79ad8a` |
| Unexpected deps / registries | **None** (clean) |
| Lifecycle scripts | Not executed (`--ignore-scripts`) |
| `node_modules` created | No (`--package-lock-only`) |

## Regression preservation

30 themes, Connected Systems, Workflows, Solutions Explorer, Advisor Phase A, service/pricing, project-request/contact, Studio exclusion, Software Factory boundaries preserved (`_m7a-static-check.mjs`).

## Forbidden actions confirmation

No external provisioning, paid subscriptions, remote migrations, DNS, deploy, git commit/push, Docker/PostgreSQL install, invented lockfile hashes, retention auto-activation, live AI, or Software Factory modifications.

**Ready for independent Codex re-audit. Production remains HOLD.**
