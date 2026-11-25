# M7A — Owner Authorization Implementation (extend pass)

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot`  
**Authorization:** Owner APPROVED architecture (Supabase PostgreSQL · Netlify Functions · Future Supabase Auth · static frontend)  
**Scope:** Local implementation + mocked testing only  
**STOP:** Atlas and Owner review — no provisioning / commit / deploy

---

## Already done (prior M7A pass) — preserved

| Deliverable | Path / evidence |
|-------------|-----------------|
| `POST /api/leads` Function + shared libs | `netlify/functions/leads.js`, `_lib/*` |
| Server consent + privacy version allowlist | `schema.js`, `privacy.js`, contact + project-request forms |
| Server sensitive-info heuristic filter | `sensitive.js` |
| Legacy Netlify Forms bypass removed | No `data-netlify`; client `fetch("/api/leads")` |
| Migrations 001–003 + insert RPC draft | `db/migrations/*`, `db/procedures/*` |
| Local harness | `qa-m6b/verify-m7a-secure-leads-20261123.mjs` (was 76/76; now **95/95**) |
| Endpoint contract, bypass evidence, prior reports | `qa-m6b/M7A-*-20261123.md` |

## Extended in this Owner-authorization pass

| Extension | Why |
|-----------|-----|
| **Postgres counters / idempotency tables** (`004_m7a_counters_idempotency.sql`) | Cost optimization: atomic INCR/UPSERT in Postgres — **overrides prior Redis recommendation** |
| **Postgres adapter stubs** (`postgres-adapters.js`) | Provider-independent repository / rate-limiter / counter seams |
| **Email notify + spam interfaces** (`notify.js`, `spam-protection.js`) | Interfaces without provisioning external services |
| **Wired optional notifier / spam protector** into `process-lead.js` / `leads.js` | Ready for Noop → Mock → vendor |
| **`.env.example`** | PLACEHOLDERS ONLY; staging vs production separation documented |
| **12-month unconverted retention draft** | `purge_unconverted_leads` marked **PENDING_FINAL_PRIVACY_APPROVAL** |
| **Threat model, cost matrix, provisioning instructions, readiness** | New `M7A-OWNER-*` reports below |
| **Docs override Redis** | Comments + provisioning docs prefer Postgres |

## Redis avoided?

**YES.** Redis / Upstash are explicitly **not** introduced. Counters, rate limits, idempotency, consent, and leads all target **PostgreSQL transactional operations**. Redis remains a future upgrade option only if a measured requirement appears (see cost matrix upgrade triggers).

## 12-month retention status

| Item | Status |
|------|--------|
| Proposed: unconverted leads **12 months** (365 days) | Documented in SQL + privacy matrix |
| Marker | **PENDING_FINAL_PRIVACY_APPROVAL** |
| Operational verification | **OPEN** — not scheduled for production |
| Soft-delete hard purge / test-row purge | Draft defaults remain; Owner must confirm |

## Release blockers — local disposition

| Blocker | Local status |
|---------|--------------|
| Server-enforced consent | **PASS** |
| Server-side sensitive-information filtering | **PASS** (heuristic; completeness not claimed) |
| Legacy Netlify Forms bypass | **PASS** (source eliminated) |
| Operational privacy / retention (12-month draft) | **PASS locally as draft** — **PENDING_FINAL_PRIVACY_APPROVAL** for go-live |

## Explicit non-actions (confirmed)

- No external provisioning (Supabase / Redis / email / CAPTCHA / AI)
- No live DB migrations
- No live AI
- No git commit / push
- No Netlify deploy / DNS / Factory mods

## Key report index (Owner)

1. `M7A-OWNER-COST-ESTIMATE-PROVISIONING-MATRIX-20261123.md` — item 9 matrix + cost estimate  
2. `M7A-OWNER-THREAT-MODEL-20261123.md`  
3. `M7A-OWNER-PROVISIONING-INSTRUCTIONS-20261123.md`  
4. `M7A-OWNER-RELEASE-READINESS-20261123.md`  
5. `M7A-OWNER-LOCAL-TEST-RESULTS-20261123.md`  
6. `M7A-ENDPOINT-CONTRACT-20261123.md` (refreshed)  
7. `M7A-DATABASE-SCHEMA-MIGRATION-DRAFTS-20261123.md` (refreshed)
