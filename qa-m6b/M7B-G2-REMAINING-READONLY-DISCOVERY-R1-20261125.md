# M7B-G2 — Remaining read-only discovery procedure (R1)

**Milestone:** M7B-G2  
**Date:** 2026-11-25  
**Project:** Signal Crest Systems LLC  
**Scope:** Signal Crest Systems.com staging discovery text only  
**Status:** **PROCEDURE ONLY / NOT AUTHORIZED TO EXECUTE**  
**Production:** **HOLD**

The queries in this file are **NOT AUTHORIZED** to run until a later explicit owner authorization. This assignment does not authorize execution. It does not connect to a database, apply SQL, change a role, change a password, or deploy.

A later written authorization has to name Signal Crest Systems LLC, project `scs-staging`, ref `kfclinlrzfwodmichmci`, and the exact step numbers below, before any statement is eligible. A **STOP** ends that session. Do not run the next step after a STOP. Do not repair a STOP by editing a migration or by typing `GRANT`, `REVOKE`, `ALTER`, `CREATE`, `DROP`, or `SET ROLE`.

Published staging host already named in the A-SQL addendum: `db.kfclinlrzfwodmichmci.supabase.co`, port **5432**, Path A. This procedure does not connect to that host. Do not copy a password, a connection string, a key, or a JWT into the evidence.

`qa-m6b/M7B-G2-REMAINING-READONLY-DISCOVERY-20261125.md` is unchanged and remains the historical document. This R1 file is the consolidated successor procedure. Where a query below is the historical query, the step names that section. This file does not restate R3 §A.4 or R3 §A.5 as open work.

---

## 1. Already closed as discovery

These results stay as recorded in the historical document §3 and in `qa-m6b/M7B-G2-DIRECT-TLS-DISCOVERY-STATUS-20261124.md` §2. Do not run them again.

| Item | Live meaning |
|------|----------------|
| R3 §A.0 PostgreSQL 17.12 / 170012 | **PASS**. Not re-probed here. |
| R3 §A.1 `current_user` and `session_user` `postgres`, `rolsuper` false, `rolcreaterole` true, `rolcanlogin` true | **PASS**. Step 1 only checks that the session still matches. |
| R3 §A.2 `anon` and `authenticated` present; five `scs_*` roles absent | Recorded. Step 9 and step 10 say when a later presence of `scs_*` is a fresh-staging STOP. |
| R3 §A.3 `postgres` member of `anon` and `authenticated`, ADMIN true, INHERIT true, SET true, grantor approximately `supabase_admin` | Recorded. Step 11 records the exact grantor. It does not drop the edge. |
| R3 §A.4 effective privilege snapshot | **NOT PROVISIONED**. Status-note heading is swapped: the status note calls this “A.5 — Broader provision status”. |
| R3 §A.5 `scs_migration` NOLOGIN | **NOT PROVISIONED**. Status-note heading is swapped: the status note calls this “A.4 — Migration role”. The three role flags are **NULL** because the role is absent. |

**NOT PROVISIONED** is complete discovery. It is not provisioning. Absent application objects on fresh staging are **not** a failure of this procedure. A.4 and A.5 are not open checks.

A-TLS is independently accepted and **CLOSED**. This file does not rerun it. G3 Netlify IPv6 connectivity stays unresolved for Functions. That fact is not, by itself, a reason to refuse a later staging SQL paste. This document does not authorize that paste.

---

## 2. Sources for RD-4b and RD-6

Claude’s RD-4b and RD-6 text is in `C:\Users\tkrau\Downloads\M7B-G2 Migration 008 Architecture Refinement (R1).pdf` (title *M7B-G2 Migration 008 Architecture Refinement (R1)*, 25 November 2026, pages 18–20). It is not stored under `qa-m6b/`. The historical discovery file and the A-SQL addendum do not contain the labels RD-4b or RD-6.

That PDF is planning for a corrective migration 008. **This procedure does not authorize migration 008.** It does not include 008’s grants, revokes, or verification block. The PDF’s later sentence that says to run bootstrap, then migrations 001–007, then 008, is not an authorization.

Page 18 says Cursor’s package `qa-m6b/M7B-G2-REMAINING-READONLY-DISCOVERY-20261125.md` stays the authoritative list, and that the net new owner work is two read-only blocks, RD-6 and RD-4b. Page 19 says RD-1 through RD-5, the dashboard observation, or 008’s own checks already cover the other items on that page. Page 20 says the package’s STOP rules apply unchanged.

### 2.1 Claude RD-6, quoted

Page 19 labels the block “RD-6 (READ-ONLY) — how auth.uid()/auth.jwt() obtain claims (X-1)”:

```sql
SELECT p.oid::regprocedure AS fn, pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'auth' AND p.proname IN ('uid','jwt','role')
ORDER BY 1;
```

Page 20 states the expected reading and the limit of that reading:

> Expect: definitions read current_setting('request.jwt.claim%' / 'request.jwt.claims').  
> Record only. Confirms §2.2: claims are session-settable; AAL2 is not enforced for direct logins.

Page 3, §2.2, is the distinction that sentence points at. Direct database credentials (`scs_owner_admin`, `postgres`) authenticate whoever holds the role password. The database then knows `session_user`. It does not know a human or MFA. §2.2 says `is_owner_aal2()` is not authoritative on that path because any session can set `request.jwt.claims`. Genuine hosted AAL2, in that section, is a Supabase Auth user through a provider-signed JWT verified at a G4 endpoint. Page 4 says no document may call a direct-credential path “AAL2 enforced”.

This procedure uses that distinction as a reading rule for step 14. It does not build the G4 endpoint, and it does not change `is_owner_aal2()`.

### 2.2 Claude RD-4b, quoted

Page 19 row: “Membership into postgres and the API roles (V-6 inputs). New: RD-4b (below), extending RD-4.”

Page 20:

```sql
SELECT m.rolname AS member, r.rolname AS role, g.rolname AS grantor,
       am.admin_option, am.inherit_option, am.set_option
FROM pg_auth_members am
JOIN pg_roles m ON m.oid = am.member
JOIN pg_roles r ON r.oid = am.roleid
JOIN pg_roles g ON g.oid = am.grantor
WHERE r.rolname IN ('postgres','anon','authenticated','service_role')
   OR m.rolname IN ('anon','authenticated','service_role')
ORDER BY 2, 1;
```

