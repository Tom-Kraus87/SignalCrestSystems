# M7B — G2 / G4 Planning Summary

**Date:** 2026-11-24  
**Nature:** Planning only  
**M7B freeze:** manifest SHA-256 `3c7cebb3f27ebf55d1d002e2d8c480a451932ff43d1b4f39f579956cb2ad4d0b` (59/59); local 265/265 PASS  
**Status:** Local implementation **CONDITIONAL** · G1 **ELIGIBLE** · G2/G3 **BLOCKED** · G4 **SPEC READY** · Production **HOLD**  
**Frozen candidate / historical R7:** **untouched** in this pass

---

## 1. Deliverables (this pass)

| Artifact | Path |
|----------|------|
| G2 execution-readiness procedure | `qa-m6b/M7B-G2-EXECUTION-READINESS-PROCEDURE-20261124.md` (+ PDF) |
| G4 hosted-auth implementation spec | `qa-m6b/M7B-G4-HOSTED-AUTH-IMPLEMENTATION-SPEC-20261124.md` (+ PDF) |
| Owner authorization matrix | `qa-m6b/M7B-OWNER-AUTHORIZATION-MATRIX-20261124.md` (+ PDF) |
| This summary | `qa-m6b/M7B-G2-G4-PLANNING-SUMMARY-20261124.md` (+ PDF) |

Sources used: M7B pre-exec / R7 executor docs; real-PG harness (read-only); Claude G4 Hosted Auth design + Nov 24 reconciliation addendum; M7A owner allowlist / AAL2 migrations.

---

## 2. Exact remaining blockers

### 2.1 Block G2 (database tests)

| ID | Blocker | Clear by |
|----|---------|----------|
| B-G2-1 | Project-admin **SET ROLE** memberships not verified/applied for `scs_intake_runtime`, `anon`, `authenticated`, `scs_notify_worker` | Owner `A-SQL` + preflight §4 of G2 procedure |
| B-G2-2 | Staging `scs_test_admin` not created / password not set | Owner `A-SQL` |
| B-G2-3 | Fixture DML grants on `idempotency_keys`, `lead_deletion_markers`, `notification_outbox`, `leads` not applied | Owner `A-SQL` |
| B-G2-4 | Effective SET ROLE + fixture preflight not PASSed | Owner run preflight |
| B-G2-5 | Workstation may still lack `psql` (optional if dashboard-only apply) and Functions `npm ci` / `pg@8.13.1` | Owner `A-DEP` |
| B-G2-6 | Process-scoped harness env + `A-DBTEST` not yet issued | Owner |
| B-G2-7 | G1 must remain satisfied (project ref, SSL, bootstrap 001–007 applied) | G1 exit criteria |

### 2.2 Block G3 (deploy)

| ID | Blocker | Clear by |
|----|---------|----------|
| B-G3-1 | G2 not PASS | Complete G2 |
| B-G3-2 | Netlify CLI 26.2.0 project pin not installed | `A-DEP` + pin procedure |
| B-G3-3 | Staging Netlify project / secrets / single deploy not authorized | `A-PROV-NET`, `A-DEPLOY` |

### 2.3 Block G4 (hosted Auth)

| ID | Blocker | Clear by |
|----|---------|----------|
| B-G4-1 | G4 code not implemented (new milestone; outside M7B freeze) | Explicit G4 implementation authorization |
| B-G4-2 | G1–G3 not complete | Prior gates |
| B-G4-3 | Supabase-managed `auth.sessions` schema + SELECT grantability **unverified** on real staging | Staging observation before locking SQL |
| B-G4-4 | Staging JWKS asymmetric algorithm not yet observed | Pin `SCS_AUTH_JWT_ALG` |
| B-G4-5 | Auth users, allowlist row, TOTP factors, Netlify reader URL not provisioned | Owner dashboard + `A-SQL` / `A-PROV-NET` |
| B-G4-6 | `A-HOSTTEST` not issued; case 14 harness still NOT RUN by design until G4 runner exists | Owner |
| B-G4-7 | Pool-drain procedure for A22/`NOLOGIN` must be proven (F3) | Staging experiment under `A-SQL` |

### 2.4 Production

| ID | Blocker |
|----|---------|
| B-PROD | **HOLD** — no production auth; requires full staging accept, Codex G5, privacy, and separate `A-PROD-*` |

---

## 3. Estimated implementation effort and dependencies

### 3.1 G2 readiness → first PASS (execution, not coding)

| Item | Owner wall-clock | Dependencies |
|------|------------------|--------------|
| `A-DEP` tools + `npm ci` | 0.5–1.5 h | Network; pin docs |
| Memberships + `scs_test_admin` + grants + preflight | 0.5–1.5 h | G1 DB; `A-SQL` |
| Harness cases 1–13 | 0.5–1.0 h | `A-DBTEST`; env hygiene |
| Evidence sanitize | 0.5 h | — |
| **Total G2 execution** | **~2–5 h** | G1 complete |

### 3.2 G4 implementation (after authorize)

| Package | Eng-days | Dependencies |
|---------|----------|--------------|
| Migration 008 (reader, definer, RPC, allowlist active, rate RPC) | 0.5–1.0 | §10 session verify; `A-SQL` |
| JWT module + pinning + owner-leads endpoint | 1.0–1.5 | `jose`; observed alg; G3 or local emulate |
| Hosted Auth runner A1–A26 + sanitizer | 1.5–2.5 | Deployed endpoint; Auth users; Owner TOTP |
| Unit JWKS mocks + docs/manifest | 0.5–1.0 | — |
| **Total G4 build+prove** | **~4–6 eng-days** + Owner TOTP time | G1–G3; Atlas G4 auth |

### 3.3 External dependencies

- Supabase Free staging (2 users; MFA; asymmetric JWT)  
- Netlify Pro credits (existing; recharge disabled)  
- Owner authenticator devices (primary + backup)  
- Codex review slots for G2 evidence and G4 candidate  
- Optional second Free project for A18-F  

**Incremental $:** $0 conditional (same Free/Pro constraints as runbook).

---

## 4. Atlas chat return pack (concise)

1. **G2 procedure** — SET ROLE memberships, fixture role/grants, preflight, env hygiene, tool installs, Owner vs agent: `M7B-G2-EXECUTION-READINESS-PROCEDURE-20261124.md`  
2. **G4 spec** — file-by-file endpoint/JWT/RPC/allowlist/rate-limit/timeouts/evidence + 26-row matrix + Atlas findings: `M7B-G4-HOSTED-AUTH-IMPLEMENTATION-SPEC-20261124.md`  
3. **Owner auth matrix** — `M7B-OWNER-AUTHORIZATION-MATRIX-20261124.md`  
4. **Blockers** — §2 above (SET ROLE/fixture/preflight/deps for G2; schema/alg/impl/hosttest for G4; Production HOLD)  
5. **Effort** — G2 ~2–5 Owner hours; G4 ~4–6 eng-days after gates  

---

## 5. Confirmations

- Planning only; **no** SQL, DB connections, installs, Git, provision, deploy, or hosted tests executed.  
- Frozen M7B candidate and historical R7 evidence **not modified**.  
- Production remains **HOLD**.
