# M7B — Owner Authorization Matrix (G2 / G4 preparation)

**Date:** 2026-11-24  
**Nature:** Planning artifact — authorizations listed here are **required before** the named action; this document does **not** grant them  
**Production:** **HOLD**  
**Baseline:** M7B freeze `3c7cebb3…`; G1 ELIGIBLE; G2/G3 BLOCKED pending prerequisites; G4 implementation not started

---

## 1. How to use this matrix

1. Owner issues a **written** authorization ID (e.g. `A-SQL-20261124-1`) naming scope, environment (**staging only**), and expiry.  
2. Agent executes **only** listed agent-capable steps under that ID, with Owner present when marked.  
3. Anything not listed is **denied by default**.  
4. Production actions require a **separate** matrix / HOLD lift — never reuse staging tokens.

---

## 2. Authorization tokens (M7B)

| Token | Scope | Typical gate |
|-------|-------|--------------|
| `A-DEP` | Local dependency install (`npm ci`, `psql` client, Netlify CLI pin) | Pre-G2 / pre-G3 |
| `A-PROV-DB` | Create staging Supabase org/project; SSL; CA download | G1 |
| `A-SQL` | Bootstrap, migrations 001–007, role/grants, `scs_test_admin`, G4 migration 008, A21/A22 toggles | G1 / G2 prep / G4 |
| `A-DBTEST` | Real-PG harness cases 1–13 | G2 |
| `A-PROV-NET` | Create staging Netlify site; context secrets | G3 |
| `A-NET-SETTINGS` | Branch monitoring / form detection / password protection settings | G3 |
| `A-LINK` / `A-GIT-PUSH` | Link repo / push if Path A | G3 |
| `A-DEPLOY` | Single staging deploy | G3 |
| `A-HOSTTEST` | Hosted H-suite + G4 A1–A26 / case 14 replacement | G4 |
| `A-GIT-COMMIT` | Commit sanitized evidence only | Post-run |
| `A-DESTROY` | Delete staging Supabase + Netlify projects | After G5 |
| `A-PROD-*` | **Not issued** while Production HOLD | — |

---

## 3. G2 execution-readiness actions

| # | Action | Env | Auth | Actor | Agent may run? | Notes |
|---|--------|-----|------|-------|----------------|-------|
| G2-01 | Install PostgreSQL 15+ client (`psql`) | Workstation | `A-DEP` | O | No | Per `M7B-POSTGRES-CLIENT-WINDOWS-20261124.md` |
| G2-02 | Pin/install `netlify-cli@26.2.0` under `tools/netlify-cli-pin` | Workstation | `A-DEP` | O | No | Per pin procedure; not required to finish G2 tests |
| G2-03 | `npm ci --prefix netlify/functions` | Workstation | `A-DEP` | O | No (unless Owner watches) | Need `pg@8.13.1` |
| G2-04 | `GRANT` SET ROLE memberships to project admin | Staging DB | `A-SQL` | O | No | Narrow grants only |
| G2-05 | `CREATE ROLE scs_test_admin` + password | Staging DB | `A-SQL` | O | No | LOGIN NOINHERIT |
| G2-06 | Fixture table grants to `scs_test_admin` | Staging DB | `A-SQL` | O | No | UPDATE/INSERT as documented |
| G2-07 | SET ROLE + fixture preflight SQL | Staging DB | `A-SQL` | O | No | Fail closed |
| G2-08 | Process-scoped env vars for harness | Workstation | — | O | No | No `setx` / no `.env` write |
| G2-09 | Run real-PG cases 1–13 | Staging DB | `A-DBTEST` | O or C w/ O | Yes if env preset by O | Case 14 stays NOT RUN |
| G2-10 | Write **new** sanitized G2 evidence | Repo `qa-m6b/` | (implied by A-DBTEST) | C/O | Yes | Never rewrite historical NOT RUN |
| G2-11 | Unset env; close shell; optional password rotate | Workstation | — | O | No | |
| G2-12 | Commit evidence | Git | `A-GIT-COMMIT` | O | No unless authorized | |

