/**
 * Fixed four-role allowlist from the A-SQL addendum credential section
 * and Claude's Option C research. Default deny. No invented roles.
 */

import { CODES, coded } from "./errors.mjs";

export const ALLOWED_ROLES = Object.freeze([
  "scs_intake_runtime",
  "scs_notify_worker",
  "scs_owner_admin",
  "scs_test_admin",
]);

const ALLOWED = new Set(ALLOWED_ROLES);

/** Explicit refusals. Anything outside the four roles is also refused. */
export const REFUSED_ROLES = Object.freeze([
  "postgres",
  "scs_migration",
  "anon",
  "authenticated",
  "service_role",
  "supabase_admin",
  "supabase_auth_admin",
  "supabase_storage_admin",
  "supabase_replication_admin",
  "dashboard_user",
  "authenticator",
  "pgbouncer",
  "supabase_read_only_user",
]);

export const CANARY_ROLE = "scs_option_c_log_canary";

export function assertAllowedRole(role) {
  if (typeof role !== "string" || !ALLOWED.has(role)) {
    throw coded(CODES.ALLOWLIST_DENIED);
  }
  return role;
}

export function isAllowedRole(role) {
  return typeof role === "string" && ALLOWED.has(role);
}
