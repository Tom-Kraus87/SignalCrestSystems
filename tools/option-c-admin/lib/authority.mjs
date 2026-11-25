/**
 * Exact administrative authority and membership edges.
 *
 * PostgreSQL 16+ non-superuser CREATEROLE (Supabase postgres) receives an
 * irremovable ADMIN edge from supabase_admin: ADMIN true, INHERIT false, SET false.
 * That edge is what authorizes ALTER ROLE ... PASSWORD. A SET-only edge does not.
 *
 * After the reviewed §B.2a grants, scs_intake_runtime and scs_notify_worker also
 * have a postgres grantor edge: ADMIN false, INHERIT false, SET true.
 * scs_owner_admin and scs_test_admin must not have that SET edge.
 * createrole_self_grant must be empty; a non-empty value changes the automatic
 * edge and is a preflight STOP, not a reason to accept a different shape.
 * Any extra edge, missing edge, or option mismatch is a STOP.
 */

import { CODES, coded } from "./errors.mjs";
import { CANARY_ROLE, assertAllowedRole } from "./allowlist.mjs";

const AUTOMATIC_ADMIN = Object.freeze({
  member: "postgres",
  grantor: "supabase_admin",
  admin: true,
  inherit: false,
  set: false,
});

const SET_EDGE = Object.freeze({
  member: "postgres",
  grantor: "postgres",
  admin: false,
  inherit: false,
  set: true,
});

export const EXPECTED_EDGES = Object.freeze({
  scs_intake_runtime: Object.freeze([AUTOMATIC_ADMIN, SET_EDGE]),
  scs_notify_worker: Object.freeze([AUTOMATIC_ADMIN, SET_EDGE]),
  scs_owner_admin: Object.freeze([AUTOMATIC_ADMIN]),
  scs_test_admin: Object.freeze([AUTOMATIC_ADMIN]),
});

/**
 * Disposable canary created by non-superuser postgres with an empty
 * createrole_self_grant. The creator receives one ADMIN edge and nothing else.
 * INHERIT and SET stay false because the self-grant setting is empty.
 */
export const CANARY_EDGE = Object.freeze({
  member: "postgres",
  grantor: "postgres",
  admin: true,
  inherit: false,
  set: false,
});

const CANARY_ATTRS = Object.freeze({
  rolcanlogin: false,
  rolinherit: false,
  rolsuper: false,
  rolcreaterole: false,
  rolcreatedb: false,
  rolreplication: false,
  rolbypassrls: false,
});

const ROLE_ATTRS = Object.freeze({
  rolcanlogin: true,
  rolinherit: false,
  rolsuper: false,
  rolcreaterole: false,
  rolcreatedb: false,
  rolreplication: false,
  rolbypassrls: false,
});

function asBool(value) {
  if (value === true || value === false) return value;
  if (value === "t" || value === "true") return true;
  if (value === "f" || value === "false") return false;
  throw coded(CODES.MEMBERSHIP);
}

function edgeKey(edge) {
  return [
    edge.member,
    edge.grantor,
    edge.admin ? "1" : "0",
    edge.inherit ? "1" : "0",
    edge.set ? "1" : "0",
  ].join("|");
}

export function assertSessionIdentity(row) {
  const current = row && (row.current_user || row.currentUser);
  const session = row && (row.session_user || row.sessionUser);
  if (current !== "postgres" || session !== "postgres") throw coded(CODES.IDENTITY);
}

export function assertAdminAttributes(row) {
  if (!row || asBool(row.rolsuper) !== false || asBool(row.rolcreaterole) !== true || asBool(row.rolcanlogin) !== true) {
    throw coded(CODES.AUTHORITY);
  }
}

/**
 * Exact canary attributes, the one creator ADMIN edge, and no direct
 * application privileges. Any mismatch, extra membership, or privilege row
 * is terminal. This runs before the synthetic verifier is assigned.
 */
