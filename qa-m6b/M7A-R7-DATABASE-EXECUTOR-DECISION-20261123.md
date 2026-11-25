# M7A-R7 — Database Executor Decision

**Date:** 2026-11-23  
**Audit snapshot:** 2026-11-24T04:20:26Z  
**Draft / process definition only — do not execute SQL remotely without separate Owner authorization.**  
**Static harness:** `db/scripts/m7a-migration-executor-static.mjs` → **PASS** (0 SQL executed)  
**Audience:** Atlas + Claude M7B staging runbook

## Atlas decision (binding)

The **controlled Supabase project administrator** (`postgres` / dashboard SQL with `CREATEROLE` or `SUPERUSER`) is the **SOLE** supported executor for:

1. `db/bootstrap/001_m7a_r4_role_bootstrap.sql`  
2. Migrations `001` … `007` in order  

`project_admin_or_scs_migration` ambiguity is **removed**.  
`scs_migration` is **reserved** and is **not** a supported migration executor.

## Identity classes (do not conflate)

| Identity | Env var | Login | Role | Purpose |
|----------|---------|-------|------|---------|
| Project administrator (SOLE executor) | `DATABASE_PROJECT_ADMIN_URL` | Yes | `postgres` (or equivalent dashboard admin) | Bootstrap, migrations 001–007, object ownership |
| Intake runtime | `DATABASE_INTAKE_URL` | Yes | `scs_intake_runtime` | Netlify Function lead intake only |
| Notify runtime | `DATABASE_NOTIFY_URL` | Yes | `scs_notify_worker` | Notify worker claim/complete only |
| Owner ops | `DATABASE_OWNER_URL` | Yes | `scs_owner_admin` | Monitoring / retention RPCs; never Function runtime |
| Test admin (fixtures) | `DATABASE_TEST_ADMIN_URL` | Yes | `scs_test_admin` | Integration fixture setup only; never production / never Function runtime |
| Reserved migration name | *(none supported)* | **NOLOGIN** | `scs_migration` | Placeholder role existence only |

Fallback Function URL: `DATABASE_URL` (must still be a Function runtime role in prod-like modes).  
`DATABASE_MIGRATION_URL` is **unsupported** for apply (historical placeholder only).

## `scs_migration` NOLOGIN decision

| Question | Decision |
|----------|----------|
| Can reserved `scs_migration` safely be `NOLOGIN`? | **Yes** — it is not a supported executor and must not authenticate. |
| Change made | Bootstrap `CREATE ROLE scs_migration NOINHERIT NOLOGIN` (minimal additive hardening within R7-02). |
| Privileges | No SUPERUSER, CREATEROLE, or other unnecessary grants. |
| Existing DBs | If a prior apply left `LOGIN`, Owner should `ALTER ROLE scs_migration NOLOGIN` out of band at next authorized provision (not executed this pass). |

## Expected ownership after apply

| Object class | Intended owner |
|--------------|----------------|
| Tables / types in `public` (leads stack) | Project administrator (`postgres`) |
| Schema objects created by 001–007 | Project administrator |
| SECURITY DEFINER functions (insert, lookup, claim, complete, retention, counters) | Project administrator |
| Runtime EXECUTE grants | Per migration 007 least-privilege matrix |

Confirm `pg_proc.proowner` / table owners are project admin — not `scs_intake_runtime`, `scs_notify_worker`, `scs_test_admin`, or `scs_migration`.

## Supabase project identity verification (direct + pooler)

Before wiring secrets, verify the **same** staging project reference on both paths:

| Path | Host pattern | Port | Username pattern | Verify |
|------|--------------|------|------------------|--------|
| Direct | `db.<PROJECT_REF>.supabase.co` | `5432` | `postgres` or role name | `<PROJECT_REF>` matches Supabase dashboard project ref |
| Pooler (transaction) | `aws-0-<REGION>.pooler.supabase.com` | `6543` | Often `postgres.<PROJECT_REF>` or `role.<PROJECT_REF>` | Project ref **embedded in username** must equal direct ref; region matches project |
| Pooler (session) | same host family | `5432` | same username embedding | Confirm mode before Functions use |

**M7B checklist:** extract `PROJECT_REF` from direct host; confirm pooler username suffix `.<PROJECT_REF>`; reject cross-project URLs; use `sslmode=verify-full` in stored secrets (factory also forces verified TLS).

## Exact environment variables (M7B)

### Provisioning / apply (outside Netlify Functions)

- `DATABASE_PROJECT_ADMIN_URL` — **required** for bootstrap + 001–007  
- Optional out-of-band: create `scs_test_admin` then set `DATABASE_TEST_ADMIN_URL`

### Netlify Functions (staging context secrets)

