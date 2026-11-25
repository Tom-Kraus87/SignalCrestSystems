# M7A-R1 — Local Test Evidence (Mock vs Static vs Real DB)

**Date:** 2026-11-23  
**Harness:** `qa-m6b/verify-m7a-secure-leads-20261123.mjs`  
**Machine result:** **125 / 125 PASS**  
**JSON:** `qa-m6b/M7A-LOCAL-TEST-RESULTS-20261123.json` (also mirrored to owner JSON)

---

## Evidence classes (do not conflate)

| Class | What it proves | What it does **not** prove |
|-------|----------------|----------------------------|
| **Mock** | Application logic with in-memory repository / rate / idempotency | Multi-instance safety, real SQL constraints, live RLS |
| **Static** | Source/migration/HTML/env contract presence and shape | Runtime grants, hosted secret isolation, edge behavior |
| **Real DB** | Migrations, grants, RLS, concurrent unique index under PostgreSQL | — **NOT AVAILABLE THIS PASS** |

---

## Mock evidence (PASS)

- Normal persist → lead + consent + submission + outbox
- Consent / privacy version rejections
- Sensitive heuristic reject
- Oversized body 413; oversized field `field_too_long` (no truncation)
- Idempotent identical replay → same receipt / single lead
- Idempotent different payload → 409 conflict
- **Concurrent same-key** → one lead, one consent, one submission, one outbox, one receipt
- Concurrent distinct keys under rate limit
- Persist failure → safe 500, no partial lead
- Honeypot silent drop; kill switch; rate limit
- Dependency factory mock mode
- Dependency factory staging **fail closed** without `DATABASE_URL`
- Phase B in-memory primitives; PostgresRateLimiter over in-memory counters
- Advisor handoff omits name/email

## Static evidence (PASS)

- No `data-netlify` on contact / project-request; client posts `/api/leads`
- `project-request.html` / `privacy.html` secure-endpoint copy (no Forms-as-primary claim)
- Migrations 001–005 present; 005 has advisory lock, payload_hash, outbox, revokes
- `.env.example` staging/prod split + Turnstile/Resend/Sentry contracts; no live-looking JWTs
- Cost matrix still prefers Postgres over Redis

## Real database evidence

| Item | Status |
|------|--------|
| Local PostgreSQL server | **UNAVAILABLE** |
| Docker Desktop engine | **Not running** (`dockerDesktopLinuxEngine` pipe missing) |
| `psql` on PATH | **Not found** |
| `DATABASE_URL` | **Unset** |
| Migrations applied | **NOT RUN** |
| GRANT/RLS live probes | **NOT RUN** |

**Limitation statement:** Mock and static PASS results are **not** database integration evidence. Staging verification must apply migrations 001–005 on an isolated Supabase project and re-test concurrent idempotency + anon deny paths there.

---

## How to re-run (local)

```bash
node qa-m6b/verify-m7a-secure-leads-20261123.mjs
```

Expected: `ok: true`, `passed` equals `total`, empty `failures`.
