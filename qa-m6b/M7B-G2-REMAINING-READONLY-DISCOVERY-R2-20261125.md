# M7B-G2 — Remaining read-only discovery procedure (R2)

**Milestone:** M7B-G2  
**Date:** 2026-11-25  
**Project:** Signal Crest Systems LLC  
**Scope:** Signal Crest Systems.com staging discovery text only  
**Status:** **PROCEDURE ONLY / NOT AUTHORIZED TO EXECUTE**  
**Production:** **HOLD**

The statements in this file are **not authorized** to run. This assignment does not connect to a database, apply SQL, change a role, change a password, install a dependency, or deploy. A later written authorization has to name Signal Crest Systems LLC, project `scs-staging`, ref `kfclinlrzfwodmichmci`, and the exact step numbers below, before any pre-bootstrap statement is eligible. RD-8 is a later section. It is not eligible in that pre-bootstrap authorization.

`qa-m6b/M7B-G2-REMAINING-READONLY-DISCOVERY-20261125.md` and `qa-m6b/M7B-G2-REMAINING-READONLY-DISCOVERY-R1-20261125.md` are unchanged historical predecessors. This R2 file is the procedure to use alone. Do not combine SQL fragments from those files with the blocks below.

Published staging host already named in project documents: `db.kfclinlrzfwodmichmci.supabase.co`, port **5432**, Path A. This procedure does not connect to that host. Do not copy a password, a connection string, a key, or a JWT into any notes.

---

## 1. How to read a result

Each possible result in this procedure is exactly one of: **Expected**, **Record only**, **STOP**, **Not applicable**, **Not yet authorized**.

Two STOP behaviors apply:

- A **session STOP** ends the read-only session. Do not run the next pre-bootstrap step. Do not repair it with `GRANT`, `REVOKE`, `ALTER`, `CREATE`, `DROP`, or `SET ROLE`.
- A **gate STOP** is still the result label **STOP**. Save the rows, then run the remaining pre-bootstrap steps so Atlas has one record. No mutation gate is eligible while any STOP is open. Gate STOPs do not authorize a repair.

A disabled Data API does not clear a bad ACL. Discovery completion is not provisioning. **NOT PROVISIONED** remains the recorded R3 result. It is not a task to create roles or objects.

---

## 2. Preserved facts

These facts stay as already recorded. This file does not re-open them as work.

| Fact | Meaning in this procedure |
|------|---------------------------|
| R3 §A.0 PostgreSQL 17.12 / 170012 | **PASS**. Not re-probed. |
| R3 §A.1 `current_user` and `session_user` are `postgres`; `rolsuper` false; `rolcreaterole` true; `rolcanlogin` true | Step 1 checks the session identity. Step 10 records the attribute row. |
| R3 §A.2 `anon` and `authenticated` present; five `scs_*` roles absent | Step 10 detects every `scs_*` role, including roles with no elevated attribute. |
| R3 §A.3 `postgres` is a member of `anon` and `authenticated`, with ADMIN true, INHERIT true, SET true, grantor approximately `supabase_admin` | Step 11 records the exact grantor. It does not drop the edge. |
| R3 §A.4 broader object snapshot | **NOT PROVISIONED**. The older status note heading is swapped: `qa-m6b/M7B-G2-DIRECT-TLS-DISCOVERY-STATUS-20261124.md` calls this block “A.5 — Broader provision status”. |
| R3 §A.5 migration-role NULLs | **NOT PROVISIONED**. The same status note calls this block “A.4 — Migration role”. The three role flags are **NULL** because the role is absent. |
| A-TLS | Independently accepted and **CLOSED**. Not rerun. |
| R4 final acceptance | Successor candidate accepted. Canonical digest `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d` (64 entries), recomputed in §12. Path A remains selected. Path B remains deferred. Do not initiate R5. Production remains **HOLD**. |
| G3 Netlify IPv6 | Unresolved for Functions. That fact is not, by itself, a reason to refuse a later staging SQL paste. This document does not authorize that paste. |
| `citext` placement | `citext` outside `public`, or unverified placement, is **STOP**. This procedure records placement. It does not move the extension. |
| Password parameters | `password_encryption`, `scram_iterations`, and `createrole_self_grant` are captured from the server. They are not guessed. |
| Provider memberships | Recorded and preserved. Do not drop them. There is no prefix-based provider exemption. |
| Session claims | A session-settable request claim is not verified hosted AAL2. Do not describe a direct-credential path as AAL2 enforced. |
| Migration 006 grants | Lines 675–679 grant `EXECUTE` to `scs_owner_admin` and `authenticated` on `is_owner_aal2()`, `soft_delete_lead(uuid)`, `purge_deleted_leads(integer)`, `purge_test_leads(integer)`, and `purge_unconverted_leads(integer)`. |
| Migration 007 | Does not revoke those five grants. `CREATE OR REPLACE` of `soft_delete_lead` keeps the existing grant. 007 drops the four-argument `complete_notification_outbox(uuid, text, boolean, text)` and creates the five-argument form. Those five `authenticated` grants are a known unapproved finding, not an approval. |
| A-CRED exit | **PROVISIONED_UNVERIFIED**. See §4. This file does not authorize A-CRED. |

---

## 3. Requirements quoted from the final reconciliation

Source: `C:\Users\tkrau\Downloads\M7B-G2 Final Architecture Reconciliation Note.pdf` (title *M7B-G2 Final Architecture Reconciliation Note*, 25 November 2026). The blocks below are the requirement text. The numbered procedure is the only paste. Do not paste a quotation as a second batch for the same fact.

Decision 2 (pages 1–2), which corrects the older “any PUBLIC grantee is a STOP” rule:

> PostgreSQL's built-in PUBLIC EXECUTE on new functions is normal, and is not a discovery STOP. A STOP applies only to an explicit pg_default_acl entry that adds privileges beyond the built-ins, or that grants an API role.

> A global default row for postgres may list PUBLIC EXECUTE even if nobody granted it. PostgreSQL copies the built-in default into the row whenever any other global default is changed. RD-3 must therefore classify PUBLIC EXECUTE on functions in a global row as built-in-equivalent, not as a STOP.

Page 9 default-ACL classification used by step 8:

> STOP on API-role grantees in postgres rows (global or public), on any grantee-0 entry in a schema-scoped public row, or on any grantee-0 entry for tables or sequences. Do not STOP on grantee-0 EXECUTE for functions in a global row.

> Record built-in-equivalent rows as "BUILT-IN", and explicit additional rows as "EXPLICIT → Atlas decision".

### 3.1 RD-4c, quoted (pages 5–6)

```sql
-- RD-4c-1 (NOW) Complete role inventory for classification
SELECT rolname, rolsuper, rolcanlogin, rolinherit, rolcreaterole, rolcreatedb,
       rolreplication, rolbypassrls
FROM pg_roles ORDER BY rolname;
```

```sql
-- RD-4c-2 (NOW) Who inherits or can SET ROLE into postgres, API roles, or broad-capability roles
SELECT m.rolname AS member, t.rolname AS target,
       pg_has_role(m.oid, t.oid, 'USAGE') AS inherits,
       pg_has_role(m.oid, t.oid, 'SET')   AS can_set_role
FROM pg_roles m CROSS JOIN pg_roles t
WHERE m.oid <> t.oid
  AND t.rolname IN ('postgres','anon','authenticated','service_role',
                    'pg_read_all_data','pg_write_all_data','pg_maintain','pg_database_owner')
  AND (pg_has_role(m.oid, t.oid, 'USAGE') OR pg_has_role(m.oid, t.oid, 'SET'))
ORDER BY t.rolname, m.rolname;
```

Page 6 also states the classification rule this procedure follows: exemptions are exact names accepted by Atlas, in class P1 or P2. Application roles get no exceptions. No `rolname !~ '^pg_'` exemption. Inherited access is checked with privilege-inquiry functions. A direct-edge `set_option` is not evidence of an indirect path.

Local project files do not contain a PostgreSQL 17 `pg_proc` dump. The `pg_has_role(oid, oid, text)` call in the quotation is not treated as already confirmed. Step 6 reads the installed signature. Step 12 runs only when that signature is present. The document states that the signature is confirmed on the server rather than invented.

### 3.2 RD-5b, quoted (page 5)

```sql
-- RD-5b-1 (NOW) Every role's CREATE/USAGE on schema public
SELECT r.rolname,
       has_schema_privilege(r.oid, 'public'::regnamespace, 'CREATE') AS can_create,
       has_schema_privilege(r.oid, 'public'::regnamespace, 'USAGE')  AS can_use
FROM pg_roles r ORDER BY 1;
```

```sql
-- RD-5b-2 (NOW) Expanded ACL of schema public (PUBLIC = grantee 0)
SELECT o.rolname AS owner,
       CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END AS grantee,
       a.privilege_type, a.is_grantable, a.grantor::regrole AS grantor
FROM pg_namespace n JOIN pg_roles o ON o.oid = n.nspowner
CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl, acldefault('n', n.nspowner))) a
WHERE n.nspname = 'public' ORDER BY 2, 3;
```

Step 13 is this requirement. It labels grantor oid 0 before any `regrole` cast, and it calls `has_schema_privilege` with role OIDs only. It does not pass the string `PUBLIC` to a privilege-inquiry function. `acldefault` runs only after step 6 confirms it.

### 3.3 RD-8 expectation, quoted (pages 5–6)