- `SCS_ENV=staging`  
- `SCS_DEPENDENCY_MODE=postgres`  
- `DATABASE_INTAKE_URL`  
- `DATABASE_NOTIFY_URL`  
- `DATABASE_URL` (fallback; prefer intake URL)  
- `LEAD_IP_HASH_SALT` (≥32 chars, non-placeholder)  
- `NOTIFY_WORKER_INVOKE_SECRET` (≥32 chars, non-placeholder)  
- Optional TLS CA: `DATABASE_SSL_CA` or `DATABASE_SSL_CA_PATH` / `PGSSLROOTCERT`  
- Optional: `DATABASE_POOL_MAX` (default 2)  
- Optional: `DATABASE_OWNER_URL` (ops only; not Function runtime)

### Authorized real-PG harness (future; NOT RUN this pass)

- `SCS_AUTHORIZE_REAL_PG_TESTS=true`  
- `DATABASE_PROJECT_ADMIN_URL`  
- `DATABASE_INTAKE_URL`  
- `DATABASE_NOTIFY_URL`  
- `DATABASE_OWNER_URL`  
- `DATABASE_TEST_ADMIN_URL` (fixtures)  
- Separate: `SCS_AUTHORIZE_HOSTED_AUTH_TESTS=true` for case 14 only  

### Forbidden as Function runtime

`postgres`, `supabase_admin`, `scs_migration`, `scs_owner_admin`, `scs_test_admin` — rejected by `ADMIN_RUNTIME_ROLES`.

## Rate-limit fixture procedures (Claude M7B / local + real-PG)

Local mock suite pattern (preserve in M7B):

1. Construct a **fresh** deps / limiter instance per case.  
2. Call `rateLimiter.reset()` before the fixture.  
3. Use a **unique** fixture email: `rate-limit-isolated-<uuid8>@example.com` (never reuse across cases).  
4. Drive submissions until 429 engages on that fixture only.  
5. Positive control: **new** deps + `reset()` + distinct `rate-limit-control-<uuid8>@example.com` must return 200 (uncontaminated).  
6. For ordering/idempotency+rate-limit cases: unique `rate-order-<uuid8>@example.com` + unique idempotency keys.  

Real-PG (when authorized): isolate counter keys / emails the same way; never share `usage_counters` keys across concurrent cases; clean fixtures via `scs_test_admin` only.

## Authoritative vs generated vs secret (executor context)

| Class | Examples | Role |
|-------|----------|------|
| Authoritative source | `db/bootstrap/*`, `db/migrations/*`, `db/scripts/m7a-migration-executor-static.mjs`, `.env.example`, root `netlify.toml`, `_headers`, `netlify/functions/_lib/pg-client.js` | Versioned process / security controls |
| Generated | `node_modules/`, `dist/`, `.netlify/*` | Rebuild from source; do not treat as policy |
| Secret-bearing local | `.env`, `.env.local`, Netlify UI secrets | Never commit; never log URLs |

## Process (authorized staging only)

1. Connect as project admin (`DATABASE_PROJECT_ADMIN_URL`).  
2. Apply bootstrap 001 (fail closed).  
3. Optionally `CREATE ROLE scs_test_admin … LOGIN NOINHERIT` for fixtures.  
4. Apply migrations 001→007 as the **same** project admin.  
5. Keep `scs_migration` reserved NOLOGIN.  
6. Confirm ownership + 007 grants.  
7. Set passwords out of band; wire Netlify to least-privilege **runtime** URLs only.

**Do not** use migration 006’s swallowed `insufficient_privilege` NOTICE path as provisioning.

---

## M7B addendum (pre-execution corrections — docs only relative to R7 freeze)

Historical R7 freeze artifacts remain authoritative for the 2026-11-24T04:20:26Z snapshot. The following clarifies harness prerequisites corrected in M7B (see `M7B-PRE-EXECUTION-CORRECTION-REPORT-20261124.md`):

| Topic | M7B rule |
|-------|----------|
| Migration URL | `DATABASE_PROJECT_ADMIN_URL` **exclusive**. Presence of `DATABASE_MIGRATION_URL` is **rejected** by the real-PG harness. |
| Fixture identity | `DATABASE_TEST_ADMIN_URL` → username **`scs_test_admin` only**. |
| Fixture min privileges | `LOGIN NOINHERIT`; fixture DML for setup/teardown; **not** SUPERUSER / CREATEROLE / REPLICATION / BYPASSRLS; never Function runtime; never production. |
| Harness TLS | Pools built with application `parseApprovedConnectionFields` + `buildSslOptions` (explicit fields, `rejectUnauthorized: true`, hostname check, optional `DATABASE_SSL_CA` / path). No unrestricted `connectionString`. |
| Windows `psql` | See `M7B-POSTGRES-CLIENT-WINDOWS-20261124.md` (install later). |
| Netlify CLI | Pin procedure for **26.2.0** prepared at `tools/netlify-cli-pin/package.json` — **do not install yet** (`M7B-NETLIFY-CLI-PIN-PROCEDURE-20261124.md`). |
