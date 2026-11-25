# M7B-G2 — Option C R1 Codex acceptance handoff

**Date:** 2026-11-25  
**Revision:** option-c-r1  
**Reviewer:** Codex (independent) — **not yet performed**  
**This document is a handoff. It is not an acceptance.**  
**Production:** **HOLD**  
**Live use:** **NOT AUTHORIZED**  
**A-DBTEST:** **not authorized** and not run  
**Predecessor commit:** `2c0e808b45a757ab205e79dd945925abd3f09dfd`

This file does not overwrite `qa-m6b/M7B-G2-OPTION-C-CODEX-ACCEPTANCE-HANDOFF-20261125.md` or `qa-m6b/M7B-G2-OPTION-C-OFFLINE-TEST-RESULTS-20261125.md`.

## 1. What changed

Offline corrective revision of `tools/option-c-admin` only. The canary is no longer reused and is no longer dropped after the target roles. An existing canary aborts the run. The new role is created `NOLOGIN` and nonprivileged, inspected, and only then given the published RFC 7677 verifier. Logging is read back before that statement. Owner acknowledgment is an injected boolean or callback. The canary is dropped and its absence is probed before any target `ALTER ROLE`. Ambiguous commits are not retried. Clients close in a `finally` path. The real administrator password is not placed in the frozen helper URL. `--resume-after` is rejected. Provisioning returns `PROVISIONED_UNVERIFIED`, not `PASS` or `VERIFIED`.

The authorization phrase is an operational guard. It is not an authentication boundary. It was not set.

## 2. Inventory

`tools/option-c-admin/SHA256-INVENTORY.json`

| Check | Result |
| --- | --- |
| Version | `option-c-r1` |
| Predecessor commit | `2c0e808b45a757ab205e79dd945925abd3f09dfd` |
| Predecessor digest, recomputed before edits | `850dac2809058fada1478c8846867631ad026ebe3b53dc8b1f725e644ce30c4e` |
| Entry count, excluding this inventory file | 18 |
| New digest | `4277cd555c2c90aa188d4f201b905b8895b29ecd436046263c4bbfdc898e99cc` |
| Sort | JavaScript UTF-16 code-unit order, the sort that reproduced the predecessor digest. PowerShell `Sort-Object` does not match that order. |

Preserved predecessor bytes: `qa-m6b/evidence/option-c-r0-2c0e808/SHA256-INVENTORY.json`. Recompute note: `qa-m6b/evidence/option-c-r0-2c0e808/PRIOR-DIGEST.txt`.

## 3. Changed paths

Utility files whose bytes changed:

- `tools/option-c-admin/OWNER-EXECUTION-PROCEDURE-NOT-AUTHORIZED.md`
- `tools/option-c-admin/SECURITY-DESIGN-AND-THREAT-MODEL.md`
- `tools/option-c-admin/SHA256-INVENTORY.json`
- `tools/option-c-admin/bin/option-c-admin.mjs`
- `tools/option-c-admin/lib/authority.mjs`
- `tools/option-c-admin/lib/authorization.mjs`
- `tools/option-c-admin/lib/errors.mjs`
- `tools/option-c-admin/lib/logger.mjs`
- `tools/option-c-admin/lib/orchestrator.mjs`
- `tools/option-c-admin/lib/self-test.mjs`
- `tools/option-c-admin/lib/statements.mjs`
- `tools/option-c-admin/lib/tls-gate.mjs`
- `tools/option-c-admin/test/offline.test.mjs`

Unchanged utility files: `lib/allowlist.mjs`, `lib/logging-guard.mjs`, `lib/password-policy.mjs`, `lib/public-exclusion.mjs`, `lib/scram.mjs`, `lib/terminal.mjs`.

New evidence and review files:

