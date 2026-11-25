/**
 * Offline-tested provisioning plan.
 * Database access is whatever object the caller injects. This module does not
 * open a socket. Live use must pass the owner authorization flag and is not
 * authorized by this assignment. The flag is an operational guard, not an
 * authentication boundary.
 *
 * Canary order:
 *   probe for an existing role and abort if one is present,
 *   BEGIN, SET LOCAL, read back every required setting,
 *   CREATE the disposable NOLOGIN role,
 *   read back attributes, the creator ADMIN edge, and direct privileges,
 *   only then assign the published RFC 7677 verifier,
 *   COMMIT once,
 *   require an explicit owner log acknowledgment,
 *   DROP the canary and confirm it is gone,
 *   only then alter a target role.
 * Ambiguous commits are not retried. A cleanup failure is never a success.
 */

import { ALLOWED_ROLES, CANARY_ROLE } from "./allowlist.mjs";
import {
  assertAdminAttributes,
  assertCanaryInspection,
  assertSessionIdentity,
  assertTargetAuthority,
  assertVerifierShape,
} from "./authority.mjs";
import { assertLiveAuthorized, assertResumeRejected } from "./authorization.mjs";
import { CODES, RESULTS, coded, isFixedCode } from "./errors.mjs";
import { createLogger } from "./logger.mjs";
import { assertLogSettings, pgauditIsPresent } from "./logging-guard.mjs";
import { assertUniqueRolePasswords, zeroBuffers } from "./password-policy.mjs";
import { RFC7677, buildVerifier } from "./scram.mjs";
import {
  SET_LOCAL,
  SET_LOCAL_PGAUDIT,
  SQL_ADMIN_ATTRS,
  SQL_BEGIN,
  SQL_CANARY_CREATE,
  SQL_CANARY_DROP,
  SQL_CANARY_EXISTS,
  SQL_CANARY_INSPECT,
  SQL_CANARY_PRIVILEGES,
  SQL_COMMIT,
  SQL_IDENTITY,
  SQL_LOG_READBACK,
  SQL_PGAUDIT_PROBE,
  SQL_ROLLBACK,
  SQL_SETTINGS,
  alterRolePasswordStatement,
  canaryAlterStatement,
  membershipSql,
  verifierShapeSql,
} from "./statements.mjs";

export const CANARY_CONFIRMATION = "CANARY-LOGS-CLEAR";

async function rowsOf(db, text) {
  const result = await db.query(text);
  return result && Array.isArray(result.rows) ? result.rows : [];
}

async function rollback(db) {
  try {
    await db.query(SQL_ROLLBACK);
    return null;
  } catch {
    return CODES.TX_CLEANUP;
  }
}

function attachSecondary(err, code) {
  if (code && isFixedCode(code) && err && !err.secondaryCode) err.secondaryCode = code;
}

async function withSuppressedTransaction(db, work) {
  await db.query(SQL_BEGIN);
  let stage = "log";
  try {
    const probe = await rowsOf(db, SQL_PGAUDIT_PROBE);
    const pgauditRequired = pgauditIsPresent(probe[0]);
    for (const statement of SET_LOCAL) await db.query(statement);
    if (pgauditRequired) await db.query(SET_LOCAL_PGAUDIT);
    const readback = await rowsOf(db, SQL_LOG_READBACK);
    const row = readback[0] ? { ...readback[0] } : {};
    if (pgauditRequired) {
      const again = await rowsOf(db, SQL_PGAUDIT_PROBE);
      row.pgaudit_log = again[0] ? again[0].pgaudit_log : undefined;
    }
    assertLogSettings(row, pgauditRequired);
    stage = "work";
    await work();
    stage = "commit";
    await db.query(SQL_COMMIT);
  } catch (err) {
    const rollbackCode = await rollback(db);
    if (err && err.publicCode) {
      attachSecondary(err, rollbackCode);
      throw err;
    }
    if (stage === "commit") {
      const ambiguous = coded(CODES.COMMIT_UNKNOWN);
      ambiguous.ambiguous = true;
      ambiguous.result = RESULTS.COMMIT_OUTCOME_UNKNOWN;
      attachSecondary(ambiguous, rollbackCode);
      throw ambiguous;
    }
    const wrapped = coded(stage === "log" ? CODES.LOG_SETTING : CODES.INTERNAL);
    attachSecondary(wrapped, rollbackCode);
    throw wrapped;
  }
}