> Expect: provider edges only (e.g. authenticator -> anon/authenticated/service_role; postgres -> anon/authenticated).  
> STOP if anon/authenticated/service_role is a MEMBER of any role, or a non-provider role is a member of postgres.

The same page gives the session order once a separate authorization exists: dashboard observation; RD-1a, RD-1b, RD-1c; RD-2, RD-3; RD-4, then RD-4b; RD-5, then RD-6.

### 2.3 What this file adds to those two queries

The owner assignment requires effective transitive reachability. Claude’s RD-4b query is one direct-edge query. Step 11 is that query, unchanged. Step 12 is the additional recursive read. It is not a second query for the same direct edges. Output is limited to depth 2 and deeper.

The owner assignment also requires explicit default-ACL grantors. Claude page 19 item X-2 says RD-3 records the defaults and that 008 would check the grantor at apply time, so X-2 was “no new owner work” in that PDF. The historical RD-3 query records the default-ACL role and the grantee. It does not output `aclexplode`’s grantor. Step 8 is the historical query with that grantor column added on the same row. It is not a second default-ACL query, and it is not permission to run 008.

Privilege-function signatures are inspected in step 6. Local files do not contain a PostgreSQL 17 catalog dump of `pg_proc`. This procedure does not assume a changed signature. Calls that depend on `has_schema_privilege`, `has_table_privilege`, `has_function_privilege`, or `aclexplode` run only when step 6 has shown a compatible installed signature.

---

## 3. Dashboard navigation

Use project `scs-staging`, ref `kfclinlrzfwodmichmci`, only after a later authorization names that project. Confirm the project name and ref on screen before recording anything. Change no setting.

| Observation | Path | Rule |
|-------------|------|------|
| SQL for the steps below | Local documents say “SQL Editor” and do not spell a longer click path. A generally accurate Supabase path is the project **SQL Editor**. | Read-only, and only when a later authorization names the step. One block at a time. |
| Data API enabled or disabled, and “Automatically expose new tables and functions” | **Dashboard path not specified in local sources.** The historical document §5 and the companion query file §A.7 name the two settings and do not name the menu. | Record both. Change neither. Mark the menu uncertain rather than guessing Settings → API versus another label. |
| Extensions, including `citext` placement | **Dashboard path not specified in local sources.** Database → Extensions is a generally accurate Supabase screen. Treat that label as uncertain if the project shows a different one. | Step 7 is the record of placement. Do not move an extension from the screen. |
| Roles and membership | Historical document §5 and companion §A.7: **do not open the Roles UI.** Database → Roles is a generally accurate Supabase path and is **not** used by this procedure. | Role facts come from steps 10–12. Do not set a password. Do not type a password into the SQL Editor. |
| Database settings for the TLS CA | Status note: Dashboard → Database Settings → SSL Configuration. | A-TLS is closed. This procedure does not reopen that screen and does not copy the CA into evidence. |
| Auth settings | **Dashboard path not specified in local sources.** | Step 14 reads `auth.uid()`, `auth.jwt()`, and `auth.role()` in SQL. Do not copy an API key or a JWT. |

---

## 4. Numbered procedure

Run the steps in order. Each SQL block is a separate batch. Capture the evidence in §5. Do not select `pg_authid.rolpassword`. Do not `SELECT` rows from lead tables. Catalog reads only.

Frozen migration facts the later steps compare against, read from source and not applied by this file:

- `db/migrations/006_m7a_r2_security_hardening.sql` lines 675–679 grant `EXECUTE` to `scs_owner_admin` and `authenticated` on `is_owner_aal2()`, `soft_delete_lead(uuid)`, `purge_deleted_leads(integer)`, `purge_test_leads(integer)`, and `purge_unconverted_leads(integer)`.
- `db/migrations/007_m7a_r4_security_corrections.sql` does not revoke those five grants. `CREATE OR REPLACE` of `soft_delete_lead` keeps the existing grant.
- Those five grants are **not** an approved final posture. `is_owner_aal2()` limiting a successful call to an allowlisted JWT whose `aal` claim is `aal2` does not limit who may `EXECUTE`.
- The 006 grant block can raise a notice and continue when a role is missing or the grantor lacks privilege (lines 680–685). A skipped role or grant notice is an apply-time **STOP**. This procedure has no notice to read, because it does not apply SQL.

### Step 1 — Evidence identity

**When:** runs before migrations.

**Source:** historical document §3 recorded R3 §A.1. This is not R3 §A.4 and not R3 §A.5.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 1 evidence identity
SELECT clock_timestamp() AT TIME ZONE 'UTC' AS captured_at_utc,
       current_user,
       session_user,
       current_database() AS database_name;
```

**Expected:** `current_user` and `session_user` are `postgres`, matching recorded §A.1. Record the database name. Do not treat a name match as permission to continue into a mutation.

**STOP:** `current_user` or `session_user` is not `postgres`. End the session.

### Step 2 — Dashboard observation

**When:** runs before migrations.

**Source:** historical document §5 and companion `qa-m6b/M7B-G2-A-SQL-REMAINING-DISCOVERY-QUERIES-20261125.md` §A.7. No SQL.

Record, from the screen identified in §3:

1. Data API enabled or disabled.
2. “Automatically expose new tables and functions” on or off.
3. The project name and ref shown on screen.

**Expected:** both settings and the on-screen project identity written down. Unknown until that observation.

**STOP:** the on-screen project is not `scs-staging` / `kfclinlrzfwodmichmci`. End the session. Automatic exposure **on** is a **STOP** for a later A-SQL apply until Atlas decides. A disabled Data API does not clear a bad default ACL. Do not change either setting in order to avoid the stop.

### Step 3 — RD-1a `createrole_self_grant`

**When:** runs before migrations.

**Source:** historical document §4 RD-1a. Same statement as companion §A.1.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-1a
-- This is not R3 §A.4 and not R3 §A.5.
SHOW createrole_self_grant;
```

**Expected:** empty. Until this step is captured, the value is unrecorded. An empty result is not a guess, and a missing capture is not a license to assume empty.

