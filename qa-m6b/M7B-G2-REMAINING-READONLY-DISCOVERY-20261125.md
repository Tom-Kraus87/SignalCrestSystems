# M7B-G2 — Remaining read-only discovery package

**Date:** 2026-11-25  
**Project:** Signal Crest Systems LLC  
**Scope:** Signal Crest Systems.com improvement only  
**Class:** Local documentation and static inspection. SQL text and dashboard observation text only.  
**Suggested filename:** available. This is `qa-m6b/M7B-G2-REMAINING-READONLY-DISCOVERY-20261125.md`.  
**Production:** **HOLD**  
**A-SQL:** **unauthorized**  
**A-DBTEST:** **unauthorized**  
**A-TLS:** independently accepted and **CLOSED**. This file does not rerun TLS, rewrite A-TLS evidence, or reopen that finding.

**Running anything in this file is not authorized by this file.** A later written authorization has to name Signal Crest Systems LLC, project `scs-staging`, ref `kfclinlrzfwodmichmci`, and the exact block, before any statement below is eligible. A STOP ends the session. This file does not connect, authenticate, generate a password, or generate a SCRAM verifier.

This file does not overwrite `qa-m6b/M7B-G2-A-SQL-EXECUTION-ADDENDUM-20261125.md` or `qa-m6b/M7B-G2-A-SQL-REMAINING-DISCOVERY-QUERIES-20261125.md`. It does not edit frozen R4 files, the frozen manifest, or any migration. It does not write a new migration. It does not apply SQL.

---

## 1. Sources read (actual filenames)

| Role | Path |
|------|------|
| A-SQL execution addendum | `qa-m6b/M7B-G2-A-SQL-EXECUTION-ADDENDUM-20261125.md` |
| Companion discovery SQL already on disk | `qa-m6b/M7B-G2-A-SQL-REMAINING-DISCOVERY-QUERIES-20261125.md` |
| Codex handoff for that addendum | `qa-m6b/M7B-G2-A-SQL-ADDENDUM-CODEX-HANDOFF-20261125.md` |
| A.4 / A.5 owner record | `qa-m6b/M7B-G2-DIRECT-TLS-DISCOVERY-STATUS-20261124.md` |
| Accepted R3 packet | `qa-m6b/M7B-G2-R3-SQL-EXECUTION-PACKET-20261124.md` |
| R4 amendment | `qa-m6b/M7B-G2-R4-AMENDMENT-TO-R3-PACKET-20261124.md` |
| R4 final acceptance | `qa-m6b/M7B-G2-R4-FINAL-ACCEPTANCE-20261124.md` |
| R4 Codex checklist | `qa-m6b/M7B-G2-R4-CODEX-REVIEW-CHECKLIST-20261124.md` |
| R4 proposal audit checklist | `qa-m6b/M7B-G2-R4-TARGETED-HARNESS-CORRECTION-PROPOSAL-20261124.md` §10 |
| Frozen migration 006 | `db/migrations/006_m7a_r2_security_hardening.sql` |
| Frozen migration 007, read only to see which 006 grants survive | `db/migrations/007_m7a_r4_security_corrections.sql` |
| Frozen migration 001, extension placement | `db/migrations/001_m7a_leads_foundation.sql` |
| Frozen migration 002, owner predicate and policies | `db/migrations/002_m7a_rls_least_privilege.sql` |
| Bootstrap, read only | `db/bootstrap/001_m7a_r4_role_bootstrap.sql` |

There is no file under `qa-m6b` whose name is a Codex consolidated audit. The accepted audit verdict is `qa-m6b/M7B-G2-R4-FINAL-ACCEPTANCE-20261124.md` §1: independent Codex audit **PASS**, P0/P1 source-level findings **NONE IDENTIFIED**, R4 implementation gate **CLOSED**. The checklist artifact is `qa-m6b/M7B-G2-R4-CODEX-REVIEW-CHECKLIST-20261124.md`. Its boxes are still empty in the file; the acceptance record is the verdict. That closed R4 audit does not review the 2026-11-25 A-SQL addendum. `qa-m6b/M7B-G2-A-SQL-ADDENDUM-CODEX-HANDOFF-20261125.md` says that Codex review is **not yet performed**. `qa-m6b/M7A-R2-CONSOLIDATED-FINDING-REGISTER-20261123.md` is an earlier M7A register, not this gate.

A-TLS evidence stays where it is: `qa-m6b/M7B-G2-A-TLS-VERIFICATION-EVIDENCE-20261125.md`, `qa-m6b/M7B-G2-A-TLS-CODEX-ACCEPTANCE-HANDOFF-20261125.md`, and `qa-m6b/evidence/m7b-g2-a-tls-20261125/`. Not rerun. Not rewritten.

