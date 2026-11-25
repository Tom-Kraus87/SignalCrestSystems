# M7B — Pre-Execution Correction Report

**Date:** 2026-11-24  
**Audit snapshot timestamp (UTC):** 2026-11-24T05:14:22Z  
**Branch:** feature/public-v1-studio-pilot  
**Baseline preserved:** M7A-R7 freeze 2026-11-24T04:20:26Z — manifest SHA-256 `4e1a07744d15b1d51d47fdc674cdd116ae29a1092047a0ca064d1fcdad432eaf` (54/54; 250/250 PASS)  
**Production:** **HOLD**

## Scope

Narrow local corrections only (10 authorized items). No provisioning, installs, DB connections, SQL, real-PG execution, hosted Auth, Git, or deploy.

## Per-item status

| # | Item | Status |
|---|------|--------|
| 1 | Remove `DATABASE_MIGRATION_URL` fallback from real-PG harness | **DONE** |
| 2 | Require `DATABASE_PROJECT_ADMIN_URL` exclusively; reject legacy var presence | **DONE** |
| 3 | Align harness CA/TLS with application (`rejectUnauthorized`, hostname, CA env; no `connectionString`) | **DONE** |
| 4 | Resolve `DATABASE_TEST_ADMIN_URL` — fixture identity `scs_test_admin`, min privileges documented + tested | **DONE** |
| 5 | Canonicalize `sslmode`/`ssl-mode` before duplicate detection + mixed-alias negative test | **DONE** |
| 6 | Negative/positive local tests for corrected behavior | **DONE** (265/265 mock/static) |
| 7 | Document exact PostgreSQL client requirements for Windows | **DONE** (`M7B-POSTGRES-CLIENT-WINDOWS-20261124.md`) |
| 8 | Prepare project-local Netlify CLI 26.2.0 pin procedure (do not install) | **DONE** (`tools/netlify-cli-pin/package.json` + procedure MD) |
| 9 | Preserve hosted Auth/AAL2 case 14 as NOT RUN | **DONE** |
| 10 | Preserve frontend features / backend behavior outside scope | **DONE** |

## Evidence classes (do not conflate)

| Class | Suite / artifact | Result |
|-------|------------------|--------|
| **(1) Mock / static local** | `verify-m7a-secure-leads-20261123.mjs` | **265 / 265 PASS** |
| **(1) Static migration executor** | `m7a-migration-executor-static.mjs` | **PASS** (0 SQL) |
| **(1) Static regression** | `_m7a-static-check.mjs` | 30 themes; studio excluded; forms bypass gone |
| **(2) Real PostgreSQL** | cases 1–13 | **NOT RUN** — `M7B-POSTGRES-INTEGRATION-NOT-RUN-20261124.json` |
| **(3) Hosted Auth / AAL2** | case 14 | **NOT RUN** (separate evidence class) |

Historical R4/R6/R7 NOT RUN JSON and R7 audit manifest remain on disk **unchanged** (R7 manifest SHA-256 verified `4e1a077…`; R7 NOT RUN SHA-256 `817eb546…`).

## Corrections summary

### Harness URL exclusivity

- Removed `DATABASE_PROJECT_ADMIN_URL || DATABASE_MIGRATION_URL` fallback.
- `resolveRealPgHarnessEnv` rejects **presence** of `DATABASE_MIGRATION_URL` (`DATABASE_MIGRATION_URL_UNSUPPORTED`).
- Requires `DATABASE_PROJECT_ADMIN_URL`, `DATABASE_INTAKE_URL`, `DATABASE_NOTIFY_URL`, `DATABASE_OWNER_URL`, `DATABASE_TEST_ADMIN_URL`.

### Harness CA / TLS alignment

- `buildHarnessPoolConfig` uses `parseApprovedConnectionFields` + `buildSslOptions` (`isProdLike: true`).
- Effective TLS verified via `inspectEffectivePgSsl` before Pool construct.
- No unrestricted `connectionString` path.

### Fixture identity

- Selected identity: **`scs_test_admin`** via `DATABASE_TEST_ADMIN_URL`.
- Minimum privileges: LOGIN NOINHERIT; fixture DML only; **not** SUPERUSER/CREATEROLE/REPLICATION/BYPASSRLS; never Function runtime; never production.
- Fixture mutations in authorized harness path use the `fixture` pool (not project admin).

### sslmode / ssl-mode canonicalize

- `canonicalizeQueryKey` maps `ssl-mode` → `sslmode` before duplicate detection.
- Mixed-alias URL `sslmode=verify-full&ssl-mode=require` rejected as `database_url_duplicate_security_param`.

## Forbidden actions NOT taken

- No external provisioning
- No dependency installations (including Netlify CLI)
- No database connections / SQL
- No real-PG testing
- No hosted Auth testing
- No Git operations
- No deployments
- No live AI
- No production configuration changes

## Freeze

- Candidate freeze: **2026-11-24T05:14:22Z**
- Manifest: `qa-m6b/M7B-AUDIT-SNAPSHOT-MANIFEST-20261124.md` (**59** entries)
- Manifest file SHA-256: `3c7cebb3f27ebf55d1d002e2d8c480a451932ff43d1b4f39f579956cb2ad4d0b`
- STOP for Codex independent review. Production remains **HOLD**.
