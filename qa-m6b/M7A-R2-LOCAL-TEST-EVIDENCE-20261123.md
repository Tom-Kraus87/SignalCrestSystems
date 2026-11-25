# M7A-R2 — Local Test Evidence

**Date:** 2026-11-23  
**Harness:** `qa-m6b/verify-m7a-secure-leads-20261123.mjs`  
**Result:** **172 / 172 PASS**  
**Prior R1 baseline:** 125 checks (preserved and extended; not replaced)

## Evidence classes

| Class | What it proves | Result |
|-------|----------------|--------|
| (1) Static source inspection | Migrations, TLS source, form clients, `.env.example`, legacy pointer | PASS (in harness) |
| (2) Mock application tests | Validation, idempotency, rate-order, headers, Turnstile, worker simulation | **172/172 PASS** |
| (3) Real PostgreSQL integration | Live migrate/grants/RLS/`received_at` | **NOT RUN** — suite prepared |
| (4) Hosted staging tests | Secret isolation, Netlify IP, provider wiring | **NOT RUN** |

## Real PostgreSQL limitation

Local PostgreSQL was unavailable. Docker start / software install were **forbidden** without Owner approval.  
Prepared executable suite: `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs`  
Skip artifact: `qa-m6b/M7A-R2-POSTGRES-INTEGRATION-SKIP-20261123.json`

**Mock PASS is not database integration evidence.**

## R2 targeted coverage (additive)

- A1: `sslmode=disable` / `require` flagged; prod-like SSL disable rejected; verified TLS options
- A2/A3: migration 006 role/grant/search_path/CREATE revoke static checks
- A4: legacy procedure has no `CREATE FUNCTION`
- A5: required idempotency key; durable `receivedAt` after cache expiry; rate-order cache replay
- A6: Netlify IP preference; XFF ignored when hosted; `isTest` stripped in staging-like
- A7: deletion marker blocks replay; purge clears outbox
- B: Turnstile required fail-closed; notify modes; simulated worker claim without PII

## Machine JSON

- `qa-m6b/M7A-LOCAL-TEST-RESULTS-20261123.json` — 172/172
- `qa-m6b/M7A-OWNER-LOCAL-TEST-RESULTS-20261123.json` — mirror

## Frontend preservation (spot-checked via harness)

Project-request / contact still post `/api/leads` with idempotency; Advisor Phase A semantics preserved in suite. No Software Factory changes.
