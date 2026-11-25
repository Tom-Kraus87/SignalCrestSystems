# M7B-G2 — A-SQL Execution Addendum

**Date:** 2026-11-25  
**Nature:** Document-only addendum for a future owner execution. Nothing in this file is authorization to run it.  
**Production:** **HOLD**  
**A-SQL:** **unauthorized**  
**A-DBTEST:** **unauthorized**  
**Frozen candidate:** `M7B-G2-R4-SUCCESSOR-20261124` remains frozen. This addendum does not rewrite it, does not hand-edit frozen migrations, and does not write a new migration.

This file does not contain its own digest. Companion SQL text is in `qa-m6b/M7B-G2-A-SQL-REMAINING-DISCOVERY-QUERIES-20261125.md`. Every query in that companion is text for a later window. It is **not authorized to run now**.

---

## 1. Sources read

| Document | Path | Use |
|----------|------|-----|
| R3 SQL execution packet | `qa-m6b/M7B-G2-R3-SQL-EXECUTION-PACKET-20261124.md` | Authoritative for topics this addendum does not supersede |
| R4 amendment | `qa-m6b/M7B-G2-R4-AMENDMENT-TO-R3-PACKET-20261124.md` | Supersedes R3 only where that amendment says so |
| R4 final acceptance | `qa-m6b/M7B-G2-R4-FINAL-ACCEPTANCE-20261124.md` | R4 implementation gate closed; A-SQL still unauthorized |
| Direct TLS discovery status | `qa-m6b/M7B-G2-DIRECT-TLS-DISCOVERY-STATUS-20261124.md` | Owner-supplied A.4 / A.5 **NOT PROVISIONED** record |
| Claude pre-A-SQL architecture readiness review | `C:\Users\tkrau\Downloads\M7B-G2 Pre-A-SQL Architecture Readiness Review.pdf` | Findings F1–F9. Verdict: **CONDITIONAL**. Not stored under `qa-m6b/` |
| Bootstrap | `db/bootstrap/001_m7a_r4_role_bootstrap.sql` | Placement, idempotence, no transaction wrapper |
| Migrations 001, 006, 007 | `db/migrations/001_m7a_leads_foundation.sql`, `006_m7a_r2_security_hardening.sql`, `007_m7a_r4_security_corrections.sql` | Extension placement, swallowed notices, authenticated grants, abort-if-roles-missing |
| A-TLS evidence after the timeout correction | `qa-m6b/M7B-G2-A-TLS-VERIFICATION-EVIDENCE-20261125.md` and `qa-m6b/evidence/m7b-g2-a-tls-20261125/network-verification.json` | Path A TLS result. A-TLS is not A-SQL |

Claude’s review states: “A-TLS is not A-SQL. The owner's A-TLS pass establishes that the connection path and the TLS helper are trustworthy. It authorizes nothing on the database. Production remains HOLD.” This addendum keeps that boundary.

R3 remains authoritative for bootstrap and migration paste order, the fixture RLS overlay, §D isolation, the rule against secrets in evidence, case 14 hosted Auth **NOT RUN**, and the historical Path B proposal text. R4 amendment §G says those topics were not rewritten. R4 final acceptance says Path A remains selected, Path B remains deferred, and “Do not initiate R5.”

---

## 2. Timeout correction carried with this addendum

The owner-executed TLS script contained:

```js
const timer = setTimeout(() => { finish(new Error('TLS verification timeout')); }, 15000);
```

**Evidence class: observed script configuration supplied by the owner in this assignment.** `timeoutMs` **15000** is the configured timeout in that script. A measured elapsed duration was not supplied. An independent timeout-rejection test was not run. TLS tests were not rerun.

The **10000** ms figure remains only the historical procedure sample in `qa-m6b/M7B-G2-DIRECT-TLS-VERIFICATION-PROCEDURE-20261124.md` (`socket.setTimeout(10000)`), from static analysis.