---

## 2. What frozen migration 006 would grant

Policy for this package: Atlas requires least-privilege access to application-owned lead records. The broad `authenticated` `EXECUTE` grants on owner-oriented functions in migration 006 are **not approved** as a final security posture. Supabase-managed roles and their provider permissions stay in place. This section reads the frozen text. It does not change it.

### 2.1 Grants on the successful path

After the bootstrap has created the four `scs_*` roles, the grant block in `db/migrations/006_m7a_r2_security_hardening.sql` (lines 659–685) does the following.

Granted to `scs_intake_runtime` only:

- `EXECUTE` on `public.insert_lead_bundle(text, text, citext, text, text, text, text, text, text, text, text, text, text, text, text, boolean, text, timestamptz, text)`
- `EXECUTE` on `public.atomic_counter_incr(text, bigint)`
- `EXECUTE` on `public.atomic_counter_expire(text, integer)`
- `EXECUTE` on `public.atomic_counter_get(text)`
- `EXECUTE` on `public.idempotency_set_nx(text, text, integer)`
- `SELECT` on `public.idempotency_keys`

Granted to `scs_notify_worker` only:

- `EXECUTE` on `public.claim_notification_outbox(text, integer, integer)`
- `EXECUTE` on `public.complete_notification_outbox(uuid, text, boolean, text)`

Granted to **both** `scs_owner_admin` and `authenticated` (lines 675–679):

- `EXECUTE` on `public.is_owner_aal2()`
- `EXECUTE` on `public.soft_delete_lead(uuid)`
- `EXECUTE` on `public.purge_deleted_leads(integer)`
- `EXECUTE` on `public.purge_test_leads(integer)`
- `EXECUTE` on `public.purge_unconverted_leads(integer)`

The same file revokes `CREATE` on schema `public` from `PUBLIC`, `anon`, and `authenticated`. It revokes all table privileges on `lead_deletion_markers`, `leads`, `consent_records`, `submission_requests`, `notification_outbox`, `usage_counters`, and `idempotency_keys` from `PUBLIC`, `anon`, and `authenticated`. It revokes `EXECUTE` on the intake and notify functions from `PUBLIC`, `anon`, and `authenticated`. It revokes `EXECUTE` on the five owner functions from `PUBLIC` only, and then grants those five to `authenticated`. It grants nothing to `service_role` and revokes nothing from `service_role`. It creates no view, no sequence, and no column `GRANT`. It does not `ALTER` owner.

`claim_notification_outbox` in 006 has no in-body caller check. Its restriction is the `EXECUTE` grant to `scs_notify_worker`.

### 2.2 What 007 leaves in place

`db/migrations/007_m7a_r4_security_corrections.sql` aborts if the four bootstrap roles are missing. It revokes the 006 `SELECT` on `idempotency_keys` from `scs_intake_runtime`. It drops `complete_notification_outbox(uuid, text, boolean, text)` and grants `EXECUTE` on `complete_notification_outbox(uuid, text, uuid, boolean, text)` to `scs_notify_worker`. It grants `EXECUTE` on `lookup_idempotency_response(text, text)` and `idempotency_set_nx(text, text, integer)` to `scs_intake_runtime`, and `EXECUTE` on `notification_outbox_status_counts()` to `scs_owner_admin`.

007 revokes `authenticated` on `lookup_idempotency_response`, `notification_outbox_status_counts`, `claim_notification_outbox`, the five-argument `complete_notification_outbox`, `idempotency_keys`, and `notification_outbox`. **007 does not revoke `EXECUTE` from `authenticated` on `is_owner_aal2`, `soft_delete_lead`, `purge_deleted_leads`, `purge_test_leads`, or `purge_unconverted_leads`.** `CREATE OR REPLACE` of `soft_delete_lead` keeps the existing grant. After a full 001–007 apply, the five `authenticated` `EXECUTE` grants from 006 are still there.

The 006 grant block catches `undefined_object` and `insufficient_privilege`, raises a notice, and continues (lines 680–685). The bootstrap text says not to use that swallowed path as provisioning. A notice that a role or a grant was skipped is STOP at a future apply. Silence is not success for any grant the handler swallowed without a notice.

### 2.3 The in-function check does not adequately restrict execution

`is_owner_aal2()` (006, lines 241–254) is `SECURITY DEFINER` with `search_path = pg_catalog, public`. It returns true only when `public.owner_allowlist.user_id` equals `auth.uid()` and `auth.jwt() ->> 'aal'` equals `aal2`. `soft_delete_lead` and the three purge functions call that predicate and then `RAISE EXCEPTION 'not authorized'` with no SQLSTATE (006, lines 370–371, 410–411, 457–458, 503–504). 007 sets `ERRCODE = 'insufficient_privilege'` on `soft_delete_lead` only. The three purge functions keep the 006 exception.

