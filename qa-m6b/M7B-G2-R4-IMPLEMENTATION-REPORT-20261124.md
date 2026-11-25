# M7B-G2-R4 — Targeted Harness Implementation Report

**Date:** 2026-11-24  
**Authorization:** Explicit Owner **A-HARNESS** (Atlas accepts narrow R4 implementation subject to successor freeze)  
**Path:** **A** selected · Path B **NOT implemented**  
**Production:** **HOLD**  
**Successor status:** **Provisional** pending Codex/Atlas acceptance

---

## 1. Verdict

Implemented Path A five-pool independent identity preflight in the real-PG harness, with fail-closed dual-user checks, admin CREATEROLE gate, pooler rejection, and `finally` pool cleanup. Local mock/static regression **PASS**. Real-PG cases 1–13 **NOT RUN**. Hosted Auth/AAL2 case 14 **NOT RUN**. No live database connections.

---

## 2. What was implemented (harness)

**Modified (allowlist #1):** `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs`

| Addition | Behavior |
|----------|----------|
| `assertPathAConnectionShape` | Exact host `db.kfclinlrzfwodmichmci.supabase.co`, port `5432`, bare username; rejects pooler hosts and `:6543` |
| `assertIndependentPoolIdentity` | Requires **both** `current_user` and `session_user`; admin requires CREATEROLE (or SUPERUSER via probe) |
| `runIndependentPoolIdentityPreflight` | Ordered five-pool Path A shape + identity; fail-closed; no admin credential fallback |
| `endPoolsQuietly` | `Promise.allSettled` pool `end()` for partial/complete failure |
| `runAuthorized` insertion | Preflight runs after five `Pool` constructs and **before** fixture DML / cases 1–13; `finally` always closes pools |

**Preserved:** cases 1–13 bodies/assertions; case 7 TLS negatives; case 14 hosted-auth NOT RUN class; strict TLS via existing `buildHarnessPoolConfig` / `pg-client.js`; Path A bare roles; credential redaction; runtime privilege restrictions; provider-managed anon/authenticated memberships (untouched in SQL).

**Not modified:** `netlify/functions/_lib/pg-client.js`, migrations/bootstrap, application features, Path B mapping.

---

## 3. Historical freeze recoverability

| Object | Value |
|--------|-------|
| Historical harness backup | `qa-m6b/evidence/m7b-g2-r4-historical-harness-826bf5c3-20261124/verify-m7a-r2-postgres-integration-20261123.mjs` |
| Verified original SHA-256 | `826bf5c3845c8d9068831a07e87aaaecfdb721f3a009115a7bdda41c96c3d0f9` |
| Attestation | `…/ORIGINAL-SHA256.txt` |
| Original 59-file digest | `3c7cebb3f27ebf55d1d002e2d8c480a451932ff43d1b4f39f579956cb2ad4d0b` (**preserved, not overwritten**) |
| Revised harness SHA-256 | `6f4f95ce3a6e7734a5cc769a9f46c7114f7c64d7d80901e6835150b2c9bcd2a2` |

---

## 4. Regression (mock/static only)

| Suite | Result | Evidence class |
|-------|--------|----------------|
| `qa-m6b/tests/m7b-g2-r4-independent-pool-identity-20261124.mjs` | **21 / 21 PASS** | mock/static local |
| `qa-m6b/verify-m7a-secure-leads-20261123.mjs` | **265 / 265 PASS** | mock/static local |
| `qa-m6b/_m7a-static-check.mjs` | PASS (30 themes; studio excluded) | static |
| `db/scripts/m7a-migration-executor-static.mjs` | PASS (0 SQL) | static |
| Real-PG harness (`SCS_AUTHORIZE_REAL_PG_TESTS` unset) | **NOT RUN** (14 cases) | real-postgresql |
| Hosted Auth/AAL2 case 14 | **NOT RUN** | hosted-auth |
| Hosted staging | **NOT RUN** | — |

**Do not treat mock/static PASS as real PostgreSQL evidence.**

R4 plan coverage (doubles): R1–R15 including auth failures ×5, dual-user mismatch, SET ROLE masquerade, admin CREATEROLE, notify fail, zero fixture DML on failure, pool cleanup, TLS negatives, pooler/6543/qualified-user rejects, cases preserved, credential redaction.

---

## 5. Successor candidate (provisional)

| Field | Value |
|-------|-------|
| Identifier | `M7B-G2-R4-SUCCESSOR-20261124` |
| Freeze timestamp (UTC) | `2026-11-25T00:25:29Z` |
| Entry count | **64** |
| Manifest SHA-256 | `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d` |
| Inventory JSON | `qa-m6b/M7B-G2-R4-SUCCESSOR-HASH-INVENTORY-20261124.json` |
| Manifest doc | `qa-m6b/M7B-G2-R4-SUCCESSOR-CANDIDATE-MANIFEST-20261124.md` |
| Comparison | `qa-m6b/M7B-G2-R4-ORIGINAL-TO-SUCCESSOR-COMPARISON-20261124.md` |

Inventory delta vs historical 59: **1 modified** (harness), **5 added**, **58 unchanged**, **0 removed**.

---

## 6. Prohibited actions confirmation

| Action | Status |
|--------|--------|
| Live database connections / SQL | **NOT DONE** |
| Credential access / `.env` reads for DB | **NOT DONE** |
| Dependency installation (`npm install` / `npm ci`) | **NOT DONE** |
| Path B implementation | **NOT DONE** |
| Application feature / migration / `pg-client` edits | **NOT DONE** |
| Git commit / push | **NOT DONE** |
| Netlify deploy / production changes | **NOT DONE** |
| Overwrite of historical 59-file freeze / historical harness hash record | **NOT DONE** |

---

## 7. Production / next gate

**Production: HOLD.**  
Stop for independent **Codex** review. Successor remains provisional until Codex/Atlas acceptance. Real-PG (`A-DBTEST`) and hosted Auth remain separately authorized.
