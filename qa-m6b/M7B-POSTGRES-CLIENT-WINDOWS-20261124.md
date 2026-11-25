# M7B — PostgreSQL Client Installation Requirements (Windows)

**Date:** 2026-11-24  
**Scope:** Local Operator workstation prerequisites for future authorized migration apply / `psql` verification  
**Status:** Documentation only — **do not install in this pass**  
**Production:** HOLD  

## Why this exists

M7B-G0 preflight found **`psql` MISSING** on the Windows workstation. Owner-authorized staging apply may use either:

1. Supabase dashboard SQL editor (no local client), **or**  
2. Local `psql` against `DATABASE_PROJECT_ADMIN_URL` (when separately authorized)

This document states the **exact** Windows client requirements so G1+ does not rediscover the gap.

## Required client

| Item | Requirement |
|------|-------------|
| Product | PostgreSQL command-line client (`psql`) |
| Minimum major version | **PostgreSQL 15** (or newer 16/17 client is acceptable) |
| Architecture | Windows x64 |
| Optional bundling | Full PostgreSQL server is **not** required — client tools only are sufficient |
| PATH | `psql.exe` must resolve from a new PowerShell / cmd session (`Get-Command psql`) |

## Approved install options (choose one)

### Option A — Official EDB installer (client tools)

1. Download the Windows x64 installer from the official PostgreSQL / EDB Windows downloads page for **15+**.  
2. Run the installer.  
3. Select **Command Line Tools** (include `psql`). Server/service components may be deselected if not needed locally.  
4. Note the tools directory (typical):  
   `C:\Program Files\PostgreSQL\<version>\bin`  
5. Add that `bin` directory to the **User** or **System** PATH.  
6. Open a **new** PowerShell window and verify:

```powershell
Get-Command psql
psql --version
```

Expect a version line indicating PostgreSQL **15** or newer.

### Option B — Package manager (winget)

When winget catalogs an official PostgreSQL package that includes client tools:

```powershell
winget search PostgreSQL
# After Owner authorizes install (NOT this M7B pass):
# winget install --id <official-postgresql-package-id>
```

Then confirm `psql --version` as above. Prefer packages that ship **15+**.

### Option C — Dashboard SQL only (no local `psql`)

If the Owner elects dashboard-only apply:

- Local `psql` remains optional.  
- Document that choice in the staging apply evidence.  
- Still keep this client doc for Operators who later need CLI verify.

## Connection usage (future authorized runs only)

- Use **`DATABASE_PROJECT_ADMIN_URL` exclusively** for bootstrap + migrations 001–007.  
- **Do not** set `DATABASE_MIGRATION_URL` (unsupported; harness rejects presence).  
- Prefer URLs with `sslmode=verify-full`. Application / harness TLS still forces verified TLS.  
- Never log the full URL or password.  
- Fixture work uses `DATABASE_TEST_ADMIN_URL` → role `scs_test_admin` (minimum privileges; not SUPERUSER).

## Verification checklist (after a separately authorized install)

- [ ] `Get-Command psql` succeeds  
- [ ] `psql --version` ≥ 15  
- [ ] PATH persists across new shells  
- [ ] No production URL wired into local shells  

## Explicitly out of scope this pass

- No PostgreSQL server install  
- No `winget` / installer execution  
- No database connections  
- No SQL execution  

**Related:** `qa-m6b/M7A-R7-DATABASE-EXECUTOR-DECISION-20261123.md`, `qa-m6b/M7B-PRE-EXECUTION-CORRECTION-REPORT-20261124.md`
