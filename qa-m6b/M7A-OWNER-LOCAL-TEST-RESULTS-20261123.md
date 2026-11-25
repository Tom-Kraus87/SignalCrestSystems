# M7A / M7A-R1 — Owner Local Test Results

**Date:** 2026-11-23  
**Harness:** `qa-m6b/verify-m7a-secure-leads-20261123.mjs`  
**Result:** **125 / 125 PASS** (0 failures)

---

## Score

| Metric | Value |
|--------|-------|
| Total checks | 125 |
| Passed | 125 |
| Failed | **0** |

JSON: `M7A-OWNER-LOCAL-TEST-RESULTS-20261123.json` / `M7A-LOCAL-TEST-RESULTS-20261123.json`

---

## Coverage highlights (M7A-R1 additions)

- Concurrent same-key idempotency (single lead + single receipt + outbox)
- Idempotency payload conflict → 409
- Oversized field rejection (`field_too_long`)
- Dependency factory mock vs staging fail-closed
- Migration 005 static presence (insert_lead_bundle, grants, outbox)
- Project-request copy no longer claims Netlify Forms

## Prior coverage retained

- Consent / privacy version / sensitive heuristic
- Bypass elimination (no `data-netlify`; `/api/leads`)
- Rate limit, honeypot, kill switch
- Advisor Phase A handoff PII minimization
- Phase B in-memory primitives
- Postgres-shaped rate limiter over in-memory counters

---

## Evidence classification

| Class | Status |
|-------|--------|
| Mock application tests | PASS |
| Static source/migration/env checks | PASS |
| Real PostgreSQL integration | **NOT RUN** — local Postgres unavailable |

**Do not treat this suite as hosted or database integration certification.**

Production remains **HOLD**.
