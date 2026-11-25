# M7A — Database Schema & Migration Drafts

**Status:** DRAFT ONLY — **do not execute** against any external database  
**Target:** New Supabase PostgreSQL project (not Factory plane)  
**Cost rule:** Counters + idempotency live in Postgres (no Redis table substitute required)

## Files

| Path | Purpose |
|------|---------|
| `db/migrations/001_m7a_leads_foundation.sql` | `leads`, `consent_records`, `submission_requests` + indexes/constraints |
| `db/migrations/002_m7a_rls_least_privilege.sql` | RLS, revoke anon, owner AAL2 helper, allowlist |
| `db/migrations/003_m7a_retention_procedures.sql` | Soft-delete scrub, hard purge, test-row purge, **unconverted 12-mo draft** |
| `db/migrations/004_m7a_counters_idempotency.sql` | `usage_counters`, `idempotency_keys`, atomic INCR/SET NX RPCs |
| `db/procedures/m7a_insert_lead_transaction.sql` | Service-role transactional insert + idempotency |

## Tables (summary)

### `leads`
PII + inquiry payload; `received_at` server-stamped; status enum; `ip_hash` (hashed only); `is_test`; soft-delete via `deleted_at`.

### `consent_records`
Append-only; `consent_given` CHECK must be `true`; stores `privacy_version` / `consent_text_version`.

### `submission_requests`
Intake ledger; **unique** `idempotency_key` (partial unique index); links lead + consent.

### `usage_counters` (004)
Atomic counter store for rate limits + future advisor credits/spend via `atomic_counter_incr`.

### `idempotency_keys` (004)
Optional response-cache SET NX; primary lead uniqueness remains on `submission_requests`.

## Access model

| Actor | Access |
|-------|--------|
| `anon` | **None** (no direct INSERT/SELECT) |
| Browser | **None** to DB — only `POST /api/leads` |
| Netlify Function | `service_role` insert via `insert_lead_bundle` + counters (provision-time grant) |
| Owner (`authenticated` + AAL2 + allowlist) | SELECT/UPDATE leads; SELECT consent/submissions; retention RPCs |

## Retention (draft — Owner / privacy)

| Class | Action | Approval |
|-------|--------|----------|
| Soft-delete | Scrub message/brief/phone/company; set `status=deleted` | Draft |
| Hard purge soft-deleted | Default **365 days** after `deleted_at` | OPEN |
| Test rows (`is_test`) | Hard purge after **30 days** | OPEN |
| Unconverted (`new`/`triaged`/`declined`/`spam`) | Proposed **12 months** via `purge_unconverted_leads` | **PENDING_FINAL_PRIVACY_APPROVAL** |

## Local mock

`netlify/functions/_lib/repository.js` → `MockLeadRepository.persistLeadTransaction`  
`InMemoryAtomicCounterStore` / `InMemoryRateLimiter` mirror Postgres semantics for tests.  
Production stubs: `postgres-adapters.js` (not wired live).
