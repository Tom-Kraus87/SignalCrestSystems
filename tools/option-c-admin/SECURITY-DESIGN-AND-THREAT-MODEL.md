# Option C administrative utility — security design and threat model

**Status:** Offline corrective revision `option-c-r1`. **Live use is NOT AUTHORIZED.**  
**Production:** **HOLD**  
**Date:** 2026-11-25  
**Location:** `tools/option-c-admin/`  
**Predecessor:** commit `2c0e808b45a757ab205e79dd945925abd3f09dfd`, preserved under `qa-m6b/evidence/option-c-r0-2c0e808/`  
**Frozen candidate:** `M7B-G2-R4-SUCCESSOR-20261124` was not modified.

Revision `option-c-r1` corrects the canary lifecycle, connection cleanup, administrator-password handling, resume rejection, and result vocabulary. It does not authorize a live run. Independent login remains a separate A-DBTEST authorization and was not run.

This design records how the standalone utility applies Claude's Option C research and the four mandatory corrections supplied with the implementation assignment. A file named as Codex's Option C architecture review was not present under `qa-m6b/` or in Downloads when this utility was written. The corrective-migration PDF that appeared in Downloads during the same window is a different workstream and is not implemented here.

## 1. Purpose

The utility prepares a future owner-operated password provisioner for four staging roles. It derives a PostgreSQL SCRAM-SHA-256 verifier on the workstation with Node's built-in `crypto` and, only under a later written authorization, would send that verifier in one `ALTER ROLE` statement per role. This build does not connect, does not generate a role password, and does not run that statement against a server.

The four roles are the password-bearing application roles already named in the A-SQL addendum:

- `scs_intake_runtime`
- `scs_notify_worker`
- `scs_owner_admin`
- `scs_test_admin`

`postgres`, `scs_migration`, and provider-managed roles (`anon`, `authenticated`, `service_role`, `supabase_admin`, and the other reserved names in the allowlist module) are refused. Any name outside the four is refused.

## 2. Assets

| Asset | Handling in this build |
| --- | --- |
| Role passwords | Entered only through a hidden TTY prompt, kept in buffers, compared by SHA-256, then zeroed. Not accepted from arguments, environment, or files. |
| SCRAM verifiers | Built in memory for a future statement. Never written to the log. Tests use the published RFC 7677 vector and one synthetic fixture. |
| Administrator password | Same hidden prompt. Not read from `DATABASE_URL` or `PGPASSWORD`. |
| Staging connection | Fixed Path A host and port. The URL is not an input and is not logged. |
| Frozen TLS helper | Called, not copied and not edited. |
| Postgres logs | The future transaction suppresses statement logging and reads every required setting back before any credential statement. |

## 3. Trust boundary

The trusted side is the owner's workstation process. The untrusted side is every string that could reach a log, a file, a public site bundle, or a database driver.

The public site builder copies an explicit allowlist. Netlify Functions are rooted at `netlify/functions`. This utility sits in neither place, and nothing under `netlify/functions` imports it. The frozen helper remains the Functions TLS implementation. The utility calls that file; the helper does not call the utility, so the utility is not pulled into the Functions bundle.

## 4. Controls

1. **Fail closed.** No arguments means the process stops. `--live` without `SCS_OPTION_C_LIVE_AUTHORIZATION` set to the exact owner phrase stops. That variable is not set by this assignment. The phrase is an operational guard only. It is not an authentication boundary: it does not authenticate the operator to PostgreSQL, and it does not prove possession of the administrator password. `--resume-after` is rejected with `OC-RESUME-REJECTED` and performs no database call. There is no role-skipping resume.
2. **Offline and live are separate.** `--self-test` checks the RFC 7677 vector, the PostgreSQL serialization fixture, and the allowlist. It does not read a TTY and does not open a socket.
3. **Password rule.** Minimum 32 bytes, each byte in `0x21`–`0x7E`, two matching entries, unique across the four roles. Printable ASCII keeps SASLprep a no-op. There is no SASLprep implementation and no new package.
4. **Verifier shape.** `SCRAM-SHA-256$<iterations>:<base64 salt>$<base64 StoredKey>:<base64 ServerKey>`, standard Base64 with padding, salt at least 16 bytes, keys 32 bytes. Quotes, statement breaks, comments, and dollar quotes are rejected before a statement is assembled. Role names are chosen from a fixed map and are not concatenated from input.
5. **Mandatory non-secret canary.** The role name stays `scs_option_c_log_canary`. The plan does not reuse, alter, or drop a role that already exists. A pre-existing LOGIN or NOLOGIN row is `OC-CANARY-EXISTS` and stops the run. The plan then creates the role explicitly as `NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 0`. Before the published RFC 7677 verifier is assigned, the same transaction reads back those attributes, the single creator ADMIN edge (`postgres` granted by `postgres`, ADMIN true, INHERIT false, SET false), and the absence of direct table, schema, and parent-role privileges. A mismatch is terminal (`OC-CANARY-ATTR`, `OC-CANARY-MEMBERSHIP`, or `OC-CANARY-PRIVILEGE`) and is rolled back. Logging settings are read back before that credential statement. Continuation requires an explicit injected acknowledgment (`canaryLogsClear`, `ownerLogAcknowledgment`, or a callback returning boolean true). A missing, rejected, or thrown acknowledgment is `OC-CANARY-ATTESTATION`. The canary is then dropped and a separate existence probe must return no row. Only after that absence proof may a target role be altered. Cleanup failure or a remaining row is terminal and is never a success. An ambiguous canary commit is `COMMIT_OUTCOME_UNKNOWN` and is not retried.
6. **Logging readback.** Inside each transaction, after `SET LOCAL` and before any credential statement, the plan reads `log_statement`, `log_min_error_statement`, `log_min_messages`, and `pg_stat_statements.track`. When `pgaudit.log` exists, that setting is set and read back too. Any mismatch rolls back and does not send `ALTER ROLE`.
7. **Authority and membership.** The session must be `current_user = session_user = postgres`, with `rolsuper` false and `rolcreaterole` true. `createrole_self_grant` must be empty. `password_encryption` must be `scram-sha-256`. `scram_iterations` must be a positive integer returned by the server; it is not invented. `server_version_num` must be at least 170000. Each target must be `LOGIN`, `NOINHERIT`, and without superuser, createrole, createdb, replication, or bypassrls. Membership edges must match exactly:
   - Every target: `postgres` granted by `supabase_admin` with ADMIN true, INHERIT false, SET false.
   - `scs_intake_runtime` and `scs_notify_worker` also: `postgres` granted by `postgres` with ADMIN false, INHERIT false, SET true.
   - `scs_owner_admin` and `scs_test_admin`: that SET edge must be absent.
   An extra edge, a missing edge, or a different option stops the role before `ALTER ROLE`.
