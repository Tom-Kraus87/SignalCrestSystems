# M7B-G2 — Option C R1 offline test results

**Date:** 2026-11-25  
**Revision:** option-c-r1  
**Node:** v22.22.3  
**Command:** `node --test tools/option-c-admin/test/offline.test.mjs`  
**Result:** 42 pass, 0 fail, 0 skipped. Exit code 0. Duration 764.4137 ms.  
**Network attempts observed by the suite:** 0  
**Live authorization in the process environment:** absent  
**Production:** **HOLD**  
**Live use:** **NOT AUTHORIZED**  
**A-DBTEST:** not authorized and not run

No package was installed. No socket was opened. The suite stubs `net.Socket.prototype.connect` and records attempts. Database clients are mocks. The published RFC 7677 verifier is the only canary verifier. No live utility execution and no `--live` against a server.

This file does not replace `qa-m6b/M7B-G2-OPTION-C-OFFLINE-TEST-RESULTS-20261125.md`.

## Original 24 tests

| # | Test | Result | Note |
|---:|---|---|---|
| 1 | RFC 7677 vector and PostgreSQL verifier serialization | PASS | Kept |
| 2 | Malformed SCRAM inputs and verifier injection | PASS | Kept |
| 3 | Password policy | PASS | Kept |
| 4 | Four-role allowlist and refusals | PASS | Kept |
| 5 | Logging hygiene | PASS | Kept. `PASS` as a log token is rewritten to `FAILED` |
| 6 | Terminal restoration | PASS | Kept |
| 7 | Unauthorized plan and unsafe argv | PASS | Kept |
| 8 | Mandatory canary and logging readback before credential statements | PASS | Same name. Assertion updated: drop and absence now precede every target `ALTER ROLE` |
| 9 | pgaudit readback when the setting exists | PASS | Kept |
| 10 | Logging mismatch blocks `ALTER ROLE` | PASS | Same name. Also asserts the canary `CREATE` does not run |
| 11 | Exact membership edges | PASS | Same name. Outcome is `PARTIAL_PROVISIONING` |
| 12 | Missing administrative edge | PASS | Kept |
| 13 | Canary attestation failure | PASS | Same name. Drop is `DROP ROLE`, then an absence probe. Not `DROP ROLE IF EXISTS` as the last call |
| 14 | Skipping the canary | PASS | Kept |
| 15 | Resume flag is rejected before any database call | PASS | **Replacement.** Old test: "resume continues after a confirmed role and still repeats the canary" |
| 16 | Ambiguous target commit is unknown and does not continue | PASS | **Replacement.** Old test: "ambiguous commit is a partial result and does not continue". Outcome is `COMMIT_OUTCOME_UNKNOWN` / `OC-COMMIT-UNKNOWN`, not `OC-PARTIAL` |
| 17 | Preflight stops for encryption, iterations, and `createrole_self_grant` | PASS | Kept |
| 18 | Independent-login probe rules | PASS | Kept. The utility does not execute the probe |
| 19 | Path A TLS gate and frozen helper | PASS | Kept |
| 20 | Live client construction without the authorization flag | PASS | Kept |
| 21 | CLI self-test and refused `--live` | PASS | Same name. Self-test result is `OFFLINE_SELF_TEST_PASS` |
| 22 | Public allowlist and Netlify Functions exclusion | PASS | Kept |
| 23 | Frozen R4 inventory unchanged | PASS | Same name. Temp script is a unique file under `os.tmpdir()` and is removed in `finally`. The old fixed name `scs-option-c-frozen-digest.ps1` is not written |
| 24 | Self-test writer contains no verifier text | PASS | Same name. Result text is `OFFLINE_SELF_TEST_PASS` |

Public exclusion from test 22: `ok` true, utility path `tools/option-c-admin`, function directory `netlify/functions`.

Frozen inventory from test 23: 64 entries, PowerShell `Sort-Object Path` digest `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d`, on-disk bytes match the frozen JSON. A JavaScript code-unit sort of the same lines does not reproduce that digest. See the R1 findings file. No frozen file was modified.

## Added tests

| # | Test | Result |
|---:|---|---|
| 25 | Pre-existing LOGIN canary aborts without reuse or removal | PASS |
| 26 | Pre-existing NOLOGIN canary aborts without reuse or removal | PASS |
| 27 | Unexpected canary memberships and privileges block the verifier | PASS |
| 28 | Canary attribute mismatch is terminal before the verifier | PASS |
| 29 | Canary logging control failure blocks the canary credential statement | PASS |
| 30 | Rejected or inconclusive owner acknowledgment is terminal | PASS |
| 31 | Canary DROP failure never provisions a target role | PASS |
| 32 | Canary absence verification failure never provisions a target role | PASS |
| 33 | Ambiguous canary commit is not retried and does not provision | PASS |
| 34 | No target ALTER ROLE occurs before verified canary cleanup | PASS |
| 35 | Database clients close on connection, canary, transaction, ambiguous, cancel, and cleanup failures | PASS |
| 36 | Primary error is preserved when client cleanup also fails | PASS |
| 37 | Real administrator password is absent from frozen helper strings | PASS |
| 38 | Partial target-role provisioning stops without a retry | PASS |
| 39 | Failed statements are not retried automatically | PASS |
| 40 | Provisioning does not report PASS or VERIFIED without independent login evidence | PASS |
| 41 | Temporary files use a unique name and are removed | PASS |
| 42 | stdout, stderr, exceptions, and temp evidence do not leak secrets | PASS |

The fixed temporary script `scs-option-c-frozen-digest.ps1` was present in the previous candidate's test 23. It is no longer written. No other fixed Option C PowerShell path was found.