**STOP:** any non-empty value. Unexpected automatic membership options are **STOP**. Do not continue to role creation. End the session. This step does not create a role.

### Step 4 — RD-1b `password_encryption`

**When:** runs before migrations.

**Source:** historical document §4 RD-1b. Same statement as companion §A.2.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-1b
SHOW password_encryption;
```

**Expected:** `scram-sha-256`. Until this step is captured, the value is unrecorded. Do not invent it.

**STOP:** any other value. No credential procedure is eligible for review on another setting. End the session. Do not generate a password or a SCRAM verifier.

### Step 5 — RD-1c `scram_iterations`

**When:** runs before migrations.

**Source:** historical document §4 RD-1c. `SHOW` of a missing parameter aborts the batch, so the historical file reads `pg_settings`.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-1c
SELECT name, setting, unit, source, boot_val
FROM pg_catalog.pg_settings
WHERE name = 'scram_iterations';
```

**Expected:** record the row if one is returned. Record **ABSENT** if zero rows are returned. Absence means the server did not expose the parameter. It does not supply an iteration count.

**STOP:** a returned `setting` that is not a positive integer. Do not invent an iteration count from an absent row. Do not generate a password or a verifier. Credential work stays blocked either way until a reviewed SCRAM procedure exists. A non-positive setting ends the session.

### Step 6 — Installed signatures and catalog columns

**When:** runs before migrations.

**Source:** this R1 file. Local SQL does not include a PostgreSQL 17 `pg_proc` dump. Inspect the installed rows. Do not assume a signature, and do not add an overload that is not in the result.

`pg_has_role` is listed so its installed signature is recorded. This procedure does not call `pg_has_role`. Transitive reachability is step 12.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 6 function signatures
-- Inspect only. Do not assume a PostgreSQL 17 signature.
SELECT p.proname,
       pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       pg_catalog.pg_get_function_result(p.oid) AS result_type,
       p.pronargs
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'pg_catalog'
  AND p.proname IN (
        'has_schema_privilege',
        'has_table_privilege',
        'has_sequence_privilege',
        'has_function_privilege',
        'has_column_privilege',
        'aclexplode',
        'pg_has_role'
      )
ORDER BY p.proname, identity_arguments;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 6 pg_auth_members columns
-- Local companion §B.2 and Claude RD-4b use these names.
-- Confirm them on the server before step 11.
SELECT a.attname, a.attnum,
       pg_catalog.format_type(a.atttypid, a.atttypmod) AS typ
FROM pg_catalog.pg_attribute a
WHERE a.attrelid = 'pg_catalog.pg_auth_members'::regclass
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY a.attnum;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 6 ACL column names
SELECT c.relname, a.attname
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
WHERE n.nspname = 'pg_catalog'
  AND c.relname IN ('pg_namespace', 'pg_default_acl', 'pg_class', 'pg_proc')
  AND a.attname IN (
        'nspname', 'nspowner', 'nspacl',
        'defaclrole', 'defaclnamespace', 'defaclobjtype', 'defaclacl',
        'relname', 'relkind', 'relacl', 'relowner',
        'relrowsecurity', 'relforcerowsecurity',
        'proname', 'proowner', 'proacl', 'prosecdef', 'proconfig'
      )
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY c.relname, a.attnum;
```

**Expected:** record every row. Unknown until captured. A function that has several overloads produces several rows. That is a normal finding.

**STOP:**

- Any of the three queries errors. End the session. Do not rewrite the query against a guessed column.
- `pg_auth_members` does not show all of `roleid`, `member`, `grantor`, `admin_option`, `inherit_option`, and `set_option`. End the session before step 11. Do not rename those columns.
- `aclexplode`’s `result_type` does not name `grantor`, `grantee`, `privilege_type`, and `is_grantable`. End the session before step 8, step 13’s ACL explode, and step 15. The predecessor already calls `aclexplode` with `grantee`, `privilege_type`, and `is_grantable`. This file adds `grantor` only when the result type names it.

Later `has_*_privilege` calls in this file are allowed only when a recorded `identity_arguments` row has the same argument shape as the call. If it does not, skip that call, record **UNVERIFIED**, and apply the STOP on that later step. Do not invent another overload.

### Step 7 — RD-2 `citext` placement and `search_path`

**When:** runs before migrations.

**Source:** historical document §4 RD-2. Same statements as companion §A.3. Migration 001 runs `CREATE EXTENSION IF NOT EXISTS "citext"` with no schema (`db/migrations/001_m7a_leads_foundation.sql` lines 7–8).

Run the extension list first. Run the second statement only if step 6 showed a `has_schema_privilege` identity compatible with `(current_user, current_schema(), 'CREATE')`.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-2 extensions
SELECT e.extname,
       n.nspname AS schema
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
ORDER BY 1;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-2 search_path
-- Run only if step 6 showed a compatible has_schema_privilege.
SELECT current_setting('search_path') AS search_path,
       current_schema() AS current_schema,
       has_schema_privilege(current_user, current_schema(), 'CREATE')
         AS can_create_in_current_schema;
```

**Expected when `citext` is already installed:** one row with `extname = citext` and `schema = public`. Record the `pgcrypto` schema and the `search_path` beside it. `gen_random_uuid()` is core PostgreSQL and does not depend on `pgcrypto`.

**STOP:**

- `citext` is present and `schema` is not `public`. **STOP.** Do not `ALTER EXTENSION`. Do not move the extension. Unverified placement is also **STOP** before any later SQL apply: if the extension query errors, end the session.
- `citext` is absent and `current_schema()` is not `public`.
- `citext` is absent and `can_create_in_current_schema` is not true.
- `citext` is absent and the second statement was skipped because the signature was not confirmed. Placement of a future install is then **UNVERIFIED**. **STOP.**

This step records placement. It does not move the extension and does not edit migration 001.

### Step 8 — RD-3 default ACLs, grantors, grantees, and PUBLIC

**When:** runs before migrations.

**Source:** historical document §4 RD-3, with `acl_grantor` added from the same `aclexplode` row. Run only if step 6’s `aclexplode` result type names `grantor`, `grantee`, `privilege_type`, and `is_grantable`, and `pg_default_acl` shows `defaclrole`, `defaclnamespace`, `defaclobjtype`, and `defaclacl`.

