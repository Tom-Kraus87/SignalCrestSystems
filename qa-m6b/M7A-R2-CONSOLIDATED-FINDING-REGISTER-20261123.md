# M7A-R2 — Consolidated Finding Register

**Date:** 2026-11-23  
**Audit snapshot:** 2026-11-24T02:07:16Z  
**Sources reconciled:** Codex M7A-R1 matrix (`M7A-R1-CODEX-FINDING-RECONCILIATION-20261123.md`) + Claude Final Architecture Reconciliation priorities (A1–A7 / B as authorized by Atlas)  
**Note:** No separate Claude-authored markdown file was present under `qa-m6b/` at R2 time; Claude priorities are taken from the Atlas R2 authorization brief and verified against current source.

**Atlas disposition legend:** `RESOLVED LOCALLY` · `OPEN` · `DEFERRED TO STAGING` · `DEFERRED TO PRODUCTION`  
**Original severity:** preserved from Codex P1–P5 / Claude A/B class (not remapped).

---

## Codex findings (original severity preserved)

| Finding ID | Original severity | Summary | Atlas disposition | Notes |
|------------|-------------------|---------|-------------------|-------|
| C-M7A-P1-01 | P1 | Unconditional MockLeadRepository | **RESOLVED LOCALLY** | R1 factory; preserved |
| C-M7A-P1-02 | P1 | Postgres repository not implemented | **RESOLVED LOCALLY** (code) / **DEFERRED TO STAGING** (live) | Adapters present; no live DB |
| C-M7A-P1-03 | P1 | Fail-open when DB missing | **RESOLVED LOCALLY** | Fail closed 503 |
| C-M7A-P1-04 | P1 | Success without confirmed persistence | **RESOLVED LOCALLY** | Requires lead/consent/submission + receivedAt |
| C-M7A-P1-05 | P1 | Credentials server-only | **RESOLVED LOCALLY** (design) / **DEFERRED TO STAGING** | Hosted secret isolation unproven |
| C-M7A-P2-01 | P2 | Concurrent same-key race | **RESOLVED LOCALLY** (mock) / **DEFERRED TO STAGING** | Advisory lock in 005/006 |
| C-M7A-P2-02 | P2 | Same key different payload | **RESOLVED LOCALLY** (mock) / **DEFERRED TO STAGING** | 409 conflict |
| C-M7A-P2-03 | P2 | Non-atomic multi-table write | **RESOLVED LOCALLY** (mock) / **DEFERRED TO STAGING** | RPC atomic + outbox |
| C-M7A-P3-01 | P3 | Lead RPC not in ordered migration | **RESOLVED LOCALLY** | 005 + 006 sequence |
| C-M7A-P3-02 | P3 | Least-privilege grants incomplete | **RESOLVED LOCALLY** (draft) / **DEFERRED TO STAGING** | Executable grants to `scs_*` |
| C-M7A-P3-03 | P3 | SECURITY DEFINER / search_path | **RESOLVED LOCALLY** (draft) / **DEFERRED TO STAGING** | `pg_catalog, public` |
| C-M7A-P3-04 | P3 | RLS unverified on real Postgres | **DEFERRED TO STAGING** | Local PG unavailable |
| C-M7A-P4-01 | P4 | Silent field truncation | **RESOLVED LOCALLY** | R1 |
| C-M7A-P4-02 | P4 | Outdated Netlify Forms copy | **RESOLVED LOCALLY** | R1 |
| C-M7A-P4-03 | P4 | Consent / privacy enforcement | **RESOLVED LOCALLY** | Preserved |
| C-M7A-P4-04 | P4 | Sensitive detection overclaimed | **RESOLVED LOCALLY** | Honest best-effort |
| C-M7A-P4-05 | P4 | PII in logs | **RESOLVED LOCALLY** | safe-log |
| C-M7A-P4-06 | P4 | Retention auto-deletion risk | **DEFERRED TO PRODUCTION** | PENDING_FINAL_PRIVACY_APPROVAL |
| C-M7A-P5-01 | P5 | Incomplete infra contracts | **RESOLVED LOCALLY** (contracts) / **OPEN** (provision) | `.env.example` R2 |
| C-M7A-P5-02 | P5 | Recovery/outbox near-zero claims | **RESOLVED LOCALLY** (honesty) / **OPEN** | Journal gated; outbox worker local only |
| C-M7A-NET-01 | Ops | Netlify Pro auto-recharge | **RESOLVED LOCALLY** | Owner documented DISABLED |
| C-M7A-NET-02 | Ops | Log retention / staging isolation | **OPEN** | Hosted verification |

## Claude / Atlas A–B priorities (original class preserved)

| Finding ID | Original class | Summary | Atlas disposition | Evidence |
|------------|----------------|---------|-------------------|----------|
| CL-A1 | A mandatory | Verified Postgres TLS; no `rejectUnauthorized:false` | **RESOLVED LOCALLY** | `pg-client.js` + negative tests |
| CL-A2 | A mandatory | Restricted intake runtime identity | **RESOLVED LOCALLY** (draft) / **DEFERRED TO STAGING** | roles + `DATABASE_INTAKE_URL` |
| CL-A3 | A mandatory | Executable grants + DEFINER hardening | **RESOLVED LOCALLY** (draft) / **DEFERRED TO STAGING** | migration 006 |
| CL-A4 | A mandatory | Legacy SQL elimination | **RESOLVED LOCALLY** | procedure pointer only |
| CL-A5 | A mandatory | Durable idempotency + rate-order | **RESOLVED LOCALLY** (mock) / **DEFERRED TO STAGING** | received_at + cache-miss tests |
| CL-A6 | A mandatory | Trusted request metadata / test flags | **RESOLVED LOCALLY** | `request-meta.js` tests |
| CL-A7 | A mandatory | Retention/outbox FK + deletion markers | **RESOLVED LOCALLY** (draft) / **DEFERRED TO PRODUCTION** (auto purge) | purge order + markers; privacy hold |
| CL-B-TURN | B required | Turnstile fail-closed when required | **RESOLVED LOCALLY** (code) / **DEFERRED TO STAGING** | no live activation |
| CL-B-NOTIFY | B required | Durable notify worker + modes | **RESOLVED LOCALLY** (code) / **DEFERRED TO STAGING** | claim/lease; simulated only |
| CL-B-RECOVERY | B gated | Encrypted recovery journal | **DEFERRED TO PRODUCTION** | explicitly not implemented |

## Status counts (Atlas dispositions)

| Disposition | Count |
|-------------|------:|
| RESOLVED LOCALLY | 24 |
| OPEN | 3 |
| DEFERRED TO STAGING | 12 |
| DEFERRED TO PRODUCTION | 3 |

*Some rows carry dual dispositions (code vs hosted). Counts above treat the primary Atlas handoff status; dual-tagged rows are counted once at the most-advanced local resolution with staging/prod deferrals listed separately in the table.*

**Dual-tag clarification for reviewers:** 24 findings have a completed local remediation component; 12 still require staging execute/verify; 3 remain production/policy gated; 3 are open ops/provision items.

## Independent re-audit ask

Codex / Claude should re-verify with emphasis on: verified TLS fail-closed, intake role (not `postgres`), live grant/RLS probes, durable `received_at` under real Postgres, spoofed header/`isTest` resistance, outbox purge order, and Turnstile/notify **without** treating mock harness results as DB integration evidence.

**Production: HOLD.**