The final note labels RD-8 **ONLY AFTER A-SQL-1**. The SQL itself is in §7 of this file, not in the pre-bootstrap numbering.

> Exactly four scs_* roles. Three have LOGIN and NOINHERIT; scs_migration has NOLOGIN.  
> None has an elevated attribute, and rolconfig is NULL.  
> Exactly one edge per role: member postgres, ADMIN true, INHERIT false, SET false, and a grantor recorded as observed (it is not assumed).  
> No scs_* role is a member of anything.  
> Any deviation is a STOP for Atlas and Codex review. The observed tuple becomes the 008 input.

The on-disk bootstrap `db/bootstrap/001_m7a_r4_role_bootstrap.sql` contains `CREATE ROLE` for `scs_intake_runtime`, `scs_notify_worker`, `scs_migration`, and `scs_owner_admin`. It contains no `GRANT`. The expected membership is the automatic edge described above, observed after a future A-SQL-1, not a statement in this file. §7 says where a tuple is specified and where the source does not specify it.

---

## 4. Owner-prompt requirements that differ from the reconciliation gates

The reconciliation note §2 (pages 3–4) describes six later gates. This procedure does not authorize any of them. Where the owner prompt for this R2 assignment differs from that PDF, the owner prompt is the rule for this document:

| Topic | Reconciliation PDF | Rule used in this R2 file (owner prompt) |
|-------|--------------------|------------------------------------------|
| A-CRED exit | Gate 5 exit evidence is per-role independent login and wrong-password rejection | A-CRED exit status is **PROVISIONED_UNVERIFIED**. Independent login and wrong-password rejection belong to separately authorized A-DBTEST authentication. |
| Login before A-DBTEST | Gate 5 is listed before gate 6 | Do not require an independent login before A-DBTEST authorization. |
| A-DBTEST contents | Gate 6 is §D fixture mutation tests and harness cases 1–13 | Fixture seeds, mutation tests, and cleanup belong to A-DBTEST integration. |
| Migration 008 order | Inside a future A-SQL-2, 001–007, then 008, and §B.2 starts only after 008 commits. 008 is not re-run after §B.2 | Preserve that order as a **sequencing note only**. Do not authorize 008, A-SQL, A-CRED live, or A-DBTEST. |

The same **PROVISIONED_UNVERIFIED** exit is stated in `qa-m6b/M7B-G2-OPTION-C-R1-CODEX-ACCEPTANCE-HANDOFF-20261125.md`. Option C source under `tools/option-c-admin` was not opened and was not edited for this assignment.

---

## 5. Dashboard navigation

Use project `scs-staging`, ref `kfclinlrzfwodmichmci`, only after a later authorization names that project. Confirm the project name and ref on screen before recording anything. Change no setting.

| Observation | Path | Rule |
|-------------|------|------|
| SQL for the steps below | Local documents say “SQL Editor” and do not spell a longer click path. A generally accurate Supabase path is the project **SQL Editor**. | Read-only, and only when a later authorization names the step. One block at a time. |
| Data API enabled or disabled, and “Automatically expose new tables and functions” | **Dashboard path not specified in local sources.** | Record both. Change neither. |
| Extensions, including `citext` placement | **Dashboard path not specified in local sources.** | Step 7 is the record of placement. Do not move an extension from the screen. |
| Roles and membership | Do not open a Roles UI. | Role facts come from steps 10–12. Do not set a password. Do not type a password into the SQL Editor. |
| Database settings for the TLS CA | A-TLS is closed. | Do not reopen that screen. Do not copy the CA into evidence. |
| Auth settings | **Dashboard path not specified in local sources.** | Step 14 reads `auth.uid()`, `auth.jwt()`, and `auth.role()` in SQL. Do not copy an API key or a JWT. |

---

## 6. Pre-bootstrap procedure

Run the steps in order after a later authorization names them. Each SQL block is one batch. Catalog reads only. Do not select `pg_authid.rolpassword`. Do not `SELECT` rows from lead tables.

Frozen comparison facts, read from source and not applied by this file:

- Migrations `db/migrations/001_m7a_leads_foundation.sql` through `007_m7a_r4_security_corrections.sql` are the object-identity source for step 9.
- The 006 grant block can raise a notice and continue when a role is missing or the grantor lacks privilege (lines 680–685). A skipped role or grant notice is an apply-time **STOP**. This procedure has no notice to read, because it does not apply SQL.

### Step 1 — Evidence identity

**When:** pre-bootstrap. Source: recorded R3 §A.1. This is not R3 §A.4 and not R3 §A.5.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 1 evidence identity
SELECT clock_timestamp() AT TIME ZONE 'UTC' AS captured_at_utc,
       current_user,
       session_user,
       current_database() AS database_name;
```

| Result | Label |
|--------|-------|
| `current_user` and `session_user` are `postgres`. Database name recorded. | **Expected** |
| Either role is not `postgres`. | **STOP** (session STOP) |

### Step 2 — Dashboard observation

**When:** pre-bootstrap. No SQL. Source: historical discovery §5. Paths are in §5 of this file.

Record Data API enabled or disabled, whether “Automatically expose new tables and functions” is on or off, and the project name and ref shown on screen.

| Result | Label |
|--------|-------|
| Both settings and the on-screen identity `scs-staging` / `kfclinlrzfwodmichmci` are written down. | **Expected** |
| On-screen project is not that name and ref. | **STOP** (session STOP) |
| Automatic exposure is on. | **STOP** (gate STOP for a later A-SQL apply, until Atlas decides). The remaining read-only steps still run. Do not change the setting. |
| Data API is disabled. | **Record only**. It does not clear a default ACL. |

### Step 3 — RD-1a `createrole_self_grant`

**When:** pre-bootstrap. Captured, not guessed. A non-empty value stops a later run before A-SQL-1. It does not end the rest of this read-only procedure.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-1a
-- Not R3 §A.4 and not R3 §A.5.
SELECT current_setting('createrole_self_grant') AS createrole_self_grant;
```

| Result | Label |
|--------|-------|
| Empty string. | **Expected** |
| The statement errors, or the value was not captured. | **STOP** (session STOP). Do not assume empty. |
| Any non-empty value. | **STOP** (gate STOP). Do not continue to role creation. This step does not create a role. |

### Step 4 — RD-1b `password_encryption`

**When:** pre-bootstrap. Captured, not guessed.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-1b
SELECT current_setting('password_encryption') AS password_encryption;
```

| Result | Label |
|--------|-------|
| `scram-sha-256`. | **Expected** |
| Any other value, or the statement errors. | **STOP** (session STOP). Do not generate a password or a SCRAM verifier. |

### Step 5 — RD-1c `scram_iterations`

**When:** pre-bootstrap. `pg_settings` is used so a missing parameter returns zero rows instead of aborting the batch.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-1c
SELECT name, setting, unit, source, boot_val
FROM pg_catalog.pg_settings
WHERE name = 'scram_iterations';
```

| Result | Label |
|--------|-------|
| One row whose `setting` is a positive integer. Record the row. | **Record only**. Credential work stays blocked until a reviewed SCRAM procedure exists. |
| Zero rows. Record **ABSENT**. Absence does not supply an iteration count. | **Record only** |
| A returned `setting` that is not a positive integer. | **STOP** (session STOP). Do not invent an iteration count. |

### Step 6 — Installed signatures and catalog columns

**When:** pre-bootstrap, before any privilege-inquiry call. Local files do not include a PostgreSQL 17 `pg_proc` dump. Record the installed rows. Do not add an overload that is not in the result. A signature used later is confirmed on the server by this step.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 6 function signatures
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
        'has_function_privilege',
        'aclexplode',
        'acldefault',
        'pg_has_role'
      )
ORDER BY p.proname, identity_arguments;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 6 pg_auth_members columns
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
-- READ-ONLY — step 6 ACL and object-identity columns
SELECT c.relname, a.attname
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
WHERE n.nspname = 'pg_catalog'
  AND c.relname IN (
        'pg_namespace', 'pg_default_acl', 'pg_class', 'pg_proc',
        'pg_type', 'pg_depend', 'pg_roles'
      )
  AND a.attname IN (
        'nspname', 'nspowner', 'nspacl',
        'defaclrole', 'defaclnamespace', 'defaclobjtype', 'defaclacl',
        'relname', 'relkind', 'relacl', 'relowner',
        'relrowsecurity', 'relforcerowsecurity',
        'proname', 'proowner', 'proacl', 'prosecdef', 'proconfig', 'prokind',
        'typname', 'typtype',
        'objid', 'deptype',
        'rolname', 'rolsuper', 'rolcreaterole', 'rolcreatedb',
        'rolcanlogin', 'rolbypassrls', 'rolinherit', 'rolreplication',
        'rolconnlimit', 'rolvaliduntil', 'rolconfig'
      )
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY c.relname, a.attnum;
```

Later calls are allowed only when a recorded `identity_arguments` row matches the call exactly:

| Later call | Required `identity_arguments` |
|------------|-------------------------------|
| `has_schema_privilege(oid, oid, text)` in step 13 | `oid, oid, text` |
| `has_schema_privilege(name, name, text)` in step 7 | `name, name, text` |
| `pg_has_role(oid, oid, text)` in step 12 | `oid, oid, text` |
| `acldefault("char", oid)` in steps 8, 13, and 15 | `"char", oid` |
| `has_table_privilege(oid, oid, text)` in step 15 | `oid, oid, text` |
| `has_function_privilege(oid, oid, text)` in step 15 | `oid, oid, text` |
| `aclexplode` in steps 8, 13, and 15 | `result_type` names `grantor`, `grantee`, `privilege_type`, and `is_grantable` |

`pg_auth_members` must show all of `roleid`, `member`, `grantor`, `admin_option`, `inherit_option`, and `set_option` before step 11.

| Result | Label |
|--------|-------|
| Every row recorded, including several overloads of one name. | **Expected** |
| Any of the three queries errors. | **STOP** (session STOP). Do not rewrite the query against a guessed column. |
| A required signature or column for a later step is absent. | **STOP** for that later conclusion (gate STOP, **UNVERIFIED**). Do not invent another overload. The later step is then **Not applicable** and its conclusion stays **STOP**. |

### Step 7 — RD-2 `citext` placement and `search_path`

**When:** pre-bootstrap. Migration 001 runs `CREATE EXTENSION IF NOT EXISTS "citext"` with no schema. This step records placement. It does not move the extension.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-2 extensions
SELECT e.extname,
       n.nspname AS schema
FROM pg_catalog.pg_extension e
JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
ORDER BY 1;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-2 search_path
SELECT current_setting('search_path') AS search_path,
       current_schema() AS current_schema;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-2 CREATE in current schema
-- Run only if step 6 showed has_schema_privilege identity_arguments
-- exactly: name, name, text
-- Run only if the extension list shows citext is absent.
SELECT has_schema_privilege(current_user, current_schema(), 'CREATE')
         AS can_create_in_current_schema;
```

