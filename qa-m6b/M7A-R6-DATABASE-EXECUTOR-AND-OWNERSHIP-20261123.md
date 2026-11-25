# M7A-R6 — Database Executor and Ownership

**Date:** 2026-11-23  
**Audit snapshot:** 2026-11-24T03:57:56Z  
**Draft / process definition only — do not execute SQL remotely without separate Owner authorization.**  
**Static harness:** `db/scripts/m7a-migration-executor-static.mjs` → **PASS** (0 SQL executed)

## Supported Supabase provisioning executor

| Step | Actor | Artifact |
|------|-------|----------|
| 1 | **Controlled project administrator** (`postgres` / Supabase dashboard SQL with CREATEROLE or SUPERUSER) | `db/bootstrap/001_m7a_r4_role_bootstrap.sql` |
| 2 | Project administrator (preferred) or `scs_migration` **without** SUPERUSER/CREATEROLE elevation | Migrations `001` … `007` in order |
| 3 | Project administrator (out of band) | Optional `CREATE ROLE scs_test_admin` for fixtures |
| 4 | Owner (out of band) | Set passwords; wire Netlify secrets to least-privilege URLs only |

**Do not** use migration 006’s swallowed `insufficient_privilege` NOTICE path as provisioning.  
**Do not** unnecessarily elevate `scs_migration`. Prefer project admin for role creation and object ownership.

## Schema and SECURITY DEFINER ownership

| Object class | Intended owner | Rationale |
|--------------|----------------|-----------|
| Tables / types in `public` (leads stack) | Project administrator (`postgres`) | Stable ownership; migrations apply as that principal |
| SECURITY DEFINER functions (insert, lookup, claim, complete, retention, counters) | Project administrator | DEFINER rights must not be the weak Function runtime role |
| Runtime EXECUTE grants | Per 007 matrix below | Least privilege |

After apply, confirm `pg_proc.proowner` / table owners are the project admin — not `scs_intake_runtime`, `scs_notify_worker`, or `scs_test_admin`.

## Runtime grant summary (after 007)

| Principal | Allowed | Denied |
|-----------|---------|--------|
| `scs_intake_runtime` | lookup / idempotency_set_nx / insert / counter RPCs | `idempotency_keys` table SELECT; outbox claim/status; Function use of admin URLs |
| `scs_notify_worker` | claim / complete with `claim_token` | outbox table SELECT; `status_counts`; intake RPCs |
| `scs_owner_admin` | `status_counts`; soft_delete / purge (AAL2-gated) | Deployed Function runtime |
| `scs_migration` | Ordered DDL only (optional) | Function runtime; no default SUPERUSER/CREATEROLE |
| `scs_test_admin` | Fixture setup / integration harness only | Function runtime; production |
| `anon` / `authenticated` | — | Privileged RPCs / tables |
| `postgres` / `supabase_admin` | Break-glass outside Functions | Function runtime (`SCS_ALLOW_ADMIN_DB_USER` not honored) |

## Test-administration identity

| Item | Value |
|------|-------|
| Role name | `scs_test_admin` |
| Env placeholder | `DATABASE_TEST_ADMIN_URL` |
| Purpose | Fixture setup for authorized real-PG tests |
| Function runtime | **Forbidden** (`ADMIN_RUNTIME_ROLES`) |
| Created by bootstrap 001? | **No** — declare separately at provision time |

## `.env.example` reconciliation

Documented placeholders: `DATABASE_INTAKE_URL`, `DATABASE_NOTIFY_URL`, `DATABASE_OWNER_URL`, `DATABASE_MIGRATION_URL`, `DATABASE_PROJECT_ADMIN_URL`, `DATABASE_TEST_ADMIN_URL`, TLS verify-full, `NOTIFY_WORKER_INVOKE_SECRET`. Role names match bootstrap / 007 / harness prerequisites.

## Unresolved provider assumptions

- Supabase may expose `postgres` via dashboard pooler differently than direct DB host — Owner must confirm connection host for admin vs runtime.
- Exact CA bundle path for `verify-full` on Netlify Functions is environment-specific (`DATABASE_SSL_CA` / `DATABASE_SSL_CA_PATH`).
- Auth schema (`auth.uid()`) availability assumed for hosted AAL2 probes — separate hosted Auth authorization required.
