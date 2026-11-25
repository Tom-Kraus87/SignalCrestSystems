# M7A-R7 — Codex Finding Reconciliation

**Date:** 2026-11-23  
**R7 snapshot:** 2026-11-24T04:20:26Z  
**Baseline:** M7A-R6 frozen snapshot 2026-11-24T03:57:56Z (preserved)  
**R4 baseline (preserved):** 2026-11-24T03:21:43Z — `M7A-R4-AUDIT-SNAPSHOT-MANIFEST-20261123.md`  
**Prior Codex BLOCKED:** evidence-availability only — **not** a new security finding  

| Gate | Prior | R7 disposition |
|------|-------|----------------|
| R6 declared snapshot hashes | Codex-verified 51 matching | R6 manifests preserved unchanged as historical evidence |
| R7-01 TLS effective config | Open (connectionString overwrite) | **RESOLVED LOCALLY** with pinned pg@8.13.1 effective-TLS proof |
| R7-02 migration executor | Open (`project_admin_or_scs_migration`) | **RESOLVED LOCALLY** — sole `project_admin`; `scs_migration` reserved NOLOGIN |
| R7-03 manifest completeness | Open (`_headers` / `.netlify`) | **RESOLVED LOCALLY** |
| Isolated staging | BLOCKED | Remains BLOCKED |
| Production | HOLD | Remains HOLD |
| Real PostgreSQL | NOT RUN | NOT RUN (R4/R6 preserved; R7 NOT RUN written) |
| Hosted Auth / AAL2 | NOT RUN | NOT RUN |

## Finding-by-finding

| ID | Severity class | Disposition | Evidence |
|----|----------------|-------------|---------|
| R7-01 | TLS override resistance | **RESOLVED LOCALLY** | Explicit fields; reject `uselibpqcompat`+`sslmode=require`; effective `ConnectionParameters.ssl` verified; Codex baseline demonstrated then blocked by factory |
| R7-02 | Sole migration executor | **RESOLVED LOCALLY** | Static harness sole `project_admin`; bootstrap NOLOGIN; docs / `.env.example` / harness prerequisites reconciled |
| R7-03 | Manifest completeness | **RESOLVED LOCALLY** | `_headers` + security-relevant sources hashed; `.netlify/netlify.toml` classified generated + verification requirement documented |

## Still open (not claimed passed)

| Item | Status |
|------|--------|
| Real PostgreSQL integration (cases 1–13) | **NOT RUN** — requires `SCS_AUTHORIZE_REAL_PG_TESTS=true` + provisioned URLs |
| Genuine hosted Supabase Auth + AAL2 (case 14) | **NOT RUN** — requires `SCS_AUTHORIZE_HOSTED_AUTH_TESTS` |
| Staging project identity verification (direct + pooler) | **BLOCKED** — Owner/staging only |
| Staging deploy / Functions `npm ci` log confirmation | **BLOCKED** |
| Production | **HOLD** |

**Mock PASS and local effective-TLS PASS are not database integration evidence. Real PostgreSQL and hosted verification have NOT passed.**