That predicate limits a **successful** call to a Supabase JWT whose subject is on `owner_allowlist` and whose `aal` claim is `aal2`. It is not a privilege boundary:

- `has_function_privilege('authenticated', …, 'EXECUTE')` is true for every member of `authenticated` because the grant is on that role.
- The functions are `SECURITY DEFINER`. A call that passes the predicate runs as the function owner, the project administrator, and bypasses the caller’s table privileges and RLS. The bodies delete or redact lead, consent, submission, and outbox rows.
- A direct session as `scs_owner_admin` does not populate `auth.uid()`. The predicate then fails. The dedicated owner role is granted `EXECUTE` and still cannot pass the check. The JWT role `authenticated` is the path that can pass it.
- Any caller who holds `EXECUTE` may enter the function. Denial happens after execution has started.
- `is_owner_aal2()` itself is granted to `authenticated` and returns the boolean for the current JWT. It does not return lead columns.

Migration 002 already granted `EXECUTE` on `is_owner_aal2()` to `authenticated` and created `FOR SELECT` / `FOR UPDATE` policies `TO authenticated` on `leads`, `consent_records`, `submission_requests`, and `owner_allowlist`, all gated by the same predicate (`db/migrations/002_m7a_rls_least_privilege.sql`, lines 41–64). 006 revokes table privileges from `authenticated` and does not drop those policies. The policies confer no access while the table grant is absent. A later default ACL or Data API grant of table privileges to `authenticated` would reopen lead rows through those policies. That result is unexpected lead-data access and is STOP.

The five `EXECUTE` grants are therefore not an approved final posture. The predicate does not make them acceptable.

### 2.4 Requirement for Atlas — reviewed correction required before SQL application

A new reviewed migration is required before any A-SQL apply. This package does not write it, does not edit 006 or 007, and does not include paste-ready correction SQL.

The correction Atlas reviews has to:

- Remove `EXECUTE` from `authenticated` on `is_owner_aal2`, `soft_delete_lead`, `purge_deleted_leads`, `purge_test_leads`, and `purge_unconverted_leads`, and leave `PUBLIC` and `anon` without `EXECUTE` on those functions.
- Bind successful owner execution to the application owner principal Atlas names. The frozen predicate does not treat `scs_owner_admin` as that principal. Revoking `authenticated` without a reviewed replacement check would leave the owner functions granted to `scs_owner_admin` and still failing closed on `auth.uid()`.
- Decide the frozen 002 policies that still name `authenticated`. They stay in the frozen file until a reviewed migration, accepted by Atlas, changes the application-object exposure. Hand-editing 002 is not allowed.
- Leave Supabase-managed roles and provider permissions in place. Do not drop or `ALTER` `anon`, `authenticated`, `service_role`, `authenticator`, or `supabase_admin`. Do not revoke provider membership edges. Do not change ownership or privileges on provider schemas `auth`, `storage`, or `extensions`. Do not revoke provider objects. An application-object `REVOKE EXECUTE` on the five functions, inside a reviewed migration, is the application change. It is not a change to the Supabase role.
- Avoid granting those functions, or lead-table DML, to `service_role` as a substitute. Frozen comments already say the `service_role` JWT is not interchangeable with the node-postgres roles. 004 and 005 do not contain a live `GRANT` to `service_role`. They also do not `REVOKE` one. A default-ACL privilege for `service_role` on lead data remains an Atlas decision and is STOP until that decision is recorded.

Until that reviewed correction is accepted, SQL application stays blocked.

---

## 3. Previous A.4 / A.5 evidence — complete as discovery, not provisioning

R3 packet sections and the status note were compared. The status-note headings are swapped relative to the R3 titles. The recorded values match the R3 queries they actually answer.

| R3 section | R3 query | Status-note heading | Recorded result |
|------------|----------|---------------------|-----------------|
| `qa-m6b/M7B-G2-R3-SQL-EXECUTION-PACKET-20261124.md` §A.4, “Effective privilege snapshot” | Intake role, fixture role, `idempotency_keys`, lookup function, conditional privileges | `qa-m6b/M7B-G2-DIRECT-TLS-DISCOVERY-STATUS-20261124.md` §2, heading “A.5 — Broader provision status” | **NOT PROVISIONED**. Intake present false. Fixture roles present false. Idempotency table present false. Lookup function present false. Conditional privileges **NULL** |
| Same packet §A.5, “`scs_migration` remains NOLOGIN” | `migration_role_status`, `rolcanlogin`, `rolsuper`, `rolcreaterole` | Same status note §2, heading “A.4 — Migration role” | **NOT PROVISIONED**. `rolcanlogin`, `rolsuper`, and `rolcreaterole` **NULL** because the role is absent |