async function preflight(db) {
  const identity = await rowsOf(db, SQL_IDENTITY);
  assertSessionIdentity(identity[0]);
  const admin = await rowsOf(db, SQL_ADMIN_ATTRS);
  assertAdminAttributes(admin[0]);
  const settings = await rowsOf(db, SQL_SETTINGS);
  const map = new Map();
  for (const row of settings) map.set(row.name, row.setting);
  if (map.get("password_encryption") !== "scram-sha-256") throw coded(CODES.ENCRYPTION);
  if (map.get("createrole_self_grant") !== "") throw coded(CODES.PREFLIGHT);
  const version = Number(map.get("server_version_num"));
  if (!Number.isInteger(version) || String(version) !== map.get("server_version_num") || version < 170000) {
    throw coded(CODES.PREFLIGHT);
  }
  const rawIterations = map.get("scram_iterations");
  const iterations = Number(rawIterations);
  if (!Number.isInteger(iterations) || iterations < 1 || String(iterations) !== rawIterations) {
    throw coded(CODES.ITERATIONS);
  }
  return iterations;
}

function partialError(completed, role, cause) {
  const ambiguous = Boolean(cause && cause.ambiguous);
  const err = coded(ambiguous ? CODES.COMMIT_UNKNOWN : CODES.PARTIAL);
  err.result = ambiguous ? RESULTS.COMMIT_OUTCOME_UNKNOWN : RESULTS.PARTIAL_PROVISIONING;
  err.completedRoles = completed.slice();
  err.skippedRoles = [];
  err.failedRole = role;
  err.causeCode = cause && cause.publicCode ? cause.publicCode : CODES.INTERNAL;
  err.ambiguous = ambiguous;
  err.independentLogin = "NOT-RUN";
  if (cause && isFixedCode(cause.secondaryCode)) err.secondaryCode = cause.secondaryCode;
  return err;
}

/**
 * Missing, rejected, and inconclusive acknowledgments are the same terminal
 * failure. The value must be the boolean true from an injected flag or from
 * an injected callback. This function does not prompt.
 */
async function acknowledgeCanary(source) {
  if (typeof source.confirmCanary === "function") {
    let value;
    try {
      value = await source.confirmCanary();
    } catch {
      throw coded(CODES.CANARY_ATTESTATION);
    }
    if (value !== true) throw coded(CODES.CANARY_ATTESTATION);
    return;
  }
  if (source.canaryLogsClear !== true && source.ownerLogAcknowledgment !== true) {
    throw coded(CODES.CANARY_ATTESTATION);
  }
}

async function ensureCanaryGone(db, drop) {
  let dropFailed = false;
  if (drop) {
    try {
      await db.query(SQL_CANARY_DROP);
    } catch {
      dropFailed = true;
    }
  }
  let left = null;
  let absenceFailed = false;
  try {
    left = await rowsOf(db, SQL_CANARY_EXISTS);
  } catch {
    absenceFailed = true;
  }
  if (dropFailed) {
    const err = coded(CODES.CANARY_CLEANUP);
    if (absenceFailed || !left || left.length !== 0) err.secondaryCode = CODES.CANARY_ABSENT;
    throw err;
  }
  if (absenceFailed || !left || left.length !== 0) throw coded(CODES.CANARY_ABSENT);
}

function needsCleanup(state) {
  return state === "rolled-back" || state === "committed" || state === "commit-unknown" || state === "in-transaction";
}

