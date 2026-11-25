# M7B-G2 — Option C R1 Final Offline Acceptance

**Date:** 2026-11-25  
**Milestone:** M7B-G2  
**Decision authority:** Atlas  
**Document type:** Final offline acceptance record for Option C revision `option-c-r1`  
**Independent auditor:** Codex  
**Production:** **HOLD**

This record accepts Codex’s independent Option C R1 security audit. It does **not** authorize live provisioning, credentials, SQL, database access, A-CRED, A-DBTEST, migration work, deployment, or Production release.

Historical R0 materials and all R1 evidence remain preserved. The accepted utility and its inventory were **not** modified by this acceptance recording.

---

## 1. Acceptance verdict

Atlas **accepts** the independently audited Option C R1 offline candidate.

| Field | Value |
|-------|-------|
| Independent verdict | **PASS WITH CONDITIONS** |
| Offline implementation gate | **CLOSED** |
| Independent tests | **42 passed, 0 failed, 0 skipped** |
| Unresolved P0 findings | **0** |
| Unresolved P1 findings | **0** |
| Utility inventory | **18 payload files plus inventory** |
| Historical R4 integrity | **64/64 verified** |
| External network during independent tests | **None** |
| Accepted Option C R1 canonical inventory digest | `4277cd555c2c90aa188d4f201b905b8895b29ecd436046263c4bbfdc898e99cc` |
| Accepted inventory file SHA-256 | `06647c0f875adc52a37e764ffc5e3734b0b80e310468d86da6b168dd26803571` |
| Historical R4 canonical digest | `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d` |

---

## 2. Candidate identity and integrity evidence

| Field | Value |
|-------|-------|
| Candidate | Option C administrative utility, revision `option-c-r1` |
| Location | `tools/option-c-admin/` |
| Inventory | `tools/option-c-admin/SHA256-INVENTORY.json` |
| Scope | Utility files only; inventory file excluded from the canonical digest |
| Entry count (payload) | 18 |
| Sort method for Option C digest | JavaScript UTF-16 code-unit order |
| Predecessor commit | `2c0e808b45a757ab205e79dd945925abd3f09dfd` |
| Predecessor digest (recomputed before R1 edits) | `850dac2809058fada1478c8846867631ad026ebe3b53dc8b1f725e644ce30c4e` |
| Preserved R0 inventory bytes | `qa-m6b/evidence/option-c-r0-2c0e808/SHA256-INVENTORY.json` |
| Preserved R0 recompute note | `qa-m6b/evidence/option-c-r0-2c0e808/PRIOR-DIGEST.txt` |

### Historical R4 integrity (unchanged)

Read-only rehash of the 64 paths in `qa-m6b/M7B-G2-R4-SUCCESSOR-HASH-INVENTORY-20261124.json`:

| Check | Result |
|-------|--------|
| Files modified | No |
| Inventory modified | No |
| Per-file SHA-256 and byte size | 64 match, 0 mismatches |
| Canonical digest (PowerShell `Sort-Object Path`) | `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d` |

The frozen R4 candidate, frozen helper `netlify/functions/_lib/pg-client.js`, `scripts/build-public.mjs`, and `db/migrations` were not modified by Option C R1 or by this acceptance.

### Supporting R1 evidence (preserved, not overwritten)

- `qa-m6b/M7B-G2-OPTION-C-R1-OFFLINE-TEST-RESULTS-20261125.md`
- `qa-m6b/M7B-G2-OPTION-C-R1-FINDINGS-DISPOSITION-20261125.md`
- `qa-m6b/M7B-G2-OPTION-C-R1-CODEX-ACCEPTANCE-HANDOFF-20261125.md`

### Historical R0 failure record (preserved)

R0 remains on record and is **not** accepted. Preserved without deletion or overwrite:

- `qa-m6b/M7B-G2-OPTION-C-OFFLINE-TEST-RESULTS-20261125.md` (24 pass / 0 fail; predecessor suite)
- `qa-m6b/M7B-G2-OPTION-C-CODEX-ACCEPTANCE-HANDOFF-20261125.md`
- `qa-m6b/evidence/option-c-r0-2c0e808/` (inventory bytes and prior digest)

R0 required corrective revision for canary lifecycle, connection cleanup, administrator-password handling, resume rejection, and result vocabulary. Those findings are disposed under §4.

