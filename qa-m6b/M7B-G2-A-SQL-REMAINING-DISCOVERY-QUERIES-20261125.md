# M7B-G2 — Remaining discovery and future verification SQL

**Date:** 2026-11-25  
**Companion to:** `qa-m6b/M7B-G2-A-SQL-EXECUTION-ADDENDUM-20261125.md`  
**Class:** SQL text and dashboard observation text only  
**Authorization:** **NOT AUTHORIZED TO RUN NOW**  
**Production:** **HOLD**  
**A-SQL:** **unauthorized**  
**A-DBTEST:** **unauthorized**

Do not paste these statements into the Supabase SQL Editor in this documentation window. Do not connect. Do not authenticate. A later written authorization has to name the project `scs-staging`, ref `kfclinlrzfwodmichmci`, before any block below is eligible. Even then, only the block that authorization names may run, and a STOP ends the session.

Completed discovery is not repeated here. §A.0, §A.1, §A.2, §A.3, §A.4, and §A.5 are already recorded. §A.4 and §A.5 returned **NOT PROVISIONED**. See the addendum §8. Do not run them again.

---

## A. Pre-apply read-only discovery — not authorized now

Run as the project administrator only in a future read-only window. Capture role names, settings, and privilege labels. Capture no passwords and no connection strings.

### A.1 `createrole_self_grant` (F1)

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY
SHOW createrole_self_grant;
```

**Expected:** empty.  
**STOP:** any non-empty value. That changes the automatic PostgreSQL 16+ membership options. Unexpected automatic membership options are STOP. Do not continue to role creation.

### A.2 `password_encryption` (F2)

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY
SHOW password_encryption;
```

**Expected:** `scram-sha-256`.  
**STOP:** any other value. The credential design in the addendum is not eligible for review on another setting.

### A.3 Extension placement and `search_path` (F4)

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY
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

**Expected when `citext` is already installed:** one row with `extname = citext` and `schema = public`. Record the `pgcrypto` schema and the `search_path` beside it. `gen_random_uuid()` does not depend on `pgcrypto`.

**STOP:**

- `citext` is present and `schema` is not `public`.
- `citext` is absent and `current_schema()` is not `public`.
- `citext` is absent and `can_create_in_current_schema` is not true.

A mismatch is STOP. Do not `ALTER EXTENSION`, do not move it, and do not edit migration 001 or the frozen functions.

### A.4 Default privileges (F3)

Global rows have `defaclnamespace = 0`. `MAINTAIN` appears as a privilege type on PostgreSQL 17 when the default ACL includes it.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY
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

**Expected:** record every row, including zero rows. Do not invent a pass from an empty result and do not treat a populated Supabase default as acceptable because the Data API is disabled.

**STOP for a future A-SQL apply:** any row whose `grantee` is `PUBLIC`, `anon`, `authenticated`, or `service_role` until Atlas decides whether those defaults are acceptable or a new reviewed migration must revoke the resulting grants. Do not revoke them in this discovery. Do not hand-edit frozen migrations.

### A.5 Object-creating and elevated roles (F3)

This is not a re-run of §A.1. It lists roles that can create objects or bypass RLS so the default-ACL grantor is interpretable. The `postgres` row is expected to match the already-recorded §A.1 result.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY
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

**Expected:** `postgres` with `rolsuper` false, `rolcreaterole` true, and `rolcanlogin` true, matching the recorded §A.1 PASS. No `scs_*` role. Provider roles such as `supabase_admin` are recorded as provider-managed and are not revoked.

**STOP:** the `postgres` attributes contradict the recorded §A.1 result; any `scs_*` role is present (that would contradict the recorded **NOT PROVISIONED** discovery); or a non-provider role other than `postgres` has `rolsuper` or `rolbypassrls`.

### A.6 Schema ownership and CREATE (F3)

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY
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

**Expected:** record owner and CREATE/USAGE. `public` owned by the project administrator is the application schema. `extensions`, `auth`, and `storage` are provider-managed. Do not change their owners.

**STOP:** `anon` or `authenticated` has `CREATE` on `public`. Record `service_role` CREATE and take it to the Atlas decision in addendum §5. Do not revoke provider-managed schema privileges in this discovery.