| Result | Label |
|--------|-------|
| `citext` is installed and `schema` is `public`. Record `pgcrypto` and `search_path` beside it. The third statement is **Not applicable**. | **Expected** |
| `citext` is present and `schema` is not `public`. | **STOP** (session STOP). Do not `ALTER EXTENSION`. |
| The extension query errors. Placement is unverified. | **STOP** (session STOP) |
| `citext` is absent, `current_schema()` is `public`, and `can_create_in_current_schema` is true. | **Record only** |
| `citext` is absent and `current_schema()` is not `public`. | **STOP** (session STOP) |
| `citext` is absent and `can_create_in_current_schema` is not true. | **STOP** (session STOP) |
| `citext` is absent and the third statement was skipped because the signature was not confirmed. | **STOP** (session STOP). Placement of a future install is **UNVERIFIED**. |

### Step 8 — RD-3 default ACLs (DISC-F01, DISC-F06)

**When:** pre-bootstrap. One classification query. Do not also run an older query that treats every PUBLIC grantee as a STOP.

Grantee oid **0** is the pseudo-role PUBLIC. It is not a `pg_roles` row. Display the word PUBLIC only in the `CASE` expression. Do not pass that word to `has_*_privilege`.

A row is **BUILT-IN** only when all of these are true: global scope (`defaclnamespace = 0`), object type `f` (function), grantee oid 0, `privilege_type` `EXECUTE`, `is_grantable` false, and `grantor` equal to `defaclrole`. That is ordinary built-in PUBLIC function EXECUTE, including a copy PostgreSQL stored when some other global default changed. It is not a discovery STOP.

Run this query only if step 6 confirmed `aclexplode` and `acldefault` identity `"char", oid`, and `pg_default_acl` shows `defaclrole`, `defaclnamespace`, `defaclobjtype`, and `defaclacl`. If `acldefault` was not confirmed, do not run the query. Null ACLs would otherwise stay unexpanded.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-3 classify default ACLs
-- NULL defaclacl is expanded with acldefault. PUBLIC is grantee oid 0.
-- Run only after step 6 confirms aclexplode and acldefault("char", oid).
WITH scoped AS (
  SELECT d.defaclrole,
         r.rolname AS defacl_role,
         d.defaclnamespace,
         CASE
           WHEN d.defaclnamespace = 0 THEN '<global>'
           ELSE n.nspname
         END AS schema_scope,
         d.defaclobjtype,
         d.defaclacl,
         COALESCE(d.defaclacl, pg_catalog.acldefault(d.defaclobjtype, d.defaclrole))
           AS effective_acl,
         (d.defaclacl IS NULL) AS expanded_from_null
  FROM pg_catalog.pg_default_acl d
  JOIN pg_catalog.pg_roles r ON r.oid = d.defaclrole
  LEFT JOIN pg_catalog.pg_namespace n ON n.oid = d.defaclnamespace
  WHERE d.defaclnamespace = 0
     OR n.nspname = 'public'
)
SELECT s.defacl_role,
       s.schema_scope,
       s.defaclobjtype,
       s.expanded_from_null,
       CASE
         WHEN x.grantor = 0 THEN 'PUBLIC'
         ELSE x.grantor::regrole::text
       END AS acl_grantor,
       x.privilege_type,
       CASE
         WHEN x.grantee = 0 THEN 'PUBLIC'
         ELSE x.grantee::regrole::text
       END AS grantee,
       x.is_grantable,
       CASE
         WHEN s.defaclnamespace = 0
          AND s.defaclobjtype = 'f'
          AND x.grantee = 0
          AND x.privilege_type = 'EXECUTE'
          AND x.is_grantable = false
          AND x.grantor = s.defaclrole
         THEN 'BUILT-IN'
         ELSE 'EXPLICIT'
       END AS classification