Grantee oid **0** is `PUBLIC`. The historical query already labels grantee 0 that way. The same label is used for grantor 0 if that oid appears. `PUBLIC` is a pseudo-role. It is not a `pg_roles` row.

Claude’s refinement PDF page 4 says the built-in default gives `PUBLIC` `EXECUTE` on every new function, and that a schema-scoped default ACL adds to the global default rather than removing it. That sentence explains why a `PUBLIC` row matters. This procedure does not contain `ALTER DEFAULT PRIVILEGES` and does not authorize that statement.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-3
-- Not R3 §A.4. Historical §4 RD-3 plus acl_grantor on the same aclexplode row.
SELECT r.rolname AS defacl_role,
       CASE
         WHEN d.defaclnamespace = 0 THEN '<global>'
         ELSE n.nspname
       END AS schema_scope,
       d.defaclobjtype,
       CASE
         WHEN x.grantor = 0 THEN 'PUBLIC'
         ELSE x.grantor::regrole::text
       END AS acl_grantor,
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
ORDER BY 1, 2, 3, 6, 5;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-3 null-ACL count
-- The explode query drops a null defaclacl. This count records those rows.
SELECT count(*) AS default_acl_rows,
       count(*) FILTER (WHERE d.defaclacl IS NULL) AS null_acl_rows
FROM pg_default_acl d
LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
WHERE d.defaclnamespace = 0
   OR n.nspname = 'public';
```

**Expected:** record every explode row, including a zero-row explode. Record the null-ACL count. An empty explode is a recorded empty result, not a pass. A populated Supabase default is a recorded default, not an acceptance. `MAINTAIN` may appear as `privilege_type` on a PostgreSQL 17 default. Record it if present. Do not add it if the row does not contain it.

**STOP:** any explode row whose `grantee` is `PUBLIC`, `anon`, `authenticated`, or `service_role`. End the session after the rows are saved. Those rows **STOP** a future A-SQL apply until Atlas decides whether the defaults are acceptable or a new reviewed migration must revoke the resulting application grants. Do not revoke them here. A disabled Data API does not justify the grants. A null `defaclacl` that this query cannot explode is **UNVERIFIED**. **STOP** before any later SQL apply and end the session.

Steps 9 through 15 do not run after this STOP. They remain required and unrun until a later written authorization names them.

### Step 9 — Application-object presence

**When:** runs before migrations as a presence check. A zero-row result is **not** a failure.

**Source:** object names created by `db/migrations/001` through `007`. This is not R3 §A.4.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 9 presence
-- Zero rows on fresh staging are NOT a failure.
SELECT 'table' AS object_kind, c.relname AS object_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
  AND c.relname IN (
        'leads',
        'consent_records',
        'submission_requests',
        'owner_allowlist',
        'usage_counters',
        'idempotency_keys',
        'notification_outbox',
        'lead_deletion_markers'
      )
UNION ALL
SELECT 'routine', p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
        'insert_lead_bundle',
        'is_owner_aal2',
        'atomic_counter_incr',
        'atomic_counter_expire',
        'atomic_counter_get',
        'idempotency_set_nx',
        'soft_delete_lead',
        'purge_deleted_leads',
        'purge_test_leads',
        'purge_unconverted_leads',
        'claim_notification_outbox',
        'complete_notification_outbox',
        'lookup_idempotency_response',
        'notification_outbox_status_counts'
      )
ORDER BY 1, 2;
```

**Expected on fresh staging:** zero rows. Record **NOT PRESENT**. Skip step 15. Continue with steps 10–14. Historical §A.4 **NOT PROVISIONED** still stands.

**Full set:** all eight table names and all fourteen routine names. Record **MIGRATIONS 001–007 OBJECTS PRESENT**. That contradicts the historical **NOT PROVISIONED** baseline. Record the contradiction. Do not drop the objects. Continue the remaining read-only steps, including step 15.

**STOP:** any other result (some named objects, not all). Partial presence is neither fresh staging nor a finished 001–007 apply. End the session. Do not create the missing objects.

### Step 10 — RD-4 object-creating and elevated roles

**When:** runs before migrations.

**Source:** historical document §4 RD-4. Same statement as companion §A.5 in that query file (that companion heading is not R3 §A.5).

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

**Expected when step 9 is NOT PRESENT:** `postgres` with `rolsuper` false, `rolcreaterole` true, and `rolcanlogin` true, matching recorded §A.1. No `scs_*` role. Provider roles such as `supabase_admin` are recorded and are not revoked.

**Expected when step 9 is the full set:** record `postgres` and any `scs_*` rows that exist. Presence of `scs_*` in that case is not, by itself, the fresh-staging contradiction. `scs_migration` with `rolcanlogin` true is still a **STOP**. Any `scs_*` row with `rolsuper` true or `rolbypassrls` true is a **STOP**.

**STOP:**

- `postgres` attributes contradict recorded §A.1. End the session.
- Step 9 is **NOT PRESENT** and any `scs_*` role exists. That contradicts recorded **NOT PROVISIONED**. End the session.
- A role other than the provider-managed names already used in the historical document (`supabase_admin`, `anon`, `authenticated`, `service_role`) and other than `postgres` has `rolsuper` or `rolbypassrls`. End the session. Do not invent further provider names to avoid the stop. Record an unfamiliar superuser or bypass role and stop.

### Step 11 — RD-4b direct membership

**When:** runs before migrations.

**Source:** Claude RD-4b, quoted in §2.2. Run only if step 6 showed `roleid`, `member`, `grantor`, `admin_option`, `inherit_option`, and `set_option`.

This query is the direct-edge record. It includes grantor identity and the ADMIN, INHERIT, and SET options. Provider-managed memberships are recorded and preserved. This step does not revoke them and does not grant new ones.

Named set used only to classify a STOP, taken from roles already named in the historical document and in Claude’s example: `postgres`, `supabase_admin`, `authenticator`, `anon`, `authenticated`, `service_role`. A role outside that set is not given a provider label by this file.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-4b direct edges
-- Claude R1 PDF page 20. Confirm column names in step 6 first.
SELECT m.rolname AS member, r.rolname AS role, g.rolname AS grantor,
       am.admin_option, am.inherit_option, am.set_option