- `qa-m6b/evidence/option-c-r0-2c0e808/SHA256-INVENTORY.json`
- `qa-m6b/evidence/option-c-r0-2c0e808/PRIOR-DIGEST.txt`
- `qa-m6b/M7B-G2-OPTION-C-R1-OFFLINE-TEST-RESULTS-20261125.md`
- `qa-m6b/M7B-G2-OPTION-C-R1-FINDINGS-DISPOSITION-20261125.md`
- `qa-m6b/M7B-G2-OPTION-C-R1-CODEX-ACCEPTANCE-HANDOFF-20261125.md`

Not changed: the frozen 64, `qa-m6b/M7B-G2-R4-SUCCESSOR-HASH-INVENTORY-20261124.json`, `db/migrations`, `netlify/functions/_lib/pg-client.js`, `scripts/build-public.mjs`, and the two historical Option C result and handoff files named above.

## 4. Tests

**Command:** `node --test tools/option-c-admin/test/offline.test.mjs`  
**Node:** v22.22.3  
**Result:** 42 pass, 0 fail, 0 skipped, exit code 0, duration 764.4137 ms.  
**Network attempts:** 0  
**Detail:** `qa-m6b/M7B-G2-OPTION-C-R1-OFFLINE-TEST-RESULTS-20261125.md`  
**Disposition:** `qa-m6b/M7B-G2-OPTION-C-R1-FINDINGS-DISPOSITION-20261125.md`

## 5. Public exclusion

Test 22 passed. The utility remains outside `ALLOWED_FILES`, is not imported by `netlify/functions`, is not one of the frozen 64, and was not found under `dist/`. `dist/` was not rebuilt.

## 6. Limitations

- Live execution is not authorized and was not run.
- Independent login is A-DBTEST. It was not run. `PROVISIONED_UNVERIFIED` is not final acceptance.
- The frozen helper still parses a URL. That URL's password is the fixed placeholder. The real administrator secret is passed only as a separate buffer. If a future helper could connect only from the URL password, this revision would fail closed rather than interpolate the real secret.
- JavaScript strings that hold a SCRAM verifier cannot be wiped. They are not logged.
- The per-statement code `OC-ROLE-PASS` still exists. The outcome field is not `PASS` and is not `VERIFIED`.
- The expected canary edge is one creator ADMIN edge from `postgres` to `postgres` with INHERIT false and SET false, which matches an empty `createrole_self_grant`. A live server that does not match fails closed. That shape was not observed on a server in this revision.
- One cleanup `DROP` after an ambiguous canary commit is not a retry of the credential transaction. It is still a single statement and it does not continue into target roles.
- The CLI still contains the pre-existing acknowledgment callback for a future authorized run. This revision did not execute it.

## 7. Actions not performed

No Git write. No SQL. No network connection. No real credential. No dependency installation. No deployment. No migration 008. No edit to the frozen helper or the frozen 64. `C:\Dev\Stone-Harbor-Website` was not touched. Production remains **HOLD**.

## 8. Acceptance checklist

- [ ] Reviewer Codex has performed an independent review of option-c-r1
- [ ] Canary lifecycle rules 1–10 match the implementation and the tests
- [ ] Real administrator password is absent from helper URL strings
- [ ] `--resume-after` is rejected and no resume replacement exists
- [ ] Outcomes do not use `PASS` or `VERIFIED` for provisioning
- [ ] Independent login remains unauthorized A-DBTEST and was not run
- [ ] Offline suite is 42 pass / 0 fail and opens no socket
- [ ] Frozen R4 digest is still `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d` with 64 byte-matching entries
- [ ] R1 digest `4277cd555c2c90aa188d4f201b905b8895b29ecd436046263c4bbfdc898e99cc` matches a fresh code-unit rehash
- [ ] Predecessor inventory bytes remain under `qa-m6b/evidence/option-c-r0-2c0e808/`
- [ ] Live flag is unset and `--live` was not executed
- [ ] No migration 008 and no frozen-file edit
- [ ] Production remains HOLD