FROM scoped s
CROSS JOIN LATERAL pg_catalog.aclexplode(s.effective_acl) AS x
ORDER BY s.defacl_role, s.schema_scope, s.defaclobjtype, grantee, x.privilege_type;
```

| Result | Label |
|--------|-------|
| Zero rows, or every returned row is `BUILT-IN`. Record the rows. | **Expected** |
| A `BUILT-IN` global function `EXECUTE` for grantee oid 0, including a row copied into a `postgres` global default. | **Record only** (classification BUILT-IN). Not a STOP. |
| `EXPLICIT` and the grantee is `anon`, `authenticated`, or `service_role` on a `postgres` row, global or `public`. | **STOP** (gate STOP). Do not revoke it here. |
| `EXPLICIT` and grantee oid 0 is on a schema-scoped `public` row. | **STOP** (gate STOP) |
| `EXPLICIT` and grantee oid 0 is on object type `r` (table) or `S` (sequence). | **STOP** (gate STOP) |
| `EXPLICIT` for any other added privilege, grant option, or grantor that fails the BUILT-IN test, including API-role grantees on a non-`postgres` default role. | **STOP** (gate STOP). Mark the row `EXPLICIT → Atlas decision`. |
| Step 6 did not confirm `acldefault` or `aclexplode`, so this query was not run. | **STOP** (gate STOP, **UNVERIFIED**). The query itself is **Not applicable**. |

`MAINTAIN` may appear as `privilege_type` on PostgreSQL 17. Record it when the row contains it. Do not add it when the row does not.

### Step 9 — Application-object presence by exact identity (DISC-F05)

**When:** pre-bootstrap presence check. Zero expected application objects on fresh staging are **NOT PRESENT**. That is not a failure. This is not R3 §A.4.

Expected identities are the final objects in migrations 001–007:

- Eight tables, relkind `r`: `leads`, `consent_records`, `submission_requests`, `owner_allowlist`, `usage_counters`, `idempotency_keys`, `notification_outbox`, `lead_deletion_markers`.
- Two enum types: `lead_status`, `submission_status`.
- Fourteen routines, prokind `f`, with `pg_get_function_identity_arguments` text below. `citext` may print as `public.citext` when the extension is in `public`; the query normalizes that spelling. `timestamptz` prints as `timestamp with time zone`.

| Routine | Identity arguments |
|---------|--------------------|
| `insert_lead_bundle` | `text, text, citext, text, text, text, text, text, text, text, text, text, text, text, text, boolean, text, timestamp with time zone, text` |
| `is_owner_aal2` | *(empty)* |
| `atomic_counter_incr` | `text, bigint` |
| `atomic_counter_expire` | `text, integer` |
| `atomic_counter_get` | `text` |
| `idempotency_set_nx` | `text, text, integer` |
| `lookup_idempotency_response` | `text, text` |
| `soft_delete_lead` | `uuid` |
| `purge_deleted_leads` | `integer` |
| `purge_test_leads` | `integer` |
| `purge_unconverted_leads` | `integer` |
| `claim_notification_outbox` | `text, integer, integer` |
| `complete_notification_outbox` | `uuid, text, uuid, boolean, text` |
| `notification_outbox_status_counts` | *(empty)* |

The four-argument `complete_notification_outbox(uuid, text, boolean, text)` is not an expected identity. 007 drops it. If it is still present, it is an extra overload.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 9 expected identities
-- found_count 0 on every row is NOT PRESENT, not a failure.
WITH expected(object_kind, object_name, identity_arguments) AS (
  VALUES
    ('table', 'leads', NULL::text),
    ('table', 'consent_records', NULL),
    ('table', 'submission_requests', NULL),
    ('table', 'owner_allowlist', NULL),
    ('table', 'usage_counters', NULL),
    ('table', 'idempotency_keys', NULL),
    ('table', 'notification_outbox', NULL),
    ('table', 'lead_deletion_markers', NULL),
    ('enum', 'lead_status', NULL),
    ('enum', 'submission_status', NULL),
    ('routine', 'insert_lead_bundle',
      'text, text, citext, text, text, text, text, text, text, text, text, text, text, text, text, boolean, text, timestamp with time zone, text'),
    ('routine', 'is_owner_aal2', ''),
    ('routine', 'atomic_counter_incr', 'text, bigint'),
    ('routine', 'atomic_counter_expire', 'text, integer'),
    ('routine', 'atomic_counter_get', 'text'),
    ('routine', 'idempotency_set_nx', 'text, text, integer'),
    ('routine', 'lookup_idempotency_response', 'text, text'),
    ('routine', 'soft_delete_lead', 'uuid'),
    ('routine', 'purge_deleted_leads', 'integer'),
    ('routine', 'purge_test_leads', 'integer'),
    ('routine', 'purge_unconverted_leads', 'integer'),
    ('routine', 'claim_notification_outbox', 'text, integer, integer'),
    ('routine', 'complete_notification_outbox', 'uuid, text, uuid, boolean, text'),
    ('routine', 'notification_outbox_status_counts', '')
)
SELECT e.object_kind,
       e.object_name,
       e.identity_arguments,
       CASE
         WHEN e.object_kind = 'table' THEN (
           SELECT count(*)
           FROM pg_catalog.pg_class c
           JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public'
             AND c.relkind = 'r'
             AND c.relname = e.object_name
         )
         WHEN e.object_kind = 'enum' THEN (
           SELECT count(*)
           FROM pg_catalog.pg_type t
           JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
           WHERE n.nspname = 'public'
             AND t.typtype = 'e'
             AND t.typname = e.object_name
         )
         ELSE (
           SELECT count(*)
           FROM pg_catalog.pg_proc p
           JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.prokind = 'f'
             AND p.proname = e.object_name
             AND replace(pg_catalog.pg_get_function_identity_arguments(p.oid),
                         'public.citext', 'citext')
                 = e.identity_arguments
         )
       END AS found_count
FROM expected e
ORDER BY e.object_kind, e.object_name;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 9 extra overloads of expected routine names
-- The four-argument complete_notification_outbox appears here if it still exists.
WITH expected(object_name, identity_arguments) AS (
  VALUES
    ('insert_lead_bundle',
      'text, text, citext, text, text, text, text, text, text, text, text, text, text, text, text, boolean, text, timestamp with time zone, text'),
    ('is_owner_aal2', ''),
    ('atomic_counter_incr', 'text, bigint'),
    ('atomic_counter_expire', 'text, integer'),
    ('atomic_counter_get', 'text'),
    ('idempotency_set_nx', 'text, text, integer'),
    ('lookup_idempotency_response', 'text, text'),
    ('soft_delete_lead', 'uuid'),
    ('purge_deleted_leads', 'integer'),
    ('purge_test_leads', 'integer'),
    ('purge_unconverted_leads', 'integer'),
    ('claim_notification_outbox', 'text, integer, integer'),
    ('complete_notification_outbox', 'uuid, text, uuid, boolean, text'),
    ('notification_outbox_status_counts', '')
)
SELECT p.proname,
       p.prokind,
       pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       p.oid::regprocedure::text AS regprocedure
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (SELECT object_name FROM expected)
  AND NOT EXISTS (
    SELECT 1
    FROM expected e
    WHERE e.object_name = p.proname
      AND e.identity_arguments = replace(
            pg_catalog.pg_get_function_identity_arguments(p.oid),
            'public.citext', 'citext')
  )
ORDER BY 1, 3;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 9 unexpected public objects
-- Record for classification. Do not ignore them.
-- Run the extension_owned column only if step 6 showed pg_depend.objid and pg_depend.deptype.
SELECT 'relation' AS object_kind,
       c.relkind,
       c.relname AS object_name,
       NULL::text AS identity_arguments,
       o.rolname AS owner,
       EXISTS (
         SELECT 1
         FROM pg_catalog.pg_depend d
         WHERE d.objid = c.oid
           AND d.deptype = 'e'
       ) AS extension_owned
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_roles o ON o.oid = c.relowner
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f', 'i')
  AND NOT (c.relkind = 'r' AND c.relname IN (
        'leads', 'consent_records', 'submission_requests', 'owner_allowlist',
        'usage_counters', 'idempotency_keys', 'notification_outbox',
        'lead_deletion_markers'
      ))
UNION ALL
SELECT 'type',
       t.typtype::text,
       t.typname,
       NULL::text,
       o.rolname,
       EXISTS (
         SELECT 1
         FROM pg_catalog.pg_depend d
         WHERE d.objid = t.oid
           AND d.deptype = 'e'
       )
FROM pg_catalog.pg_type t
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
JOIN pg_catalog.pg_roles o ON o.oid = t.typowner
WHERE n.nspname = 'public'
  AND t.typtype = 'e'
  AND t.typname NOT IN ('lead_status', 'submission_status')
UNION ALL
SELECT 'routine',
       p.prokind,
       p.proname,
       pg_catalog.pg_get_function_identity_arguments(p.oid),
       o.rolname,
       EXISTS (
         SELECT 1
         FROM pg_catalog.pg_depend d
         WHERE d.objid = p.oid
           AND d.deptype = 'e'
       )
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
JOIN pg_catalog.pg_roles o ON o.oid = p.proowner
WHERE n.nspname = 'public'
  AND p.proname NOT IN (
        'insert_lead_bundle', 'is_owner_aal2', 'atomic_counter_incr',
        'atomic_counter_expire', 'atomic_counter_get', 'idempotency_set_nx',
        'lookup_idempotency_response', 'soft_delete_lead',
        'purge_deleted_leads', 'purge_test_leads', 'purge_unconverted_leads',
        'claim_notification_outbox', 'complete_notification_outbox',
        'notification_outbox_status_counts'
      )
ORDER BY 1, 3, 4;
```

| Result | Label |
|--------|-------|
| Every expected `found_count` is 0, and the extra-overload query is empty. Record **NOT PRESENT**. Unexpected public objects, including extension members and indexes, are listed and not treated as a failed presence check. Step 15 is **Not applicable**. | **Expected** |
| Every expected `found_count` is 1, and the extra-overload query is empty. Record **MIGRATIONS 001–007 OBJECTS PRESENT**. That contradicts historical **NOT PROVISIONED**. Do not drop the objects. Continue, including step 15. | **Expected** for the identity check, and **Record only** for the contradiction with the historical baseline. |
| Some expected `found_count` values are 0 and some are not, or any `found_count` is greater than 1. | **STOP** (session STOP). Partial presence is neither fresh staging nor a finished 001–007 apply. Do not create the missing objects. |
| The extra-overload query returns any row, including the four-argument `complete_notification_outbox`. | **STOP** (session STOP). Duplicate overload. |
| An unexpected public object whose name is not one of the fourteen routines. | **Record only**. Classify it. Extension-owned rows stay recorded and are left alone. |
| `pg_depend` columns were not confirmed, so the third query was not run. | **STOP** (gate STOP, **UNVERIFIED** unexpected-object classification). If the first query already shows a partial set, that remains a session STOP. |

### Step 10 — RD-4c complete role inventory (DISC-F02)

**When:** pre-bootstrap. This is the only role-inventory query. It replaces a filtered “elevated roles only” list, which missed an `scs_*` role that had no superuser, createrole, createdb, or bypass attribute. Every `scs_*` role is in this result. Replication, BYPASSRLS, LOGIN, INHERIT, CREATEROLE, and CREATEDB are columns on that row.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-4c-1 complete role inventory
SELECT rolname,
       rolsuper,
       rolcanlogin,
       rolinherit,
       rolcreaterole,
       rolcreatedb,
       rolreplication,
       rolbypassrls
FROM pg_catalog.pg_roles
ORDER BY rolname;
```

Named set used only to describe a preserved provider role, not to hide any row: `postgres`, `supabase_admin`, `authenticator`, `anon`, `authenticated`, `service_role`. A role outside that set is not given a provider label by a name prefix.

| Result | Label |
|--------|-------|
| `postgres` shows `rolsuper` false, `rolcreaterole` true, and `rolcanlogin` true. Other `postgres` flags are written down as returned. | **Expected** for those three flags. Other flags are **Record only**. |
| Step 9 is **NOT PRESENT** and no `rolname` matches `scs_%` with the underscore escaped as in the next check. | **Expected** |
| Step 9 is **NOT PRESENT** and any role name begins with `scs_`. Use the predicate `rolname LIKE 'scs\_%' ESCAPE '\'` on the saved rows. | **STOP** (session STOP). That contradicts recorded **NOT PROVISIONED**. |
| Step 9 is the full set, and an `scs_*` role has `rolsuper`, `rolcreaterole`, `rolcreatedb`, `rolreplication`, `rolbypassrls`, or `rolinherit` true, or `scs_migration` has `rolcanlogin` true. | **STOP** (gate STOP) |
| Step 9 is the full set and the four bootstrap role names exist with LOGIN / NOLOGIN as created by the bootstrap file. Further attribute proof is RD-8, which is **Not yet authorized**. | **Record only** |
| `postgres` contradicts recorded §A.1 on `rolsuper`, `rolcreaterole`, or `rolcanlogin`. | **STOP** (session STOP) |
| A role other than the named set above has `rolsuper` or `rolbypassrls`. Record the exact name. Do not drop it and do not exempt it by prefix. | **Record only** for the name. Later exemption is **Not yet authorized**. |
| Provider roles such as `supabase_admin`, `anon`, `authenticated`, and `service_role` appear. | **Record only**. Do not revoke them. |

### Step 11 — RD-4b direct membership

**When:** pre-bootstrap. Run only if step 6 showed `roleid`, `member`, `grantor`, `admin_option`, `inherit_option`, and `set_option`.

