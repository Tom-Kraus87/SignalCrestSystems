# M7B-G2 — Option C Codex acceptance handoff

**Date:** 2026-11-25  
**Reviewer:** Codex (independent) — **not yet performed**  
**Production:** **HOLD**  
**Live use:** **NOT AUTHORIZED**  
**Successor candidate:** `M7B-G2-R4-SUCCESSOR-20261124` remains the frozen inventory. This handoff does not replace it and does not rewrite it.

This is a new handoff. It does not overwrite `qa-m6b/M7B-G2-A-TLS-CODEX-ACCEPTANCE-HANDOFF-20261125.md`, `qa-m6b/M7B-G2-A-SQL-ADDENDUM-CODEX-HANDOFF-20261125.md`, or `qa-m6b/M7B-G2-R4-CODEX-REVIEW-CHECKLIST-20261124.md`.

## 1. What was built

A standalone offline administrative utility at `tools/option-c-admin/`. It is outside the frozen 64-file inventory, outside the public allowlist, and outside `netlify/functions`. The default command refuses to run. `--self-test` is local. `--live` refuses unless `SCS_OPTION_C_LIVE_AUTHORIZATION` equals the phrase in `tools/option-c-admin/lib/authorization.mjs`. That variable was not set. The live socket path was not executed.

## 2. Sources

| Source | Use |
| --- | --- |
| `C:\Users\tkrau\Downloads\M7B-G2 Secure Credential Provisioning Research (Option C).pdf` | Claude's Option C research. Read locally. Not copied into the repo. |
| `qa-m6b/M7B-G2-A-SQL-EXECUTION-ADDENDUM-20261125.md` §4 | Four password-bearing roles, refusals, strength rule, Path A, separate authorization. |
| `C:\Users\tkrau\Downloads\M7B-G2 Pre-A-SQL Architecture Readiness Review.pdf` | Cited by the addendum. F2 and the membership correction were read locally. |
| `netlify/functions/_lib/pg-client.js` | Frozen explicit-field TLS helper. Called. Not edited. |
| `scripts/build-public.mjs`, `netlify.toml` | Static exclusion check. Not edited. |
| Assignment text, four mandatory corrections | Canary, logging readback, exact authority edges, PostgreSQL serialization tests. |

A file whose name is Codex's Option C architecture review was not under `qa-m6b/` and was not in Downloads. The PDF downloaded during this window, `M7B-G2 Corrective Migration Architecture (Owner Functions, service_role, Default ACLs)`, is a different workstream. It was identified and not implemented. No corrective migration was written.

## 3. Mandatory corrections

| Correction | Where it is enforced |
| --- | --- |
| Non-secret logging canary is mandatory | `executePlan` always runs the canary transaction before target roles. `skipCanary` throws `OC-CANARY-REQUIRED` before any query. Continuation requires `CANARY-LOGS-CLEAR`. |
| Every transaction-local logging setting is verified before a credential statement | `BEGIN`, `SET LOCAL`, readback, then the statement. A mismatch rolls back. `pgaudit.log` is included when the setting exists. The canary `ALTER` is covered, not only the role `ALTER`. |
| Exact administrative authority and membership edges | Session must be `postgres` with `CREATEROLE` and without superuser. Each target must match the edge set in the security design. Extra, missing, or different options stop that role before `ALTER ROLE`. |
| PostgreSQL serialization tests plus the RFC 7677 vector | `rfc7677VectorMatches` locks the published client proof and server signature. `syntheticSerializationMatches` locks `SCRAM-SHA-256$4096:...` for the synthetic fixture. |

## 4. Public exclusion

**evidenceClass: static.** Test 22 imported `checkPublicExclusion()` and passed. The check reads, and does not run, the publisher.

| Check | Result |
| --- | --- |
| Utility path | `tools/option-c-admin` |
| `scripts/build-public.mjs` `ALLOWED_FILES` mentions the utility | No |
| `netlify.toml` `functions` directory | `netlify/functions` |
| `netlify.toml` mentions the utility | No |
| Files under `netlify/functions`, excluding `node_modules`, import `tools/option-c-admin` | No |
| Frozen 64 paths include the utility | No |
| `dist/` contains the utility | No |
| Gitignore relied on as the control | No. Gitignore was not edited. |

