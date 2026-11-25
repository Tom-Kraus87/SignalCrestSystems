# Option C owner execution procedure

**NOT AUTHORIZED**

**Production:** **HOLD**  
**This document does not authorize a database connection, a password entry, or an `ALTER ROLE`.**  
**The environment variable `SCS_OPTION_C_LIVE_AUTHORIZATION` is not set by the implementation assignment and must not be set on the strength of this file.**

Do not run `--live`. The offline command that is allowed for a workstation check is only:

```text
node tools/option-c-admin/bin/option-c-admin.mjs --self-test
node --test tools/option-c-admin/test/offline.test.mjs
```

Both stay on the machine. They do not open a socket.

## 1. Why execution is stopped

All of the following are still true:

- A-SQL is not authorized. The four roles are not an authorized provisioning target in this window.
- A-TLS is closed. It is not rerun by this procedure.
- `password_encryption`, `scram_iterations`, and `createrole_self_grant` are not yet recorded from the staging server.
- No separate owner execution authorization for Option C live use has been issued.
- The live flag is absent. The utility refuses `--live` without it.
- Independent login of the four roles is not authorized and was not run.

A later authorization, if the owner writes one, has to name Signal Crest Systems LLC, project `scs-staging`, ref `kfclinlrzfwodmichmci`, and this utility. Until that document exists, stop here.

## 2. Future prerequisites

These are requirements for a later window. They are not steps to perform now.

1. Record `SHOW password_encryption` as `scram-sha-256`. Any other value is a stop.
2. Record `SHOW scram_iterations` as a positive integer. Do not invent a count if the value is absent. The utility uses the recorded count and will not guess.
3. Record `SHOW createrole_self_grant` as empty. A non-empty value changes the automatic membership edge and is a stop.
4. Confirm the bootstrap and the later creation of `scs_test_admin` have already happened under their own authorization, so the four roles exist.
5. Create four password-manager entries, each at least 32 printable ASCII characters and unique. Do not create one for `scs_migration`. Do not put a password in chat, in a file, or in an argument.
6. Use a fresh terminal. Do not set `DATABASE_URL`, `SUPABASE_DB_URL`, or `PGPASSWORD`.
7. Supply the Dashboard CA that A-TLS already proved, as `DATABASE_SSL_CA` or `DATABASE_SSL_CA_PATH`. Do not weaken TLS.
8. Set `SCS_OPTION_C_LIVE_AUTHORIZATION` to the exact phrase expected by `tools/option-c-admin/lib/authorization.mjs` only after the written authorization above. Unset it when the terminal closes.

## 3. Future run shape

The utility, once authorized, does the work in this order. A failure stops the run.

1. Self-check the RFC 7677 vector before any network activity. A mismatch aborts.
2. Build the Path A client only: host `db.kfclinlrzfwodmichmci.supabase.co`, port `5432`, user `postgres`, database `postgres`, `verify-full`, `rejectUnauthorized` true, hostname verification on, CA loaded. Pooler hosts and port 6543 are refused. The frozen `netlify/functions/_lib/pg-client.js` helper builds the TLS object. The connection string is not passed to `pg`.
3. Read identity, administrator attributes, server version, password encryption, iteration count, and `createrole_self_grant`.
4. **Mandatory canary.** In one transaction: `BEGIN`, `SET LOCAL` the logging settings, read every required setting back, create `scs_option_c_log_canary` as `NOLOGIN` if needed, set the published non-secret dummy verifier, `COMMIT`.
5. Search the Postgres logs for that dummy. Continue only by typing `CANARY-LOGS-CLEAR`. Any other answer stops the run. The canary role is then dropped.
6. For each remaining role, in order `scs_intake_runtime`, `scs_notify_worker`, `scs_owner_admin`, `scs_test_admin`:
   - New transaction.
   - Set and read back every logging setting before the credential statement.
   - Require the exact authority and membership edges in the security design.
   - `ALTER ROLE` with the verifier only.
   - Confirm the stored value is present and has the `SCRAM-SHA-256$` prefix without selecting the verifier text.
   - `COMMIT`.
7. Hidden prompts collect each role password twice and the administrator password once. The terminal is restored on success, on an error, and on Ctrl+C or a supported termination signal.
8. Output is role name plus PASS or FAIL and a fixed code. No verifier, no SQL text, and no URL.

## 4. Partial-run recovery

Each role is its own transaction. Roles that committed stay changed. The failed role is rolled back when the error happened before `COMMIT`. If `COMMIT` itself fails, that role is **ambiguous**: do not retry it until an independent check shows whether the verifier landed.

On a stop:

1. Keep the fixed error code and the list of completed roles. Do not copy SQL or a verifier into the note.
2. Drop `scs_option_c_log_canary` if it remains. The utility attempts this drop on the failure path.
3. Do not start the next role.
4. Do not edit a frozen migration to "finish" the run.
5. A later resume, only inside an authorization that is still in force, may pass `--resume-after` with the last role that was independently confirmed. Resume repeats the canary. It does not re-alter the skipped roles. It still checks logging and membership for the next role.

## 5. Role-by-role verification

In-transaction prefix checks are not independent authentication. After a successful commit, a separate process must, for each role:

1. Connect over Path A with the frozen TLS helper as that role. `current_user` and `session_user` must both equal the role.
2. Confirm a deliberately wrong password is rejected.
3. Confirm `scs_migration` still cannot log in.
4. Read `SHOW log_statement` and `SHOW log_min_messages` in a new administrator session and confirm the session defaults returned after the transaction-local settings ended.

`SET ROLE` and the SQL Editor do not satisfy this check. This build's result for independent login is `NOT-RUN`.

## 6. Abandon conditions

Stop and do not improvise if any of these occur:

- The RFC self-test fails.
- `password_encryption` is not `scram-sha-256`, or `scram_iterations` cannot be read.
- `createrole_self_grant` is not empty.
- Any required logging setting does not read back before the credential statement.
- The log search shows the canary verifier or anything password-like.
- Membership edges are not exactly the set in the security design.
- `ALTER ROLE` is denied.
- The TLS gate fails, or the host is not the Path A direct host.
- A secret would have to be placed in an argument, an environment variable, a file, or on screen.

If a secret is exposed, stop. Do not paste it into chat or into an evidence file. Rotation, if it becomes necessary, waits for a fixed utility and a new authorization.

## 7. Cleanup

When the staging fixture is retired, or the staging project is deleted, remove the four password-manager entries. `scs_migration` must still have no login password. Unset the live authorization variable. This paragraph does not authorize that cleanup today.
