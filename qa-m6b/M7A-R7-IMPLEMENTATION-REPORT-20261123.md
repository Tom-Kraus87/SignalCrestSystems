# M7A-R7 — Implementation Report

**Date:** 2026-11-23  
**Audit snapshot timestamp:** 2026-11-24T04:20:26Z  
**Authoritative baseline:** M7A-R6 frozen snapshot 2026-11-24T03:57:56Z (Codex 51/51 hashes; preserved)  
**Prior mock/static:** 234/234 (R6). This pass: **250 / 250 PASS** (mock/static + R7 targeted)  
**Scope:** Resolve ONLY outstanding M7A-R6 independent audit findings R7-01, R7-02, R7-03  
**Backend redesign:** NOT performed  
**Production:** **HOLD**  
**Isolated staging:** **BLOCKED** pending Owner authorization + hosted acceptance  
**Git commit / push / deploy / npm install / remote SQL / live AI:** **NOT PERFORMED**

## Findings addressed

| ID | Finding | Disposition |
|----|---------|-------------|
| R7-01 | TLS override via `connectionString` + `uselibpqcompat` / sslmode downgrade | **CORRECTED LOCALLY** |
| R7-02 | `project_admin_or_scs_migration` ambiguity; scs_migration as alternate executor | **CORRECTED LOCALLY** |
| R7-03 | Manifest omitted `_headers` / unclear `.netlify/netlify.toml` authority | **CORRECTED LOCALLY** (manifest + classification) |

Codex’s prior BLOCKED verdict was evidence-availability only — not a new security finding. This pass supplies effective-TLS evidence with pinned `pg@8.13.1`.

## R7-01 — TLS override resistance

| | |
|--|--|
| Root cause | `pg@8.13.1` `ConnectionParameters` does `Object.assign({}, config, parse(connectionString))`, overwriting a secure `ssl` object when the URL contains `uselibpqcompat=true&sslmode=require` (`rejectUnauthorized: false`). |
| Correction | Strict URL parse → explicit approved fields only; **never** pass unrestricted `connectionString` alongside TLS. Reject `uselibpqcompat`, TLS downgrade modes, SSL injection params, duplicates, unsupported params. Require `rejectUnauthorized: true` + `tls.checkServerIdentity`. Verify **effective** TLS via real `ConnectionParameters` before Pool construct. |
| Supabase formats | Direct `db.<ref>.supabase.co:5432` and pooler `*.pooler.supabase.com:6543` (+ optional `pgbouncer=true`) preserved. `sslmode=require` alone is normalized to application-forced verify-full (no connectionString path). |
| Tests | Codex reproduction rejected; positive verify-full / require-normalized / pooler; injection/duplicate/disable/verify-ca rejects. **No DB connect. No npm install.** |
| Evidence | `M7A-R7-TLS-EFFECTIVE-CONFIGURATION-EVIDENCE-20261123.md` (+ JSON) |

**Changed:** `netlify/functions/_lib/pg-client.js`, `qa-m6b/verify-m7a-secure-leads-20261123.mjs`

## R7-02 — Sole migration executor

| | |
|--|--|
| Decision | Controlled Supabase **project administrator** is the **SOLE** supported executor for bootstrap + migrations 001–007. |
| Removed | All `project_admin_or_scs_migration` ambiguity. |
| `scs_migration` | **Reserved NOLOGIN** — not a supported executor; must not receive LOGIN / SUPERUSER / CREATEROLE / unnecessary privileges. |
| Ownership | Tables, schema objects, SECURITY DEFINER functions → project admin (`postgres`). |
| Reconciled | Static executor, bootstrap, migration 006 role comment, `.env.example`, PG harness prerequisites, staging readiness. |

**Changed:** `db/scripts/m7a-migration-executor-static.mjs`, `db/bootstrap/001_m7a_r4_role_bootstrap.sql`, `db/migrations/006_m7a_r2_security_hardening.sql`, `.env.example`, `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs`

Decision detail: `M7A-R7-DATABASE-EXECUTOR-DECISION-20261123.md`

## R7-03 — Manifest completeness

| Artifact | Classification |
|----------|----------------|
| `_headers` | **Authoritative source** — included in R7 manifest |
| Root `netlify.toml` | **Authoritative source** — build command, redirects, API headers |
| `.netlify/netlify.toml` | **Generated local Netlify CLI state** — NOT authoritative; excluded from hash set with required generated-configuration verification note |
| `node_modules/`, `dist/` | Generated / install artifacts — excluded |
| `.env`, secrets | Secret-bearing local config — excluded |

Scope/exclusions: `M7A-R7-AUDIT-SNAPSHOT-MANIFEST-20261123.md`  
Historical R4/R6 manifests and NOT RUN JSON: **preserved unchanged**.

## Local evidence summary

| Evidence class | Result |
|----------------|--------|
| (1)+(2) Static + mock + R7 targeted | **250 / 250 PASS** |
| Migration executor static | **PASS** (0 SQL executed; sole executor `project_admin`) |
| Regression static (`_m7a-static-check`) | 30 themes; studio excluded; forms bypass gone |
| Effective TLS (pinned pg@8.13.1) | **PASS** locally — no database connection |
| (3) Real PostgreSQL | **NOT RUN** (14 cases; R7 NOT RUN JSON; R4/R6 preserved) |
| (4) Hosted / Auth AAL2 | **NOT RUN / HOLD** |

## Workstream — regression preservation

Five Connected Systems, Illustrative Workflows, 30 themes, Solutions Explorer, deterministic Solutions Advisor, project-request workflow, Stone Harbor concept studio exclusion from `dist`, public artifact security controls — **preserved**.

## Forbidden actions confirmation

No external provisioning, package installation (`npm ci` / `npm install`), SQL against any DB, database connections for tests claiming real-PG pass, Git commit/push, deployment, billing changes, live AI, Stone Harbor Tradeworks LLC modifications, or SignalCrest Software Factory modifications.

**Ready for independent Codex re-audit. Production remains HOLD. Stop after freeze.**
