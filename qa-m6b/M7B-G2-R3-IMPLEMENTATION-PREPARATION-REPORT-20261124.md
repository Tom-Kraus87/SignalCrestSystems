# M7B-G2-R3 — Implementation Preparation Report

**Date:** 2026-11-24  
**Milestone:** M7B-G2-R3 Connectivity and Execution Packet Closure (preparation)  
**Nature:** Preparation only — **no SQL executed, no DB connections, no credential access, no freeze/harness changes, no Git, no deploy**  
**Production:** **HOLD**  
**G2 execution:** Awaits separate Owner authorization; **G2 mutation authorization remains withheld**  
**Supersedes for apply guidance:** R2 packet set dated 20261124 (R2/R1/prior G2 files retained as historical — not deleted/overwritten)

---

## 1. Freeze integrity stance (this pass)

| Check | Result |
|-------|--------|
| Authoritative candidate SHA-256 | `3c7cebb3f27ebf55d1d002e2d8c480a451932ff43d1b4f39f579956cb2ad4d0b` |
| Freeze files modified this pass | **NONE** |
| Harness `verify-m7a-r2-postgres-integration-20261123.mjs` | **UNCHANGED** (read-only inspection) SHA-256 `826bf5c3845c8d9068831a07e87aaaecfdb721f3a009115a7bdda41c96c3d0f9` |
| `netlify/functions/_lib/pg-client.js` | **UNCHANGED** (read-only inspection) |
| `db/bootstrap/*`, `db/migrations/*` | **UNCHANGED** |
| R2 packet artifacts | **RETAINED** (not overwritten) |
| R3 packet manifest vs 59-file freeze | **Separate** — R3 hashes packet docs/SQL/proposal only |

**Verdict: frozen 59-file M7B candidate UNTOUCHED. Path A requires no freeze change. Path B would require a future freeze break (proposal only).**

Local evidence baseline (from freeze, not re-run): mock/static **265 / 265 PASS**; real-PG **NOT RUN**.

---

## 2. Owner-verified G1 configuration + live discovery (binding)

| Field | Value |
|-------|-------|
| Project | `scs-staging` |
| Organization | Signal Crest Systems LLC |
| Project reference | `kfclinlrzfwodmichmci` |
| Region | East US (Ohio), `us-east-2` |
| Status | Healthy |
| Data API | **Disabled** |
| Direct host | `db.kfclinlrzfwodmichmci.supabase.co:5432` |
| Shared pooler host | `aws-1-us-east-2.pooler.supabase.com` |
| Session pooler port | `5432` |
| Transaction pooler port | `6543` (**not** an unreviewed substitute) |
| Database | `postgres` |
| PostgreSQL (Owner-verified) | **17.12** / `server_version_num` **170012** |
| Admin identity (Owner-verified) | `current_user`=`postgres`, `session_user`=`postgres`; `rolsuper`=false; `rolcreaterole`=true; `rolcanlogin`=true |
| PG16+ gate | **PASS** |
| External connectivity | **UNVERIFIED** (Owner separate DNS/TCP/TLS/tool discovery) |

---

## 3. R3 assignment coverage map

| # | Correction | Where delivered |
|---|------------|-----------------|
| 1 | Independent custom-role authentication | SQL packet §D.1 + identity rules; Walkthrough §6–7 |
| 2 | Direct vs session pooler | SQL packet Path A/B gate; Walkthrough decision gate; **separate** Path B proposal |
| 3 | Fixture isolation expansion | SQL packet isolation table + §D.0; R3 SQL header; Walkthrough §0 |
| 4 | Consent-read negative control | SQL packet §D.5b; Correction Report §5 |
| 5 | Credential provisioning | SQL packet §B.5; Walkthrough §4.3; Prep §7 |
| 6 | Owner execution workflow | Walkthrough full rewrite of sequencing |
| — | Freeze preserved; R2 retained | Correction Report §1, §9 |

---

## 4. Path A vs Path B (mutually exclusive)

### Path A — Direct DB host (compatible with frozen candidate)

- Host: `db.kfclinlrzfwodmichmci.supabase.co:5432`
- Usernames: exact bare roles (`postgres` / `scs_*`)
- Harness: existing frozen file — **no change**
- Requires: verified network connectivity, TLS hostname validation, independent role authentication via external TLS-verifying client for fixture proofs

### Path B — Shared session pooler (requires separately authorized revision)

- Host: `aws-1-us-east-2.pooler.supabase.com:5432` (session)
- Usernames: provider project-qualified (`<role>.kfclinlrzfwodmichmci`)
- Harness/app identity validators: **incompatible** with exact-name checks
- Proposal: `M7B-G2-R3-HARNESS-CHANGE-PROPOSAL-PATH-B-20261124.md` — **NOT IMPLEMENTED**
- Transaction pooler `:6543`: forbidden as unreviewed substitute

**Preparation stance:** Authoritative R3 apply path assumes **Path A** until Owner decides otherwise after connectivity evidence.

---

## 5. Exact bootstrap / migration / overlay order

**SOLE DDL executor:** Supabase project administrator (Dashboard SQL Editor with `CREATEROLE`) for §B apply.  
**Independent fixture / custom-role proofs:** external TLS-verifying PostgreSQL client only (not SQL Editor).  
**Do not** use `scs_migration` (NOLOGIN).  
**Do not** use Function runtime URLs for DDL.