### A.7 Data API and automatic exposure (F3)

Not SQL. In a future read-only dashboard observation of project `scs-staging` only:

1. Record whether the Data API is enabled or disabled.
2. Record the “Automatically expose new tables and functions” setting.
3. Do not change either setting.
4. Do not open the Roles UI to set a password.

**Expected:** both values written down for Atlas.  
**STOP for apply:** the automatic-exposure setting is on, or the default-ACL query in A.4 grants API roles privileges on future `public` objects, until Atlas decides. Disabling the Data API does not justify those grants.

---

## B. Future §B.2 membership verification — not authorized now

Run only after a future A-SQL authorization has completed bootstrap and only if `SHOW createrole_self_grant` was empty. This replaces the single-row expectation in R3 §B.2c. It does not authorize the grants by itself.

### B.1 Grants that are still required, and grants that are not

Preserve provider `anon` and `authenticated` memberships. Do not revoke them and do not downgrade their options.

Grant `scs_intake_runtime` and `scs_notify_worker` only when the edge query shows no row with `set_option = true` for that role. The automatic admin edge (`admin_option` true, `set_option` false, `inherit_option` false, grantor `supabase_admin`) does not count as SET. “Missing” means no effective SET permission.

Do not issue `GRANT anon` or `GRANT authenticated` when a preserved edge already has `set_option` true. If SET is absent on those provider roles, STOP. Do not grant `scs_owner_admin`.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- MUTATING — future A-SQL only — do not run during discovery
-- PG16+ options. Does not change the administrator's own role attributes.
GRANT scs_intake_runtime TO CURRENT_USER
  WITH INHERIT FALSE, SET TRUE, ADMIN FALSE;
GRANT scs_notify_worker TO CURRENT_USER
  WITH INHERIT FALSE, SET TRUE, ADMIN FALSE;
```

Skip either statement when that role already has an edge with `set_option` true. Do not add `GRANT anon` or `GRANT authenticated` to this block.

### B.2 Complete membership-edge verification

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — future post-grant verification
SELECT r.rolname AS member,
       m.rolname AS role_name,
       g.rolname AS grantor,
       am.admin_option,
       am.inherit_option,
       am.set_option
FROM pg_auth_members am
JOIN pg_roles r ON r.oid = am.member
JOIN pg_roles m ON m.oid = am.roleid
JOIN pg_roles g ON g.oid = am.grantor
WHERE r.rolname = current_user
  AND m.rolname IN (
        'scs_intake_runtime',
        'scs_notify_worker',
        'anon',
        'authenticated',
        'scs_owner_admin'
      )
ORDER BY m.rolname, g.rolname;

SELECT m.rolname AS role_name,
       bool_or(am.set_option) AS effective_set,
       bool_or(am.inherit_option) AS any_inherit,
       bool_or(am.admin_option) AS any_admin,
       count(am.roleid) AS edge_count
FROM pg_roles m
LEFT JOIN pg_auth_members am ON am.roleid = m.oid
LEFT JOIN pg_roles r
  ON r.oid = am.member
 AND r.rolname = current_user
WHERE m.rolname IN (
        'scs_intake_runtime',
        'scs_notify_worker',
        'anon',
        'authenticated'
      )
GROUP BY m.rolname
ORDER BY 1;
```

**Expected for `scs_intake_runtime` and `scs_notify_worker` when `createrole_self_grant` is empty:**

- `effective_set` true.
- `any_inherit` false.
- At least one automatic edge with `admin_option` true, `set_option` false, `inherit_option` false, grantor `supabase_admin`.
- The §B.2a edge with `admin_option` false, `set_option` true, `inherit_option` false, grantor the project administrator.
- No `scs_owner_admin` edge for `current_user`.

**Expected for `anon` and `authenticated`:** the preserved provider edges remain. The recorded options are ADMIN true, INHERIT true, and SET true. `effective_set` true. Do not require `inherit_option` false or `admin_option` false.

