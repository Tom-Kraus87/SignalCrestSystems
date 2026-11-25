# M7A-R1 — Codex Finding-by-Finding Reconciliation Matrix

**Date:** 2026-11-23  
**Prior audit verdict:** **FAIL** (independent M7A security audit)  
**This pass:** Local remediation only  
**Note:** No separate Codex report file was present under `qa-m6b/` at remediation time. Finding IDs below are reconstructed from the authorized M7A-R1 FAIL priority list and known local defects. Independent Codex must re-verify.

**Status legend:** `PASS` = locally remediated with mock/static evidence · `DEFERRED` = requires hosted/staging or Owner approval · `FAIL` = still open locally · `OPEN` = pending external verification

| Finding ID | Priority | Summary | Remediation | Local status | Evidence |
|------------|----------|---------|-------------|--------------|----------|
| C-M7A-P1-01 | P1 | Unconditional `MockLeadRepository` in production handler | `deps.js` factory; `leads.js` uses `getLeadDependencies` | **PASS** | Static + factory tests |
| C-M7A-P1-02 | P1 | Postgres repository / counters not implemented for prod path | `postgres-adapters.js` + `pg-client.js` + `package.json` `pg` | **PASS** (code) / **OPEN** (hosted) | Adapter unit contract; no live DB |
| C-M7A-P1-03 | P1 | Fail-open when DB config missing | Staging/prod fail closed → 503 `intake_misconfigured` | **PASS** | Factory fail-closed test |
| C-M7A-P1-04 | P1 | Success receipt without confirmed persistence | Requires lead/consent/submission ids | **PASS** | Persist-unconfirmed guard + failure tests |
| C-M7A-P1-05 | P1 | Production credentials must remain server-only | Server Function + `.env.example`; no browser secrets | **PASS** (design) / **OPEN** (hosted secret isolation) | Static `.env.example` checks |
| C-M7A-P2-01 | P2 | Concurrent same-key race → duplicate leads | Mock key lock; SQL advisory lock + unique key in `005` | **PASS** (mock) / **OPEN** (real DB) | Concurrent same-key tests 125-suite |
| C-M7A-P2-02 | P2 | Same key + different payload not rejected | `payload_hash` + 409 `idempotency_conflict` | **PASS** (mock) / **OPEN** (real DB) | Conflict test |
| C-M7A-P2-03 | P2 | Lead/consent/submission(/outbox) not atomic | Mock stages commit; RPC inserts all four atomically | **PASS** (mock) / **OPEN** (real DB) | Outbox row assertions |
| C-M7A-P3-01 | P3 | Lead RPC not in ordered migration | `005_m7a_insert_lead_bundle.sql` | **PASS** (draft) / **OPEN** (execute) | Static migration checks |
| C-M7A-P3-02 | P3 | Least-privilege grants incomplete | REVOKE PUBLIC/anon/authenticated on RPC + outbox RLS | **PASS** (SQL draft) / **OPEN** (execute) | Migration inventory |
| C-M7A-P3-03 | P3 | SECURITY DEFINER / search_path review | Fixed `search_path=public`; inventory documented | **PASS** (review) / **OPEN** (live verify) | Inventory doc |
| C-M7A-P3-04 | P3 | RLS behavior unverified on real Postgres | Local Postgres unavailable | **DEFERRED** | Limitation documented |
| C-M7A-P4-01 | P4 | Silent field truncation | Reject `field_too_long` | **PASS** | Oversized name/message tests |
| C-M7A-P4-02 | P4 | Outdated Netlify Forms public copy | `project-request.html` hero updated | **PASS** | Static HTML checks |
| C-M7A-P4-03 | P4 | Consent / privacy version enforcement | Preserved in `schema.js` | **PASS** | Existing suite |
| C-M7A-P4-04 | P4 | Sensitive detection overclaimed | Still heuristic / best-effort | **PASS** (honest) | Detector honesty checks |
| C-M7A-P4-05 | P4 | PII/credentials in application logs | `safe-log.js` meta only | **PASS** (code review) | Safe-log module |
| C-M7A-P4-06 | P4 | Retention auto-deletion risk | Remains PENDING_FINAL_PRIVACY_APPROVAL; not activated | **PASS** / **DEFERRED** (policy) | Migration 003 marker |
| C-M7A-P5-01 | P5 | Incomplete infra config contracts | `.env.example` + Turnstile/Resend/Sentry placeholders | **PASS** (contracts) / **OPEN** (provision) | `.env.example` |
| C-M7A-P5-02 | P5 | Recovery/outbox near-zero claims | Outbox table added; recovery journal documented as unproven | **PASS** (docs honesty) / **OPEN** (proof) | Outbox + readiness docs |
| C-M7A-NET-01 | Ops | Netlify Pro auto-recharge status unknown | Owner confirmed **DISABLED AND SAVED** | **PASS** (documented) | Verified-account update |
| C-M7A-NET-02 | Ops | Function log retention / staging / secret isolation | Pending hosted verification | **OPEN** | Staging checklist |

## Aggregate

| Bucket | Count |
|--------|-------|
| Local PASS | 16 |
| DEFERRED (policy / no local PG) | 2 |
| OPEN (hosted / execute / prove) | 8+ overlapping hosted items |
| Local FAIL remaining | **0** identified for authorized local scope |

## Independent re-audit ask

Codex should re-run against this matrix with emphasis on: factory fail-closed paths, concurrent idempotency under real Postgres after authorized migration execute, grant/RLS live verification, and hosted secret isolation — **without treating mock harness results as DB integration evidence**.

**Production: HOLD.**
