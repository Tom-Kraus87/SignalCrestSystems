# M7A — Secure Backend Foundation and Lead Intake

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot` (confirmed)  
**Owner authorization:** RECEIVED — Supabase PostgreSQL · Netlify Functions · Future Auth · static frontend  
**Production release:** **HOLD**  
**This pass:** Local implementation only — **STOP for Atlas and Owner review**  
**Git:** No commit, push, or deployment performed

---

## Objective

Prepare a reusable secure lead-intake foundation for future AI Advisor Phase B and private owner dashboard, while eliminating public Netlify Forms bypass of server validation — under **Postgres-first cost optimization** (no Redis).

## What shipped (local)

| Area | Status |
|------|--------|
| `POST /api/leads` Netlify Function + shared libs | Implemented (mock persistence) |
| Strict schema, size limits, consent, privacy version | Implemented |
| Server-generated `receivedAt`, sensitive-info reject | Implemented (heuristic — not complete credential detection) |
| Rate-limit + idempotency interfaces | Implemented (in-memory local; Postgres adapters stubbed) |
| Postgres schema + RLS + retention **drafts** | `001`–`003` — **not executed** |
| Postgres counters / idempotency tables | `004` — **not executed** (overrides Redis) |
| Email notify + spam interfaces | Implemented (Noop / honeypot; vendors unprovisioned) |
| `.env.example` staging vs prod placeholders | Written — no secrets |
| Frontend Forms bypass removed | Done (`data-netlify` removed; client posts `/api/leads`) |
| Advisor Phase A corrections | Done (ARIA group, minimized handoff PII, clear after prefill) |
| Phase B transactional primitives | Code interfaces + in-memory INCR mock (no live AI) |
| Threat model + cost matrix | `M7A-OWNER-THREAT-MODEL-*`, `M7A-OWNER-COST-ESTIMATE-*` |
| Local test harness | **95/95 PASS** |

## Codex P1 blockers — local disposition

1. **Server-side consent** — Required affirmative consent enforced in `validateLeadPayload`; contact form includes consent checkbox.  
2. **Server-side sensitive-info filtering** — Heuristic reject in Function; does **not** claim complete credential detection.  
3. **Privacy/retention ops** — 12-month unconverted draft documented as **PENDING_FINAL_PRIVACY_APPROVAL**.  
4. **Atomic counters** — **PASS design** via Postgres UPSERT (migration `004`); Redis **not** introduced. Blobs RMW still FAIL.

## Key paths

- Endpoint: `netlify/functions/leads.js` + `netlify/functions/_lib/*`  
- Redirect: `netlify.toml` → `/api/leads`  
- Schema drafts: `db/migrations/001`–`004`  
- Insert procedure draft: `db/procedures/m7a_insert_lead_transaction.sql`  
- Client: `script.js`, `project-request.html`, `contact.html`  
- Owner reports: `qa-m6b/M7A-OWNER-*-20261123.md`

## Preservation checks

- 30 themes preserved.  
- Workflow experiences / Solutions Explorer untouched in this pass.  
- Advisor Phase A deterministic disclosure retained.  
- Studio excluded from `dist/`.

## Explicit non-actions

- No Supabase/Netlify/Redis/email/CAPTCHA provisioning  
- No live migrations  
- No real customer submissions  
- No live AI  
- No git commit / push / deploy / DNS / Factory mods

## Readiness

**CONDITIONAL locally** for foundation completeness under Owner-authorized cost rules.  
**PRODUCTION RELEASE: HOLD** pending Atlas/Owner review, privacy final approval, hosted staging verification, and provisioning authorization.
