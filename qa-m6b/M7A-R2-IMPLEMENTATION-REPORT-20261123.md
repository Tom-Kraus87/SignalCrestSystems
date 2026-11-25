# M7A-R2 — Consolidated Security Hardening Implementation Report

**Date:** 2026-11-23  
**Audit snapshot timestamp:** 2026-11-24T02:07:16Z  
**Scope:** Local remediation only (A1–A7 + B where practical)  
**Prior status:** M7A-R1 local acceptance **CONDITIONAL**  
**Production release:** **HOLD**  
**Hosted staging readiness:** **BLOCKED** (pending Owner provision + execute)  
**Git commit / push / deploy / remote migrations / paid provisioning / Docker:** **NOT PERFORMED**

---

## Objective

Reconcile completed R1 against Codex’s latest independent audit matrix and Claude’s Final Architecture Reconciliation priorities (A1–A7 / B). Confirm each finding against **current source** before changing code. Deliver local hardening suitable for Atlas + independent Codex re-review — without self-certifying hosted controls.

## Source confirmation (pre-change)

| Area | Current-source confirmation before edit |
|------|-----------------------------------------|
| A1 TLS | `pg-client.js` still used `{ rejectUnauthorized: false }` |
| A2 identity | `.env.example` used administrative `postgres` URL; no intake role |
| A3 grants | Migration 005 grants remained commented placeholders; `search_path = public` only |
| A4 legacy SQL | Procedure already documentation pointer (retained; pointed at 005+006) |
| A5 idempotency | Postgres adapter returned request-time `receivedAt`, not DB-persisted; keys optional |
| A6 metadata | `x-forwarded-for` preferred; client `isTest` honored unconditionally |
| A7 retention | Purge CTEs omitted `notification_outbox` despite `ON DELETE RESTRICT` |
| B controls | Turnstile placeholder could allow when “required”; no outbox worker |

## What changed

### A1 — Verified PostgreSQL TLS
- Production-like configs require `rejectUnauthorized: true` + hostname verification.
- Trusted CA via `DATABASE_SSL_CA` / `DATABASE_SSL_CA_PATH` / `PGSSLROOTCERT`.
- Connection-string `sslmode=disable|allow|prefer|require|no-verify` rejected or overridden with verified TLS.
- Fail closed on insecure SSL configuration.
- Negative unit tests for untrusted / disabled SSL.

### A2 — Restricted runtime database identity
- Roles: `scs_intake_runtime`, `scs_notify_worker`, `scs_migration`, `scs_owner_admin` (migration 006).
- Function prefers `DATABASE_INTAKE_URL`; rejects administrative `postgres` / `supabase_admin` in prod-like (unless explicit override).
- Documented: node-postgres DB roles ≠ Supabase `service_role` JWT.
- Pooling (`DATABASE_POOL_MAX`) and credential rotation notes in `.env.example`.
- Unused “must have service_role for intake” coupling removed from config resolver.

### A3 — Executable grants + SECURITY DEFINER hardening
- Migration 006 issues **executable** `GRANT EXECUTE … TO scs_intake_runtime` / notify / owner roles.
- All privileged RPCs reviewed and recreated with `SET search_path = pg_catalog, public` and qualified objects.
- `REVOKE CREATE ON SCHEMA public FROM PUBLIC` (+ anon/authenticated when present).
- Staging privilege probe comments included (anon deny / intake EXECUTE).

### A4 — Legacy SQL elimination
- `db/procedures/m7a_insert_lead_transaction.sql` remains documentation-only (no `CREATE`).
- Authoritative sequence: migrations **001 → 006**.

### A5 — Durable idempotency
- RPC returns persisted `received_at` on original and duplicate.
- Adapters/mock return DB-persisted timestamp (survives response-cache expiry).
- Valid idempotency key required for supported submissions; non-null 64-char payload fingerprint required on persist.
- Identical replay → original receipt; different payload → 409.
- Rate-limit ordering: cache-hit identical replay returns before rate limit; cache miss still rate-limited then durable DB replay.
- Public form client already sends `Idempotency-Key` (verified).

### A6 — Trusted request metadata
- Prefer Netlify `x-nf-client-connection-ip`; ignore visitor `X-Forwarded-For` on hosted contexts.
- Client `isTest` ignored unless non-prod-like **and** `SCS_ALLOW_CLIENT_TEST_FLAG=true`.

### A7 — Retention / deletion integrity
- Purge functions delete `notification_outbox` before leads.
- `lead_deletion_markers` prevent deleted-key recreation via stale replay.
- Soft-delete writes markers; automated unconverted retention remains **PENDING_FINAL_PRIVACY_APPROVAL**.
- No deletion executed against real customer records.

### B — Production-required controls (local)
- Turnstile: server-side verify path with **fail-closed** when required / network error / placeholder+required.
- Durable notify worker: atomic claim/lease/complete RPCs + `notify-worker.js` Function stub.
- Minimal notify content (receipt + form metadata; no email/message).
- Owner-visible failure status helper (`pending` / `failed` / `dead` counts).
- Explicit modes: `disabled` | `simulated` | `operational` (no live provider activation).
- Encrypted recovery journal **not** implemented (separately gated).

## Preservation

- 30 themes, five Connected Systems, Illustrative Workflows, Solutions Explorer, Advisor Phase A — untouched beyond lead-intake hardening.
- Transformation Studio remains excluded from public dist.
- Software Factory boundaries untouched.

## Local test summary

| Evidence class | Result |
|----------------|--------|
| (1) Static source inspection | PASS (in harness) |
| (2) Mock application tests | **172/172 PASS** (preserved prior suite + R2 targeted) |
| (3) Real PostgreSQL integration | **SKIPPED** — no local PG; suite prepared at `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs` |
| (4) Hosted staging tests | **NOT RUN** |

Prior R1 baseline was **125** checks; R2 harness now **172** (≈47 new targeted checks for A1–A7/B).

## Explicit non-actions

- No external provisioning, paid subscriptions, remote migrations  
- No git commit, push, Netlify deployment, DNS changes, production changes  
- No Docker start / software install  
- No live AI activation; no Software Factory modifications  
- No self-certification of M7A hosted security  
- No regeneration of historical cost reports  

## Verdict for Atlas / Codex

**Local R2 remediation COMPLETE for review.**  
**Production remains HOLD.**  
**STOP for Atlas and independent Codex review.**