FROM pg_auth_members am
JOIN pg_roles m ON m.oid = am.member
JOIN pg_roles r ON r.oid = am.roleid
JOIN pg_roles g ON g.oid = am.grantor
WHERE r.rolname IN ('postgres','anon','authenticated','service_role')
   OR m.rolname IN ('anon','authenticated','service_role')
ORDER BY 2, 1;
```

**Expected:** provider edges only. Claude’s example is `authenticator` as member of `anon`, `authenticated`, and `service_role`, and `postgres` as member of `anon` and `authenticated`. The recorded §A.3 options on those two `postgres` edges are `admin_option` true, `inherit_option` true, and `set_option` true. Record the exact `grantor`. The historical word was “approximately `supabase_admin`”. This step replaces the approximation with the returned name. Do not drop the edge if the name differs.

**STOP:**

- `anon`, `authenticated`, or `service_role` is a member of any role (the `member` column is one of those three). End the session.
- A role outside the named set above is a member of `postgres`. End the session. Do not drop that membership.
- The `postgres` membership in `anon` or in `authenticated` does not have all three options true. Unexpected membership options are **STOP**. End the session.
- The grantor of those two recorded edges is not `supabase_admin`. End the session for classification. Do not revoke the edge.

`SET ROLE` is not part of this procedure. Companion §B.3 session probes are future post-grant checks. They are **NOT AUTHORIZED** and are not run here.

### Step 12 — RD-4b transitive reachability

**When:** runs before migrations.

**Source:** owner requirement added to Claude RD-4b. Direct edges stay in step 11. This query returns only depth 2 and deeper. Run only after the same column confirmation as step 11.

`inherit_along_path` is a reading aid: true only when every edge on that path has `inherit_option` true. It is not `pg_has_role`. A `set_option` on an indirect edge is not recorded as `SET ROLE` permission for the start role. Direct SET permission is step 11’s `set_option` only.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-4b transitive paths
-- Depth >= 2 only. Direct edges remain step 11.
-- Run only after step 6 confirms the pg_auth_members columns.
WITH RECURSIVE walk AS (
  SELECT
    m.rolname AS start_role,
    m.rolname AS member_name,
    r.rolname AS role_name,
    g.rolname AS grantor_name,
    am.admin_option,
    am.inherit_option,
    am.set_option,
    1 AS depth,
    ARRAY[m.rolname, r.rolname]::text[] AS path,
    am.inherit_option AS inherit_along_path
  FROM pg_catalog.pg_auth_members am
  JOIN pg_catalog.pg_roles m ON m.oid = am.member
  JOIN pg_catalog.pg_roles r ON r.oid = am.roleid
  JOIN pg_catalog.pg_roles g ON g.oid = am.grantor
  WHERE r.rolname IN ('postgres', 'anon', 'authenticated', 'service_role')
     OR m.rolname IN (
          'postgres', 'anon', 'authenticated', 'service_role', 'authenticator'
        )
  UNION ALL
  SELECT
    w.start_role,
    m.rolname,
    r.rolname,
    g.rolname,
    am.admin_option,
    am.inherit_option,
    am.set_option,
    w.depth + 1,
    (w.path || r.rolname)::text[],
    (w.inherit_along_path AND am.inherit_option) AS inherit_along_path
  FROM walk w
  JOIN pg_catalog.pg_roles prev ON prev.rolname = w.role_name
  JOIN pg_catalog.pg_auth_members am ON am.member = prev.oid
  JOIN pg_catalog.pg_roles m ON m.oid = am.member
  JOIN pg_catalog.pg_roles r ON r.oid = am.roleid
  JOIN pg_catalog.pg_roles g ON g.oid = am.grantor
  WHERE w.depth < 8
    AND NOT (r.rolname = ANY (w.path))
)
SELECT start_role,
       member_name,
       role_name,
       grantor_name,
       admin_option,
       inherit_option,
       set_option,
       depth,
       path,
       inherit_along_path
FROM walk
WHERE depth >= 2
ORDER BY start_role, depth, role_name, member_name;
```

**Expected:** record every row. Zero rows means no indirect path under this walk. That is a recorded empty result. It does not replace step 11.

**STOP:** any path whose `role_name` is `postgres` and whose `start_role` is outside the named set in step 11. End the session. Do not drop the path. An indirect path that only repeats preserved provider edges is recorded, not revoked.

### Step 13 — RD-5 schema USAGE, CREATE, and PUBLIC schema ACL

**When:** runs before migrations.

**Source:** historical document §4 RD-5 for the two `has_schema_privilege` queries (companion §A.6). The `nspacl` statements are the additional raw ACL record, including grantee 0 as `PUBLIC`. Run the `has_schema_privilege` statements only when step 6 showed a compatible identity. Run the `nspacl` explode only when step 6 showed `nspacl` and a compatible `aclexplode`.

The first historical call passes the text `'public'` as the user argument. In that historical query the word means the `PUBLIC` pseudo-role, not the schema name. If the installed signature does not accept that call, do not invent another one. The `nspacl` explode is the explicit PUBLIC record.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-5 PUBLIC pseudo-role via has_schema_privilege
-- Historical §4 RD-5. Run only if step 6 showed a compatible signature.
-- The text 'public' here is the user argument, meaning the PUBLIC pseudo-role.
SELECT n.nspname,
       o.rolname AS owner,
       has_schema_privilege('public', n.oid, 'USAGE') AS public_usage,
       has_schema_privilege('public', n.oid, 'CREATE') AS public_create
FROM pg_namespace n
JOIN pg_roles o ON o.oid = n.nspowner
WHERE n.nspname IN ('public', 'extensions', 'auth', 'storage')
ORDER BY 1;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-5 effective USAGE and CREATE
-- Historical §4 RD-5. Run only if step 6 showed a compatible signature.
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

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — schema ACL null flag
SELECT n.nspname,
       o.rolname AS owner,
       n.nspacl IS NULL AS acl_is_null
FROM pg_namespace n
JOIN pg_roles o ON o.oid = n.nspowner
WHERE n.nspname IN ('public', 'extensions', 'auth', 'storage')
ORDER BY 1;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — schema ACL explode, including PUBLIC as grantee 0
-- Run only if step 6 confirmed nspacl and aclexplode.
SELECT n.nspname,
       CASE
         WHEN x.grantor = 0 THEN 'PUBLIC'
         ELSE x.grantor::regrole::text
       END AS acl_grantor,
       CASE
         WHEN x.grantee = 0 THEN 'PUBLIC'
         ELSE x.grantee::regrole::text
       END AS grantee,
       x.privilege_type,
       x.is_grantable