R4 amendment §B still says “§A.4 / §A.5 **Still pending Owner execution**.” R4 final acceptance §4 item 1 still says “Complete remaining read-only A.4/A.5 discovery.” Both were written before the status note. The status note is the later owner record. Addendum §8 already reconciles them.

**These two results are complete as discovery. They are not successful provisioning.** The roles and objects are absent. A-SQL has not been performed. **This package does not request R3 §A.4 or §A.5 again.** The queries in §4 use different labels on purpose. RD-4 is an elevated-role inventory. It is not R3 §A.5.

Also already recorded, and not requested again:

- §A.0 PostgreSQL 17.12 / 170012 **PASS** (R3 packet and R4 amendment §B).
- §A.1 `current_user` and `session_user` `postgres`, `rolsuper` false, `rolcreaterole` true, `rolcanlogin` true **PASS**.
- §A.2 `anon` and `authenticated` present; all five `scs_*` absent (R4 amendment §B).
- §A.3 `postgres` is already a member of `anon` and `authenticated`, with ADMIN true, INHERIT true, and SET true, grantor approximately `supabase_admin` (R4 amendment §B and §C).

---

## 4. Remaining read-only SQL Editor discovery

Each block is read-only. Run each block as its own batch so one error does not hide the next result. Capture role names, settings, schema names, and privilege labels. Capture no passwords, verifiers, or connection strings.

### RD-1. Membership-option setting, password encryption, and SCRAM iterations

Recorded membership options, not re-queried: `postgres` is a member of `anon` and of `authenticated` with `admin_option` true, `inherit_option` true, and `set_option` true. The recorded grantor is approximately `supabase_admin`. R4 amendment §C says to preserve those provider edges. Duplicate §A.3 SQL is not in this file. The exact grantor string remains an Atlas decision (addendum §13). This package does not ask for a second §A.3 run.

When `createrole_self_grant` is empty, a later non-superuser `CREATE ROLE` by `postgres` is expected to add an automatic edge with `admin_option` true, `set_option` false, `inherit_option` false, and grantor `supabase_admin`. That edge is not SET permission. A non-empty `createrole_self_grant` changes those automatic options.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-1a
-- This is not R3 §A.4 and not R3 §A.5.
SHOW createrole_self_grant;
```

**Expected:** empty.  
**STOP:** any non-empty value. Do not continue to role creation. Unexpected automatic membership options are STOP.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-1b
SHOW password_encryption;
```

**Expected:** `scram-sha-256`.  
**STOP:** any other value. No credential procedure is eligible for review on another setting.

`scram_iterations` is not named in the accepted R3 packet, the R4 amendment, or the A-SQL addendum. Discover it without assuming the parameter exists. `SHOW` of a missing parameter aborts the batch. Use the catalog view.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-1c
SELECT name, setting, unit, source, boot_val
FROM pg_catalog.pg_settings
WHERE name = 'scram_iterations';
```

**Expected:** record the row if one is returned. Record **ABSENT** if zero rows are returned. Absence means the server did not expose the parameter. It does not supply an iteration count.  
**STOP:** a returned `setting` that is not a positive integer. Do not invent an iteration count from an absent row. Do not generate a password or a verifier from either result. Credential work stays blocked until a reviewed SCRAM procedure exists.

### RD-2. `citext` placement and `search_path`

Migration 001 runs `CREATE EXTENSION IF NOT EXISTS "citext"` with no schema (`db/migrations/001_m7a_leads_foundation.sql`, lines 7–8). Several `SECURITY DEFINER` functions pin `search_path = pg_catalog, public` and use `citext`, including `insert_lead_bundle`. `gen_random_uuid()` is core PostgreSQL and does not depend on `pgcrypto`.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-2
SELECT e.extname,
       n.nspname AS schema
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
ORDER BY 1;

SELECT current_setting('search_path') AS search_path,
       current_schema() AS current_schema,
       has_schema_privilege(current_user, current_schema(), 'CREATE')
         AS can_create_in_current_schema;
```

**Expected when `citext` is already installed:** one row with `extname = citext` and `schema = public`. Record the `pgcrypto` schema and the `search_path` beside it.

**STOP — a `citext` schema mismatch is STOP:**

- `citext` is present and `schema` is not `public`.
- `citext` is absent and `current_schema()` is not `public`.
- `citext` is absent and `can_create_in_current_schema` is not true.

Do not `ALTER EXTENSION`. Do not move the extension. Do not edit migration 001 or the frozen functions.

### RD-3. Default ACLs