Previously recorded network and helper results stay as recorded: project `scs-staging`, ref `kfclinlrzfwodmichmci`, host `db.kfclinlrzfwodmichmci.supabase.co`, port 5432, Path A direct IPv6, certificate file SHA-256 `700723581420DD1AC98FD7E9AC529F0EF210EADCAF87FC868A3AD7D114C2F3B7`, network timestamp `2026-11-25T05:01:27.350Z`, positive TLS **PASS**, authorized true, TLSv1.3, issuer Supabase Intermediate 2021 CA, expiration November 23, 2028, server fingerprint `11:CB:BA:C0:5D:EB:8A:B3:6F:B1:AC:6D:F5:73:79:86:65:E8:A4:F4:F2:23:F8:0B:7F:CE:2F:6E:BF:08:9D:15`, negative hostname **PASS**, `ERR_TLS_CERT_ALTNAME_INVALID`, correct SNI preserved true, hostname `intentional-mismatch.invalid`, helper timestamp `2026-11-25T05:06:08.107Z`, `pg@8.13.1`, production-like true, `postgres_required`, `verify-full`, `rejectUnauthorized` true, native hostname verification true, CA loaded true, CA matches local file true, connection string forwarded false, seven negative controls **PASS**, no credentials, no SQL, and no helper network connection.

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| `qa-m6b/evidence/m7b-g2-a-tls-20261125/network-verification.json` | 5436 | `bbaed269e8389cae68be143cd3c1d71cd174e95daa5afa899c6458595980b191` |
| `qa-m6b/evidence/m7b-g2-a-tls-20261125/application-helper-verification.json` | 4013 | `ef8887889b83fb95620dfed3ee4fa451fe0278cef7c32c309c4755056609b16d` |
| `qa-m6b/M7B-G2-A-TLS-VERIFICATION-EVIDENCE-20261125.md` | 8815 | `2b0fe12ce2171dc93a114cf5efa3af987cb0415166aa5ee09c158b7668fd4f5d` |
| `qa-m6b/M7B-G2-A-TLS-CODEX-ACCEPTANCE-HANDOFF-20261125.md` | 6601 | `3ab43370a363c1577cf28c27c25f134416b73c5d4245256e0c247d09c321a611` |

`application-helper-verification.json` was not edited. Its size and SHA-256 match the audited bytes. Pre-correction copies are in `qa-m6b/evidence/m7b-g2-a-tls-20261125/historical-pre-timeout-correction/`.

---

## 3. F1 — §B.2c membership expectations

Claude F1 (review PDF, pages 2–3): “§B.2c expectations contradict PostgreSQL 16+ behavior and the R4 preservation rule.” The review states that from PostgreSQL 16, when non-superuser `postgres` creates a role, it automatically receives an ADMIN membership in that role, with `supabase_admin` as grantor, and that Supabase documents this edge as irremovable. With `createrole_self_grant` empty, the automatic edge is `ADMIN=t, SET=f, INHERIT=f`. The new §B.2a edge, grantor `postgres`, is `ADMIN=f, SET=t, INHERIT=f`. R3 §B.2c expects one row per role with `inherit_option = f`, `set_option = t`, and `admin_option = f` (`qa-m6b/M7B-G2-R3-SQL-EXECUTION-PACKET-20261124.md`, §B.2c). That single-row expectation fails when both edges exist.

The same section of the review says the preserved provider edges for `anon` and `authenticated` are `ADMIN=t, INHERIT=t, SET=t`, so §B.2c fails again if it demands `inherit_option = f` and `admin_option = f`. R4 amendment §C already says: do not blindly re-run the R3 §B.2a `GRANT` of `anon` and `authenticated`; preserve the provider edges; grant `scs_intake_runtime` and `scs_notify_worker` only if missing, with PostgreSQL 16+ `INHERIT FALSE, SET TRUE, ADMIN FALSE`; do not add `scs_owner_admin` SET ROLE membership. R4 recorded §A.3 as `postgres` already a member of `anon` and `authenticated`, with `ADMIN=true`, `INHERIT=true`, `SET=true`, and grantor approximately `supabase_admin`.

Claude’s correction, adopted here: restate verification in effective terms. “Missing” means no edge with SET for that target. An admin-only row is not SET permission. At least one edge has `set_option = t`. For the `scs_*` harness targets, no edge has `inherit_option = t`. The irremovable automatic ADMIN edge granted by `supabase_admin` is expected. The `anon` and `authenticated` provider edges are preserved with their recorded options. The four SET ROLE probes remain the deciding check. `SHOW createrole_self_grant` is required read-only discovery. A non-empty value changes the automatic edge. **Unexpected automatic membership options are STOP.**

Future §B.2, only inside a later written A-SQL, and not now:

1. Run the complete membership-edge query in the companion (member, role, grantor, admin, inherit, set), not a single-row filter.
2. Grant `scs_intake_runtime` and `scs_notify_worker` to `CURRENT_USER` with `INHERIT FALSE, SET TRUE, ADMIN FALSE` when no existing edge has `set_option = t`. The automatic admin edge does not satisfy that test, so those two grants remain required after bootstrap.
3. Do not grant `anon` or `authenticated` again when the preserved provider edge already has `set_option = t`. Do not revoke, replace, or downgrade those edges. If a preserved edge does not provide SET, STOP and escalate. Do not improvise a grant.
4. Do not grant `scs_owner_admin` for SET ROLE. R3 §A.3 says case 8 uses an independent login.
5. Then run the four session-local probes: `SET ROLE` to `scs_intake_runtime`, `anon`, `authenticated`, and `scs_notify_worker`, read `current_user`, and `RESET ROLE` after each probe. Any probe failure blocks G2. Admin `SET ROLE` is not independent authentication. R3 and R4 both keep that distinction.
6. Do not alter the project administrator’s `rolinherit` or other role attributes to compensate.

The SQL text is in the companion under “Future §B.2 membership verification.” It is not authorized to run now.

---

## 4. F2 — Credential provisioning (design only)

Claude F2 (review PDF, page 3): “No authorized password-provisioning path exists.” R3 §B.5 offers a Dashboard Roles UI that must not be assumed until the owner verifies it, or `psql` `\password` under a separate authorization. The R4 amendment records `psql` as **not on PATH**. The discovery status records the same. No Node provisioning path is specified in the R3 packet. The review asks for one chosen method before A-SQL, including “(c) A separately reviewed Node procedure that computes the SCRAM-SHA-256 verifier locally and never sends or stores plaintext,” and `SHOW password_encryption` expecting `scram-sha-256`. It also says dashboard queries are attributable in the Postgres logs, so plaintext must never pass through the SQL Editor. The assessment (page 7) adds a minimum strength rule: random, at least 32 characters, unique per role.

**Atlas recommendation for later independent review:** a local Node.js SCRAM-SHA-256 procedure using the existing environment. This addendum does not select it for execution, does not generate a password, and does not generate a verifier.

### Blocker: a secure Node procedure is not established

This pass checked already-installed local code and did not install anything.

- The discovery status records Node **v22.22.3**. This pass confirmed the built-in `crypto` module exposes `pbkdf2Sync`, `createHmac`, `createHash`, and `randomBytes`.
- A search of repository `.js`, `.mjs`, and `.md` files found no `scram` or `pbkdf2` implementation.
- `saslprep` is absent from `node_modules` and from `netlify/functions/node_modules`. Node `crypto` does not implement SASLprep. PostgreSQL applies SASLprep before it derives a SCRAM-SHA-256 verifier.
- Writing that derivation here would be an unreviewed cryptographic implementation. This assignment forbids that, and it forbids generating passwords or verifiers.

### Alternatives compared, none installed or run

| Alternative | Source | Result in this pass |
|-------------|--------|---------------------|
| (a) Dashboard Roles UI | R3 §B.5 Method 1; Claude F2 | Unverified. Not selected. Plaintext must not be typed into the SQL Editor |
| (b) `psql` `\password` | R3 §B.5 Method 2; Claude F2 | `psql` is not on PATH. Installing it requires `A-DEP`, which is not authorized. Not selected |
| (c) Reviewed local Node SCRAM-SHA-256 procedure | Atlas recommendation; Claude F2 option (c) | Design only. Blocked until an independent review accepts an implementation that already exists or is separately authorized. Not written here |

### Requirements for that later review

The future procedure, if Atlas authorizes a review, must meet all of the following before any provisioning authorization:

- Unique random passwords, at least 32 characters, one each for `scs_intake_runtime`, `scs_notify_worker`, `scs_owner_admin`, and `scs_test_admin`.
- No password for `scs_migration`. The bootstrap creates it `NOLOGIN`. R3 §A.5 expects `rolcanlogin = false` after bootstrap.
- Secure interactive input and password-manager storage only.
- No plaintext password in SQL, history, chat, logs, or files.
- Locally generated SCRAM-SHA-256 verifiers. Treat verifiers as sensitive. Do not log a verifier or a password.
- No unreviewed cryptographic implementation. The review has to accept the SASLprep behavior explicitly, including any decision to restrict the alphabet to characters SASLprep does not rewrite.
- Direct Path A only, with the accepted TLS helper: `rejectUnauthorized` true, native hostname verification, `verify-full`, and the CA already proven in A-TLS. The connection string is not forwarded by that helper.
- `SHOW password_encryption` recorded as `scram-sha-256` before the procedure is eligible for review. Any other value is STOP.
- An explicit credential lifetime and a cleanup point. The duration is an unresolved owner decision. Cleanup includes removal from the password manager at fixture retirement (§F) or staging-project deletion, and no leftover login password on `scs_migration`.
- Separate written authorization for actual provisioning, and a further separate authorization for independent authentication. Provisioning is not `A-DBTEST`. SQL Editor and `SET ROLE` are not independent authentication.

`SHOW password_encryption` is in the companion. It is not authorized to run now.

---

## 5. F3 — Default privileges, grants, and the post-apply matrix

Claude F3 (review PDF, pages 3–4): “Supabase default privileges are not inspected, and the post-apply matrix is incomplete.” On projects with automatic API exposure, new objects in `public` receive table, function, and sequence privileges for `anon`, `authenticated`, and `service_role`. The migrations revoke from `PUBLIC`, `anon`, and `authenticated` on most objects and never revoke from `service_role`. Migration 006 grants the owner soft-delete and purge RPCs to `authenticated` (`db/migrations/006_m7a_r2_security_hardening.sql`, the `GRANT EXECUTE` statements to `scs_owner_admin, authenticated` for `is_owner_aal2`, `soft_delete_lead`, `purge_deleted_leads`, `purge_test_leads`, and `purge_unconverted_leads`). Claude says that contradicts the stated “anon/authenticated: nothing” posture unless it is intended for a future AAL2 path. R3 §C.4 and §C.5 sample only a few grants.

The review’s PostgreSQL 17.12 assessment (page 6) says the PG17 `MAINTAIN` privilege appears in Supabase defaults and must be included in the F3 matrix. Staging is recorded as 17.12 / 170012 in the R3 packet §A.0 and the R4 amendment §B. That version result is already **PASS**. It is not re-run here.

### Read-only discovery to prepare, not to run now

The companion contains text for:

- Global and `public`-schema `pg_default_acl`, with `aclexplode` so `MAINTAIN` is visible.
- Object-creating and elevated roles (`rolsuper`, `rolcreaterole`, `rolcreatedb`, `rolbypassrls`), interpreted against the already-recorded A.1 result for `postgres`.
- Schema ownership and `USAGE` / `CREATE` for `PUBLIC`, `anon`, `authenticated`, and `service_role`.
- The Supabase Data API setting and the “Automatically expose new tables and functions” setting, as a later dashboard observation. Those are not SQL. The owner does not change them in that observation.

**STOP before any future A-SQL apply** if that discovery shows a default ACL that grants `anon`, `authenticated`, `PUBLIC`, or `service_role` table, sequence, or function privileges in `public` or globally, until Atlas decides the posture below. Recording the rows is the point of discovery. Treating them as acceptable because the Data API is off is not allowed. **Data API disablement alone does not justify unnecessary grants.**

### Post-apply matrix, future §C only

R3 §C.4 and §C.5 remain necessary and are not sufficient. The companion’s post-apply text covers tables, views, sequences, functions, schemas, direct column ACLs, and effective privileges from `has_*_privilege` (inherited membership included) for `PUBLIC`, `anon`, `authenticated`, `service_role`, `scs_intake_runtime`, `scs_notify_worker`, `scs_migration`, `scs_owner_admin`, and `scs_test_admin`. `MAINTAIN` is included for ordinary and partitioned tables. The same future run records function owner, `prosecdef`, and `proconfig` search path; RLS and forced RLS; and `rolbypassrls`.

Application-owned objects are the `public` tables, functions, and policies created by the frozen migrations and the R3 fixture overlay, with the project administrator as owner. Provider-managed objects are everything else, including `auth`, `storage`, `extensions`, and roles such as `supabase_admin`. This addendum does not revoke provider-managed privileges and does not hand-edit frozen migrations.