export async function executePlan(db, options) {
  const source = options || {};
  assertLiveAuthorized(source.env, source.argv);
  assertResumeRejected(source.argv);
  if (source.resumeAfter != null) throw coded(CODES.RESUME_REJECTED);
  if (!db || typeof db.query !== "function") throw coded(CODES.INTERNAL);
  if (source.transport !== "mock" && source.transport !== "injected-client") {
    throw coded(CODES.LIVE_UNAUTHORIZED);
  }
  if (source.skipCanary === true) throw coded(CODES.CANARY_REQUIRED);
  assertUniqueRolePasswords(source.passwords);
  if (typeof source.saltFor !== "function") throw coded(CODES.SCRAM_FORMAT);
  const log = source.log || createLogger(() => {});
  const buffers = ALLOWED_ROLES.map((role) => source.passwords[role]);
  let primary = null;
  let result = null;
  let canaryState = "absent";
  let cleanupAttempted = false;

  async function settleCanary() {
    if (cleanupAttempted) return;
    if (!needsCleanup(canaryState)) return;
    cleanupAttempted = true;
    const drop = canaryState === "committed" || canaryState === "commit-unknown";
    try {
      await ensureCanaryGone(db, drop);
      canaryState = "removed";
    } catch (err) {
      log.event({
        phase: "canary-cleanup",
        role: CANARY_ROLE,
        result: RESULTS.FAILED,
        code: err && err.publicCode ? err.publicCode : CODES.CANARY_CLEANUP,
      });
      throw err;
    }
  }

  try {
    const iterations = await preflight(db);
    const existing = await rowsOf(db, SQL_CANARY_EXISTS);
    if (existing.length > 0) {
      canaryState = "blocked-existing";
      const exists = coded(CODES.CANARY_EXISTS);
      exists.result = RESULTS.FAILED;
      throw exists;
    }
    try {
      canaryState = "in-transaction";
      await withSuppressedTransaction(db, async () => {
        await db.query(SQL_CANARY_CREATE);
        const inspected = await rowsOf(db, SQL_CANARY_INSPECT);
        const privileges = await rowsOf(db, SQL_CANARY_PRIVILEGES);
        assertCanaryInspection(inspected, privileges);
        await db.query(canaryAlterStatement(RFC7677.verifier));
      });
      canaryState = "committed";
    } catch (err) {
      canaryState = err && err.ambiguous ? "commit-unknown" : "rolled-back";
      if (err && err.publicCode) {
        if (err.ambiguous) {
          err.result = RESULTS.COMMIT_OUTCOME_UNKNOWN;
          err.failedRole = CANARY_ROLE;
        } else if (!err.result) {
          err.result = RESULTS.FAILED;
        }
        throw err;
      }
      const wrapped = coded(CODES.INTERNAL);
      wrapped.result = RESULTS.FAILED;
      throw wrapped;
    }
    await acknowledgeCanary(source);
    await settleCanary();
    log.event({
      phase: "canary",
      role: CANARY_ROLE,
      result: RESULTS.CANARY_VERIFIED,
      code: CODES.ROLE_PASS,
    });

    const completed = [];
    const roleOutcomes = [];
    for (const role of ALLOWED_ROLES) {
      const salt = source.saltFor(role);
      try {
        if (!Buffer.isBuffer(salt)) throw coded(CODES.SCRAM_FORMAT);
        const verifier = buildVerifier(source.passwords[role], { salt, iterations });
        await withSuppressedTransaction(db, async () => {
          const membership = await rowsOf(db, membershipSql(role));
          assertTargetAuthority(role, membership);
          await db.query(alterRolePasswordStatement(role, verifier));
          const shape = await rowsOf(db, verifierShapeSql(role));
          assertVerifierShape(shape[0]);
        });
        completed.push(role);
        roleOutcomes.push({
          role,
          result: RESULTS.PROVISIONED_UNVERIFIED,
          code: CODES.ROLE_PASS,
        });
        log.event({
          phase: "role",
          role,
          result: RESULTS.PROVISIONED_UNVERIFIED,
          code: CODES.ROLE_PASS,
        });
      } catch (err) {
        log.event({
          phase: "role",
          role,
          result: err && err.ambiguous ? RESULTS.COMMIT_OUTCOME_UNKNOWN : RESULTS.FAILED,
          code: err && err.publicCode ? err.publicCode : CODES.PARTIAL,
        });
        throw partialError(completed, role, err);
      } finally {
        if (Buffer.isBuffer(salt)) salt.fill(0);
      }
    }
    result = {
      result: RESULTS.PROVISIONED_UNVERIFIED,
      canary: RESULTS.CANARY_VERIFIED,
      completedRoles: completed,
      skippedRoles: [],
      independentLogin: "NOT-RUN",
      iterations,
      roleOutcomes,
    };
  } catch (err) {
    primary = err && err.publicCode ? err : coded(CODES.INTERNAL);
    if (!primary.result) primary.result = RESULTS.FAILED;
  }

  if (needsCleanup(canaryState) && !cleanupAttempted) {
    try {
      await settleCanary();
    } catch (cleanupErr) {
      const code = cleanupErr && cleanupErr.publicCode ? cleanupErr.publicCode : CODES.CANARY_CLEANUP;
      if (primary) {
        if (!primary.secondaryCode) primary.secondaryCode = code;
      } else {
        primary = cleanupErr && cleanupErr.publicCode ? cleanupErr : coded(CODES.CANARY_CLEANUP);
        if (!primary.result) primary.result = RESULTS.FAILED;
      }
    }
  }

  zeroBuffers(buffers);
  if (primary) throw primary;
  return result;
}