---

## 3. Independent audit results

Codex performed an independent Option C R1 security audit. Atlas accepts the following recorded results exactly:

| Result | Accepted value |
|--------|----------------|
| Verdict | **PASS WITH CONDITIONS** |
| Offline implementation gate | **CLOSED** |
| Tests | **42 passed, 0 failed, 0 skipped** |
| Unresolved P0 | **0** |
| Unresolved P1 | **0** |
| Utility inventory | **18 payload files plus inventory** |
| Historical R4 integrity | **64/64 verified** |
| External network during independent tests | **None** |

Offline suite reference (implementation evidence, not a substitute for the independent audit):

- Command: `node --test tools/option-c-admin/test/offline.test.mjs`
- Node: v22.22.3
- Detail: `qa-m6b/M7B-G2-OPTION-C-R1-OFFLINE-TEST-RESULTS-20261125.md`
- Network attempts observed by the suite: 0
- Live authorization phrase: absent
- `--live`: not executed

Public exclusion (test 22): utility remains outside `ALLOWED_FILES`, is not imported by `netlify/functions`, is not one of the frozen 64, and was not found under `dist/`. `dist/` was not rebuilt for this acceptance.

---

## 4. Original findings disposition

Source matrix: `qa-m6b/M7B-G2-OPTION-C-R1-FINDINGS-DISPOSITION-20261125.md`.

| Finding | Disposition |
|---------|-------------|
| P0.1 Abort if canary already exists; no reuse/normalize/alter/remove | **IMPLEMENTED** |
| P0.2 Create disposable canary `NOLOGIN` and nonprivileged | **IMPLEMENTED** |
| P0.3 Verify attributes, creator ADMIN edge, membership, privileges before synthetic verifier | **IMPLEMENTED** |
| P0.4 Logging controls accepted and read back before canary credential statement | **IMPLEMENTED** |
| P0.5 Explicit owner acknowledgment; missing/rejected/inconclusive is terminal | **IMPLEMENTED** |
| P0.6 Failed or inconclusive canary inspection is terminal | **IMPLEMENTED** |
| P0.7 Remove canary before any real target-role credential change | **IMPLEMENTED** |
| P0.8 Independently confirm canary no longer exists | **IMPLEMENTED** |
| P0.9 Do not proceed to targets if cleanup or absence verification fails | **IMPLEMENTED** |
| P0.10 Do not automatically retry an ambiguous canary transaction | **IMPLEMENTED** |
| P1 Connection lifecycle — close every client in a `finally` path; preserve primary error | **IMPLEMENTED** |
| P1 Administrator password — never place the real password in a helper URL | **IMPLEMENTED** |
| P1 Resume — reject `--resume-after`; no unverified role skipping | **IMPLEMENTED** |
| P1 Independent login — do not execute role logins; do not treat unverified provisioning as final acceptance | **IMPLEMENTED** for the utility boundary; login proof itself **DEFERRED** to A-DBTEST |
| P1 Result semantics — no provisioning `PASS` or `VERIFIED` | **IMPLEMENTED** |
| P2/P3 Authorization phrase is an operational guard, not an authentication boundary | **IMPLEMENTED** (documented; variable not set) |
| P2/P3 Unique temporary file path with guaranteed cleanup | **IMPLEMENTED** |

Unresolved P0 findings after R1: **0**.  
Unresolved P1 findings after R1: **0**.

---

## 5. Remaining P2/P3 limitations (conditions)

The accepted verdict is **PASS WITH CONDITIONS**. The conditions are residual limitations, not open P0/P1 defects:

1. **Live path unexercised.** Live execution is not authorized and was not run. Discovery values (`password_encryption`, `scram_iterations`, `createrole_self_grant`) are not yet recorded from the staging server for an authorized live window.
2. **Independent authentication deferred.** Correct-password and incorrect-password login remain A-DBTEST and were not run. `PROVISIONED_UNVERIFIED` is not final acceptance.
3. **Frozen helper URL shape.** The helper still parses a URL whose password is the fixed placeholder `option-c-placeholder-not-a-secret`. The real administrator secret is a separate buffer. A buffer equal to the placeholder fails closed (`OC-SECRET-IN-URL`).
4. **Verifier string wipe.** JavaScript strings that hold a SCRAM verifier cannot be wiped. They are not logged.
5. **Per-statement code token.** The per-statement code `OC-ROLE-PASS` still exists. The outcome field is not `PASS` and is not `VERIFIED`.
6. **Canary edge shape not live-observed.** The expected canary creator ADMIN edge matches an empty `createrole_self_grant`. A live server that does not match fails closed. That shape was not observed on a server in this revision.
7. **Ambiguous-canary cleanup DROP.** One cleanup `DROP` after an ambiguous canary commit is not a retry of the credential transaction; it does not continue into target roles.
8. **CLI acknowledgment callback.** The pre-existing acknowledgment callback for a future authorized run was not executed by this revision.
9. **Authorization phrase residual.** `SCS_OPTION_C_LIVE_AUTHORIZATION` remains an operational guard only. It is not an authentication boundary and was not set.

These conditions do **not** reopen the offline implementation gate. They bound any later live authorization.

---

## 6. Live-provider prerequisites

Recorded for a later window only. They are **not** steps authorized by this acceptance. Source: `tools/option-c-admin/OWNER-EXECUTION-PROCEDURE-NOT-AUTHORIZED.md` and the A-SQL addendum.

1. Record `SHOW password_encryption` as `scram-sha-256`. Any other value is a stop.
2. Record `SHOW scram_iterations` as a positive integer returned by the server. Do not invent a count.
3. Record `SHOW createrole_self_grant` as empty. A non-empty value is a stop.
4. Confirm bootstrap and later creation of `scs_test_admin` under their own authorization so the four password-bearing roles exist.
5. Create four password-manager entries (minimum 32 printable ASCII characters, unique). No password for `scs_migration`. No password in chat, files, or arguments.
6. Use a fresh terminal. Do not set `DATABASE_URL`, `SUPABASE_DB_URL`, or `PGPASSWORD`.
7. Supply the Dashboard CA already proven by A-TLS (`DATABASE_SSL_CA` or `DATABASE_SSL_CA_PATH`). Do not weaken TLS.
8. Set `SCS_OPTION_C_LIVE_AUTHORIZATION` to the exact expected phrase **only after** a separate written live authorization that names Signal Crest Systems LLC, project `scs-staging`, ref `kfclinlrzfwodmichmci`, and this utility. Unset it when the terminal closes.
9. Path A only: host `db.kfclinlrzfwodmichmci.supabase.co`, port `5432`, user `postgres`, database `postgres`, `verify-full`, `rejectUnauthorized` true, hostname verification on. Pooler hosts and port 6543 are refused.

---

## 7. Explicit authorization boundaries

| Action | Status under this acceptance |
|--------|------------------------------|
| Offline Option C R1 implementation gate | **CLOSED** (accepted) |
| Live Option C execution (`--live`) | **NOT AUTHORIZED** |
| A-CRED (live credential provisioning) | **UNAUTHORIZED** |
| A-DBTEST (independent role authentication) | **UNAUTHORIZED** |
| A-SQL / SQL execution | **UNAUTHORIZED** |
| Database access / network to staging DB | **UNAUTHORIZED** |
| Credentials / password or verifier generation for roles | **UNAUTHORIZED** |
| Migration implementation (including 008) | **UNAUTHORIZED** |
| Dependency installation | **UNAUTHORIZED** |
| Deployment | **UNAUTHORIZED** |
| Production release | **HOLD** |
| Edit to accepted utility or its inventory by this record | **NOT DONE** |
| Overwrite of R0 failure record or R1 evidence | **NOT DONE** |

This acceptance closes the **offline** implementation gate only. It does not issue A-CRED, A-DBTEST, or any live-provider authorization.

---

## 8. Preferred provisioning method and fallback

### Option C preferred

Atlas selects the reviewed local Node.js SCRAM-SHA-256 Option C utility (`tools/option-c-admin`, revision `option-c-r1`) as the **preferred** future credential-provisioning method for the four staging roles:

- `scs_intake_runtime`
- `scs_notify_worker`
- `scs_owner_admin`
- `scs_test_admin`

Preference does **not** authorize execution. Live use still requires a separate written authorization (A-CRED) after live-provider prerequisites are met.

### `psql` password procedure retained as fallback

