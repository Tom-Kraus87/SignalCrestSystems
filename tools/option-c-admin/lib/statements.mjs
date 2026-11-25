/**
 * Fixed SQL text. Role names are selected from maps. User input is never
 * concatenated into a statement. The verifier literal is appended only after
 * it passes the injection and format gates.
 */

import { CANARY_ROLE, assertAllowedRole } from "./allowlist.mjs";
import { CODES, coded } from "./errors.mjs";
import { VERIFIER_PATTERN } from "./scram.mjs";

const INJECTION = /['\\\u0000;\r\n]|--|\/\*|\*\/|\$\$/;

export function quoteVerifierLiteral(verifier) {
  if (typeof verifier !== "string") throw coded(CODES.SCRAM_FORMAT);
  if (INJECTION.test(verifier)) throw coded(CODES.INJECTION);
  if (!VERIFIER_PATTERN.test(verifier)) throw coded(CODES.SCRAM_FORMAT);
  return `'${verifier}'`;
}

export const SQL_BEGIN = "BEGIN";
export const SQL_COMMIT = "COMMIT";
export const SQL_ROLLBACK = "ROLLBACK";

export const SQL_IDENTITY =
  "SELECT current_user AS current_user, session_user AS session_user";

export const SQL_ADMIN_ATTRS =
  "SELECT rolsuper, rolcreaterole, rolcanlogin FROM pg_catalog.pg_roles WHERE rolname = 'postgres'";

export const SQL_SETTINGS =
  "SELECT name, setting FROM pg_catalog.pg_settings WHERE name IN ('password_encryption', 'scram_iterations', 'createrole_self_grant', 'server_version_num')";

export const SQL_PGAUDIT_PROBE = "SELECT current_setting('pgaudit.log', true) AS pgaudit_log";

export const SET_LOCAL = Object.freeze([
  "SET LOCAL log_statement = 'none'",
  "SET LOCAL log_min_error_statement = 'panic'",
  "SET LOCAL log_min_messages = 'fatal'",
  "SET LOCAL pg_stat_statements.track = 'none'",
]);

export const SET_LOCAL_PGAUDIT = "SET LOCAL pgaudit.log = 'none'";

export const SQL_LOG_READBACK =
  "SELECT current_setting('log_statement') AS log_statement, current_setting('log_min_error_statement') AS log_min_error_statement, current_setting('log_min_messages') AS log_min_messages, current_setting('pg_stat_statements.track') AS pg_stat_statements_track";

/** Existence probe. Any row is a pre-existing role and is a stop. */
export const SQL_CANARY_EXISTS =
  "SELECT rolname, rolcanlogin FROM pg_catalog.pg_roles WHERE rolname = 'scs_option_c_log_canary'";

/**
 * Explicit disposable role. No IF NOT EXISTS. NOLOGIN and no administrative
 * attributes. CONNECTION LIMIT 0 blocks login even if a later flag flipped.
 */
export const SQL_CANARY_CREATE =
  'CREATE ROLE "scs_option_c_log_canary" NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 0';

/**
 * Attribute and membership readback. Runs before the canary password statement.
 * The single expected edge is the creator ADMIN edge from postgres to postgres.
 */
export const SQL_CANARY_INSPECT =
  "SELECT c.rolname AS canary_name, c.rolcanlogin, c.rolinherit, c.rolsuper, c.rolcreaterole, c.rolcreatedb, c.rolreplication, c.rolbypassrls, c.rolconnlimit, m.rolname AS member_name, g.rolname AS grantor_name, am.admin_option, am.inherit_option, am.set_option FROM pg_catalog.pg_roles c LEFT JOIN pg_catalog.pg_auth_members am ON am.roleid = c.oid LEFT JOIN pg_catalog.pg_roles m ON m.oid = am.member LEFT JOIN pg_catalog.pg_roles g ON g.oid = am.grantor WHERE c.rolname = 'scs_option_c_log_canary'";

/**
 * Direct privileges and parent-role memberships. Zero rows means the canary
 * has no table ACL, no schema ACL, and is not a member of another role.
 * Privileges held only through PUBLIC are not rows here.
 */
export const SQL_CANARY_PRIVILEGES =
  "SELECT privilege_kind, object_name FROM (SELECT 'table'::text AS privilege_kind, c.relname AS object_name FROM pg_catalog.pg_class c WHERE c.relacl IS NOT NULL AND EXISTS (SELECT 1 FROM pg_catalog.aclexplode(c.relacl) x JOIN pg_catalog.pg_roles pr ON pr.oid = x.grantee WHERE pr.rolname = 'scs_option_c_log_canary') UNION ALL SELECT 'schema'::text, n.nspname FROM pg_catalog.pg_namespace n WHERE n.nspacl IS NOT NULL AND EXISTS (SELECT 1 FROM pg_catalog.aclexplode(n.nspacl) x JOIN pg_catalog.pg_roles pr ON pr.oid = x.grantee WHERE pr.rolname = 'scs_option_c_log_canary') UNION ALL SELECT 'member-of'::text, parent.rolname FROM pg_catalog.pg_auth_members am JOIN pg_catalog.pg_roles child ON child.oid = am.member JOIN pg_catalog.pg_roles parent ON parent.oid = am.roleid WHERE child.rolname = 'scs_option_c_log_canary') canary_privileges";

/** Exact drop. Not IF EXISTS, and never used to remove a role we did not create. */
export const SQL_CANARY_DROP = 'DROP ROLE "scs_option_c_log_canary"';

const ROLE_ALTER = Object.freeze({
  scs_intake_runtime: 'ALTER ROLE "scs_intake_runtime" PASSWORD ',
  scs_notify_worker: 'ALTER ROLE "scs_notify_worker" PASSWORD ',
  scs_owner_admin: 'ALTER ROLE "scs_owner_admin" PASSWORD ',
  scs_test_admin: 'ALTER ROLE "scs_test_admin" PASSWORD ',
});

const ROLE_MEMBERSHIP = Object.freeze({
  scs_intake_runtime:
    "SELECT r.rolname AS role_name, r.rolcanlogin, r.rolinherit, r.rolsuper, r.rolcreaterole, r.rolcreatedb, r.rolreplication, r.rolbypassrls, m.rolname AS member_name, g.rolname AS grantor_name, am.admin_option, am.inherit_option, am.set_option FROM pg_catalog.pg_roles r LEFT JOIN pg_catalog.pg_auth_members am ON am.roleid = r.oid LEFT JOIN pg_catalog.pg_roles m ON m.oid = am.member LEFT JOIN pg_catalog.pg_roles g ON g.oid = am.grantor WHERE r.rolname = 'scs_intake_runtime'",
  scs_notify_worker:
    "SELECT r.rolname AS role_name, r.rolcanlogin, r.rolinherit, r.rolsuper, r.rolcreaterole, r.rolcreatedb, r.rolreplication, r.rolbypassrls, m.rolname AS member_name, g.rolname AS grantor_name, am.admin_option, am.inherit_option, am.set_option FROM pg_catalog.pg_roles r LEFT JOIN pg_catalog.pg_auth_members am ON am.roleid = r.oid LEFT JOIN pg_catalog.pg_roles m ON m.oid = am.member LEFT JOIN pg_catalog.pg_roles g ON g.oid = am.grantor WHERE r.rolname = 'scs_notify_worker'",
  scs_owner_admin:
    "SELECT r.rolname AS role_name, r.rolcanlogin, r.rolinherit, r.rolsuper, r.rolcreaterole, r.rolcreatedb, r.rolreplication, r.rolbypassrls, m.rolname AS member_name, g.rolname AS grantor_name, am.admin_option, am.inherit_option, am.set_option FROM pg_catalog.pg_roles r LEFT JOIN pg_catalog.pg_auth_members am ON am.roleid = r.oid LEFT JOIN pg_catalog.pg_roles m ON m.oid = am.member LEFT JOIN pg_catalog.pg_roles g ON g.oid = am.grantor WHERE r.rolname = 'scs_owner_admin'",
  scs_test_admin:
    "SELECT r.rolname AS role_name, r.rolcanlogin, r.rolinherit, r.rolsuper, r.rolcreaterole, r.rolcreatedb, r.rolreplication, r.rolbypassrls, m.rolname AS member_name, g.rolname AS grantor_name, am.admin_option, am.inherit_option, am.set_option FROM pg_catalog.pg_roles r LEFT JOIN pg_catalog.pg_auth_members am ON am.roleid = r.oid LEFT JOIN pg_catalog.pg_roles m ON m.oid = am.member LEFT JOIN pg_catalog.pg_roles g ON g.oid = am.grantor WHERE r.rolname = 'scs_test_admin'",
});

const ROLE_VERIFY = Object.freeze({
  scs_intake_runtime:
    "SELECT rolcanlogin, rolpassword IS NOT NULL AS has_secret, left(rolpassword, 15) = 'SCRAM-SHA-256$' AS scram_form FROM pg_catalog.pg_authid WHERE rolname = 'scs_intake_runtime'",
  scs_notify_worker:
    "SELECT rolcanlogin, rolpassword IS NOT NULL AS has_secret, left(rolpassword, 15) = 'SCRAM-SHA-256$' AS scram_form FROM pg_catalog.pg_authid WHERE rolname = 'scs_notify_worker'",
  scs_owner_admin:
    "SELECT rolcanlogin, rolpassword IS NOT NULL AS has_secret, left(rolpassword, 15) = 'SCRAM-SHA-256$' AS scram_form FROM pg_catalog.pg_authid WHERE rolname = 'scs_owner_admin'",
  scs_test_admin:
    "SELECT rolcanlogin, rolpassword IS NOT NULL AS has_secret, left(rolpassword, 15) = 'SCRAM-SHA-256$' AS scram_form FROM pg_catalog.pg_authid WHERE rolname = 'scs_test_admin'",
});

export function alterRolePasswordStatement(role, verifier) {
  assertAllowedRole(role);
  if (!Object.hasOwn(ROLE_ALTER, role)) throw coded(CODES.ALLOWLIST_DENIED);
  return ROLE_ALTER[role] + quoteVerifierLiteral(verifier);
}

export function canaryAlterStatement(verifier) {
  if (verifierIncludesInjection(verifier)) throw coded(CODES.INJECTION);
  return `ALTER ROLE "${CANARY_ROLE}" PASSWORD ${quoteVerifierLiteral(verifier)}`;
}

function verifierIncludesInjection(verifier) {
  return typeof verifier === "string" && INJECTION.test(verifier);
}

export function membershipSql(role) {
  assertAllowedRole(role);
  return ROLE_MEMBERSHIP[role];
}

export function verifierShapeSql(role) {
  assertAllowedRole(role);
  return ROLE_VERIFY[role];
}