**STOP:** `effective_set` is not true for any of the four harness targets; any `scs_*` edge has `inherit_option` true; the automatic edge’s options differ from the empty-`createrole_self_grant` expectation; a provider `anon` or `authenticated` edge was revoked or downgraded; or an `scs_owner_admin` membership was added.

### B.3 Effective SET ROLE probes

These probes are session-local. They are not independent authentication. Reset after each one. A failure blocks G2. Do not start the harness.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- Future post-grant session probes. RESET after every probe.
SET ROLE scs_intake_runtime;
SELECT current_user;
RESET ROLE;

SET ROLE anon;
SELECT current_user;
RESET ROLE;

SET ROLE authenticated;
SELECT current_user;
RESET ROLE;

SET ROLE scs_notify_worker;
SELECT current_user;
RESET ROLE;
```

**Expected:** `current_user` equals the role just set, then returns to the project administrator after `RESET ROLE`.  
**STOP:** any probe errors or returns a different `current_user`.

---

## C. Future post-apply privilege matrix — not authorized now

Run as the project administrator only after a future A-SQL apply of bootstrap, migrations 001–007, phase-3 `scs_test_admin`, and §B.4 has finished, and only if that apply was authorized. Missing application objects at that point are STOP, not a fresh-database **NOT PROVISIONED** result. If `service_role` is absent, the effective-privilege queries error. That error is STOP. Do not drop `service_role` from the role list to make the query succeed.

Lead-data objects are `leads`, `consent_records`, `submission_requests`, `notification_outbox`, `lead_deletion_markers`, `usage_counters`, `idempotency_keys`, `owner_allowlist`, and the functions named in the addendum §5. Unexpected effective access to those objects is STOP. Inherited privileges count.

### C.1 Direct ACLs on tables, views, sequences, and functions

`relkind`: `r` table, `p` partitioned table, `v` view, `m` materialized view, `S` sequence. Application migrations do not create views. Provider views still appear because the filter is schema-wide outside the system catalogs. Distinguish them by `nspname` and `owner`. Do not revoke provider-owned rows.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — future post-apply
SELECT n.nspname,
       c.relname,
       c.relkind,
       o.rolname AS owner,
       CASE WHEN x.grantee = 0 THEN 'PUBLIC' ELSE x.grantee::regrole::text END AS grantee,
       x.privilege_type,
       x.is_grantable
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_roles o ON o.oid = c.relowner
CROSS JOIN LATERAL aclexplode(c.relacl) AS x
WHERE c.relacl IS NOT NULL
  AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY 1, 2, 5, 6;
```

### C.2 Effective table, view, sequence, and MAINTAIN privileges

`has_*_privilege` includes privileges inherited through membership. `MAINTAIN` is queried for tables only (`relkind` `r` and `p`), which is where PostgreSQL 17 defines it.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — future post-apply
WITH roles(role_name) AS (
  VALUES
    ('public'),
    ('anon'),
    ('authenticated'),
    ('service_role'),
    ('scs_intake_runtime'),
    ('scs_notify_worker'),
    ('scs_migration'),
    ('scs_owner_admin'),
    ('scs_test_admin')
),
rels AS (
  SELECT c.oid, n.nspname, c.relname, c.relkind, o.rolname AS owner
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_roles o ON o.oid = c.relowner
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
)
SELECT r.nspname,
       r.relname,
       r.relkind,
       r.owner,
       roles.role_name,
       CASE
         WHEN r.relkind IN ('r', 'p', 'v', 'm') THEN has_table_privilege(roles.role_name, r.oid, 'SELECT')
         ELSE NULL
       END AS select_priv,
       CASE
         WHEN r.relkind IN ('r', 'p', 'v', 'm') THEN has_table_privilege(roles.role_name, r.oid, 'INSERT')
         ELSE NULL
       END AS insert_priv,
       CASE
         WHEN r.relkind IN ('r', 'p', 'v', 'm') THEN has_table_privilege(roles.role_name, r.oid, 'UPDATE')
         ELSE NULL
       END AS update_priv,
       CASE
         WHEN r.relkind IN ('r', 'p', 'v', 'm') THEN has_table_privilege(roles.role_name, r.oid, 'DELETE')
         ELSE NULL
       END AS delete_priv,
       CASE
         WHEN r.relkind IN ('r', 'p') THEN has_table_privilege(roles.role_name, r.oid, 'MAINTAIN')
         ELSE NULL
       END AS maintain_priv,
       CASE
         WHEN r.relkind = 'S' THEN has_sequence_privilege(roles.role_name, r.oid, 'USAGE')
         ELSE NULL
       END AS sequence_usage,
       CASE
         WHEN r.relkind = 'S' THEN has_sequence_privilege(roles.role_name, r.oid, 'SELECT')
         ELSE NULL
       END AS sequence_select,
       CASE
         WHEN r.relkind = 'S' THEN has_sequence_privilege(roles.role_name, r.oid, 'UPDATE')
         ELSE NULL
       END AS sequence_update