Global rows have `defaclnamespace = 0`. On PostgreSQL 17, `MAINTAIN` appears as a privilege type when the default ACL includes it. Staging is already recorded as 17.12. This query does not re-run the version probe.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-3
-- Not R3 §A.4. R3 §A.4 is already NOT PROVISIONED and is not repeated.
SELECT r.rolname AS defacl_role,
       CASE
         WHEN d.defaclnamespace = 0 THEN '<global>'
         ELSE n.nspname
       END AS schema_scope,
       d.defaclobjtype,
       x.privilege_type,
       CASE
         WHEN x.grantee = 0 THEN 'PUBLIC'
         ELSE x.grantee::regrole::text
       END AS grantee,
       x.is_grantable
FROM pg_default_acl d
JOIN pg_roles r ON r.oid = d.defaclrole
LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) AS x
WHERE d.defaclnamespace = 0
   OR n.nspname = 'public'
ORDER BY 1, 2, 3, 5, 4;
```

**Expected:** record every row, including a zero-row result. An empty result is a recorded empty result. A populated Supabase default is a recorded default.  
**STOP for a future A-SQL apply:** any row whose `grantee` is `PUBLIC`, `anon`, `authenticated`, or `service_role` until Atlas decides whether those defaults are acceptable or a new reviewed migration must revoke the resulting application grants. Do not revoke them in this discovery. Do not edit frozen migrations. Disabling the Data API does not make those grants acceptable.

### RD-4. Object-creating and elevated roles

This inventory explains who can create objects that receive the default ACL. It is not R3 §A.5. R3 §A.5 already recorded `scs_migration` as **NOT PROVISIONED** and is not repeated.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-4
-- Not R3 §A.5.
SELECT rolname,
       rolsuper,
       rolcreaterole,
       rolcreatedb,
       rolcanlogin,
       rolbypassrls,
       rolinherit
FROM pg_roles
WHERE rolsuper
   OR rolcreaterole
   OR rolcreatedb
   OR rolbypassrls
   OR rolname IN (
        'postgres',
        'supabase_admin',
        'anon',
        'authenticated',
        'service_role'
      )
ORDER BY rolname;
```

**Expected:** `postgres` with `rolsuper` false, `rolcreaterole` true, and `rolcanlogin` true, matching the recorded §A.1 result. No `scs_*` role. Provider roles such as `supabase_admin` are recorded as provider-managed and are not revoked.  
**STOP:** the `postgres` attributes contradict the recorded §A.1 result; any `scs_*` role is present, which would contradict the recorded **NOT PROVISIONED** discovery; or a non-provider role other than `postgres` has `rolsuper` or `rolbypassrls`.

### RD-5. Public-schema access and object ownership

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-5
SELECT n.nspname,
       o.rolname AS owner,
       has_schema_privilege('public', n.oid, 'USAGE') AS public_usage,
       has_schema_privilege('public', n.oid, 'CREATE') AS public_create
FROM pg_namespace n
JOIN pg_roles o ON o.oid = n.nspowner
WHERE n.nspname IN ('public', 'extensions', 'auth', 'storage')
ORDER BY 1;

SELECT n.nspname,
       o.rolname AS owner,
       u.rolname AS grantee,
       has_schema_privilege(u.oid, n.oid, 'USAGE') AS usage,
       has_schema_privilege(u.oid, n.oid, 'CREATE') AS create_privilege
FROM pg_namespace n
JOIN pg_roles o ON o.oid = n.nspowner
JOIN pg_roles u
  ON u.rolname IN ('anon', 'authenticated', 'service_role')
