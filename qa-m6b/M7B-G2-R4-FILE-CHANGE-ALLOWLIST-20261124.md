# M7B-G2-R4 — Exact Proposed File-Change Allowlist

**Date:** 2026-11-24  
**Status:** Allowlist **executed** under Owner `A-HARNESS` (2026-11-24) — see implementation report  
**Path:** **A** selected · Path B **out of scope**  
**Production:** **HOLD**  
**Token:** `A-HARNESS` granted; successor freeze provisional pending Codex

---

## Allowed under separately authorized implementation

| # | Path | Action | Purpose |
|--:|------|--------|---------|
| 1 | `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs` | **MODIFY** | Path A host/port/bare-username gates; five-pool independent `current_user`+`session_user` preflight; admin CREATEROLE check; fail-closed auth; `finally` pool cleanup; preserve cases 1–13 + TLS |
| 2 | `qa-m6b/tests/m7b-g2-r4-independent-pool-identity-20261124.mjs` | **CREATE** | Regression coverage per R4 test plan |

---

## Explicitly NOT on the allowlist

| Path / class | Reason |
|--------------|--------|
| `netlify/functions/_lib/pg-client.js` | Path A reuses existing TLS/identity helpers unchanged |
| `netlify/functions/**` (other) | Not required for preflight |
| `db/bootstrap/**`, `db/migrations/**` | SQL apply is separate `A-SQL` track |
| R3 Path B harness/app username mapping | Path B **not selected** |
| Historical freeze manifest / prior packet hashes | **Never overwrite**; emit successor manifest after impl |
| Production config / deploy | **HOLD** |
| Credential files / `.env` | Never commit secrets |

---

## Documentation produced this pass (not harness code)

| Path | Notes |
|------|-------|
| `qa-m6b/M7B-G2-R4-TARGETED-HARNESS-CORRECTION-PROPOSAL-20261124.md` (+ PDF) | Authoritative proposal |
| `qa-m6b/M7B-G2-R4-FILE-CHANGE-ALLOWLIST-20261124.md` (+ PDF) | This file |
| `qa-m6b/M7B-G2-R4-REGRESSION-TEST-PLAN-20261124.md` (+ PDF) | Test matrix |
| `qa-m6b/M7B-G2-R4-AMENDMENT-TO-R3-PACKET-20261124.md` (+ PDF) | R3 delta only |

---

## Freeze stance

| Object | Rule |
|--------|------|
| Original 59-file digest `3c7cebb3…` | Preserve historical record |
| Original harness hash `826bf5c3…` | Untouched until `A-HARNESS` |
| After authorized edit | Publish **new successor** candidate manifest — do not rewrite history |
