# M7A-R6 — Codex Finding Reconciliation

**Date:** 2026-11-23  
**R6 snapshot:** 2026-11-24T03:57:56Z  
**R4 baseline (preserved):** 2026-11-24T03:21:43Z — `M7A-R4-AUDIT-SNAPSHOT-MANIFEST-20261123.md`  
**Prior R4 freeze (historical):** 2026-11-24T03:09:40Z — `M7A-R4-AUDIT-SNAPSHOT-MANIFEST-20261123-FROZEN-030940Z.md`

| Gate | Prior | R6 disposition |
|------|-------|----------------|
| R4 declared snapshot hashes | Codex-verified 50 matching | R4 manifests preserved unchanged as historical evidence |
| R5 supplemental findings | Open after R4 freeze | A–C corrected locally |
| Isolated staging | BLOCKED | Remains BLOCKED |
| Production | HOLD | Remains HOLD |
| Real PostgreSQL | NOT RUN | NOT RUN (historical R4 record preserved; R6 NOT RUN written) |
| Hosted Auth / AAL2 | Unseparated from simulated JWT | Separated (case 14 NOT RUN) |

## Finding-by-finding

| ID | Severity class | Disposition | Evidence |
|----|----------------|-------------|---------|
| R5-A | Build reproducibility | **RESOLVED LOCALLY** | `netlify.toml` command; static harness assertion; lockfile SHA unchanged |
| R5-B | Migration executor / ownership | **RESOLVED LOCALLY** (process docs + static harness) | `db/scripts/m7a-migration-executor-static.mjs`; `.env.example`; bootstrap comments |
| R5-C1 | Concurrent conflict methodology | **RESOLVED LOCALLY** | Mock + PG harness case 4 use `Promise.all` / `allSettled` |
| R5-C2 | JWT vs hosted Auth separation | **RESOLVED LOCALLY** | Case 8 renamed simulated; case 14 hosted Auth always NOT RUN |
| R5-C3 | Notification handler auth | **RESOLVED LOCALLY** | Actual `exports.handler` missing/incorrect/correct; unauthorized not 503 |
| R5-C4 | Rate-limit isolation | **RESOLVED LOCALLY** | Unique fixture emails + `reset()` + positive controls |
| R5-C5 | `createPgQueryClient` exercise | **RESOLVED LOCALLY** | TLS / admin / test-admin / effective identity + positives |
| R5-C6 | Positive controls on rejections | **RESOLVED LOCALLY** | Added across conflict, rate-limit, handler, identity paths |

## Still open (not claimed passed)

| Item | Status |
|------|--------|
| Real PostgreSQL integration (cases 1–13) | **NOT RUN** — requires `SCS_AUTHORIZE_REAL_PG_TESTS=true` + provisioned URLs |
| Genuine hosted Supabase Auth + AAL2 (case 14) | **NOT RUN** — requires separate `SCS_AUTHORIZE_HOSTED_AUTH_TESTS` |
| Staging deploy / Functions `npm ci` log confirmation | **BLOCKED** — separate Owner authorization |
| Production | **HOLD** |

**Mock PASS is not database integration evidence. Real PostgreSQL and hosted verification have NOT passed.**