WHERE n.nspname IN ('public', 'extensions', 'auth', 'storage')
ORDER BY 1, 3;
```

**Expected:** record owner, `USAGE`, and `CREATE`. `public` owned by the project administrator is the application schema. `extensions`, `auth`, and `storage` are provider-managed. Their owners stay as recorded.  
**STOP:** `anon` or `authenticated` has `CREATE` on `public`. Record `service_role` `CREATE` and take it to the Atlas decision in addendum §5. Do not revoke provider-managed schema privileges in this discovery.

Application objects do not exist yet. R3 §A.4 already recorded that absence as **NOT PROVISIONED**. Do not query lead tables or lead functions in this pre-apply pass. Ownership of those objects is a post-apply check in §6. The proposed owner is the project administrator, which recorded §A.1 identifies as `postgres`.

---

## 5. Dashboard Data API exposure — owner observation

This pass did not log into the Supabase Dashboard.

In a future read-only look at project `scs-staging`, ref `kfclinlrzfwodmichmci`, the owner records:

1. Whether the Data API is enabled or disabled.
2. Whether “Automatically expose new tables and functions” is on or off.
3. The project name and ref actually shown on screen, so the window is confirmed to be `scs-staging`.

Change neither setting. Do not open the Roles UI. Do not type a password. Do not copy a connection string into the evidence.

**Expected:** both settings written down for Atlas.  
**STOP for apply:** automatic exposure is on, until Atlas decides. RD-3 rows that grant `PUBLIC`, `anon`, `authenticated`, or `service_role` privileges on future `public` objects are the same stop. **Data API disablement alone does not justify those grants.**

---

## 6. Proposed future post-apply privilege matrix

**Status: PROPOSED. NOT APPLIED.** Nothing in the database was changed. This matrix is the least-privilege target for a future apply that includes a reviewed correction. It is not a description of privileges that exist today. Today the application objects are **NOT PROVISIONED**.

Applying frozen 006 as written would violate this matrix, because `authenticated` would hold `EXECUTE` on the five owner functions. That appearance is expected from the frozen file and is STOP for matrix acceptance.

Unexpected effective access to lead data is STOP. Lead-data objects are `public.leads`, `public.consent_records`, `public.submission_requests`, `public.notification_outbox`, `public.lead_deletion_markers`, `public.usage_counters`, `public.idempotency_keys`, `public.owner_allowlist`, and the functions that read or write them: `insert_lead_bundle`, `lookup_idempotency_response`, `idempotency_set_nx`, `atomic_counter_incr`, `atomic_counter_get`, `atomic_counter_expire`, `claim_notification_outbox`, `complete_notification_outbox`, `notification_outbox_status_counts`, `soft_delete_lead`, `purge_deleted_leads`, `purge_test_leads`, `purge_unconverted_leads`, and `is_owner_aal2`.

Effective privileges include privileges inherited through membership. Direct ACL rows and `has_*_privilege` results are both required so an inherited grant is visible. `scs_*` roles are created `NOINHERIT` by the bootstrap, so their effective privileges should equal their direct grants. Recorded §A.3 gives `postgres` `INHERIT` true on `anon` and `authenticated`. That inherited provider edge stays. It is not a reason to copy `anon` or `authenticated` privileges onto an `scs_*` role.

PostgreSQL 17 `MAINTAIN` applies to ordinary and partitioned tables. Proposed value on every lead-data table, for every role in this matrix: **false**. A true `MAINTAIN` result is STOP, including a true result that comes only from a default ACL. Data API disablement does not justify `MAINTAIN`.

Application migrations create no views and no sequences. A view or sequence that appears in `public` under application ownership is recorded. Any privilege on it for the roles below is STOP unless Atlas has named it. Provider views outside the application set are recorded and not revoked. `MAINTAIN` is not a sequence privilege. Sequence privileges to record are `USAGE`, `SELECT`, and `UPDATE`.

R3 §C.4 expectations remain in force after a future apply and are not a substitute for the full matrix: intake `SELECT` on `idempotency_keys` false, notify `SELECT` on `notification_outbox` false, intake lookup `EXECUTE` true, notify claim `EXECUTE` true, notify status-count `EXECUTE` false, owner status-count `EXECUTE` true, fixture purge `EXECUTE` false.

| Role | Tables, columns, sequences, MAINTAIN on lead data | Functions | Schema `public` | Inheritance |
|------|---------------------------------------------------|-----------|-----------------|-------------|
| `PUBLIC` | No `SELECT`, `INSERT`, `UPDATE`, `DELETE`, column privilege, sequence privilege, or `MAINTAIN` | No `EXECUTE` on lead functions | `CREATE` false. Record `USAGE`. `CREATE` true is STOP | Default `PUBLIC` grants count as effective privileges |
| `anon` | None of the above | No `EXECUTE` on lead functions, including `insert_lead_bundle` | `CREATE` false. Record `USAGE` | Do not add a membership. Preserve the existing provider edge on `postgres` |
| `authenticated` | None of the above. A table privilege plus a frozen 002 policy is lead-data access and is STOP | No `EXECUTE` on lead functions. The five 006 owner-function grants are a matrix failure, not an acceptance | `CREATE` false. Record `USAGE` | Same preserved provider edge. The role itself is not altered |
| `service_role` | None, unless a future Atlas decision names an explicit grant. An unnamed default-ACL grant is STOP | No `EXECUTE` on lead functions unless that same decision names the function | Record `CREATE` and `USAGE`. Do not revoke the role | Provider role. Preserve it. A JWT for this role is not an `scs_*` login |
| `scs_intake_runtime` | No table or column DML. No `SELECT` on `idempotency_keys` after 007. No sequence privilege. No `MAINTAIN` | `EXECUTE` on `insert_lead_bundle`, `atomic_counter_incr`, `atomic_counter_expire`, `atomic_counter_get`, `idempotency_set_nx`, and `lookup_idempotency_response` only | `CREATE` false. `USAGE` as required to call the granted functions | `NOINHERIT`. `rolsuper` false. `rolbypassrls` false. `LOGIN` true. No inherited lead privilege |
| `scs_notify_worker` | No table `SELECT` on `notification_outbox`. No other lead DML. No `MAINTAIN` | `EXECUTE` on `claim_notification_outbox(text, integer, integer)` and `complete_notification_outbox(uuid, text, uuid, boolean, text)` only. No status-count `EXECUTE` | `CREATE` false | `NOINHERIT`. `rolsuper` false. `rolbypassrls` false. `LOGIN` true |
| `scs_migration` | No privileges on lead objects | No `EXECUTE` | `CREATE` false | `NOINHERIT`. `NOLOGIN`. `rolcanlogin` false. `rolsuper` false. `rolbypassrls` false. Any privilege is STOP |
| `scs_owner_admin` | No broad table DML. Owner work goes through the reviewed functions | `EXECUTE` on `notification_outbox_status_counts`. `EXECUTE` on the five owner functions only if the reviewed correction also makes this role the principal that can succeed. `EXECUTE` for `authenticated` on those five is not this row | `CREATE` false | `NOINHERIT`. `LOGIN` true. `rolsuper` false. `rolbypassrls` false. No `SET ROLE` membership for the project administrator |
| `scs_test_admin` | Absent until a future phase-3 create. After a future authorized §B.4 only: column `UPDATE` on `leads.deleted_at`, `idempotency_keys.expires_at`, and `notification_outbox.lease_expires_at`, plus the `lead_deletion_markers` privileges R3 §B.4 names. Any broader column or table privilege is STOP. No `MAINTAIN` | No `EXECUTE` on purge, soft-delete, intake, or notify functions | `CREATE` false | `NOINHERIT`. `LOGIN` true after phase 3. `rolsuper` false. `rolbypassrls` false |

Function owners for application `SECURITY DEFINER` functions: the project administrator. `proconfig` contains `search_path=pg_catalog, public`. Owner equal to an `scs_*` role is STOP. `prosecdef` true with a missing `search_path`, or with `search_path` equal only to `public`, is STOP. Do not `ALTER FUNCTION` the frozen bodies in the execution window.

RLS stays enabled on each lead-data table listed above. RLS off is STOP. `BYPASSRLS`, `SUPERUSER`, `CREATEROLE`, or `REPLICATION` on any `scs_*` role is STOP.

Provider schemas `auth`, `storage`, and `extensions` are recorded with their current owners and privileges. This matrix does not revoke them and does not change their owners.

Future verification SQL, still **not authorized**, and still not a re-run of R3 §A.4 or §A.5, is the post-apply text already written in `qa-m6b/M7B-G2-A-SQL-REMAINING-DISCOVERY-QUERIES-20261125.md` §C.1 through §C.6. Use it only after a future authorization has applied bootstrap, migrations 001–007, the reviewed correction, phase-3 `scs_test_admin`, and §B.4. Missing application objects at that point are STOP. They are not a fresh-database **NOT PROVISIONED** result. If `service_role` is absent, the effective-privilege queries error. That error is STOP. Do not drop `service_role` from the role list to make a query succeed.

The checks those future queries must report are:

- Direct ACLs on tables, views, materialized views, and sequences (`relkind` `r`, `p`, `v`, `m`, `S`), with grantee and `MAINTAIN` where present.
- Effective `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and table `MAINTAIN`, plus sequence `USAGE`, `SELECT`, and `UPDATE`, for `public`, `anon`, `authenticated`, `service_role`, and every `scs_*` role, via `has_table_privilege` and `has_sequence_privilege` so inherited privileges are included.
- Function owner, `prosecdef`, `proconfig`, and effective `EXECUTE` for the same roles.
- Schema owner, `USAGE`, and `CREATE` on `public`, `extensions`, `auth`, and `storage` for the same roles.
- Direct column ACLs, then effective column `SELECT`, `INSERT`, and `UPDATE` on every column of the lead-data tables.
- RLS enabled and forced flags, and `rolbypassrls` for the same roles.

