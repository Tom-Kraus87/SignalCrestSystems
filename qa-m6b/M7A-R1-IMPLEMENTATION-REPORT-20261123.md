# M7A-R1 — Backend Security Remediation Implementation Report

**Date:** 2026-11-23  
**Scope:** Local remediation after independent M7A security audit **FAIL**  
**Production release:** **HOLD**  
**Hosted / staging deploy:** **NOT PERFORMED**  
**Git commit / push / Netlify deploy / remote migrations / paid provisioning:** **NOT PERFORMED**

---

## Objective

Resolve locally actionable Codex M7A FAIL findings and prepare the backend for **real isolated staging verification** — without claiming hosted security controls as verified.

## What was fixed (P1–P5)

### P1 — Production dependency wiring
- Added environment-aware factory: `netlify/functions/_lib/deps.js` + `pg-client.js`.
- `leads.js` no longer unconditionally constructs `MockLeadRepository`.
- Mocks only when explicit local mock/test mode **and** not prod-like (`staging` / `production` / Netlify `CONTEXT` / `SCS_DEPENDENCY_MODE=postgres`).
- Staging/production **fail closed** (503 `intake_misconfigured`) when `DATABASE_URL` missing/invalid/`pg` unavailable.
- Implemented production adapters: `PostgresLeadRepository`, `PostgresAtomicCounterStore`, `PostgresRateLimiter`, `PostgresIdempotencyStore`.
- Success receipt requires confirmed `leadId` + `consentId` + `submissionId`.
- Server-only credentials documented; `pg` declared under `netlify/functions/package.json` (not browser).

### P2 — Transactional idempotency
- Mock repository serializes same-key concurrent persists; stores `payload_hash`.
- Identical concurrent same-key → one lead / one receipt.
- Same key + different payload → **409** `idempotency_conflict`.
- Migration `005` moves `insert_lead_bundle` into ordered migrations with advisory xact lock, unique-key handling, atomic lead+consent+submission+`notification_outbox`.
- Response-cache stores fingerprint; conflict checked before replay.
- Concurrent same-key tests added to harness (**PASS**).

### P3 — Database migrations and permissions
- `db/migrations/005_m7a_insert_lead_bundle.sql` is the canonical RPC + outbox + grants draft.
- `REVOKE` from `PUBLIC` / `anon` / `authenticated` on insert RPC; related counter RPCs hardened.
- `SECURITY DEFINER` + `SET search_path = public` retained and reviewed in inventory.
- **Real local PostgreSQL:** unavailable (Docker daemon not running; no `psql` / `DATABASE_URL`). Limitation documented — **mock tests are not DB integration evidence**.

### P4 — Privacy and input handling
- Oversized fields now rejected (`field_too_long`) — **no silent truncation**.
- `project-request.html` no longer claims Netlify Forms pattern; points to secure lead endpoint.
- Consent + privacy-version enforcement preserved.
- Sensitive-data detection remains **best-effort** (not comprehensive secret detection).
- Safe logging unchanged — no bodies / contact details / briefs / credentials in app logs.
- 12-month unconverted retention remains **PENDING_FINAL_PRIVACY_APPROVAL**; no automatic deletion against real data.

### P5 — Infrastructure readiness
- `.env.example` contracts for Supabase Postgres, Netlify Functions, Turnstile, Resend, optional Sentry.
- Turnstile spam protector contract stub (no live activation required for local).
- Encrypted recovery journal + durable notification outbox requirements documented separately — **no near-zero recovery claim**.

## Preservation

- Connected Systems scenarios, Illustrative Workflows, 30 themes, Solutions Explorer, AI Solutions Advisor Phase A — not modified in this pass beyond lead-form copy.
- Transformation Studio remains excluded from public dist build path.
- Software Factory boundaries untouched.

## Local test summary

| Evidence class | Result |
|----------------|--------|
| Mock unit/integration harness | **125/125 PASS** |
| Static source/migration checks (in harness) | PASS |
| Real PostgreSQL migration/grants/RLS | **NOT RUN** — local Postgres unavailable |

## Explicit non-actions

- No external provisioning, paid subscriptions, remote migrations  
- No git commit, push, Netlify deployment, production changes  
- No live AI activation  
- No self-certification of hosted security controls  

## Verdict for Atlas / Codex

**Local remediation COMPLETE for review.**  
**Production remains HOLD.**  
**STOP for Atlas and independent Codex review.**
