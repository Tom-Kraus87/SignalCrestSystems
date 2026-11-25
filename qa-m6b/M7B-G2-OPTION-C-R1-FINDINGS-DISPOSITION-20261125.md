# M7B-G2 — Option C R1 findings disposition

**Date:** 2026-11-25  
**Revision:** option-c-r1  
**Predecessor:** `2c0e808b45a757ab205e79dd945925abd3f09dfd`  
**Production:** **HOLD**  
**Live use:** **NOT AUTHORIZED**

This matrix records the corrective revision. It is not an acceptance. Historical candidate evidence remains at `qa-m6b/M7B-G2-OPTION-C-OFFLINE-TEST-RESULTS-20261125.md`, `qa-m6b/M7B-G2-OPTION-C-CODEX-ACCEPTANCE-HANDOFF-20261125.md`, and `qa-m6b/evidence/option-c-r0-2c0e808/`.

The predecessor digest `850dac2809058fada1478c8846867631ad026ebe3b53dc8b1f725e644ce30c4e` was recomputed from the 18 on-disk files before any R1 edit, excluding the inventory file. It matched. The preserved inventory bytes are the copy under `qa-m6b/evidence/option-c-r0-2c0e808/SHA256-INVENTORY.json`.

| Finding | Disposition | Evidence |
| --- | --- | --- |
| P0.1 Abort if the canary role already exists. Do not reuse, normalize, alter, or remove it. | IMPLEMENTED | `SQL_CANARY_EXISTS` then `OC-CANARY-EXISTS` before `CREATE`. Tests "pre-existing LOGIN canary" and "pre-existing NOLOGIN canary". |
| P0.2 Create the disposable canary explicitly with NOLOGIN and nonprivileged attributes. | IMPLEMENTED | `SQL_CANARY_CREATE` in `lib/statements.mjs`. Role name remains `scs_option_c_log_canary`. |
| P0.3 Verify exact attributes, the expected creator ADMIN edge, no unauthorized membership, and no direct application privilege before the synthetic verifier. | IMPLEMENTED | `assertCanaryInspection` runs before `canaryAlterStatement`. Tests for membership, privilege, and attribute mismatch show zero canary `ALTER ROLE`. |
| P0.4 Require logging controls to be accepted and read back before the canary credential statement. | IMPLEMENTED | `withSuppressedTransaction` readback happens before `work()`. Tests "a logging readback mismatch" and "canary logging control failure". |
| P0.5 Require explicit owner acknowledgment. Missing, rejected, or inconclusive acknowledgment is terminal. Offline acknowledgment is an injected boolean or callback. | IMPLEMENTED | `acknowledgeCanary` in `lib/orchestrator.mjs`. Tests "canary attestation failure" and "rejected or inconclusive owner acknowledgment". No new live prompt was added. The existing CLI callback is not executed by this revision. |
| P0.6 Failed or inconclusive canary inspection is terminal. | IMPLEMENTED | Attribute, membership, privilege, and logging failures set `FAILED` and do not continue. |
| P0.7 Remove the canary before any real target-role credential change. | IMPLEMENTED | `DROP ROLE` and the absence probe run before the role loop. Test "no target ALTER ROLE occurs before verified canary cleanup". |
| P0.8 Independently confirm the canary role no longer exists. | IMPLEMENTED | `SQL_CANARY_EXISTS` after the drop. Test "canary absence verification failure". |
| P0.9 Do not proceed to target roles if cleanup or absence verification fails. | IMPLEMENTED | Tests "canary DROP failure" and "canary absence verification failure". A cleanup failure is never `PROVISIONED_UNVERIFIED`. |
| P0.10 Do not automatically retry an ambiguous canary transaction. | IMPLEMENTED | One `BEGIN`, one `COMMIT`, one `CREATE` in "ambiguous canary commit is not retried". A later single `DROP` is cleanup, not a second credential transaction. |
| P1 connection lifecycle. Close every client in a `finally` path, including connection failure, canary failure, transaction failure, ambiguous commit, cancellation, and cleanup failure. Preserve the primary code when cleanup also fails. | IMPLEMENTED | `withAdminClient` and `openAdminClient` in `lib/tls-gate.mjs`. `runLive` uses `withAdminClient`. Tests "database clients close..." and "primary error is preserved...". Secondary code is `OC-CLIENT-CLEANUP` or `OC-CANARY-CLEANUP`. |
| P1 administrator password. Never place the real password in a helper URL. | IMPLEMENTED | `adminHelperUrl()` uses `option-c-placeholder-not-a-secret`. The real secret is a buffer on the client and on `inspectEffectivePgSsl` only. A buffer equal to the placeholder fails closed with `OC-SECRET-IN-URL`. Test "real administrator password is absent from frozen helper strings". |
| P1 resume. Remove `--resume-after` and unverified role skipping. Reject the flag with no database call. | IMPLEMENTED | `assertResumeRejected`. Test "resume flag is rejected before any database call" replaces the old resume test. No alternate resume was added. |
| P1 independent login. Do not execute role logins. Do not treat unverified provisioning as final acceptance. | IMPLEMENTED for the utility boundary. The login proof itself is **DEFERRED**. | `executePlan` sets `independentLogin` to `NOT-RUN` and returns `PROVISIONED_UNVERIFIED`. Test "provisioning does not report PASS or VERIFIED". Correct-password and incorrect-password login remains A-DBTEST and was not run. |
| P1 result semantics. | IMPLEMENTED | Outcomes are only `OFFLINE_SELF_TEST_PASS`, `CANARY_VERIFIED`, `PROVISIONED_UNVERIFIED`, `PARTIAL_PROVISIONING`, `COMMIT_OUTCOME_UNKNOWN`, and `FAILED`. Tests 16, 21, 33, 38, and 40. `VERIFIED` is not emitted. |
| P2/P3 authorization phrase is an operational guard, not an authentication boundary. | IMPLEMENTED | `lib/authorization.mjs`, `SECURITY-DESIGN-AND-THREAT-MODEL.md`, and `OWNER-EXECUTION-PROCEDURE-NOT-AUTHORIZED.md`. The variable was not set. |
| P2/P3 replace the fixed temporary PowerShell path with a unique file and guaranteed cleanup. | IMPLEMENTED | The only fixed Option C script was `os.tmpdir()/scs-option-c-frozen-digest.ps1` inside the previous test. Test 23 and test 41 use `os.tmpdir()` plus a unique name and `finally` unlink. |