---

## 7. Findings that block SQL application

| Finding | Effect on A-SQL | Source |
|---------|-----------------|--------|
| Broad `authenticated` `EXECUTE` on the five owner functions | **Blocks apply.** Frozen 006 grants them. 007 leaves them. The in-function check does not adequately restrict execution. A reviewed correction is required and has not been written | 006 lines 675–679; 007 grant section; §2 of this file |
| Reviewed SCRAM procedure missing | **Blocks apply** of any login-role credential step. No procedure was written. No password and no verifier were generated. Dashboard UI is unverified. `psql` is not on PATH. `SHOW password_encryption` is not yet recorded | Addendum §4 and §13; discovery status §3 |
| `scram_iterations` unrecorded | **Blocks any credential step.** RD-1c is the recording query. A result does not authorize a verifier | This file §4 RD-1 |
| `citext` placement unverified | **Blocks apply** until RD-2 records schema `public`. A mismatch is STOP | Addendum §6; migration 001 lines 7–8 |
| `createrole_self_grant` unrecorded | **Blocks role creation.** A non-empty value is STOP | Addendum §3 and §13 |
| Default ACLs, public `CREATE`, and Data API exposure unrecorded | **Blocks apply** until RD-3, RD-5, and the dashboard notes are recorded and Atlas decides. Automatic exposure on is STOP. API-role default grants are STOP until that decision | Addendum §5 |
| `service_role` lead-data posture unresolved | **Blocks apply** under the least-privilege policy. Frozen SQL never revokes `service_role` | Addendum §5 and §13 |
| Written A-SQL authorization absent | **Blocks apply.** Production remains HOLD | R4 final acceptance §5 and §6 |
| Codex review of the A-SQL addendum not done | **Blocks readiness** for controlled execution. The closed R4 Codex audit does not cover the addendum | `qa-m6b/M7B-G2-A-SQL-ADDENDUM-CODEX-HANDOFF-20261125.md`; addendum §13 |
| G3 Netlify IPv6 connectivity | **Unresolved.** Addendum §9 records Claude F7 as a forward risk that is not, by itself, the reason to refuse a staging SQL paste. It blocks treating workstation TLS or a SQL apply as proof that Netlify Functions can reach the IPv6-only direct host. It blocks deploy. Path B is not selected. No IPv4 add-on is purchased. `netlify/functions/_lib/pg-client.js` stays unmodified. Stop if an execution plan assumes Functions connectivity, selects Path B, or buys the add-on | Addendum §9 and §13; R4 amendment §A |
| 006 and 007 skip notices | **Apply-time STOP** if a role or grant was skipped. An exception from 007 is STOP. This is not a reason to edit the frozen files | Addendum §7 |
| A-TLS | **Does not block.** Independently accepted and closed. Not rerun | A-TLS evidence and handoff |
| R3 §A.4 and §A.5 | **Discovery complete** as **NOT PROVISIONED**. They do not provision, and they are not open discovery items. They do not clear the blockers above | Status note §2; addendum §8 |