FROM pg_namespace n
CROSS JOIN LATERAL aclexplode(n.nspacl) AS x
WHERE n.nspname IN ('public', 'extensions', 'auth', 'storage')
ORDER BY 1, 3, 4;
```

**Expected:** record owner, effective `USAGE`, effective `CREATE`, the null flag, and every ACL row. `public` owned by the project administrator is the application schema. `extensions`, `auth`, and `storage` are provider-managed. Their owners stay as recorded. A null `nspacl` is recorded as null. Do not translate null into “PUBLIC has no privilege” or “PUBLIC has CREATE”.

**STOP:**

- `anon` or `authenticated` has `CREATE` on `public`. End the session.
- The `'public'` user-argument call errors, or it was skipped as **UNVERIFIED**, and the explode also does not show whether `PUBLIC` has `CREATE` on `public`. Effective PUBLIC `CREATE` is then **UNVERIFIED**. **STOP** before any later SQL apply and end the session.
- Do not revoke provider-managed schema privileges. Record `service_role` `CREATE` and take it to the Atlas decision in the A-SQL addendum §5. That recorded `service_role` `CREATE` remains a **STOP** for apply until Atlas decides. It does not, by itself, end the discovery session if `anon` and `authenticated` are clear and PUBLIC `CREATE` on `public` is false.

### Step 14 — RD-6 `auth.uid()`, `auth.jwt()`, and `auth.role()`

**When:** runs before migrations. These are provider functions in schema `auth`. They do not depend on migrations 001–007.

**Source:** Claude RD-6, quoted in §2.1.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-6
-- Claude R1 PDF pages 19–20.
SELECT p.oid::regprocedure AS fn, pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'auth' AND p.proname IN ('uid','jwt','role')
ORDER BY 1;
```

**Expected:** record each returned definition. Claude’s expected reading is that the bodies obtain claims through `current_setting` of `request.jwt.claim` or `request.jwt.claims`. If the text shows that, record “session GUC”. A session GUC is settable by the session. It is not verified hosted AAL2. Direct-login `session_user` plus a settable claim is the §2.2 direct-credential path. Do not describe it as AAL2 enforced.

**STOP:**

- `pg_get_functiondef` errors, including for lack of privilege. Record the error with any secret redacted. End the session. Do not guess the body.
- One of `uid`, `jwt`, or `role` is absent. Record **ABSENT**. End the session.
- The body does not match Claude’s expected `current_setting` reading. Record the definition and end the session for classification. Do not `CREATE OR REPLACE` the function.

Do not `SET request.jwt.claims`. Do not `SET ROLE`. Do not put a JWT sample in the evidence. Redact any literal that looks like a key.

### Step 15 — Application grants, only if step 9 is the full set

**When:** runs only if migrations 001–007 are present, meaning step 9 returned the full object set. If step 9 is **NOT PRESENT**, skip this step. That skip is not a failure.

**Source:** this R1 file. Companion §C.1 through §C.6 is a different, later gate. It runs only after a future authorization has applied bootstrap, migrations 001–007, a reviewed correction, phase-3 `scs_test_admin`, and §B.4. Do not run companion §C in this procedure. Missing objects in that future gate are **STOP**. Missing objects in step 9 of this procedure are not.

Do not `SELECT` from `leads` or any other lead table. Privilege catalogs only.

Lead-data objects are `public.leads`, `public.consent_records`, `public.submission_requests`, `public.notification_outbox`, `public.lead_deletion_markers`, `public.usage_counters`, `public.idempotency_keys`, `public.owner_allowlist`, and the functions named in step 9.

Run the `aclexplode` statements only if step 6 allowed `aclexplode`. Run each `has_*_privilege` statement only if step 6 showed a compatible identity. `MAINTAIN` is read from `privilege_type` when the ACL contains it. Do not call `has_table_privilege` with `'MAINTAIN'` unless step 6 showed that this call shape exists and the operator records an error as “privilege name not accepted” without treating the error as proof that `MAINTAIN` is absent. If that call is not clearly supported, skip it and rely on `privilege_type`.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 15 table and routine ACLs
-- Skip the whole step unless step 9 is the full set.
SELECT 'table' AS object_kind,
       c.relname AS object_name,
       c.relkind,
       o.rolname AS owner,
       CASE WHEN c.relacl IS NULL THEN 'NULL_ACL' ELSE 'EXPLICIT_ACL' END AS acl_state,
       CASE
         WHEN x.grantor IS NULL THEN NULL
         WHEN x.grantor = 0 THEN 'PUBLIC'
         ELSE x.grantor::regrole::text
       END AS acl_grantor,
       CASE
         WHEN x.grantee IS NULL THEN NULL
         WHEN x.grantee = 0 THEN 'PUBLIC'
         ELSE x.grantee::regrole::text
       END AS grantee,
       x.privilege_type,
       x.is_grantable
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_roles o ON o.oid = c.relowner
LEFT JOIN LATERAL aclexplode(c.relacl) AS x ON true
WHERE n.nspname = 'public'
  AND c.relname IN (
        'leads', 'consent_records', 'submission_requests', 'owner_allowlist',
        'usage_counters', 'idempotency_keys', 'notification_outbox',
        'lead_deletion_markers'
      )
UNION ALL
SELECT 'routine',
       p.oid::regprocedure::text,
       'f',
       o.rolname,
       CASE WHEN p.proacl IS NULL THEN 'NULL_ACL' ELSE 'EXPLICIT_ACL' END,
       CASE
         WHEN x.grantor IS NULL THEN NULL
         WHEN x.grantor = 0 THEN 'PUBLIC'
         ELSE x.grantor::regrole::text
       END,
       CASE
         WHEN x.grantee IS NULL THEN NULL
         WHEN x.grantee = 0 THEN 'PUBLIC'
         ELSE x.grantee::regrole::text
       END,
       x.privilege_type,
       x.is_grantable
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles o ON o.oid = p.proowner
LEFT JOIN LATERAL aclexplode(p.proacl) AS x ON true
WHERE n.nspname = 'public'
  AND p.proname IN (
        'insert_lead_bundle', 'is_owner_aal2', 'atomic_counter_incr',
        'atomic_counter_expire', 'atomic_counter_get', 'idempotency_set_nx',
        'soft_delete_lead', 'purge_deleted_leads', 'purge_test_leads',
        'purge_unconverted_leads', 'claim_notification_outbox',
        'complete_notification_outbox', 'lookup_idempotency_response',
        'notification_outbox_status_counts'
      )