R3 §C.1 expects application table owners to be the project admin, not a runtime role, the fixture role, or `scs_migration`. R3 §C.2 expects the designed `SECURITY DEFINER` functions to be owned by the project admin, with `search_path` hardened in `proconfig`. Migration 006 sets `search_path = pg_catalog, public` on those functions. Earlier drafts in migrations 002 and 003 used `search_path = public`. The post-apply `proconfig` is the check. A `SECURITY DEFINER` function whose `search_path` is missing, or is only `public`, is STOP. Do not `ALTER` the frozen functions to repair it in the execution window.

R3 §C.3 expects RLS enabled on the listed application tables. A lead-data table with RLS off is STOP. `rolbypassrls` on any `scs_*` role is STOP. R3 forbids granting `BYPASSRLS`, `SUPERUSER`, `CREATEROLE`, or `REPLICATION` to runtime or fixture roles.

**Unexpected access to lead data is STOP.** Lead-data objects for this gate are `public.leads`, `public.consent_records`, `public.submission_requests`, `public.notification_outbox`, `public.lead_deletion_markers`, `public.usage_counters`, `public.idempotency_keys`, `public.owner_allowlist`, and the functions that read or write them (`insert_lead_bundle`, `lookup_idempotency_response`, `idempotency_set_nx`, `atomic_counter_incr`, `atomic_counter_get`, `atomic_counter_expire`, `claim_notification_outbox`, `complete_notification_outbox`, `notification_outbox_status_counts`, `soft_delete_lead`, `purge_deleted_leads`, `purge_test_leads`, `purge_unconverted_leads`, `is_owner_aal2`). Effective privileges count, including privileges inherited through membership. Direct grants and effective privileges are both reported so an inherited grant is visible.

Until Atlas records a decision, these results stop acceptance of the matrix:

- Any effective table, column, sequence, or `MAINTAIN` privilege on the lead-data tables for `PUBLIC`, `anon`, or `authenticated`.
- `EXECUTE` on `insert_lead_bundle` for `anon` or `authenticated`. R3 §C.5 expects anon denied and intake `EXECUTE` true.
- The migration 006 `EXECUTE` grants to `authenticated` on `is_owner_aal2`, `soft_delete_lead`, and the three purge functions. They are expected to appear because the frozen file grants them. Their appearance is not acceptance. Claude flags them as contradicting the “anon/authenticated: nothing” posture unless a future AAL2 path intends them.
- Any `service_role` privilege on lead-data tables or lead functions that the accepted design did not explicitly require. R3 §C does not sample `service_role`. Migration comments say the `service_role` JWT is not interchangeable with the node-postgres roles.

R3 §C.4 expectations that remain in force after apply include `intake_idem_select` false, `notify_outbox_select` false, intake lookup `EXECUTE` true, notify claim `EXECUTE` true, fixture purge `EXECUTE` false, and the listed fixture column updates true only after §B.4. `scs_migration` with any login or any privilege on these objects is STOP.

### Report to Atlas — new migration may be required

If the intended posture is no `authenticated` `EXECUTE` on the owner soft-delete and purge functions, and no `service_role` or default-ACL privileges on lead data beyond an explicit design, the frozen migrations do not implement that posture. **A new reviewed migration would be required.** This pass does not write it, does not hand-edit `006` or `007`, and does not revoke provider-managed privileges. A-SQL stays unauthorized until Atlas records the decision.

---

## 6. F4 — Extension placement (`citext`)

Claude F4 (review PDF, page 4): “Extension placement is unverified.” Migration 001 runs `CREATE EXTENSION IF NOT EXISTS "pgcrypto"` and `CREATE EXTENSION IF NOT EXISTS "citext"` with no schema (`db/migrations/001_m7a_leads_foundation.sql`). The review says Supabase extensions usually live in `extensions`, or are created into the first `search_path` schema. Several `SECURITY DEFINER` functions pin `search_path = pg_catalog, public` and use `citext`. If `citext` is in `extensions`, its operators may not resolve at run time. `gen_random_uuid()` is core PostgreSQL and is not affected. The review’s correction is to stop and review if `citext` is present outside `public`, or would install outside it.

**This addendum makes `citext` schema compatibility a mandatory gate. A mismatch is STOP.** Do not relocate the extension. Do not modify the frozen functions. Do not add a schema clause by editing migration 001.

The companion query is the gate, for a later read-only window:

- If `citext` exists and its schema is `public`, the gate is clear. Record `pgcrypto` and `search_path` beside it.
- If `citext` exists in any other schema, **STOP**.
- If `citext` is absent, record `current_schema()` and whether the current user can `CREATE` there. Installation without a schema uses the current default object-creation schema. If that schema is not `public`, or the user cannot create there, **STOP** before apply.

Real-PG coverage of a `citext` comparison remains a later `A-DBTEST` concern through `insert_lead_bundle`, as the review notes for cases 2 and 3. `A-DBTEST` is not authorized.

---

## 7. F5 — Migration 006 and 007 notices

Claude F5 (review PDF, pages 4–5): “The 006 role and grant blocks can swallow failures.” The role block catches `insufficient_privilege` and `OTHERS` and raises notices that `scs_*` role creation was skipped (`db/migrations/006_m7a_r2_security_hardening.sql`). The grant block catches `undefined_object` and `insufficient_privilege` and raises notices that role grants were skipped. Other blocks catch `undefined_object` and continue with no notice. The bootstrap comment says not to use 006’s swallowed `insufficient_privilege` path as the provisioning path. Migration 007 aborts with `RAISE EXCEPTION` if the four bootstrap roles are missing (`db/migrations/007_m7a_r4_security_corrections.sql`). It does not use 006’s skip notices.

**Capturing and reviewing notices from migrations 006 and 007 is a future execution step.** It is not done in this pass. In that future step, the owner saves the full notice text with the execution log, excluding secrets.

**Any skipped role or grant is STOP.** A notice that role creation was skipped, or that role grants were skipped, stops the sequence. Do not continue to the next file. An exception from 007 is STOP. A notice from 007 that a role or grant was skipped is also STOP. Silence is not success: the F3 matrix is the gate for a grant that 006 swallowed without a notice. Do not hand-edit the frozen files to remove the handlers during the run.

---

## 8. F6 — A.4 and A.5 are already recorded, and they are not provisioning

Claude F6 (review PDF, page 5): “The pending read-only discovery is not complete. §A.4 and §A.5 are still pending owner execution, per the R4 amendment and the R4 final acceptance.”

That statement matches the documents Claude listed. R4 amendment §B says “§A.4 / §A.5 **Still pending Owner execution**.” R4 final acceptance §4 item 1 says “Complete remaining read-only A.4/A.5 discovery.” Claude’s evidence list on pages 1–2 does not include the later discovery status record.

The owner result is in `qa-m6b/M7B-G2-DIRECT-TLS-DISCOVERY-STATUS-20261124.md` §2, written after the amendment and the final acceptance. Both results are **NOT PROVISIONED**. The status note’s headings are swapped relative to the R3 section titles:

| R3 section | What R3 asks | Where the owner result is written | Result |
|------------|----------------|------------------------------------|--------|
| §A.4 Effective privilege snapshot | Intake role, fixture role, `idempotency_keys`, lookup function, conditional privileges | Status note heading “A.5 — Broader provision status” | **NOT PROVISIONED**. Intake present false. Fixture roles present false. Idempotency table present false. Lookup function present false. Conditional privileges **NULL** |
| §A.5 `scs_migration` remains NOLOGIN | Migration role status and `rolcanlogin` / `rolsuper` / `rolcreaterole` | Status note heading “A.4 — Migration role” | **NOT PROVISIONED**. `rolcanlogin`, `rolsuper`, and `rolcreaterole` **NULL** because the role is absent |

**Do not execute §A.4 or §A.5 again.** Discovery completion is not successful provisioning. The roles and objects are absent. A-SQL has not been performed.

Also already recorded, and not requested again as discovery:

- §A.0 PostgreSQL 17.12 / 170012 **PASS** (R3 packet).
- §A.1 `current_user` and `session_user` `postgres`, `rolsuper` false, `rolcreaterole` true, `rolcanlogin` true **PASS** (R3 packet).
- §A.2 `anon` and `authenticated` present; all five `scs_*` absent (R4 amendment §B).
- §A.3 provider membership of `postgres` in `anon` and `authenticated`, options ADMIN, INHERIT, and SET all true, grantor approximately `supabase_admin` (R4 amendment §B and §C).

The grantor word “approximately” is a precision limit of that recorded §A.3 row. This addendum does not request a duplicate §A.3 run. The future §B.2c query records the grantor exactly at execution time. Whether Atlas wants the exact pre-apply grantor string before issuing A-SQL is an unresolved decision in §13.