The utility imports the frozen helper. The helper does not import the utility, so the Functions bundle does not gain this tree. The frozen helper file was not modified.

## 5. Test results

**Command:** `node --test tools/option-c-admin/test/offline.test.mjs`  
**Node:** v22.22.3  
**Result:** 24 pass, 0 fail, 0 skipped, exit code 0, duration 840.8181 ms.  
**Detail:** `qa-m6b/M7B-G2-OPTION-C-OFFLINE-TEST-RESULTS-20261125.md`

The suite stubs `net.Socket.prototype.connect` and recorded zero connection attempts. Database behavior is mocked. The process environment did not contain the live authorization phrase. Child processes for the CLI were given an environment with that variable, `DATABASE_URL`, `SUPABASE_DB_URL`, and `PGPASSWORD` removed.

## 6. Inventories

### Frozen R4 inventory

Recomputed after the new files existed. Method: canonical lines `path<TAB>sha256<TAB>bytes`, sorted by `Sort-Object Path`, UTF-8, joined by `\n`, no trailing newline. On-disk bytes of all 64 paths were hashed and compared with `qa-m6b/M7B-G2-R4-SUCCESSOR-HASH-INVENTORY-20261124.json`.

| Check | Result |
| --- | --- |
| Entry count | 64 |
| Canonical digest | `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d` |
| On-disk bytes versus recorded hashes | Match |
| Frozen manifest edited | No |

### New utility files only

`tools/option-c-admin/SHA256-INVENTORY.json`

| Check | Result |
| --- | --- |
| Scope | `tools/option-c-admin` except the inventory file itself |
| Entry count | 18 |
| Canonical digest | `850dac2809058fada1478c8846867631ad026ebe3b53dc8b1f725e644ce30c4e` |
| Method | Ordinal path sort, `path<TAB>sha256<TAB>bytes`, UTF-8, newline join, no trailing newline |
| Inventory file bytes | 3533 |
| Inventory file SHA-256 | `be98f4eadbf21b66e56ed967bb96761a6263590a2e2d208e69fdc3407afefe82` |

## 7. Paths created

- `tools/option-c-admin/bin/option-c-admin.mjs`
- `tools/option-c-admin/lib/` (`allowlist`, `authority`, `authorization`, `errors`, `logger`, `logging-guard`, `orchestrator`, `password-policy`, `public-exclusion`, `scram`, `self-test`, `statements`, `terminal`, `tls-gate`)
- `tools/option-c-admin/test/offline.test.mjs`
- `tools/option-c-admin/SECURITY-DESIGN-AND-THREAT-MODEL.md`
- `tools/option-c-admin/OWNER-EXECUTION-PROCEDURE-NOT-AUTHORIZED.md`
- `tools/option-c-admin/SHA256-INVENTORY.json`
- `qa-m6b/M7B-G2-OPTION-C-OFFLINE-TEST-RESULTS-20261125.md`
- `qa-m6b/M7B-G2-OPTION-C-CODEX-ACCEPTANCE-HANDOFF-20261125.md`

## 8. Actions not performed

No Git operation. No SQL against a server. No network connection. No real credential handling and no password or verifier generation for a role. No dependency installation. No deployment. No edit to the frozen R4 candidate, the frozen manifest, existing migrations, or the TLS helper. No corrective migration. A-TLS evidence was not rewritten and TLS was not rerun. `C:\Dev\Stone-Harbor-Website` was not touched. Production remains **HOLD**.

## 9. Acceptance checklist

- [ ] Utility path is outside the frozen 64, the public allowlist, and `netlify/functions`
- [ ] Frozen helper is reused and unchanged
- [ ] Four-role allowlist matches the addendum, and `postgres`, `scs_migration`, and provider roles are refused
- [ ] Canary is mandatory and logging settings are read back before every credential statement
- [ ] Membership edges are exact, including the PostgreSQL 16+ automatic ADMIN edge
- [ ] RFC 7677 vector and the separate serialization fixture both pass
- [ ] Offline suite is 24 pass / 0 fail and opens no socket
- [ ] Frozen digest is still `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d` with 64 entries
- [ ] Live flag is unset and `--live` was not executed
- [ ] No corrective migration was added