ORDER BY 1, 2, 7, 8;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 15 column ACLs
-- Rows appear only where a column ACL is explicit.
SELECT c.relname,
       a.attname,
       CASE
         WHEN x.grantor = 0 THEN 'PUBLIC'
         ELSE x.grantor::regrole::text
       END AS acl_grantor,
       CASE
         WHEN x.grantee = 0 THEN 'PUBLIC'
         ELSE x.grantee::regrole::text
       END AS grantee,
       x.privilege_type,
       x.is_grantable
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(a.attacl) AS x
WHERE n.nspname = 'public'
  AND a.attnum > 0
  AND NOT a.attisdropped
  AND a.attacl IS NOT NULL
  AND c.relname IN (
        'leads', 'consent_records', 'submission_requests', 'owner_allowlist',
        'usage_counters', 'idempotency_keys', 'notification_outbox',
        'lead_deletion_markers'
      )
ORDER BY 1, 2, 4, 5;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 15 effective table privileges for existing API roles
-- Run only if step 6 showed has_table_privilege(oid, oid, text).
-- Does not call MAINTAIN.
SELECT r.rolname,
       c.relname,
       has_table_privilege(r.oid, c.oid, 'SELECT') AS can_select,
       has_table_privilege(r.oid, c.oid, 'INSERT') AS can_insert,
       has_table_privilege(r.oid, c.oid, 'UPDATE') AS can_update,
       has_table_privilege(r.oid, c.oid, 'DELETE') AS can_delete
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_roles r
  ON r.rolname IN ('anon', 'authenticated', 'service_role')
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
  AND c.relname IN (
        'leads', 'consent_records', 'submission_requests', 'owner_allowlist',
        'usage_counters', 'idempotency_keys', 'notification_outbox',
        'lead_deletion_markers'
      )
ORDER BY 2, 1;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 15 effective EXECUTE for existing API roles
-- Run only if step 6 showed has_function_privilege(oid, oid, text).
SELECT r.rolname,
       p.oid::regprocedure AS fn,
       has_function_privilege(r.oid, p.oid, 'EXECUTE') AS can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles r
  ON r.rolname IN ('anon', 'authenticated', 'service_role')
WHERE n.nspname = 'public'
  AND p.proname IN (
        'insert_lead_bundle', 'is_owner_aal2', 'atomic_counter_incr',
        'atomic_counter_expire', 'atomic_counter_get', 'idempotency_set_nx',
        'soft_delete_lead', 'purge_deleted_leads', 'purge_test_leads',
        'purge_unconverted_leads', 'claim_notification_outbox',
        'complete_notification_outbox', 'lookup_idempotency_response',
        'notification_outbox_status_counts'
      )
ORDER BY 2, 1;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 15 RLS flags and policies
SELECT c.relname,
       c.relrowsecurity,
       c.relforcerowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
  AND c.relname IN (
        'leads', 'consent_records', 'submission_requests', 'owner_allowlist',
        'usage_counters', 'idempotency_keys', 'notification_outbox',
        'lead_deletion_markers'
      )
ORDER BY 1;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 15 policy names
-- polroles is raw oid[]. Oid 0 means PUBLIC. Do not drop the raw value.
SELECT c.relname,
       pol.polname,
       pol.polcmd,
       pol.polroles::text AS polroles
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
        'leads', 'consent_records', 'submission_requests', 'owner_allowlist',
        'usage_counters', 'idempotency_keys', 'notification_outbox',
        'lead_deletion_markers'
      )
ORDER BY 1, 2;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 15 other application-owned relations in public
SELECT c.relname, c.relkind, o.rolname AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_roles o ON o.oid = c.relowner
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
  AND o.rolname = current_user
  AND c.relname NOT IN (
        'leads', 'consent_records', 'submission_requests', 'owner_allowlist',
        'usage_counters', 'idempotency_keys', 'notification_outbox',
        'lead_deletion_markers'
      )
