# M7A-R1 — Database Migration and Permission Inventory

**Date:** 2026-11-23  
**Execution status:** **DRAFT ONLY — not executed** against remote or local Postgres  
**Local Postgres availability:** **UNAVAILABLE** (Docker Desktop daemon not running; no `psql`; `DATABASE_URL` unset)

---

## Ordered migrations

| Order | File | Purpose |
|------:|------|---------|
| 001 | `db/migrations/001_m7a_leads_foundation.sql` | `leads`, `consent_records`, `submission_requests` + unique idempotency index |
| 002 | `db/migrations/002_m7a_rls_least_privilege.sql` | RLS enable; revoke table grants; `owner_allowlist`; `is_owner_aal2()` |
| 003 | `db/migrations/003_m7a_retention_procedures.sql` | Soft-delete / purge RPCs; unconverted purge **PENDING_FINAL_PRIVACY_APPROVAL** |
| 004 | `db/migrations/004_m7a_counters_idempotency.sql` | `usage_counters`, `idempotency_keys`, atomic counter / SET NX RPCs |
| 005 | `db/migrations/005_m7a_insert_lead_bundle.sql` | `payload_hash`, `notification_outbox`, `insert_lead_bundle`, grants harden |

Pointer (non-canonical): `db/procedures/m7a_insert_lead_transaction.sql` → see migration 005.

---

## Objects and intended privileges

| Object | Type | SECURITY DEFINER | search_path | Intended EXECUTE/TABLE access |
|--------|------|------------------|-------------|-------------------------------|
| `leads` | table | n/a | n/a | service_role write; authenticated owner SELECT/UPDATE via RLS; **no anon** |
| `consent_records` | table | n/a | n/a | service_role write; owner SELECT; **no anon** |
| `submission_requests` | table | n/a | n/a | service_role write; owner SELECT; **no anon** |
| `notification_outbox` | table | n/a | n/a | service_role only; RLS on; revoke PUBLIC/anon/authenticated |
| `usage_counters` | table | n/a | n/a | service_role via RPCs; revoke direct table access |
| `idempotency_keys` | table | n/a | n/a | service_role via RPCs; revoke direct table access |
| `owner_allowlist` | table | n/a | n/a | owner self-select under AAL2 |
| `is_owner_aal2()` | function | YES | `public` | EXECUTE to `authenticated` only |
| `insert_lead_bundle(...)` | function | YES | `public` | **REVOKE** PUBLIC/anon/authenticated; GRANT service_role at provision |
| `atomic_counter_incr/get/expire` | functions | YES | `public` | REVOKE PUBLIC/anon/authenticated; service_role at provision |
| `idempotency_set_nx` | function | YES | `public` | REVOKE PUBLIC/anon/authenticated; service_role at provision |
| `soft_delete_lead` / purges | functions | YES | `public` | authenticated + `is_owner_aal2()` gate |
| `purge_unconverted_leads` | function | YES | `public` | **PENDING_FINAL_PRIVACY_APPROVAL** — do not schedule |

---

## RLS posture (intended)

- All lead-plane tables: RLS **enabled**.
- No policies for `anon` → deny by default.
- Authenticated owner policies require `is_owner_aal2()`.
- Netlify Function uses **service_role** (bypasses RLS) — key must remain server-only.

---

## Verification evidence

| Check | Result |
|-------|--------|
| Migration files present / static content checks | PASS (harness) |
| Applied to local Postgres | **NOT RUN** |
| Live GRANT/REVOKE inventory query | **NOT RUN** |
| Live RLS deny tests (anon SELECT/INSERT) | **NOT RUN** |
| Concurrent insert under real unique index | **NOT RUN** |

**Do not treat mock repository tests as database integration evidence.**

---

## Durable outbox + recovery journal (separate requirements)

| Concern | Status |
|---------|--------|
| `notification_outbox` atomic insert with lead bundle | SQL draft in 005 |
| Outbox replay worker / poison handling | **NOT IMPLEMENTED** |
| Encrypted recovery journal for failed Function invocations | **DOCUMENTED REQUIREMENT ONLY** |
| Near-zero recovery / deletion reconciliation proof | **NOT CLAIMED** |

---

## STOP

Do not execute these migrations against hosted Supabase until Atlas/Owner authorize isolated staging provisioning.