This query is the direct-edge record only. A `set_option` on a direct edge is not evidence that some other role can reach the target through an indirect path. Indirect INHERIT and SET are step 12.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-4b direct edges
-- Confirm pg_auth_members columns in step 6 first.
SELECT m.rolname AS member,
       r.rolname AS role,
       g.rolname AS grantor,
       am.admin_option,
       am.inherit_option,
       am.set_option
FROM pg_catalog.pg_auth_members am
JOIN pg_catalog.pg_roles m ON m.oid = am.member
JOIN pg_catalog.pg_roles r ON r.oid = am.roleid
JOIN pg_catalog.pg_roles g ON g.oid = am.grantor
WHERE r.rolname IN ('postgres', 'anon', 'authenticated', 'service_role')
   OR m.rolname IN ('anon', 'authenticated', 'service_role')
ORDER BY 2, 1;
```

| Result | Label |
|--------|-------|
| Provider edges only. The recorded shape is `authenticator` as member of `anon`, `authenticated`, and `service_role`, and `postgres` as member of `anon` and `authenticated` with `admin_option`, `inherit_option`, and `set_option` all true, grantor `supabase_admin`. Record the exact grantor that is returned. | **Expected** when that shape is returned. |
| The grantor name differs from `supabase_admin` on those two `postgres` edges. Do not drop the edge. | **STOP** (gate STOP) for classification. |
| `postgres` membership in `anon` or `authenticated` does not have all three options true. | **STOP** (gate STOP) |
| `anon`, `authenticated`, or `service_role` is the member of any role. | **STOP** (gate STOP) |
| A role outside `postgres`, `supabase_admin`, `authenticator`, `anon`, `authenticated`, and `service_role` is a member of `postgres`. | **STOP** (gate STOP). Do not drop the membership. |
| Step 6 did not confirm the columns, so this query was not run. | **STOP** (gate STOP, **UNVERIFIED**). The query is **Not applicable**. |

`SET ROLE` is not part of this procedure. Do not execute it.

### Step 12 — RD-4c effective INHERIT and SET (DISC-F03)

**When:** pre-bootstrap, after step 11. Run only if step 6 showed `pg_has_role` identity_arguments exactly `oid, oid, text`. If it did not, do not run this query and do not treat step 11 as a substitute.

The target list is the reconciliation list, plus every role that itself has `rolsuper`, `rolreplication`, or `rolbypassrls`. Those extra targets are identified by attribute and returned by exact name. No role is removed because its name starts with `pg_`.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-4c-2 effective INHERIT and SET
-- Run only if step 6 showed pg_has_role identity_arguments: oid, oid, text
-- Signature is confirmed on the server by step 6. It is not invented here.
-- Direct-edge set_option from step 11 is not this result.
SELECT m.rolname AS member,
       t.rolname AS target,
       pg_catalog.pg_has_role(m.oid, t.oid, 'USAGE') AS inherits,
       pg_catalog.pg_has_role(m.oid, t.oid, 'SET') AS can_set_role,
       t.rolsuper AS target_is_superuser,
       m.rolsuper AS member_is_superuser
FROM pg_catalog.pg_roles m
CROSS JOIN pg_catalog.pg_roles t
WHERE m.oid <> t.oid
  AND (
        t.rolname IN (
          'postgres', 'anon', 'authenticated', 'service_role',
          'pg_read_all_data', 'pg_write_all_data', 'pg_maintain',
          'pg_database_owner'
        )
        OR t.rolsuper
        OR t.rolreplication
        OR t.rolbypassrls
      )
  AND (
        pg_catalog.pg_has_role(m.oid, t.oid, 'USAGE')
        OR pg_catalog.pg_has_role(m.oid, t.oid, 'SET')
      )
ORDER BY t.rolname, m.rolname;
```

| Result | Label |
|--------|-------|
| Rows for the preserved provider paths: `authenticator` into `anon`, `authenticated`, and `service_role`; `postgres` into `anon` and `authenticated`. | **Expected** |
| A superuser member, recorded by exact name, can inherit or SET into a target. Do not exempt it by prefix. Later P1 naming is a separate decision. | **Record only**. That later naming is **Not yet authorized**. |
| `anon`, `authenticated`, `service_role`, `authenticator`, or any `scs_*` role has `inherits` or `can_set_role` into `postgres`, `pg_read_all_data`, `pg_write_all_data`, `pg_maintain`, or `pg_database_owner`. `authenticator` into `anon`, `authenticated`, or `service_role` stays the expected provider path and is not this row. | **STOP** (gate STOP) |
| A non-superuser outside `postgres`, `supabase_admin`, `authenticator`, `anon`, `authenticated`, and `service_role` has `inherits` or `can_set_role` into `postgres`. | **STOP** (gate STOP) |
| Any other non-superuser row into a broad-capability predefined role. Record the exact member and target. | **Record only** for Atlas classification. No prefix exemption. |
| Zero rows. | **Record only**. It does not replace step 11. |
| Step 6 did not show `oid, oid, text` for `pg_has_role`. | **STOP** (gate STOP, **UNVERIFIED**). The query is **Not applicable**. Do not infer indirect reachability from step 11. |

### Step 13 — RD-5b CREATE, USAGE, and the expanded public ACL (DISC-F04, DISC-F06)

**When:** pre-bootstrap. This is the only schema-privilege query pair. It covers every role, not only `anon`, `authenticated`, and `service_role`. There is no prefix exemption.

Run the first query only if step 6 showed `has_schema_privilege` identity_arguments exactly `oid, oid, text`. Run the second only if step 6 also confirmed `aclexplode` and `acldefault` identity `"char", oid`. A null `nspacl` is expanded with `acldefault('n', owner)`. It is not read as “PUBLIC has no privilege” and it is not read as “PUBLIC has CREATE” without that expansion.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-5b-1 every role CREATE and USAGE on public
-- Run only if step 6 showed has_schema_privilege identity_arguments: oid, oid, text
SELECT r.rolname,
       pg_catalog.has_schema_privilege(r.oid, 'public'::regnamespace, 'CREATE') AS can_create,
       pg_catalog.has_schema_privilege(r.oid, 'public'::regnamespace, 'USAGE') AS can_use,
       r.rolsuper
FROM pg_catalog.pg_roles r
ORDER BY 1;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-5b-2 expanded ACL of schema public
-- PUBLIC is grantee or grantor oid 0. Do not pass the string PUBLIC to has_schema_privilege.
-- Run only if step 6 confirmed aclexplode and acldefault("char", oid).
SELECT o.rolname AS owner,
       (n.nspacl IS NULL) AS expanded_from_null,
       CASE
         WHEN a.grantor = 0 THEN 'PUBLIC'
         ELSE a.grantor::regrole::text
       END AS acl_grantor,
       CASE
         WHEN a.grantee = 0 THEN 'PUBLIC'
         ELSE a.grantee::regrole::text
       END AS grantee,
       a.privilege_type,
       a.is_grantable
FROM pg_catalog.pg_namespace n
JOIN pg_catalog.pg_roles o ON o.oid = n.nspowner
CROSS JOIN LATERAL pg_catalog.aclexplode(
       COALESCE(n.nspacl, pg_catalog.acldefault('n', n.nspowner))
     ) AS a
WHERE n.nspname = 'public'
ORDER BY grantee, a.privilege_type;
```

| Result | Label |
|--------|-------|
| Schema owner has `can_create` and `can_use`. Owner name recorded. `extensions`, `auth`, and `storage` are not in this query; their provider ownership is not changed. | **Expected** for the owner’s CREATE and USAGE. |
| `anon` or `authenticated` has `can_create` true. | **STOP** (gate STOP) |
| Expanded ACL shows grantee oid 0 with `CREATE`, or `is_grantable` true on that PUBLIC `CREATE`. | **STOP** (gate STOP) |
| `service_role` has `can_create` true. | **STOP** (gate STOP) until Atlas decides. |
| Any other non-owner, non-superuser role has `can_create` true, whatever its name prefix. | **STOP** (gate STOP). Record the exact name. |
| A superuser has `can_create` true because superuser privilege inquiry returns true. Record the exact name. | **Record only**. A later P1 exemption is **Not yet authorized**. |
| `USAGE` for `anon`, `authenticated`, or PUBLIC, without `CREATE`. | **Record only** |
| The required signature was not confirmed, or `nspacl` is null and `acldefault` was not confirmed, so PUBLIC `CREATE` was not shown. | **STOP** (gate STOP, **UNVERIFIED**) |

### Step 14 — RD-6 `auth.uid()`, `auth.jwt()`, and `auth.role()`

**When:** pre-bootstrap. These provider functions do not depend on migrations 001–007.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — RD-6
SELECT p.oid::regprocedure AS fn,
       pg_catalog.pg_get_functiondef(p.oid) AS definition
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'auth'
  AND p.proname IN ('uid', 'jwt', 'role')
ORDER BY 1;
```

The reconciliation’s expected reading, carried from the architecture refinement, is that the bodies obtain claims through `current_setting` of `request.jwt.claim` or `request.jwt.claims`.

| Result | Label |
|--------|-------|
| Each of `uid`, `jwt`, and `role` is returned, and the body reads those settings. Record “session GUC”. A session GUC is settable by the session. It is not verified hosted AAL2. | **Record only** |
| `pg_get_functiondef` errors, including for lack of privilege. Redact any secret. | **STOP** (session STOP). Do not guess the body. |
| One of the three names is absent. Record **ABSENT**. | **STOP** (session STOP) |
| The body does not show that `current_setting` reading. Record the definition. | **STOP** (gate STOP) for classification. Do not `CREATE OR REPLACE` the function. |