Also still unauthorized, from R4 final acceptance §5: A-DBTEST, dependency installation, credential access, Git operations, and deployment. R5 stays uninitiated. Path A remains selected for the owner workstation. Path B remains deferred.

---

## 8. Owner execution checklist

**This checklist does not authorize the owner to run it.**

When a separate written authorization names Signal Crest Systems LLC, `scs-staging`, and ref `kfclinlrzfwodmichmci`:

1. Open the Dashboard only for the observation in §5. Confirm the project on screen. Record Data API enabled or disabled, and record automatic exposure on or off. Change nothing. Do not open Roles. Do not enter a password.
2. In the SQL Editor, run RD-1a, RD-1b, RD-1c, RD-2, RD-3, RD-4, and RD-5, one block at a time. Save privilege labels and settings. Save no secrets.
3. Do not run R3 §A.4. Do not run R3 §A.5. Both are already **NOT PROVISIONED**.
4. Stop the session if `createrole_self_grant` is non-empty, `password_encryption` is not `scram-sha-256`, `scram_iterations` returns a non-positive value, `citext` is not in `public` or would install outside `public`, RD-3 shows a `PUBLIC` / `anon` / `authenticated` / `service_role` default grant, `anon` or `authenticated` has `CREATE` on `public`, any `scs_*` role exists, or `postgres` no longer matches recorded §A.1.
5. Stop if automatic exposure is on. A disabled Data API does not clear a bad default ACL.
6. Bring the notes to Atlas. Do not paste the bootstrap. Do not paste migrations 001–007. Do not create a role. Do not apply the proposed matrix. The matrix is proposed, not applied.
7. SQL application stays blocked until Atlas accepts the reviewed correction in §2.4 and a reviewed SCRAM procedure exists, and until the other rows in §7 that block apply are closed by a written decision. G3 stays unresolved for Functions connectivity even if a later staging paste is separately authorized.
8. After a future authorized apply, and only then, the §C queries in the companion file are the verification text. Unexpected lead-data access is STOP. A skipped 006 or 007 notice is STOP.

---

## 9. What this pass did

Local read of the files in §1 and of the frozen SQL cited in §2. One new evidence file was created. The suggested name was free.

No Git operation, no SQL execution, no Supabase login, no Dashboard login, no network check, no password or verifier, no dependency installation, no deploy, no edit to frozen R4 files, no edit to the frozen manifest, and no edit to any migration. A-TLS was not rerun. R3 §A.4 and R3 §A.5 were not requested again. Production remains **HOLD**. A-SQL remains unauthorized.
