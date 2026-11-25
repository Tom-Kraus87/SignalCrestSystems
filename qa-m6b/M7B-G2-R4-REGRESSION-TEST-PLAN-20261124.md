# M7B-G2-R4 — Independent Pool Identity Regression Test Plan

**Date:** 2026-11-24  
**Status:** Plan only — tests **not** implemented this pass  
**Harness under test (future):** `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs`  
**Proposed test file:** `qa-m6b/tests/m7b-g2-r4-independent-pool-identity-20261124.mjs`  
**Path:** **A** · Production **HOLD**

---

## 1. Goals

Prove the authorized preflight:

1. Independently authenticates all five configured pools before cases 1–13  
2. Requires both `current_user` and `session_user`  
3. Proves admin CREATEROLE  
4. Fails closed without admin fallback  
5. Rejects SET ROLE as “independent” auth  
6. Preserves TLS negative controls and Path A host rules  
7. Cleans up pools after partial failure  
8. Does not alter cases 1–13 assertions when preflight passes  

Prefer **unit/integration doubles** (fake clients / stubbed `Pool`) for identity logic; use real PostgreSQL only under separate `A-DBTEST`.

---

## 2. Required scenarios

| ID | Scenario | Setup | Expect |
|----|----------|-------|--------|
| R1 | All five correct identities | Each pool returns matching dual users; admin `rolcreaterole` true | Preflight PASS; gate opens to cases |
| R2a | Project admin auth failure | Admin connect/query rejects | FAIL; no cases; no fallback |
| R2b | Intake auth failure | Intake rejects | FAIL before fixture DML |
| R2c | Notify auth failure | Notify rejects | FAIL; notify not skipped |
| R2d | Owner auth failure | Owner rejects | FAIL before cases |
| R2e | Fixture auth failure | Fixture rejects | FAIL before fixture DML |
| R3 | Incorrect `current_user` | `session_user` correct, `current_user` wrong | FAIL closed |
| R4 | Incorrect `session_user` | `current_user` correct, `session_user` wrong | FAIL closed |
| R5 | SET ROLE masquerade | Login as admin; `SET ROLE scs_intake_runtime` so `current_user` matches intake but `session_user` stays `postgres` | Must **not** satisfy intake (or any non-admin) preflight |
| R6 | Admin without CREATEROLE | Dual users = `postgres` but `rolcreaterole=false` and not SUPERUSER | FAIL closed |
| R7 | Invalid notification credentials | Bad `DATABASE_NOTIFY_URL` password/user | Preflight FAIL on notify; suite does not continue |
| R8 | Failure before fixture mutations | Fail any preflight check; spy on fixture `query` | Fixture `query` never called for DML |
| R9 | Pool cleanup after partial preflight failure | Pass 1–2 pools, fail next; spy `pool.end` | All constructed pools `end()` in `finally` |
| R10a | TLS `rejectUnauthorized` required | Config without verified TLS | `buildHarnessPoolConfig` / preflight TLS path FAIL |
| R10b | TLS hostname verification required | Missing `checkServerIdentity` | FAIL |
| R10c | Case 7 wrong-hostname control | Existing case 7 behavior | Still certificate rejection FAIL-closed (no weakening) |
| R11 | Unapproved pooler host | Host `aws-1-us-east-2.pooler.supabase.com` | Reject before connect |
| R12 | Transaction pooler port | Port `6543` | Reject |
| R13 | Qualified username under Path A | User `scs_test_admin.kfclinlrzfwodmichmci` | Reject |
| R14 | Cases 1–13 preserved | Preflight PASS with doubles/real under auth | Existing assertions unchanged |
| R15 | No credential / URL logging | Force failures | Logs/evidence contain codes/labels only — never password or full URL |

---

## 3. Execution notes

| Mode | When |
|------|------|
| Local doubles (default for CI-style gate) | After `A-HARNESS` implements helpers; no live DB |
| Real-PG preflight smoke | Only with `A-DBTEST` + Path A URLs + verified TLS |
| Path B scenarios | **Out of scope** (not selected) |

**Never:** embed passwords, commit `.env`, or print connection URLs in test output.

---

## 4. Exit criteria

Regression plan is **satisfied** only when R1–R15 have automated or Owner-witnessed evidence under authorized runs, and Codex audit checklist in the R4 proposal is complete.