Do not `SET request.jwt.claims`. Do not `SET ROLE`. Do not put a JWT sample in the notes.

### Step 15 — Application grants, only if step 9 is the full set

**When:** only if step 9 is **MIGRATIONS 001–007 OBJECTS PRESENT**. If step 9 is **NOT PRESENT**, this step is **Not applicable**. That skip is not a failure.

Run the ACL query only if step 6 confirmed `aclexplode` and `acldefault` identity `"char", oid`. Null `proacl` and null `relacl` are expanded with `acldefault('f', owner)` and `acldefault('r', owner)`. A function entry is **BUILT-IN** only when it matches that function default shape: grantee oid 0, `EXECUTE`, `is_grantable` false, and `grantor` equal to the owner. Ordinary built-in PUBLIC function EXECUTE is **Record only**, not a STOP. Any other privilege is **EXPLICIT**.

Do not call `has_table_privilege` or `has_function_privilege` unless step 6 showed identity_arguments `oid, oid, text` for that function. Do not pass the string `PUBLIC`. Do not call `MAINTAIN` as a privilege-inquiry argument. Read `MAINTAIN` from `privilege_type` when the ACL contains it.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 15 expanded table and routine ACLs
-- Skip unless step 9 is the full set.
-- Run only if step 6 confirmed aclexplode and acldefault("char", oid).
WITH objs AS (
  SELECT 'table'::text AS object_kind,
         c.oid,
         c.relname AS object_name,
         c.relkind::text AS kind,
         o.rolname AS owner,
         c.relowner AS owner_oid,
         (c.relacl IS NULL) AS expanded_from_null,
         COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner)) AS effective_acl
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_roles o ON o.oid = c.relowner
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname IN (
          'leads', 'consent_records', 'submission_requests', 'owner_allowlist',
          'usage_counters', 'idempotency_keys', 'notification_outbox',
          'lead_deletion_markers'
        )
  UNION ALL
  SELECT 'routine',
         p.oid,
         p.oid::regprocedure::text,
         p.prokind,
         o.rolname,
         p.proowner,
         (p.proacl IS NULL),
         COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_catalog.pg_roles o ON o.oid = p.proowner
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND p.proname IN (
          'insert_lead_bundle', 'is_owner_aal2', 'atomic_counter_incr',
          'atomic_counter_expire', 'atomic_counter_get', 'idempotency_set_nx',
          'lookup_idempotency_response', 'soft_delete_lead',
          'purge_deleted_leads', 'purge_test_leads', 'purge_unconverted_leads',
          'claim_notification_outbox', 'complete_notification_outbox',
          'notification_outbox_status_counts'
        )
)
SELECT o.object_kind,
       o.object_name,
       o.kind,
       o.owner,
       o.expanded_from_null,
       CASE
         WHEN x.grantor = 0 THEN 'PUBLIC'
         ELSE x.grantor::regrole::text
       END AS acl_grantor,
       CASE
         WHEN x.grantee = 0 THEN 'PUBLIC'
         ELSE x.grantee::regrole::text
       END AS grantee,
       x.privilege_type,
       x.is_grantable,
       CASE
         WHEN o.object_kind = 'routine'
          AND x.grantee = 0
          AND x.privilege_type = 'EXECUTE'
          AND x.is_grantable = false
          AND x.grantor = o.owner_oid
         THEN 'BUILT-IN'
         ELSE 'EXPLICIT'
       END AS classification
FROM objs o
CROSS JOIN LATERAL pg_catalog.aclexplode(o.effective_acl) AS x
ORDER BY o.object_kind, o.object_name, grantee, x.privilege_type;
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
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) AS x
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
-- READ-ONLY — step 15 effective table privileges
-- Run only if step 6 showed has_table_privilege identity_arguments: oid, oid, text
SELECT r.rolname,
       c.relname,
       pg_catalog.has_table_privilege(r.oid, c.oid, 'SELECT') AS can_select,
       pg_catalog.has_table_privilege(r.oid, c.oid, 'INSERT') AS can_insert,
       pg_catalog.has_table_privilege(r.oid, c.oid, 'UPDATE') AS can_update,
       pg_catalog.has_table_privilege(r.oid, c.oid, 'DELETE') AS can_delete
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_roles r
  ON r.rolname IN ('anon', 'authenticated', 'service_role')
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
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
-- Run only if step 6 showed has_function_privilege identity_arguments: oid, oid, text
SELECT r.rolname,
       p.oid::regprocedure AS fn,
       pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE') AS can_execute
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
JOIN pg_catalog.pg_roles r
  ON r.rolname IN ('anon', 'authenticated', 'service_role')
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.proname IN (
        'insert_lead_bundle', 'is_owner_aal2', 'atomic_counter_incr',
        'atomic_counter_expire', 'atomic_counter_get', 'idempotency_set_nx',
        'lookup_idempotency_response', 'soft_delete_lead',
        'purge_deleted_leads', 'purge_test_leads', 'purge_unconverted_leads',
        'claim_notification_outbox', 'complete_notification_outbox',
        'notification_outbox_status_counts'
      )
ORDER BY 2, 1;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 15 security definer and search_path
SELECT p.oid::regprocedure AS fn,
       p.prosecdef,
       p.proconfig
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.proname IN (
        'insert_lead_bundle', 'is_owner_aal2', 'atomic_counter_incr',
        'atomic_counter_expire', 'atomic_counter_get', 'idempotency_set_nx',
        'lookup_idempotency_response', 'soft_delete_lead',
        'purge_deleted_leads', 'purge_test_leads', 'purge_unconverted_leads',
        'claim_notification_outbox', 'complete_notification_outbox',
        'notification_outbox_status_counts'
      )
ORDER BY 1;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — step 15 RLS flags
SELECT c.relname,
       c.relrowsecurity,
       c.relforcerowsecurity
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
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
-- polroles is raw oid[]. Oid 0 means PUBLIC.
SELECT c.relname,
       pol.polname,
       pol.polcmd,
       pol.polroles::text AS polroles
FROM pg_catalog.pg_policy pol
JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
        'leads', 'consent_records', 'submission_requests', 'owner_allowlist',
        'usage_counters', 'idempotency_keys', 'notification_outbox',
        'lead_deletion_markers'
      )
ORDER BY 1, 2;
```

| Result | Label |
|--------|-------|
| Step 9 is **NOT PRESENT**. | **Not applicable** |
| `EXECUTE` for `authenticated` on `is_owner_aal2()`, `soft_delete_lead(uuid)`, `purge_deleted_leads(integer)`, `purge_test_leads(integer)`, and `purge_unconverted_leads(integer)`. This is the 006 grant that 007 does not revoke. It is not an approval. | **STOP** (gate STOP). Finish the other statements in this step so the rows are saved. Later matrix acceptance stays blocked. |
| Built-in PUBLIC `EXECUTE` on a function (`BUILT-IN` row). | **Record only**. Not a STOP. |
| No table `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `MAINTAIN`, or column privilege for PUBLIC, `anon`, `authenticated`, or `service_role` on the eight tables. | **Expected** |
| Any table, column, or `MAINTAIN` privilege on a lead table for PUBLIC, `anon`, `authenticated`, or `service_role`. | **STOP** (gate STOP). Do not revoke it in the session. |
| `EXECUTE` for `anon`, PUBLIC, or `service_role` on a lead function, other than a `BUILT-IN` PUBLIC `EXECUTE` row. | **STOP** (gate STOP) |
| `EXECUTE` for `authenticated` on any lead function other than the five named above. | **STOP** (gate STOP) |
| `EXPLICIT` function privilege whose grantor is not the owner, or whose `is_grantable` is true, outside the five known grants. | **STOP** (gate STOP) |
| RLS off (`relrowsecurity` false) on a lead table. `relforcerowsecurity` is recorded and is not given a new requirement here. | **STOP** (gate STOP) for RLS off. `relforcerowsecurity` is **Record only**. |
| `prosecdef` true and `proconfig` has no `search_path`, or `search_path` is only `public`. Migrations 006 and 007 set `search_path` to `pg_catalog, public` on these security-definer functions. | **STOP** (gate STOP). Do not `ALTER FUNCTION`. |
| `search_path` is `pg_catalog, public` on those security-definer functions. | **Expected** |
| Frozen 002 policies `TO authenticated` are present, and the table grant is absent. | **Record only**. They confer no access while the table grant is absent. |
| Designed `EXECUTE` for `scs_intake_runtime` or `scs_notify_worker` matching frozen 006 and 007. | **Record only**. It is not an approval of production and it does not authorize a later apply. |
| A required `has_*_privilege` signature was not confirmed. | **STOP** (gate STOP, **UNVERIFIED**) for the effective-privilege conclusion. Do not treat the ACL list as that conclusion. |
| `acldefault` was not confirmed and any `proacl` or `relacl` is null. | **STOP** (gate STOP, **UNVERIFIED**) |

---

## 7. RD-8 — ONLY AFTER A-SQL-1

**ONLY AFTER A-SQL-1. Read-only. Does not authorize bootstrap or any later phase.**

This section is not a pre-bootstrap step. Do not run it in the same session as steps 1–15. Running it before A-SQL-1 is **Not yet authorized**. If the four `scs_*` roles are absent, that absence is the pre-bootstrap expectation from step 10. It is not an RD-8 failure.