The owner-operated `psql` `\password` procedure remains the documented **fallback**, subject to separate authorization and client availability. Per the A-SQL addendum and R4/discovery records, `psql` is not on PATH; installing it requires `A-DEP`, which is not authorized by this acceptance. Plaintext must never pass through the SQL Editor.

| Method | Status |
|--------|--------|
| (c) Option C — reviewed local Node SCRAM-SHA-256 utility | **Preferred** (offline accepted; live unauthorized) |
| (b) `psql` `\password` | **Fallback retained** (not selected for execution; `A-DEP` may be required) |
| (a) Dashboard Roles UI | Unverified; not selected |

---

## 9. Maximum successful A-CRED result

If A-CRED is later authorized and a provisioning run completes without failure, the maximum successful utility outcome is:

**`PROVISIONED_UNVERIFIED`**

It is **not** `PASS`.  
It is **not** `VERIFIED`.

Allowed outcomes remain only:

- `OFFLINE_SELF_TEST_PASS`
- `CANARY_VERIFIED`
- `PROVISIONED_UNVERIFIED`
- `PARTIAL_PROVISIONING`
- `COMMIT_OUTCOME_UNKNOWN`
- `FAILED`

`CANARY_VERIFIED` means the canary transaction, acknowledgment, drop, and absence proof succeeded. It is not final acceptance of the four roles.

A-CRED remains **unauthorized** under this acceptance.

---

## 10. Independent authentication assigned to A-DBTEST

Independent correct-password and incorrect-password authentication is assigned to **A-DBTEST**, not to A-CRED and not to Option C offline acceptance.

Required shape (for a later authorized window; not run now):

1. Connect over Path A with the frozen TLS helper as each role. `current_user` and `session_user` must both equal the role.
2. Confirm a deliberately wrong password is rejected.
3. Confirm `scs_migration` still cannot log in.
4. Confirm session logging defaults after transaction-local settings end.

`SET ROLE` and the SQL Editor do **not** satisfy this check. Until A-DBTEST evidence exists, independent login remains `NOT-RUN` and provisioning evidence remains at most `PROVISIONED_UNVERIFIED`.

A-DBTEST remains **unauthorized** under this acceptance.

---

## 11. Local versus remote candidate status

| Candidate class | Status |
|-----------------|--------|
| **Local offline Option C R1 candidate** (`tools/option-c-admin`, digest `4277cd…`) | **ACCEPTED** for offline implementation; gate **CLOSED** |
| **Local historical R0 candidate** (commit `2c0e808…`, digest `850dac…`) | **NOT ACCEPTED**; preserved under `qa-m6b/evidence/option-c-r0-2c0e808/` and original R0 handoff/results |
| **Historical R4 successor** (64-file freeze, digest `683cc3f…`) | **Unchanged and verified** 64/64; not rewritten by Option C |
| **Remote / live staging provider execution candidate** | **NOT ACCEPTED**; no live run; no remote provisioning evidence; A-CRED and A-DBTEST unauthorized |
| **Foreign workspace** (`C:\Dev\Stone-Harbor-Website`) | **Not touched** |

This acceptance applies only to the local offline Option C R1 utility candidate in the Signal Crest Systems LLC workspace. It does not accept any remote live-provider run and does not create a remote deployment candidate.

---

## 12. Atlas acceptance and offline gate closure

Atlas accepts Codex’s independent Option C R1 security audit as **PASS WITH CONDITIONS**.

**Offline implementation gate: CLOSED.**

Closure means the offline Option C R1 corrective implementation and its independent audit are accepted for the recorded digests and test counts above. Closure does **not** authorize:

- A-CRED
- A-DBTEST
- live utility execution
- database access
- SQL
- credentials
- migration implementation
- deployment

**Production remains HOLD.**

---

## 13. Preservation and non-modification statement

This document is a **new** acceptance/status record only.

- Original R0 failure record preserved.
- All R1 evidence preserved.
- Accepted utility (`tools/option-c-admin/`) untouched by this recording.
- Accepted inventory (`tools/option-c-admin/SHA256-INVENTORY.json`) untouched by this recording.
- Frozen R4 inventory and payloads untouched.
- No Git commit or push performed by this acceptance recording assignment.
- No network, database access, SQL, credentials, live utility execution, migration implementation, or deployment performed by this assignment.