| Paste order | Relative path |
|------------:|---------------|
| 1 | `db/bootstrap/001_m7a_r4_role_bootstrap.sql` |
| 2 | `db/migrations/001_m7a_leads_foundation.sql` |
| 3 | `db/migrations/002_m7a_rls_least_privilege.sql` |
| 4 | `db/migrations/003_m7a_retention_procedures.sql` |
| 5 | `db/migrations/004_m7a_counters_idempotency.sql` |
| 6 | `db/migrations/005_m7a_insert_lead_bundle.sql` |
| 7 | `db/migrations/006_m7a_r2_security_hardening.sql` |
| 8 | `db/migrations/007_m7a_r4_security_corrections.sql` |
| 9 | `qa-m6b/M7B-G2-R3-staging-fixture-rls-policies-20261124.sql` |

**Interleaved Owner steps:** see Walkthrough (discovery already partially complete; Path A/B gate; passwords; §D via external client; harness only under `A-DBTEST`).

---

## 6. Fixture RLS design summary

**R3 overlay:** Policy/grant bodies intentionally identical to R2; header documents exclusive maintenance window + expanded baseline STOP rules.  
**Harness change:** **not required for Path A.**  
**Path B:** separate proposal only.

**Rejected:** BYPASSRLS, SUPERUSER, SQL Editor as independent `scs_test_admin` auth, transaction pooler shortcut, frozen harness edits in this pass.

---

## 7. Secure credential creation and storage (Owner-only)

**Hard rule:** Never put passwords in packet text, chat, AI context, committed files, SQL Editor history, shell arguments, logs, or evidence.

| Step | Guidance |
|------|----------|
| Role create | §B.3 creates `scs_test_admin` **without** password literal |
| Primary attempt | Owner may try Dashboard → Database → Roles **only after verifying** the UI can set passwords for custom login roles on this project |
| If UI unverified / unavailable | **STOP** assumption. Use separately authorized secure alternative |
| Preferred alternative | Local `psql` as CREATEROLE admin with interactive `\password scs_test_admin` (and other login roles) so the password is **prompted**, not placed on the command line or in SQL Editor history |
| Store | Password manager only |
| Harness wiring | Process-scoped env URLs only under `A-DBTEST`; Path A bare usernames |

---

## 8. Membership options (PostgreSQL 16+ only)

Unchanged from R2: PG16+ `INHERIT FALSE, SET TRUE, ADMIN FALSE` for required four targets; STOP if &lt;16 (already PASS at 170012); no optional `scs_owner_admin` SET ROLE membership; no project-admin inheritance attribute changes.

**Note:** Admin `SET ROLE` probes prove switchability for the **administrator** session. They are **not** independent fixture-role authentication.

---

## 9. Cross-session §D design (R3)

1. Exclusive serial staging maintenance window.  
2. Expanded baseline: all fixture-visible records (`is_test`, `r4%`, `it-%`, seed token) — STOP if unexpected.  
3. Admin seeds uniquely tagged → COMMIT (SQL Editor OK for admin).  
4. Independent `scs_test_admin` login via **external TLS-verifying client** — both `current_user` and `session_user` must match.  
5. Visibility + rollback mutations + isolated denials (incl. corrected consent probe).  
6. Admin cleanup → zero residual.  
7. Interrupted-test recovery retained.

---

## 10. Real-PG cases 1–13 (NOT executed)

**Harness:** frozen `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs`  
**Requires Path A** (or an accepted Path B revision + re-freeze — not this pass).  
**Auth:** `A-DEP` if needed, `A-SQL` preflight PASS, `A-DBTEST`.  
Case 14 remains NOT RUN (G4).

---

## 11. Authorization boundary confirmation

| Action | This preparation pass |
|--------|------------------------|
| SQL execution / DB connection | **NOT DONE** |
| Credential access | **NOT DONE** |
| Frozen source / harness changes | **NOT DONE** |
| Path B implementation | **NOT DONE** |
| Git / deploy | **NOT DONE** |
| Production | **HOLD** |
| G2 SQL apply / mutation auth | **Withheld — awaits `A-SQL`** |

---

## 12. Related artifacts

- Authoritative SQL: `qa-m6b/M7B-G2-R3-SQL-EXECUTION-PACKET-20261124.md`  
- Walkthrough: `qa-m6b/M7B-G2-R3-OWNER-WALKTHROUGH-20261124.md`  
- Corrections: `qa-m6b/M7B-G2-R3-CORRECTION-REPORT-20261124.md`  
- Path B proposal (not implemented): `qa-m6b/M7B-G2-R3-HARNESS-CHANGE-PROPOSAL-PATH-B-20261124.md`  
- Packet SHA-256 manifest: `qa-m6b/M7B-G2-R3-EXECUTION-PACKET-MANIFEST-20261124.md`  
- Overlay SQL: `qa-m6b/M7B-G2-R3-staging-fixture-rls-policies-20261124.sql`  
- Historical R2 (retained): `qa-m6b/M7B-G2-R2-*`  
- Freeze: `qa-m6b/M7B-AUDIT-SNAPSHOT-MANIFEST-20261124.md`
