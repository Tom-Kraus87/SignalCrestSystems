/**
 * Live execution is unauthorized in this build unless the owner presents
 * the explicit flag. This module does not set that flag.
 * Offline self-test does not consult it.
 *
 * The phrase is an operational guard for a future owner window. It is not an
 * authentication boundary: it does not authenticate the operator to PostgreSQL
 * and it does not prove possession of the administrator password.
 */

import { CODES, coded } from "./errors.mjs";

export const LIVE_AUTHORIZATION_ENV = "SCS_OPTION_C_LIVE_AUTHORIZATION";
export const LIVE_AUTHORIZATION_PHRASE = "OWNER-AUTHORIZED-OPTION-C-LIVE";

export function liveAuthorized(env, argv) {
  const args = Array.isArray(argv) ? argv : [];
  if (!args.includes("--live")) return false;
  if (!env || typeof env !== "object") return false;
  return env[LIVE_AUTHORIZATION_ENV] === LIVE_AUTHORIZATION_PHRASE;
}

export function assertLiveAuthorized(env, argv) {
  if (!liveAuthorized(env, argv)) throw coded(CODES.LIVE_UNAUTHORIZED);
}

/** --resume-after is rejected. There is no role-skipping resume path. */
export function assertResumeRejected(argv) {
  const args = Array.isArray(argv) ? argv : [];
  for (const arg of args) {
    if (typeof arg !== "string") throw coded(CODES.ENV_SECRET_FORBIDDEN);
    if (arg === "--resume-after" || arg.startsWith("--resume-after=")) {
      throw coded(CODES.RESUME_REJECTED);
    }
  }
}

const SECRET_ARG = /:\/\//i;
const PASSWORD_ARG = /^--?password(?:=|$)/i;

export function assertArgvSafe(argv) {
  const args = Array.isArray(argv) ? argv : [];
  for (const arg of args) {
    if (typeof arg !== "string") throw coded(CODES.ENV_SECRET_FORBIDDEN);
    if (SECRET_ARG.test(arg) || PASSWORD_ARG.test(arg) || arg.includes("PASSWORD=")) {
      throw coded(CODES.ENV_SECRET_FORBIDDEN);
    }
  }
}