## R4 rehash

Read-only rehash of the 64 paths in `qa-m6b/M7B-G2-R4-SUCCESSOR-HASH-INVENTORY-20261124.json`.

| Check | Result |
| --- | --- |
| Files modified | No |
| Inventory modified | No |
| Per-file SHA-256 and byte size | 64 match, 0 mismatches |
| PowerShell `Sort-Object Path` digest | `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d` |
| JavaScript UTF-16 code-unit sort of the same lines | `9b297f0a300b30489ed08d34714327be57b447d936f8bb62a121b32877cdd6fc` |

The JavaScript sort disagrees because PowerShell's default string sort treats hyphens and underscores differently from UTF-16 code units (`advisor-kb.json` versus `advisor.html`, and `_lib` versus `DEPENDENCY-LOCKING.md`). The digest that matches the expected value is the PowerShell sort. That disagreement is not a byte mismatch. The R4 files were not "corrected."

## Option C digest sort

The predecessor Option C digest was recomputed with JavaScript UTF-16 code-unit order and matched `850dac2809058fada1478c8846867631ad026ebe3b53dc8b1f725e644ce30c4e`. PowerShell `Sort-Object` does not reproduce that predecessor digest. The R1 inventory digest uses the same JavaScript code-unit order.

## Not done

No live run. No network connection. No SQL against a server. No Git write. No migration 008. No edit to `netlify/functions/_lib/pg-client.js`, `scripts/build-public.mjs`, or the frozen 64. Production remains **HOLD**.