export function assertCanaryInspection(rows, privilegeRows) {
  if (!Array.isArray(rows) || rows.length === 0) throw coded(CODES.CANARY_ATTR);
  if (!Array.isArray(privilegeRows) || privilegeRows.length !== 0) throw coded(CODES.CANARY_PRIVILEGE);
  const first = rows[0];
  if (first.canary_name !== CANARY_ROLE) throw coded(CODES.CANARY_ATTR);
  for (const [key, expected] of Object.entries(CANARY_ATTRS)) {
    if (asBool(first[key]) !== expected) throw coded(CODES.CANARY_ATTR);
  }
  if (Number(first.rolconnlimit) !== 0) throw coded(CODES.CANARY_ATTR);
  const actual = [];
  for (const row of rows) {
    if (row.canary_name !== CANARY_ROLE) throw coded(CODES.CANARY_ATTR);
    if (row.member_name == null && row.grantor_name == null) throw coded(CODES.CANARY_MEMBERSHIP);
    actual.push({
      member: row.member_name,
      grantor: row.grantor_name,
      admin: asBool(row.admin_option),
      inherit: asBool(row.inherit_option),
      set: asBool(row.set_option),
    });
  }
  const expectedKeys = [edgeKey(CANARY_EDGE)];
  const actualKeys = actual.map(edgeKey).sort();
  if (expectedKeys.length !== actualKeys.length) throw coded(CODES.CANARY_MEMBERSHIP);
  for (let i = 0; i < expectedKeys.length; i += 1) {
    if (expectedKeys[i] !== actualKeys[i]) throw coded(CODES.CANARY_MEMBERSHIP);
  }
}

export function assertTargetAuthority(role, rows) {
  assertAllowedRole(role);
  if (!Array.isArray(rows) || rows.length === 0) throw coded(CODES.AUTHORITY);
  const first = rows[0];
  if (first.role_name !== role) throw coded(CODES.AUTHORITY);
  for (const [key, expected] of Object.entries(ROLE_ATTRS)) {
    if (asBool(first[key]) !== expected) throw coded(CODES.AUTHORITY);
  }
  const actual = [];
  for (const row of rows) {
    if (row.role_name !== role) throw coded(CODES.AUTHORITY);
    if (row.member_name == null && row.grantor_name == null) {
      throw coded(CODES.MEMBERSHIP);
    }
    actual.push({
      member: row.member_name,
      grantor: row.grantor_name,
      admin: asBool(row.admin_option),
      inherit: asBool(row.inherit_option),
      set: asBool(row.set_option),
    });
  }
  const expectedKeys = EXPECTED_EDGES[role].map(edgeKey).sort();
  const actualKeys = actual.map(edgeKey).sort();
  if (expectedKeys.length !== actualKeys.length) throw coded(CODES.MEMBERSHIP);
  for (let i = 0; i < expectedKeys.length; i += 1) {
    if (expectedKeys[i] !== actualKeys[i]) throw coded(CODES.MEMBERSHIP);
  }
}

/**
 * Role-by-role in-transaction check. The full verifier is not a selected column.
 * Independent login is a separate later proof and is not implied by this check.
 */
export function assertVerifierShape(row) {
  if (!row || asBool(row.rolcanlogin) !== true || asBool(row.has_secret) !== true || asBool(row.scram_form) !== true) {
    throw coded(CODES.VERIFY_FAIL);
  }
}

/**
 * Future independent-login decision. Wrong-password rejection is required.
 * SQL Editor and SET ROLE are not acceptance.
 */
export function interpretLoginProbe(probe) {
  if (!probe || probe.channel !== "independent-login") throw coded(CODES.VERIFY_FAIL);
  if (probe.currentUser !== probe.expectedRole || probe.sessionUser !== probe.expectedRole) {
    throw coded(CODES.VERIFY_FAIL);
  }
  if (probe.wrongPasswordRejected !== true) throw coded(CODES.VERIFY_FAIL);
  return { role: probe.expectedRole, independentLogin: "PASS" };
}
