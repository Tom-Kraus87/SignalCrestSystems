# M7A-R2 — Database Migration & Permission Inventory

**Date:** 2026-11-23  
**Execute status:** DRAFT ONLY — do not run against hosted DB without Atlas/Owner authorization  
**Identity note:** node-postgres roles ≠ Supabase `service_role` JWT

## Ordered migration sequence (authoritative)

| Order | File | Purpose |
|------:|------|---------|
| 001 | `db/migrations/001_m7a_leads_foundation.sql` | `leads`, `consent_records`, `submission_requests` |
| 002 | `db/migrations/002_m7a_rls_least_privilege.sql` | RLS + `is_owner_aal2` + owner policies |
| 003 | `db/migrations/003_m7a_retention_procedures.sql` | soft_delete / purge drafts (superseded bodies in 006) |
| 004 | `db/migrations/004_m7a_counters_idempotency.sql` | counters + `idempotency_keys` + RPCs |
| 005 | `db/migrations/005_m7a_insert_lead_bundle.sql` | `insert_lead_bundle` + `notification_outbox` |
| 006 | `db/migrations/006_m7a_r2_security_hardening.sql` | roles, grants, DEFINER harden, deletion markers, worker, purge FK fix |

**Legacy pointer (non-executable):** `db/procedures/m7a_insert_lead_transaction.sql`

## Principals

| Role | Intended use | Must NOT be used for |
|------|--------------|----------------------|
| `scs_intake_runtime` | Netlify Function lead intake (RPC execute) | DDL, owner purge, admin |
| `scs_notify_worker` | Outbox claim/complete worker | Lead insert, migrations |
| `scs_migration` | Apply migrations / DDL | Function runtime |
| `scs_owner_admin` | Owner admin RPCs (with AAL2) | Public intake |
| `postgres` / `supabase_admin` | Break-glass only | Deployed Function identity |
| `anon` / `authenticated` | Browser JWT paths | Lead write / counter / outbox |
| `service_role` (JWT) | PostgREST admin (future dashboard) | Assumed interchangeable with node-pg |

## SECURITY DEFINER inventory (post-006)

| Object | search_path | EXECUTE grant target |
|--------|-------------|----------------------|
| `insert_lead_bundle` | `pg_catalog, public` | `scs_intake_runtime` |
| `atomic_counter_incr/expire/get` | `pg_catalog, public` | `scs_intake_runtime` |
| `idempotency_set_nx` | `pg_catalog, public` | `scs_intake_runtime` |
| `claim_notification_outbox` | `pg_catalog, public` | `scs_notify_worker` |
| `complete_notification_outbox` | `pg_catalog, public` | `scs_notify_worker` |
| `is_owner_aal2` | `pg_catalog, public` | `scs_owner_admin`, `authenticated` |
| `soft_delete_lead` | `pg_catalog, public` | `scs_owner_admin`, `authenticated` |
| `purge_*` | `pg_catalog, public` | `scs_owner_admin`, `authenticated` |

All of the above: `REVOKE` from `PUBLIC` / `anon` / `authenticated` where applicable (intake/counter/outbox RPCs).

## Schema privileges

- `REVOKE CREATE ON SCHEMA public FROM PUBLIC` (+ anon/authenticated when present).
- Tables: RLS enabled; direct DML revoked from PUBLIC/anon/authenticated.
- `lead_deletion_markers`: tombstones for deleted idempotency keys.

## Connection pooling & rotation (ops contract)

- Pool max: `DATABASE_POOL_MAX` (default 2) per Function instance.
- Prefer transaction/session pooler endpoint compatible with `sslmode=verify-full`.
- Rotate: update Netlify context secret → recycle Functions → revoke old DB password.
- TLS: verified certificates required in staging/production; optional `DATABASE_SSL_CA`.

## Staging privilege probes (run after migrate)

```sql
SET ROLE anon;
-- expect permission denied:
-- SELECT public.insert_lead_bundle(...);
-- SELECT * FROM public.leads;
RESET ROLE;

SELECT has_function_privilege(
  'scs_intake_runtime',
  'public.insert_lead_bundle(text,text,citext,text,text,text,text,text,text,text,text,text,text,text,text,boolean,text,timestamptz,text)',
  'EXECUTE'
); -- expect true
```

## Retention policy marker

`purge_unconverted_leads` remains **PENDING_FINAL_PRIVACY_APPROVAL**. Do not schedule against real customer data.