FROM rels r
CROSS JOIN roles
ORDER BY 1, 2, 5;
```

### C.3 Functions, ownership, SECURITY DEFINER, and search path

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — future post-apply
WITH roles(role_name) AS (
  VALUES
    ('public'),
    ('anon'),
    ('authenticated'),
    ('service_role'),
    ('scs_intake_runtime'),
    ('scs_notify_worker'),
    ('scs_migration'),
    ('scs_owner_admin'),
    ('scs_test_admin')
)
SELECT n.nspname,
       p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       o.rolname AS owner,
       p.prosecdef AS security_definer,
       p.proconfig,
       roles.role_name,
       has_function_privilege(roles.role_name, p.oid, 'EXECUTE') AS execute_priv
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles o ON o.oid = p.proowner
CROSS JOIN roles
WHERE n.nspname = 'public'
ORDER BY 2, 3, 7;
```

**Expected for application `SECURITY DEFINER` functions:** `owner` is the project administrator, and `proconfig` contains `search_path=pg_catalog, public`.  
**STOP:** owner is `scs_intake_runtime`, `scs_notify_worker`, `scs_migration`, `scs_owner_admin`, or `scs_test_admin`; `prosecdef` is true and `search_path` is missing or is only `public`; `anon` or `authenticated` can `EXECUTE` `insert_lead_bundle`; `scs_test_admin` can `EXECUTE` any purge function. The `authenticated` `EXECUTE` grants from migration 006 on `is_owner_aal2`, `soft_delete_lead`, and the purge functions are expected to appear and are STOP for matrix acceptance until Atlas decides. Do not `ALTER FUNCTION` the frozen bodies.

### C.4 Schemas

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — future post-apply
WITH roles(role_name) AS (
  VALUES
    ('public'),
    ('anon'),
    ('authenticated'),
    ('service_role'),
    ('scs_intake_runtime'),
    ('scs_notify_worker'),
    ('scs_migration'),
    ('scs_owner_admin'),
    ('scs_test_admin')
)
SELECT n.nspname,
       o.rolname AS owner,
       roles.role_name,
       has_schema_privilege(roles.role_name, n.oid, 'USAGE') AS usage_priv,
       has_schema_privilege(roles.role_name, n.oid, 'CREATE') AS create_priv
