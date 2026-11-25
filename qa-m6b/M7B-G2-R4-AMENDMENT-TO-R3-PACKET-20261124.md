# M7B-G2-R4 — Amendment to R3 Packet

**Date:** 2026-11-24  
**Nature:** Targeted amendment only — **does not rewrite** accepted R3 sections  
**Base packet:** `M7B-G2-R3-*` (retained authoritative for unchanged topics)  
**This amendment supersedes R3 only where stated below**  
**Production:** **HOLD** · G2 mutation auth still withheld pending `A-SQL`  
**A-HARNESS (2026-11-24):** **IMPLEMENTED** (Path A five-pool identity preflight) — successor provisional pending Codex

---

## A. Path decision (supersedes R3 “pending Owner” gate)

| Item | R3 state | R4 amendment |
|------|----------|--------------|
| Path A vs B | Pending connectivity evidence | **Path A SELECTED** |
| Evidence | External connectivity UNVERIFIED | Direct DNS **AAAA success**; TCP **5432 TcpTestSucceeded=True (IPv6)**; session pooler TCP True but **not selected** |
| Path B | Proposal on standby | Remains **NOT implemented**; contingency only if Path A later fails TLS/client proof |
| Transaction pooler `:6543` | Forbidden | Still forbidden |

**Harness implication:** R4 proposes a Path A **preflight** correction (five-pool independent identity). It does **not** adopt R3 Path B username mapping.

---

## B. Live discovery updates (append to R3 §A evidence)

| Probe | R4 recorded result |
|-------|-------------------|
| PG version | 17.12 / 170012 (unchanged PASS) |
| §A.2 | `anon`/`authenticated` present (NOLOGIN + non-elevated attrs). **All five `scs_*` ABSENT** |
| §A.3 | `postgres` already member of `anon` + `authenticated`; ADMIN=true, INHERIT=true, SET=true; grantor ≈ `supabase_admin` |
| §A.4 / §A.5 | **Still pending Owner execution** |
| Tools | Node v22.22.3, npm 12.0.1; **psql NOT on PATH** |
| TLS hostname/cert | **Still UNVERIFIED** |

---

## C. §B.2 membership reconciliation (supersedes blind GRANT of anon/authenticated)

**Do not** blindly re-run R3 §B.2a `GRANT anon|authenticated … WITH INHERIT FALSE, SET TRUE, ADMIN FALSE` against provider-managed edges.

| Edge | R4 rule |
|------|---------|
| Provider `anon` / `authenticated` on `postgres` | **Preserve** — no revoke/replace/option downgrade |
| `scs_intake_runtime` / `scs_notify_worker` | Grant **only if missing** after bootstrap, with PG16+ `INHERIT FALSE, SET TRUE, ADMIN FALSE` |
| `scs_owner_admin` SET ROLE membership | Still **do not add** |

If SET ROLE to `anon`/`authenticated` fails under preserved edges → STOP / escalate (unchanged R3 spirit).

Admin SET ROLE probes still **≠** independent fixture/pool authentication.

---

## D. Harness correction (new — not in R3 apply path)

R3 stated Path A needs **no harness change**. R4 amends that statement:

| Topic | Amendment |
|-------|-----------|
| Why | Codex P1: five pools constructed without independent dual-user proof before cases/fixture DML |
| What | Fail-closed preflight: all five pools; both `current_user` and `session_user`; admin CREATEROLE; Path A host gates; `finally` cleanup |
| When | **`A-HARNESS` granted 2026-11-24 — IMPLEMENTED** |
| Code | `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs` (revised SHA-256 `6f4f95ce…`) |
| Test | `qa-m6b/tests/m7b-g2-r4-independent-pool-identity-20261124.mjs` (21/21 mock/static PASS) |
| Docs | `M7B-G2-R4-TARGETED-HARNESS-CORRECTION-PROPOSAL-20261124.md` + `M7B-G2-R4-IMPLEMENTATION-REPORT-20261124.md` |
| Freeze | Historical `3c7cebb3…` / harness `826bf5c3…` preserved; successor `683cc3f5…` (64 entries) provisional |

R3 Path A “no change” remains true for **pooler username compatibility**. It is **amended** for **independent pool identity preflight** (now implemented under Path A).

---

## E. Owner sequence delta

Insert into R3 walkthrough mentally (full rewrite avoided):

1. Path A is decided (this amendment).  
2. Finish §A.4 / §A.5 + TLS validation.  
3. `A-SQL` apply with **reconciled §B.2** (section C).  
4. Independent §D via TLS client (Node/`pg` acceptable if `psql` missing; SQL Editor still forbidden as fixture auth).  
5. **`A-HARNESS`** implement R4 preflight allowlist.  
6. Successor freeze.  
7. **`A-DBTEST`** real-PG cases 1–13.

Missing `psql` does **not** undo Path A selection; it constrains which external client runs §D until `A-DEP` or Node-based §D is authorized.

---

## F. Authorization boundaries (updated for A-HARNESS impl)

| Bound | Status |
|-------|--------|
| A-HARNESS harness + R4 test | **DONE** (allowlist only) |
| SQL / DB / credentials / installs / Git / deploy | **Not done** |
| Historical 59-file freeze + harness `826bf5c3…` | **Preserved** (backup + original digest untouched) |
| Successor candidate | **Provisional** (`683cc3f5…`, 64 entries) |
| Path B implementation | **Not done** |
| Real-PG / hosted Auth / staging | **NOT RUN** |
| Production | **HOLD** |

---

## G. What R3 still owns (not rewritten)

- Bootstrap/migration paste order  
- Fixture RLS overlay design + consent `42501` contract  
- §D isolation / exclusive maintenance window  
- Credential storage rules (no secrets in evidence)  
- Case 14 hosted Auth NOT RUN (G4)  
- Path B proposal text (historical contingency)

---

## H. Companion R4 deliverables

### Preparation (prior)

- `M7B-G2-R4-TARGETED-HARNESS-CORRECTION-PROPOSAL-20261124.md`  
- `M7B-G2-R4-FILE-CHANGE-ALLOWLIST-20261124.md`  
- `M7B-G2-R4-REGRESSION-TEST-PLAN-20261124.md`  

### Implementation (this A-HARNESS pass)

- `M7B-G2-R4-IMPLEMENTATION-REPORT-20261124.md`  
- `M7B-G2-R4-FILE-CHANGE-INVENTORY-20261124.md`  
- `M7B-G2-R4-LOCAL-REGRESSION-EVIDENCE-20261124.md`  
- `M7B-G2-R4-SUCCESSOR-CANDIDATE-MANIFEST-20261124.md`  
- `M7B-G2-R4-SUCCESSOR-HASH-INVENTORY-20261124.json`  
- `M7B-G2-R4-ORIGINAL-TO-SUCCESSOR-COMPARISON-20261124.md`  
- `M7B-G2-R4-CODEX-REVIEW-CHECKLIST-20261124.md`  
- Matching PDFs under `qa-m6b/pdf/`