---

## 4. G4 implementation + hosted Auth actions

| # | Action | Env | Auth | Actor | Agent may run? | Notes |
|---|--------|-----|------|-------|----------------|-------|
| G4-01 | Implement owner-leads Function + JWT module + migration 008 (local) | Repo | Owner milestone approval | C | Yes after explicit G4 implement auth | **Separate** from frozen M7B; new candidate |
| G4-02 | `npm` add pinned `jose` / lockfile | Repo | `A-DEP` + G4 impl auth | C/O | Yes when authorized | |
| G4-03 | Apply migration 008 on staging | Staging DB | `A-SQL` | O | No | After G1–G3 as required |
| G4-04 | Create Auth users; disable sign-up; enroll TOTP | Staging Auth | `A-SQL` / Owner dashboard | O | No | Hand-entered codes |
| G4-05 | Insert allowlist UUID | Staging DB | `A-SQL` | O | No | |
| G4-06 | Set Netlify secrets (`DATABASE_OWNER_READ_URL`, `SCS_AUTH_*`, …) | Staging Netlify | `A-PROV-NET` | O | No | No secret keys / JWT HS256 |
| G4-07 | Deploy G4 candidate once | Staging Netlify | `A-DEPLOY` | O | No | |
| G4-08 | Run A1–A26 hosted Auth suite | Staging | `A-HOSTTEST` | O or C w/ O | Yes if authorized | Sanitizer on |
| G4-09 | A21 allowlist toggle / A22 NOLOGIN + pool drain | Staging | `A-SQL` + `A-HOSTTEST` | O | No for SQL toggles | |
| G4-10 | Optional second Free project (A18-F) | Staging+ | Owner decision | O | No | |
| G4-11 | Codex review of sanitized evidence | — | — | X | — | |
| G4-12 | Destroy staging | Cloud | `A-DESTROY` | O | No | After G5 |

---

## 5. Explicitly unauthorized (default deny)

| Action | Status |
|--------|--------|
| Any production Supabase/Netlify change | **HOLD** |
| Reuse staging owner password/TOTP in production | Forbidden |
| Store TOTP seeds in repo, env, chat, or evidence | Forbidden |
| Place `scs_owner_admin` or project admin URL in Netlify Functions | Forbidden |
| Treat case 8 simulated JWT as hosted Auth proof | Forbidden |
| Modify frozen M7B/R7 manifest files or historical NOT RUN JSON | Forbidden |
| Agent-held long-term DB passwords | Forbidden |
| Paid Supabase/Netlify add-ons without separate cost auth | Forbidden |

---

## 6. Minimum Owner authorizations to unblock next gates

| To unlock | Required tokens already satisfied | Next tokens |
|-----------|-----------------------------------|-------------|
| G2 execution | G1 exit + this readiness procedure prepared | `A-DEP`, `A-SQL` (memberships/fixture), `A-DBTEST` |
| G3 deploy | G2 PASS | `A-PROV-NET`, `A-DEPLOY` (+ link/push if Path A), `A-DEP` for CLI pin |
| G4 implement | Atlas accepts this spec | Explicit G4 implementation authorization (new) |
| G4 hosted accept | G3 + G4 code freeze | `A-SQL` (008), `A-HOSTTEST` |
| Production | Full staging accept + Codex + privacy | **New** `A-PROD-*` set — not in scope |

---

## 7. Related documents

- `M7B-G2-EXECUTION-READINESS-PROCEDURE-20261124.md`  
- `M7B-G4-HOSTED-AUTH-IMPLEMENTATION-SPEC-20261124.md`  
- `M7B-G2-G4-PLANNING-SUMMARY-20261124.md`  
- Claude G4 design + Nov 24 reconciliation addendum (Owner Downloads PDFs)