FROM pg_namespace n
JOIN pg_roles o ON o.oid = n.nspowner
CROSS JOIN roles
WHERE n.nspname IN ('public', 'extensions', 'auth', 'storage')
ORDER BY 1, 3;
```

**STOP:** any `scs_*` role has `CREATE` on `public`. `PUBLIC` `CREATE` on `public` is STOP. Provider schemas are recorded and not revoked.

### C.5 Relevant column grants

Direct column ACLs, then effective privileges on every column of the lead-data tables. R3 §B.4 names the fixture columns that may be true for `scs_test_admin` after the overlay: `leads.deleted_at` UPDATE, `idempotency_keys.expires_at` UPDATE, `notification_outbox.lease_expires_at` UPDATE, and the listed `lead_deletion_markers` columns. Any broader effective column privilege for `PUBLIC`, `anon`, `authenticated`, or `service_role` on lead-data columns is STOP pending the Atlas decision. Data API disablement does not justify them.

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — future post-apply — direct column ACLs
SELECT n.nspname,
       c.relname,
       a.attname,
       o.rolname AS owner,
       x.privilege_type,
       CASE WHEN x.grantee = 0 THEN 'PUBLIC' ELSE x.grantee::regrole::text END AS grantee,
       x.is_grantable
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_roles o ON o.oid = c.relowner
CROSS JOIN LATERAL aclexplode(a.attacl) AS x
WHERE a.attacl IS NOT NULL
  AND a.attnum > 0
  AND NOT a.attisdropped
  AND n.nspname = 'public'
ORDER BY 1, 2, 3, 6, 5;
```

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — future post-apply — effective column privileges
WITH roles(role_name) AS (
  VALUES
    ('public'),
    ('anon'),
    ('authenticated'),
    ('service_role'),
    ('scs_intake_runtime'),
    ('scs_notify_worker'),
    ('scs_migration'),
    ('scs_owner_admin'),
    ('scs_test_admin')
),
cols AS (
  SELECT c.oid AS reloid,
         n.nspname,
         c.relname,
         a.attname
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE a.attnum > 0
    AND NOT a.attisdropped
    AND n.nspname = 'public'
    AND c.relname IN (
          'leads',
          'consent_records',
          'submission_requests',
          'notification_outbox',
          'lead_deletion_markers',
          'usage_counters',
          'idempotency_keys',
          'owner_allowlist'
        )
)
SELECT cols.relname,
       cols.attname,
       roles.role_name,
       has_column_privilege(roles.role_name, cols.reloid, cols.attname, 'SELECT') AS col_select,
       has_column_privilege(roles.role_name, cols.reloid, cols.attname, 'INSERT') AS col_insert,
       has_column_privilege(roles.role_name, cols.reloid, cols.attname, 'UPDATE') AS col_update
FROM cols
CROSS JOIN roles
ORDER BY 1, 2, 3;
```

### C.6 RLS and BYPASSRLS

```sql
-- NOT AUTHORIZED TO RUN NOW
-- READ-ONLY — future post-apply
SELECT c.relname,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced,
       o.rolname AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_roles o ON o.oid = c.relowner
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
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
ORDER BY 1;

SELECT rolname, rolbypassrls, rolsuper, rolcanlogin, rolinherit
FROM pg_roles
WHERE rolname IN (
        'anon',
        'authenticated',
        'service_role',
        'scs_intake_runtime',
        'scs_notify_worker',
        'scs_migration',
        'scs_owner_admin',
        'scs_test_admin'
      )
ORDER BY 1;
```

**Expected:** RLS enabled on each listed application table. Every `scs_*` row has `rolbypassrls` false, `rolsuper` false, and `scs_migration.rolcanlogin` false. `scs_test_admin` has `rolinherit` false and `rolcanlogin` true after phase 3.  
**STOP:** RLS is off on a listed lead-data table; any `scs_*` role has `BYPASSRLS` or `SUPERUSER`; `scs_migration` can log in.

R3 §C.4’s sampled expectations remain in force and are not a substitute for C.1–C.6: intake `SELECT` on `idempotency_keys` false, notify `SELECT` on `notification_outbox` false, intake lookup `EXECUTE` true, notify claim `EXECUTE` true, fixture purge `EXECUTE` false.

---

## D. Future notice capture — not a query, not authorized now

When a future A-SQL window pastes migrations 006 and 007, save the full notice and error text. Remove nothing except secrets, and there should be no secrets in those files.

**STOP:** any notice that a role was skipped or a grant was skipped. An exception from 007 is STOP. Do not continue to the next statement after a STOP. The matrix in section C is still required, because some 006 handlers continue without a notice.

---

## E. Explicitly omitted

These are not in this file because they are already recorded or because they are out of scope:

- R3 §A.4 and §A.5. Result: **NOT PROVISIONED**. Do not run them again.
- R3 §A.0, §A.1, §A.2, and §A.3.
- Password SQL, `ALTER ROLE … PASSWORD`, SCRAM verifiers, and `psql` `\password`.
- Any `REVOKE` of provider-managed privileges, any `ALTER EXTENSION`, and any edit of frozen migrations.
- Path B connection strings and the IPv4 add-on.
