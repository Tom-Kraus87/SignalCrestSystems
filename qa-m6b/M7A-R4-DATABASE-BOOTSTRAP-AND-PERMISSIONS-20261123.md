# M7A-R4 — Database Bootstrap and Permissions

**Date:** 2026-11-23  
**Draft only — do not execute remotely without separate Owner authorization.**  
**Audit snapshot:** 2026-11-24T03:21:43Z  
**Prior R4 freeze:** 2026-11-24T03:09:40Z (historical)

## Intended order

1. `db/bootstrap/001_m7a_r4_role_bootstrap.sql` (CREATEROLE/SUPERUSER; fail closed)
2. `db/migrations/001` … `006` (historical drafts retained; 006 role NOTICE path is NOT provisioning)
3. `db/migrations/007_m7a_r4_security_corrections.sql` (aborts if roles missing)

## Runtime grant summary after 007

| Principal | Allowed | Denied |
|-----------|---------|--------|
| scs_intake_runtime | lookup/idempotency/insert/counter RPCs | idempotency_keys SELECT; outbox claim/status |
| scs_notify_worker | claim/complete with claim_token | outbox table SELECT; status_counts |
| scs_owner_admin | status_counts; soft_delete/purge | Function runtime use |
| anon/authenticated | — | privileged RPCs/tables |

`SCS_ALLOW_ADMIN_DB_USER` is not honored. Break-glass admin stays outside Functions.