Remaining read-only discovery is only the items never recorded: `createrole_self_grant`, `password_encryption`, extension placement and `search_path`, default ACLs, schema ownership and CREATE, object-creating roles, and the Data API / automatic-exposure setting. Text and STOP conditions are in the companion.

---

## 9. F7 — Hosted connectivity (G3)

Claude F7 (review PDF, page 5): “Forward risk (not an A-SQL blocker): hosted Functions connectivity.” Direct connections map to IPv6. IPv4 is available through the shared pooler or the Pro-only IPv4 add-on. “Path A is proven for the owner workstation harness only. Whether Netlify Functions can reach the IPv6-only direct host is unverified, and likely not.” The review says G3 will probably need the session pooler (Path B) or the IPv4 add-on, and that the risk should be recorded so it is not discovered at deploy time.

**Recorded status: unresolved.** Path A remains the selected path for the owner workstation, per the R4 amendment and the R4 final acceptance. A-TLS recorded direct IPv6 TLS **PASS** from that workstation. Netlify Functions reachability of the IPv6-only direct host is not verified. This addendum does not select Path B, does not purchase an IPv4 add-on, and does not modify the connection validator (`netlify/functions/_lib/pg-client.js` stays frozen). G3 deploy remains unauthorized. F7 does not by itself block the document; it blocks any assumption that the workstation proof is a Functions proof.

---

## 10. F8 — `scs_test_admin` placement

Claude F8 (review PDF, page 5): “scs_test_admin creation is placed in two spots. §B.1 says it is optional between order 1 and 2, while the phase table puts it at phase 3, after §B.2. Pick one; phase 3 is recommended.”

The R3 phase table (packet, “Execution phases”) places §B.3 at **phase 3**, after phase 2 §B.2 and before phase 4 §B.5 and phase 5 §B.4. The same packet’s §B.1 also says “Optional between order 1 and 2: create `scs_test_admin`.” The bootstrap file says `scs_test_admin` is declared separately and is not created there.

**Consistent placement for a future authorized run: phase 3 only.** Create `scs_test_admin` after §B.2 membership verification and before password provisioning and the fixture overlay. Do not create it between bootstrap and migration 001. The bootstrap, migrations 001–007, and §B.2 finish first. §B.4 still requires the role to exist, which phase 3 provides before phase 5. The password is still out of band under §B.5, with no password literal in SQL. This resolves the packet’s two sentences. It does not edit the frozen bootstrap or the frozen migrations.

---

## 11. F9 — Partial bootstrap recovery

Claude F9 (review PDF, page 5): “The bootstrap has no transaction wrapper. It is idempotent, and a partial run is safely re-runnable. Keep the existing recovery row, and note that it was re-run intentionally.”

`db/bootstrap/001_m7a_r4_role_bootstrap.sql` is a sequence of `DO` blocks. It has no `BEGIN` / `COMMIT`. Each `CREATE ROLE` tolerates `duplicate_object` only after the role is confirmed to exist. A failed block can leave earlier roles created. The R3 recovery row remains: “Bootstrap fails — Fix CREATEROLE / identity; re-run bootstrap only; do not start migrations.”

**Re-run safety is not authorization to re-run.** The script can be applied again when a role already exists, because that duplicate path is the one it tolerates. That property does not authorize an execution. A re-run is available only inside a future A-SQL authorization that is still in force and only at the bootstrap failure point, before any migration has started. The owner records that the re-run was intentional. If the authorization was stopped, or a migration has started, the migration recovery row applies instead: stop, do not run the next file, capture the error without secrets, and do not hand-edit frozen SQL. Idempotence does not reopen a stopped authorization and does not authorize `A-DBTEST`.

---

## 12. Prerequisite checklist

Claude’s checklist (review PDF, pages 8–10) is restated with the reconciliation above. All execution items remain unauthorized now.