A-SQL-1, if a later authorization ever names it, is the bootstrap file only: `db/bootstrap/001_m7a_r4_role_bootstrap.sql`. No passwords. No other SQL. This document does not authorize that run.

RD-8 does not authorize migration 008, migrations 001–007, §B.2, A-CRED, or A-DBTEST.

### RD-8.0 — Confirm catalog columns in that later session

Do not reuse a previous session’s step 6 notes. The signature is confirmed on the server in the RD-8 session.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- ONLY AFTER A-SQL-1 — does not authorize bootstrap
-- READ-ONLY — RD-8.0 pg_auth_members columns
SELECT a.attname
FROM pg_catalog.pg_attribute a
WHERE a.attrelid = 'pg_catalog.pg_auth_members'::regclass
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY a.attnum;
```

| Result | Label |
|--------|-------|
| This section is reached before a separate A-SQL-1 authorization has been used. | **Not yet authorized** |
| `roleid`, `member`, `grantor`, `admin_option`, `inherit_option`, and `set_option` are all present. | **Expected** |
| Any of those columns is absent, or the query errors. | **STOP** (session STOP). Do not rename a column. RD-8.1 and RD-8.2 are then **Not applicable**. |

### RD-8.1 — Role attributes

```sql
-- NOT AUTHORIZED TO RUN NOW
-- ONLY AFTER A-SQL-1 — does not authorize bootstrap
-- READ-ONLY — RD-8.1 scs_* attributes
SELECT rolname,
       rolcanlogin,
       rolinherit,
       rolsuper,
       rolcreaterole,
       rolcreatedb,
       rolreplication,
       rolbypassrls,
       rolconnlimit,
       rolvaliduntil,
       rolconfig
FROM pg_catalog.pg_roles
WHERE rolname LIKE 'scs\_%' ESCAPE '\'
ORDER BY 1;
```

Expected attributes, taken from the final reconciliation note and from `db/bootstrap/001_m7a_r4_role_bootstrap.sql`:

| Role | `rolcanlogin` | `rolinherit` | Elevated attributes | `rolconfig` |
|------|---------------|--------------|---------------------|-------------|
| `scs_intake_runtime` | true (LOGIN) | false (NOINHERIT) | false | NULL |
| `scs_notify_worker` | true (LOGIN) | false (NOINHERIT) | false | NULL |
| `scs_owner_admin` | true (LOGIN) | false (NOINHERIT) | false | NULL |
| `scs_migration` | false (NOLOGIN) | false (NOINHERIT) | false | NULL |

Elevated attributes, from the reconciliation sentence “None has an elevated attribute” and from the 008 refinement V-10 list, are `rolsuper`, `rolcreaterole`, `rolcreatedb`, `rolreplication`, and `rolbypassrls`. Expected value for each is false.

| Column | Expectation |
|--------|-------------|
| `rolconnlimit` | **source does not specify this tuple** |
| `rolvaliduntil` | **source does not specify this tuple** |
| `rolconfig` | NULL. The reconciliation specifies this. |

`scs_test_admin` is not created by the bootstrap file. A fifth `scs_*` role is a deviation.

| Result | Label |
|--------|-------|
| Exactly the four roles, with the attributes in the table above. `rolconnlimit` and `rolvaliduntil` are written down and not compared to an invented value. | **Expected** |
| Any other count, any elevated attribute true, `rolinherit` true, `scs_migration` with LOGIN, or `rolconfig` not NULL. | **STOP** (gate STOP). The observed tuple is for Atlas and Codex. This section does not repair it. |

### RD-8.2 — Membership tuples

Run only after RD-8.0 confirmed the six columns.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- ONLY AFTER A-SQL-1 — does not authorize bootstrap
-- READ-ONLY — RD-8.2 membership edges
SELECT r.rolname AS role,
       m.rolname AS member,
       g.rolname AS grantor,
       am.admin_option,
       am.inherit_option,
       am.set_option
FROM pg_catalog.pg_auth_members am
JOIN pg_catalog.pg_roles r ON r.oid = am.roleid
JOIN pg_catalog.pg_roles m ON m.oid = am.member
JOIN pg_catalog.pg_roles g ON g.oid = am.grantor
WHERE r.rolname LIKE 'scs\_%' ESCAPE '\'
   OR m.rolname LIKE 'scs\_%' ESCAPE '\'
ORDER BY 1, 2;
```

Exact tuples specified by the final reconciliation note, page 6. One row per role:

| role (roleid) | member | admin_option | inherit_option | set_option | grantor |
|----------------|--------|--------------|----------------|------------|---------|
| `scs_intake_runtime` | `postgres` | true | false | false | source does not specify this tuple. The final note says the grantor is recorded as observed and is not assumed. |
| `scs_notify_worker` | `postgres` | true | false | false | source does not specify this tuple. Same rule. |
| `scs_owner_admin` | `postgres` | true | false | false | source does not specify this tuple. Same rule. |
| `scs_migration` | `postgres` | true | false | false | source does not specify this tuple. Same rule. |

The 008 architecture refinement V-6d names grantor `supabase_admin` as an assumption that would stop a future migration 008 if untrue. The final reconciliation supersedes that assumption for this discovery record: the grantor is observed, not filled in here. Record the returned grantor. Do not treat a different name, by itself, as an RD-8 STOP. A missing edge, an extra edge, a wrong member, or a wrong option is a STOP.

No `scs_*` role is a member of anything. A row whose `member` column is an `scs_*` role is a deviation.

The bootstrap file does not contain a `GRANT`. This query does not create the edge.

| Result | Label |
|--------|-------|
| Exactly four rows, one for each role above, member `postgres`, ADMIN true, INHERIT false, SET false, and no row where an `scs_*` role is the member. Grantor written down as returned. | **Expected** |
| Any other shape. | **STOP** (gate STOP). Do not drop or add an edge. |
| RD-8.0 did not confirm the columns. | **Not applicable** for this query, and RD-8.0 remains **STOP**. |

Provider-managed memberships outside this `scs_*` filter, including `postgres` into `anon` and `authenticated`, stay as step 11 recorded them. RD-8 does not drop them.

---

## 8. Sequencing notes that are not authorizations

These sentences preserve order. They do not authorize the work.

- A future A-SQL-2, if separately authorized, runs migrations 001 through 007, then migration 008, and only then §B.2. If 008 stops, §B.2 does not start. 008 is not re-run after §B.2. Migration 008 is not written and not executed by this assignment.
- A-CRED exit status is **PROVISIONED_UNVERIFIED** (owner prompt, §4). Independent login and wrong-password rejection belong to separately authorized A-DBTEST authentication. Do not require that login before A-DBTEST authorization.
- Fixture seeds, mutation tests, and cleanup belong to A-DBTEST integration.
- G3 Netlify IPv6 remains unresolved and is not itself a reason to refuse a later staging SQL paste. This document does not authorize that paste.
- Creating an evidence file is not authorized by this assignment. §9 is the shape of a later note, not permission to create one.

---

## 9. Evidence shape

After a later authorization, a future note under `qa-m6b/` may hold the sanitized record. This assignment does not create that file and does not name it.

Each saved step records:

- Timestamp from step 1, and the batch time if the editor shows one.
- Role name only (`current_user` from step 1).
- The exact query text.
- The result rows, redacted.

Redact passwords, verifiers, JWTs, API keys, and connection strings. Do not paste a JWT sample. Do not record `rolpassword`. If a function definition contains a secret, redact the secret and keep the `current_setting` call visible.

Template:

```text
timestamp_utc:
role_name:
step:
query:
rows:
redactions: passwords, JWTs, and connection strings removed
```

---

## 10. STOP index

| Condition | Label | Session |
|-----------|-------|---------|
| On-screen project is not `scs-staging` / `kfclinlrzfwodmichmci` | **STOP** | End |
| `current_user` or `session_user` is not `postgres` | **STOP** | End |
| `password_encryption` is not `scram-sha-256` | **STOP** | End |
| `scram_iterations` is present and is not a positive integer | **STOP** | End |
| `citext` is not in `public`, or placement is unverified | **STOP** | End. Do not move the extension. |
| A required catalog query errors | **STOP** | End. Do not guess a column. |
| Partial application-object set, or a duplicate overload | **STOP** | End. Do not create the missing object. |
| Fresh staging and any `scs_*` role exists | **STOP** | End |
| `postgres` contradicts recorded §A.1 | **STOP** | End |
| `createrole_self_grant` is non-empty | **STOP** | Continue the remaining read-only steps. Block A-SQL-1. |
| Automatic Data API exposure is on | **STOP** | Continue reads. Block a later apply until Atlas decides. |
| Default ACL is `EXPLICIT` under the step 8 rules | **STOP** | Continue reads. Do not revoke. |
| Built-in global PUBLIC function `EXECUTE` | **Record only** | Not a STOP. |
| `anon` or `authenticated` has `CREATE` on `public` | **STOP** | Continue reads. |
| PUBLIC `CREATE` on `public`, or that fact is unverified | **STOP** | Continue reads. |
| Another non-owner, non-superuser role has `CREATE` on `public` | **STOP** | Continue reads. No prefix exemption. |
| API role is a member of any role, or a non-provider role is a member of `postgres` | **STOP** | Continue reads. Do not drop the edge. |
| Effective `pg_has_role` path is unverified, or an application role can inherit or SET into `postgres` or a broad predefined role | **STOP** | Continue reads. Do not treat step 11 `set_option` as the indirect answer. |
| Unexpected lead-data privilege in step 15, including the five unapproved `authenticated` `EXECUTE` grants | **STOP** | Finish step 15. Do not revoke. Not an approval. |
| `service_role` lead-data grant | **STOP** | Finish step 15. |
| Security-definer lead function whose `search_path` is missing or is only `public` | **STOP** | Do not `ALTER FUNCTION`. |
| RD-8 attribute or membership deviation | **STOP** | RD-8 session only. Does not authorize a repair. |
| A-SQL, migration 008, A-CRED live, A-DBTEST, evidence-file creation | **Not yet authorized** | Do not run. |