ORDER BY 1;
```

**Expected if 001–007 were applied and no later correction exists:**

- Record `EXECUTE` for `authenticated` on `is_owner_aal2()`, `soft_delete_lead(uuid)`, `purge_deleted_leads(integer)`, `purge_test_leads(integer)`, and `purge_unconverted_leads(integer)`. That is the known 006 grant that 007 does not revoke. Record it as a finding. It is **not** an approval. It does not, by itself, end the session. It still blocks a later matrix acceptance and a later apply, as the historical document §2 and §7 already say.
- Frozen 002 policies `TO authenticated` may still be present. Record them. They confer no access while the table grant is absent.
- No table `SELECT`, `INSERT`, `UPDATE`, `DELETE`, or column privilege for `PUBLIC`, `anon`, or `authenticated` on the lead tables.
- No `EXECUTE` for `anon` or `PUBLIC` on the lead functions.
- `service_role` has no lead-table or lead-function privilege unless a returned row shows one. Frozen 006 and 007 do not grant `service_role` those privileges. A default ACL may still have done so. Record whatever is returned.
- One `complete_notification_outbox` signature, the five-argument form from migration 007. RLS enabled (`relrowsecurity` true) on each lead table. `relforcerowsecurity` is recorded and is not given a new requirement here.
- Function owner is the project administrator (`postgres` under recorded §A.1). `prosecdef` and `proconfig` are not in the ACL query. If the operator needs them, read `prosecdef` and `proconfig` from `pg_proc` for the same function names in a further read-only `SELECT`. `search_path` missing, or `search_path` equal only to `public`, on a `SECURITY DEFINER` lead function is **STOP**. Do not `ALTER FUNCTION`.

**STOP** (unexpected lead-data access). End the session after the rows are saved. Do not revoke anything in the session.

- Any table, column, or `MAINTAIN` privilege on a lead table for `PUBLIC`, `anon`, `authenticated`, or `service_role`.
- `EXECUTE` for `anon`, `PUBLIC`, or `service_role` on any lead function.
- `EXECUTE` for `authenticated` on any lead function other than the five named above.
- A null `proacl` on a lead function, or a null `relacl` on a lead table, when step 6 cannot confirm the corresponding `has_*_privilege` call. Null is not “no privilege”. Claude page 4’s built-in `PUBLIC EXECUTE` default is why a null function ACL is not a pass.
- RLS off on a lead table.
- Both the four-argument and the five-argument `complete_notification_outbox` still present.
- A privilege for `PUBLIC`, `anon`, `authenticated`, or `service_role` on an extra relation returned by the last query.
- A `SECURITY DEFINER` lead function whose `proconfig` has no `search_path`, or whose `search_path` is only `public`.

Designed `EXECUTE` for `scs_intake_runtime` and `scs_notify_worker`, if those roles exist and the grants match frozen 006 and 007, is recorded. It is not lead-data access for `anon` or `authenticated`. It is not a discovery approval of production, and it does not authorize a later apply.

---

## 5. Evidence

This assignment does not create an evidence file. After a later authorization, evidence goes to a future file under `qa-m6b/` only. That file is not named here.

Each saved step records:

- Timestamp from step 1, and the step’s own batch time if the editor shows one.
- Role used, name only (`current_user` from step 1).
- The exact query text.
- The result rows.

Redact passwords, verifiers, JWTs, API keys, and connection strings. Do not paste a JWT sample to illustrate RD-6. Do not record `rolpassword`. If a function definition contains a secret, redact the secret and keep the `current_setting` call visible.

---

## 6. Read-only discovery stops here

**Future mutations are NOT AUTHORIZED.**

This includes Option C live credential work, migration apply, bootstrap apply, migration 008, any other `GRANT` or `REVOKE`, `ALTER DEFAULT PRIVILEGES`, extension moves, password changes, `SET ROLE`, and deploy. Companion §B.1 is mutating SQL. It is not part of this procedure.

A reviewed correction of the five `authenticated` `EXECUTE` grants is still required before any A-SQL apply. This file does not write that correction. `password_encryption`, `scram_iterations`, and `createrole_self_grant` stay unrecorded until steps 3–5 have been run under a later authorization. Missing values are not a license to guess.

Provider-managed memberships, including the recorded `postgres` edges into `anon` and `authenticated`, must be preserved. A later mutation must not drop them. This document is read-only and drops nothing.

G3 Netlify IPv6 connectivity for Functions stays unresolved. It does not, by itself, refuse a later staging SQL paste. This document does not authorize that paste. Production remains **HOLD**.

---

## 7. STOP index

| Condition | Session | Later apply |
|-----------|---------|-------------|
| `createrole_self_grant` non-empty | End | Blocked |
| `password_encryption` other than `scram-sha-256` | End | Blocked |
| `scram_iterations` present and not a positive integer | End | Credential step blocked even when the row is acceptable, until a reviewed SCRAM procedure exists |
| `citext` not in `public`, or placement unverified | End | Blocked. Do not move the extension |
| Default ACL grantee `PUBLIC`, `anon`, `authenticated`, or `service_role` | End after the rows are saved | Blocked until Atlas decides |
| `anon` or `authenticated` has `CREATE` on schema `public` | End | Blocked |
| PUBLIC `CREATE` on `public` unverified | End | Blocked |
| Fresh staging (step 9 empty) and any `scs_*` role exists | End | Blocked |
| `postgres` contradicts recorded §A.1 | End | Blocked |
| RD-4b: API role is a member of any role, non-provider member of `postgres`, option mismatch, or unexpected grantor on the recorded `postgres` edges | End | Blocked. Do not drop the edge |
| Unexpected lead-data access in step 15 | End after the rows are saved | Blocked |
| Broad `authenticated` `EXECUTE` on the five owner functions | Record. Do not treat as approval. Session may continue through the rest of step 15 | Still blocked. Not an approved posture |
| Skipped 006 or 007 role or grant notice | Not visible here. This file does not apply SQL | Apply-time STOP |
| Automatic Data API exposure on | Record in step 2 | STOP until Atlas decides. Disabling the API does not clear a bad ACL |
| `service_role` lead-data grant | End if seen in step 15 | Blocked until Atlas names an explicit grant |

---

## 8. Requirement checklist

| Requirement | Steps | When |
|-------------|-------|------|
| RD-1 `createrole_self_grant` | 3 | Before migrations |
| RD-1 `password_encryption` | 4 | Before migrations |
| RD-1 `scram_iterations` | 5 | Before migrations |
| RD-2 extension placement and `citext` schema | 7 | Before migrations |
| RD-3 default ACLs, including grantor, grantee, and `PUBLIC` | 6, 8 | Before migrations |
| RD-4 elevated and object-creating roles | 10 | Before migrations |
| RD-4b direct membership, grantor, ADMIN, INHERIT, SET, preserve provider edges | 6, 11 | Before migrations |
| RD-4b transitive reachability | 12 | Before migrations |
| RD-5 effective schema `USAGE` and `CREATE`, PUBLIC schema ACL | 6, 13 | Before migrations |
| RD-6 `auth.uid()`, `auth.jwt()`, `auth.role()`, session claims versus hosted AAL2 | 14 | Before migrations |
| Dashboard Data API and automatic exposure | 2 | Before migrations |
| Installed `has_*_privilege` and `aclexplode` signatures | 6 | Before migrations |
| Application object state | 9 | Presence check before migrations. Zero rows are not a failure |
| Application grants and unexpected lead-data access | 15 | Only if step 9 is the full 001–007 set |
| R3 §A.4 and R3 §A.5 | Not steps. Closed as **NOT PROVISIONED**. Headings in the status note are swapped, as §1 says | Do not run |

---

## 9. What this file does not do

No query in this file was executed. No database connection was opened. No Git command was run. No migration was edited or applied. Migration 008 was not written. Frozen R4 files were not edited. Option C files were not edited. Production remains **HOLD**. A-SQL, A-DBTEST, credential provisioning, and deploy remain unauthorized.