| # | Prerequisite | Status |
|---|----------------|--------|
| 1 | Dashboard project is `scs-staging`, ref `kfclinlrzfwodmichmci` | Recorded in the discovery status, the R3 packet, and the A-TLS evidence. Re-confirm by looking at the dashboard only at a future execution window |
| 2 | §A.4 and §A.5 recorded as **NOT PROVISIONED** | **Done.** See §8. This is not provisioning |
| 3 | Extra read-only discovery: `createrole_self_grant`, `password_encryption`, extensions and `search_path`, `pg_default_acl`, schema CREATE, object-creating roles, Data API / automatic exposure | **Not done.** SQL and observation text are in the companion. Not authorized now |
| 4 | §A.3 provider edges recorded | **Done** in the R4 amendment, with grantor recorded approximately. Not re-requested |
| 5 | This document-only addendum issued for Codex | **This file.** Codex verification is not done |
| 6 | Atlas decision on `service_role` and `authenticated` lead-object grants | **Unresolved.** `citext` mismatch is already a mandatory STOP (§6), not an open choice |
| 7 | Password method selected and independently reviewed | **Blocked.** See §4. No method is authorized to run |
| 8 | Credential rules: 32+ unique random passwords, none for `scs_migration`, password manager only, URLs only in the process environment under a future `A-DBTEST` | Stated in §4. Not performed |
| 9 | Independent-login client for §D.1 | A-TLS proved Path A and the `pg@8.13.1` helper. The exact §D Node procedure is not reviewed. `psql` is not installed. `A-DBTEST` is unauthorized |
| 10 | Exclusive serial execution window booked, owner present, stop and recovery tables in hand | **Not done** |
| 11 | Written A-SQL naming Signal Crest Systems LLC, ref `kfclinlrzfwodmichmci`, successor `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d`, and the authorized phases | **Not issued** |
| 12 | G3 forward risk recorded | **Recorded as unresolved** in §9. It does not select a hosted path |

Claude’s closing line remains the posture: the procedure is not ready for controlled owner execution until the open items are complete. Production remains **HOLD**.

---

## 13. Unresolved decisions and blockers

| Item | State |
|------|--------|
| Production | **HOLD** |
| A-SQL | **Unauthorized** |
| A-DBTEST | **Unauthorized** |
| A-DEP, Git, deploy, R5, Path B implementation | **Not authorized.** R4 final acceptance already withholds them |
| Password procedure | **Blocked.** No secure Node procedure is established from installed code. Dashboard UI unverified. `psql` absent |
| Credential lifetime duration | **Unresolved.** The later authorization must name it |
| Exact pre-apply §A.3 grantor string | Recorded approximately. Duplicate discovery is not requested. Atlas may still require the exact string before A-SQL |
| `authenticated` EXECUTE on owner RPCs, and `service_role` / default-ACL grants on lead data | **Unresolved Atlas decision.** A new migration is required if the intended posture removes them. Not written here |
| `citext` schema | **Unknown until the remaining discovery.** A mismatch is STOP |
| `createrole_self_grant` and `password_encryption` | **Unknown until the remaining discovery.** Non-empty `createrole_self_grant` is STOP. `password_encryption` other than `scram-sha-256` is STOP |
| G3 Netlify IPv6 connectivity | **Unresolved.** Path B not selected. IPv4 add-on not purchased. Connection validator not modified |
| Codex review of this addendum and of the timeout correction | **Not done.** See `qa-m6b/M7B-G2-A-SQL-ADDENDUM-CODEX-HANDOFF-20261125.md` |

---

## 14. Frozen inventory checked in this pass

**evidenceClass: static.** Recomputed from `qa-m6b/M7B-G2-R4-SUCCESSOR-HASH-INVENTORY-20261124.json`. Canonical lines `path<TAB>sha256<TAB>bytes`, sorted by path with `Sort-Object Path`, UTF-8, joined by `\n` with no extra trailing newline, SHA-256 lowercase hex. Inventory JSON and companion reports were excluded. On-disk bytes of the 64 paths were compared with the inventory.

| Check | Result |
|-------|--------|
| Entries | 64 |
| Expected digest | `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d` |
| Recomputed digest | `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d` |
| On-disk mismatches | **None** |
| Manifest | **Not modified** |

This addendum, the discovery companion, the timeout preservation directory, and the corrected A-TLS evidence files are outside that 64-entry inventory.

---

## 15. What this pass did not do

No Git operation, no SQL execution, no Supabase authentication, no network check, no password or SCRAM verifier generation, no dependency installation, no deploy, no role provisioning, no migration apply, and no edit to frozen candidate files. The helper verification JSON was not edited. Historical pre-correction copies were not modified after the copy.