---

## 11. Requirement checklist

| Requirement | Where | When |
|-------------|-------|------|
| DISC-F01 default ACLs versus built-in PUBLIC function EXECUTE | Step 8 | Pre-bootstrap |
| DISC-F02 complete role inventory, every `scs_*` role, including replication, BYPASSRLS, LOGIN, INHERIT, CREATEROLE, CREATEDB | Step 10 | Pre-bootstrap |
| DISC-F03 direct membership preserved; effective INHERIT and SET via `pg_has_role` after the server confirms `oid, oid, text` | Steps 11 and 12 | Pre-bootstrap |
| DISC-F04 RD-4c and RD-5b; every role’s CREATE and USAGE on `public`; expanded schema ACL; no prefix exemption | Steps 10, 12, and 13 | Pre-bootstrap |
| DISC-F05 exact object identity, signatures, kinds, duplicates, partial sets, unexpected public objects | Step 9 | Pre-bootstrap. Zero expected objects are **NOT PRESENT**, not a failure. |
| DISC-F06 NULL ACLs expanded with `acldefault`; PUBLIC is oid 0; the string PUBLIC is not passed to privilege-inquiry functions | Steps 8, 13, and 15 | Pre-bootstrap |
| DISC-F07 / RD-8 | §7 RD-8.0, RD-8.1, RD-8.2 | **ONLY AFTER A-SQL-1**. Not a pre-bootstrap step. |
| RD-1 `createrole_self_grant` | Step 3 | Pre-bootstrap |
| RD-1 `password_encryption` | Step 4 | Pre-bootstrap |
| RD-1 `scram_iterations` | Step 5 | Pre-bootstrap |
| RD-2 `citext` and `search_path` | Step 7 | Pre-bootstrap |
| RD-3 default ACLs, grantor, grant option, PUBLIC | Steps 6 and 8 | Pre-bootstrap |
| RD-4 elevated and object-creating roles | Step 10 (complete inventory; no second filtered query) | Pre-bootstrap |
| RD-4b direct membership | Step 11 | Pre-bootstrap |
| RD-4c | Steps 10 and 12 | Pre-bootstrap |
| RD-5 schema USAGE and CREATE | Step 13 (RD-5b is the only query; no second PUBLIC-by-name call) | Pre-bootstrap |
| RD-5b | Step 13 | Pre-bootstrap |
| RD-6 session claims versus hosted AAL2 | Step 14 | Pre-bootstrap |
| Dashboard Data API and automatic exposure | Step 2 | Pre-bootstrap |
| Application grants | Step 15 | Only if step 9 is the full 001–007 set. Otherwise **Not applicable**. |
| R3 §A.4 and R3 §A.5 | Not steps. Closed as **NOT PROVISIONED**. Status-note headings are swapped. | Do not run. |

Pre-bootstrap steps are 1 through 15. RD-8 is outside that numbering.

---

## 12. Source integrity

Hashes are SHA-256, lowercase. Sizes are bytes. No hash of this R2 file is written here.

| Path | Bytes | SHA-256 |
|------|------:|---------|
| `qa-m6b/M7B-G2-REMAINING-READONLY-DISCOVERY-R1-20261125.md` | 54550 | `9cfa122b5eb797302d43c940a413fdbf4a9c64af5425555f26dfd4520b566652` |
| `qa-m6b/M7B-G2-REMAINING-READONLY-DISCOVERY-20261125.md` | 37408 | `acdbefc607f5c5517ebd22503fe37fdc9a258c78a5dff06c9438660b0e7d1c71` |
| `qa-m6b/M7B-G2-R4-SUCCESSOR-HASH-INVENTORY-20261124.json` | 12060 | `7cddac87ea255c886819a6efc64259fb5874827e3aef9b261522bf091ff59be0` |
| `qa-m6b/M7B-G2-A-SQL-EXECUTION-ADDENDUM-20261125.md` | 35142 | `758b7303354ebaca62aafbc629aa15b8dcde8ca3ad974be618a8e523270fa7b4` |
| `qa-m6b/M7B-G2-A-SQL-REMAINING-DISCOVERY-QUERIES-20261125.md` | 23434 | `68fa8c610d19117bf5f7cdc5883e4450e8858e07bdd8b99414d26f07a3307696` |
| `qa-m6b/M7B-G2-DIRECT-TLS-DISCOVERY-STATUS-20261124.md` | 6438 | `006ac21d5052e20f1fdcedb0686e90084d7cda60fda037ebe404ab452148991d` |
| `qa-m6b/M7B-G2-R4-FINAL-ACCEPTANCE-20261124.md` | 2283 | `eb72e84d55742824f3c4bfa44ceee4117d2bf1e99e9160cb10d68f1846c1c2a6` |
| `qa-m6b/M7B-G2-OPTION-C-R1-CODEX-ACCEPTANCE-HANDOFF-20261125.md` | 6738 | `fb11b687e6b032a524eaf4cb503df9b6ca9e88a58364330c7013ed2efccc6a3b` |
| `db/bootstrap/001_m7a_r4_role_bootstrap.sql` | 4100 | `e70d2bd22d147228cdcfece725d9a287cd718fe7ef77221493f94e05f88d5d8f` |
| `db/migrations/001_m7a_leads_foundation.sql` | 5572 | `7f45ae6de2f666bc1e8ea7c2816e6fd60a515b367a51ac7bd1e706ee028b8dc0` |
| `db/migrations/002_m7a_rls_least_privilege.sql` | 2584 | `fbbb319e6215665dfdc02ecfd225c079fd1b396828397e647e2b90be84f58850` |
| `db/migrations/003_m7a_retention_procedures.sql` | 5624 | `509595c5457c989379adb4e51c309e56111104525032a76fec68478b9c0cf472` |
| `db/migrations/004_m7a_counters_idempotency.sql` | 5229 | `0f0ee07642f22cc727891d471f35c6f04d11ad3c9136a495567452a6e7f62888` |
| `db/migrations/005_m7a_insert_lead_bundle.sql` | 8125 | `b2ebc8adb202ffa60c8e83d14230449b893bb34572486dbdfdabd53550c30c39` |
| `db/migrations/006_m7a_r2_security_hardening.sql` | 24640 | `5120160bc97c9bbfa805675d0f28c64dd8b2399416a08feb498e1103de84b63f` |
| `db/migrations/007_m7a_r4_security_corrections.sql` | 13827 | `dce49eff38a9d1591964bad88be9d00b46969d65050d1b5b96478a997d05d2d8` |
| `C:\Users\tkrau\Downloads\M7B-G2 Final Architecture Reconciliation Note.pdf` | 336130 | `5e918cc28000111e6a3f38fb223292031623fdfae111071230ac8b5742605136` |
| `C:\Users\tkrau\Downloads\M7B-G2 Migration 008 Architecture Refinement (R1).pdf` | 588962 | `dca3a1657a06fce5e7b1cb7ba7b6e36f623cc0241f8c272e56f8a2bffece8600` |
| `C:\Users\tkrau\Downloads\M7B-G2 Corrective Migration Architecture (Owner Functions, service_role, Default.pdf` | 626619 | `905badace93e48cb3922403563b0bec55a1e313b8566d65270d7f74ac52dd56f` |

The corrective PDF filename on disk ends at `Default.pdf`.

Predecessor references:

- R1 recomputed hash: `9cfa122b5eb797302d43c940a413fdbf4a9c64af5425555f26dfd4520b566652`, 54550 bytes. Matches the hash recorded before this file was written.
- Original discovery recomputed hash: `acdbefc607f5c5517ebd22503fe37fdc9a258c78a5dff06c9438660b0e7d1c71`, 37408 bytes.
- R4 inventory digest recomputed in this assignment. Method: each inventory row as `path`, tab, lowercase sha256, tab, bytes; `Sort-Object Path`; UTF-8; lines joined by newline; no trailing newline. Result: `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d`, 64 entries. The inventory file was not modified.
- Option C R1 inventory digest is historical context only: `4277cd555c2c90aa188d4f201b905b8895b29ecd436046263c4bbfdc898e99cc`. It was not recomputed here. Option C was not reviewed and was not edited.

Located and not used as procedure text: `C:\Users\tkrau\Downloads\M7B-G2 Secure Credential Provisioning Research (Option C).pdf` and `C:\Users\tkrau\Downloads\M7B-G2 Pre-A-SQL Architecture Readiness Review.pdf`. They are not missing. This procedure does not authorize credential provisioning.

No named source required for RD-4c, RD-5b, or RD-8 was missing.

---

## 13. What this file does not do

No query in this file was executed. No database connection was opened. No Git command was run. No migration was edited or applied. Migration 008 was not written. Frozen R4 files were not edited. Option C files were not edited. No dependency was installed. Production remains **HOLD**. A-SQL, A-CRED live, A-DBTEST, and deploy remain unauthorized.
