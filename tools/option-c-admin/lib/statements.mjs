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

export const SQL_CANARY_CREATE =
  "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'scs_option_c_log_canary') THEN CREATE ROLE \"scs_option_c_log_canary\" NOLOGIN NOINHERIT; END IF; END $$";

export const SQL_CANARY_DROP = 'DROP ROLE IF EXISTS "scs_option_c_log_canary"';

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
