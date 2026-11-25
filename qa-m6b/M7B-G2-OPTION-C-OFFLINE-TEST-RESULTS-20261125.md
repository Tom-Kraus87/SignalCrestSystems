# M7B-G2 — Option C offline test results

**Date:** 2026-11-25  
**Node:** v22.22.3  
**Command:** `node --test tools/option-c-admin/test/offline.test.mjs`  
**Result:** 24 pass, 0 fail, 0 skipped. Exit code 0. Duration 840.8181 ms.  
**Network attempts observed by the suite:** 0  
**Live authorization in the process environment:** absent  
**Production:** **HOLD**  
**Live use:** **NOT AUTHORIZED**

No package was installed. The suite uses `node:test` and the already-installed `pg` module only so the frozen TLS helper can inspect an explicit field object. It does not connect.

| # | Test | Result |
|---:|---|---|
| 1 | RFC 7677 vector and PostgreSQL verifier serialization | PASS |
| 2 | Malformed SCRAM inputs and verifier injection | PASS |
| 3 | Password policy | PASS |
| 4 | Four-role allowlist and refusals | PASS |
| 5 | Logging hygiene | PASS |
| 6 | Terminal restoration | PASS |
| 7 | Unauthorized plan and unsafe argv | PASS |
| 8 | Mandatory canary and logging readback before credential statements | PASS |
| 9 | pgaudit readback when the setting exists | PASS |
| 10 | Logging mismatch blocks `ALTER ROLE` | PASS |
| 11 | Exact membership edges | PASS |
| 12 | Missing administrative edge | PASS |
| 13 | Canary attestation failure | PASS |
| 14 | Skipping the canary | PASS |
| 15 | Resume repeats the canary and skips confirmed roles | PASS |
| 16 | Ambiguous commit stops the run | PASS |
| 17 | Preflight stops for encryption, iterations, and `createrole_self_grant` | PASS |
| 18 | Independent-login probe rules | PASS |
| 19 | Path A TLS gate and frozen helper | PASS |
| 20 | Live client construction without the authorization flag | PASS |
| 21 | CLI self-test and refused `--live` | PASS |
| 22 | Public allowlist and Netlify Functions exclusion | PASS |
| 23 | Frozen R4 inventory unchanged | PASS |
| 24 | Self-test writer contains no verifier text | PASS |

Public exclusion report from test 22: `ok` true, utility path `tools/option-c-admin`, function directory `netlify/functions`.

Frozen inventory from test 23: 64 entries, canonical digest `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d`, on-disk bytes match the frozen JSON.
