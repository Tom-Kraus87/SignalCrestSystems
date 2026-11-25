# M7A-R7 — Staging Readiness

**Date:** 2026-11-23  
**Audit snapshot:** 2026-11-24T04:20:26Z  
**Local remediation:** COMPLETE for Codex re-audit (R7-01/02/03)  
**Isolated staging execute:** **BLOCKED** (requires separate Owner authorization)  
**Production:** **HOLD**

## Verdict

Local R7 findings are corrected. The candidate is frozen for independent Codex review. Staging must not be treated as verified until Owner-authorized project identity checks, migration apply as project admin, deploy, and hosted acceptance complete.

## Ready locally

- TLS factory builds clients from explicit fields; effective pg@8.13.1 TLS verified without DB connect  
- Sole migration executor = project admin; `scs_migration` reserved NOLOGIN  
- Manifest includes `_headers` + security-relevant sources; `.netlify/netlify.toml` classified generated  
- Mock/static **250/250 PASS**; migration static PASS; regression static green  
- Public allowlist / Studio exclusion preserved  
- R4/R6 historical manifests + NOT RUN evidence preserved  

## Not ready / blocked (staging-only)

| Item | Status |
|------|--------|
| Direct + pooler project-ref verification | BLOCKED — Owner confirms same `PROJECT_REF` |
| Remote migration apply as project admin | BLOCKED — no SQL executed |
| `scs_migration` NOLOGIN on already-provisioned DBs | BLOCKED — out-of-band `ALTER` if needed |
| Staging Netlify deploy | BLOCKED |
| Functions install log (`npm ci` → `pg@8.13.1`) | BLOCKED |
| Real PostgreSQL suite | NOT RUN |
| Hosted Supabase Auth + AAL2 | NOT RUN |
| Production | HOLD |

## M7B environment + harness prerequisites (exact)

See also `M7A-R7-DATABASE-EXECUTOR-DECISION-20261123.md`.

**Apply / ownership**

- `DATABASE_PROJECT_ADMIN_URL` (SOLE executor)  
- Ownership expectation: tables + SECURITY DEFINER → project admin  

**Runtime (Netlify staging)**

- `DATABASE_INTAKE_URL`, `DATABASE_NOTIFY_URL`, `DATABASE_URL`  
- `LEAD_IP_HASH_SALT`, `NOTIFY_WORKER_INVOKE_SECRET`  
- `SCS_ENV=staging`, `SCS_DEPENDENCY_MODE=postgres`  
- Optional: `DATABASE_SSL_CA` / `DATABASE_SSL_CA_PATH`  

**Real-PG harness (future authorization)**

- `SCS_AUTHORIZE_REAL_PG_TESTS=true`  
- `DATABASE_PROJECT_ADMIN_URL`, `DATABASE_INTAKE_URL`, `DATABASE_NOTIFY_URL`, `DATABASE_OWNER_URL`, `DATABASE_TEST_ADMIN_URL`  
- Hosted Auth separately: `SCS_AUTHORIZE_HOSTED_AUTH_TESTS=true`  

**Rate-limit fixtures**

- Fresh limiter + `reset()`  
- Unique emails `rate-limit-isolated-<uuid>@…` / `rate-limit-control-<uuid>@…`  
- Positive uncontaminated control required  

## Project identity verification (required before secrets)

1. Read staging `PROJECT_REF` from Supabase dashboard.  
2. Direct URL host must be `db.<PROJECT_REF>.supabase.co`.  
3. Pooler username must embed `.<PROJECT_REF>` (e.g. `postgres.<PROJECT_REF>` or `scs_intake_runtime.<PROJECT_REF>`).  
4. Reject any URL whose ref does not match.  
5. Prefer `sslmode=verify-full` in stored URLs.

## Authoritative vs generated vs secret

| Authoritative source | Generated / non-authoritative | Secret-bearing (exclude from manifests) |
|----------------------|-------------------------------|----------------------------------------|
| Root `netlify.toml`, `_headers` | `.netlify/netlify.toml`, `.netlify/state.json` | `.env`, `.env.local`, Netlify UI secrets |
| `netlify/functions/**` (except `node_modules`) | `netlify/functions/node_modules/**`, `dist/**` | Live connection URLs/passwords |
| `db/**` SQL + static executor | Build logs | |
| `qa-m6b` reports / manifests | | |

**Generated-configuration verification (required at deploy):** confirm the hosted build uses **root** `netlify.toml` command `npm ci --prefix netlify/functions && node scripts/build-public.mjs` and that edge headers from `_headers` / `[[headers]]` appear on responses — do not trust `.netlify/netlify.toml` as policy.

## Next Owner gates

1. Codex independent re-audit of R7 freeze  
2. Authorize staging project; verify direct + pooler project ref  
3. Authorize migration apply as project admin; confirm NOLOGIN on `scs_migration`  
4. Authorize staging deploy; confirm `pg@8.13.1` in Functions log  
5. Authorize real-PG then hosted-Auth verification  
6. Keep production HOLD until acceptance clears  

**Mock / local TLS PASS is not hosted acceptance.**

---

## M7B pre-execution note (does not reopen R7 freeze)

R7 freeze `2026-11-24T04:20:26Z` remains historical evidence. M7B local corrections (harness URL exclusivity, CA alignment, `sslmode`/`ssl-mode` canonicalize, fixture identity docs, Windows `psql` requirements, Netlify CLI 26.2.0 pin **procedure only**) are captured in:

- `qa-m6b/M7B-PRE-EXECUTION-CORRECTION-REPORT-20261124.md`  
- `qa-m6b/M7B-AUDIT-SNAPSHOT-MANIFEST-20261124.md`  

Real PostgreSQL and hosted Auth/AAL2 remain **NOT RUN**. Production remains **HOLD**.