8. **TLS.** Path A only: `db.kfclinlrzfwodmichmci.supabase.co`, port 5432, user `postgres`, database `postgres`. Pooler hosts, port 6543, and dotted pooler usernames are rejected. `rejectUnauthorized` must stay true, hostname verification must stay the helper's `checkServerIdentity`, `servername` is the Path A host, and a CA must be supplied. `sslmode` other than `verify-full`, and environment settings that disable verification, are rejected. The frozen helper parses a URL whose userinfo password is the fixed non-secret placeholder `option-c-placeholder-not-a-secret`. The real administrator password is not URL-encoded and is not placed in that string. It is supplied only as a buffer on the separate client password field and on `inspectEffectivePgSsl`. If the real buffer equals the placeholder, assessment fails closed with `OC-SECRET-IN-URL`. `connectionString` is not forwarded to `pg`. Every allocated client is closed in a `finally` path. If close also fails, the primary code remains and `OC-CLIENT-CLEANUP` is recorded as `secondaryCode`.
9. **Logs.** The logger writes only phase, role, result, and a fixed `OC-*` code. A line that still contains a verifier, a connection URL, or a password clause is replaced with `OC-LOG-HYGIENE`.
10. **Terminal.** Raw mode is restored on success, on a thrown error, on Ctrl+C, and on SIGINT, SIGTERM, SIGBREAK, and SIGHUP when the platform accepts that signal.
11. **Result vocabulary.** The only outcomes are `OFFLINE_SELF_TEST_PASS`, `CANARY_VERIFIED`, `PROVISIONED_UNVERIFIED`, `PARTIAL_PROVISIONING`, `COMMIT_OUTCOME_UNKNOWN`, and `FAILED`. Provisioning does not emit `PASS` or `VERIFIED`. `CANARY_VERIFIED` means the canary transaction, acknowledgment, drop, and absence proof succeeded. It is not final acceptance of the four roles. Role log lines carry the role name, one of those outcomes, and a fixed `OC-*` code. They do not carry passwords or verifiers.

## 5. Threats

| Threat | Mitigation |
| --- | --- |
| Plaintext password in SQL, logs, or chat | The statement carries a verifier. Passwords are not interpolated. Logs use fixed codes. |
| Verifier in `pg_stat_statements` or an error log | Transaction-local suppression plus readback before the statement. Failed checks roll back. The canary is the mandatory proof that the operator must confirm in the database logs before target roles change. |
| Wrong role or provider role | Fixed allowlist, default deny, statements stored per role. |
| SQL injection through the role or the verifier | Allowlist lookup and a verifier alphabet check. Dangerous characters throw `OC-INJECTION` and are not placed in a statement. |
| Pooler or weakened TLS | Host, port, user, and TLS checks run before a client exists. The frozen helper is the TLS constructor. |
| Admin URL stolen from the environment | `DATABASE_URL`, `SUPABASE_DB_URL`, and `PGPASSWORD` are forbidden inputs. The host is a constant. |
| Partial apply | One transaction per role. A non-ambiguous stop is `PARTIAL_PROVISIONING`. An ambiguous commit is `COMMIT_OUTCOME_UNKNOWN` and is not retried. Neither outcome is `PASS` or `VERIFIED`. Independent login is a separate A-DBTEST authorization and was not run. |
| Utility shipped on the public site | Path is outside the allowlist and outside `netlify/functions`. A static check records that fact. |
| Custom crypto bug | RFC 7677 client proof and server signature are locked. A second test locks PostgreSQL's stored-verifier serialization for a synthetic password and salt. |
| `createrole_self_grant` changes the automatic ADMIN edge | Non-empty value is a preflight stop. The expected edges are not relaxed. |

## 6. Residual risk

JavaScript strings that hold a verifier cannot be wiped. The plan keeps passwords in buffers and zeroes those buffers. The helper URL carries only the placeholder, so the real administrator password is not copied into that string. The live socket path exists and refuses to run unless the owner flag is present; this assignment does not set the flag and does not execute that path. A future execution still needs a separate written authorization, the recorded discovery values, and the operator's log acknowledgment. Provisioning success is `PROVISIONED_UNVERIFIED`. `VERIFIED` is reserved for a later consolidated acceptance that has independent authentication evidence. That login proof, including rejection of a wrong password, is A-DBTEST and was not run. A cleanup failure never produces `OFFLINE_SELF_TEST_PASS`, `CANARY_VERIFIED`, or `PROVISIONED_UNVERIFIED`.

## 7. Out of scope

No corrective migration. No edit to frozen migrations, the frozen manifest, or the TLS helper. No live database session. No dependency installation. No deployment.
