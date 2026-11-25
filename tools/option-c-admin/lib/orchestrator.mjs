/**
 * Offline-tested provisioning plan.
 * Database access is whatever object the caller injects. This module does not
 * open a socket. Live use must pass the owner authorization flag and is not
 * authorized by this assignment.
 *
 * Order for every credential statement, including the mandatory canary:
 *   BEGIN, SET LOCAL, read back every required setting, then the statement.
 * Authority and exact membership edges are checked inside the role transaction
 * after the logging readback and before ALTER ROLE.
 */

import { ALLOWED_ROLES, CANARY_ROLE, assertAllowedRole } from "./allowlist.mjs";
import {
  assertAdminAttributes,
  assertSessionIdentity,
  assertTargetAuthority,
  assertVerifierShape,
} from "./authority.mjs";
import { assertLiveAuthorized } from "./authorization.mjs";
import { CODES, coded } from "./errors.mjs";
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
  } catch {
    /* Keep the original fixed code. */
  }
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
    await rollback(db);
    if (err && err.publicCode) throw err;
    if (stage === "commit") {
      const ambiguous = coded(CODES.PARTIAL);
      ambiguous.ambiguous = true;
      throw ambiguous;
    }
    throw coded(stage === "log" ? CODES.LOG_SETTING : CODES.INTERNAL);
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

function partialError(completed, skipped, role, cause) {
  const err = coded(CODES.PARTIAL);
  err.completedRoles = completed.slice();
  err.skippedRoles = skipped.slice();
  err.failedRole = role;
  err.causeCode = cause && cause.publicCode ? cause.publicCode : CODES.INTERNAL;
  err.ambiguous = Boolean(cause && cause.ambiguous);
  err.independentLogin = "NOT-RUN";
  return err;
}

export async function executePlan(db, options) {
  const source = options || {};
  assertLiveAuthorized(source.env, source.argv);
  if (!db || typeof db.query !== "function") throw coded(CODES.INTERNAL);
  if (source.transport !== "mock" && source.transport !== "injected-client") {
    throw coded(CODES.LIVE_UNAUTHORIZED);
  }
  if (source.skipCanary === true) throw coded(CODES.CANARY_REQUIRED);
  assertUniqueRolePasswords(source.passwords);
  if (typeof source.saltFor !== "function") throw coded(CODES.SCRAM_FORMAT);
  const log = source.log || createLogger(() => {});
  let skipped = [];
  if (source.resumeAfter != null) {
    assertAllowedRole(source.resumeAfter);
    const index = ALLOWED_ROLES.indexOf(source.resumeAfter);
    skipped = ALLOWED_ROLES.slice(0, index + 1);
  }
  const pending = ALLOWED_ROLES.slice(skipped.length);
  const buffers = ALLOWED_ROLES.map((role) => source.passwords[role]);
  let canaryStarted = false;
  const completed = [];
  try {
    const iterations = await preflight(db);
    canaryStarted = true;
    await withSuppressedTransaction(db, async () => {
      await db.query(SQL_CANARY_CREATE);
      await db.query(canaryAlterStatement(RFC7677.verifier));
    });
    log.event({ phase: "canary", role: CANARY_ROLE, result: "PASS", code: CODES.ROLE_PASS });
    let logsClear = source.canaryLogsClear === true;
    if (typeof source.confirmCanary === "function") {
      logsClear = (await source.confirmCanary()) === true;
    }
    if (logsClear !== true) throw coded(CODES.CANARY_ATTESTATION);

    for (const role of pending) {
      const salt = source.saltFor(role);
      try {
        if (!Buffer.isBuffer(salt)) throw coded(CODES.SCRAM_FORMAT);
        const verifier = buildVerifier(source.passwords[role], { salt, iterations });
        try {
          await withSuppressedTransaction(db, async () => {
            const membership = await rowsOf(db, membershipSql(role));
            assertTargetAuthority(role, membership);
            await db.query(alterRolePasswordStatement(role, verifier));
            const shape = await rowsOf(db, verifierShapeSql(role));
            assertVerifierShape(shape[0]);
          });
        } finally {
          /* The statement string cannot be wiped. It is not logged. */
        }
        completed.push(role);
        log.event({ phase: "role", role, result: "PASS", code: CODES.ROLE_PASS });
      } catch (err) {
        log.event({
          phase: "role",
          role,
          result: "FAIL",
          code: err && err.publicCode ? err.publicCode : CODES.PARTIAL,
        });
        throw partialError(completed, skipped, role, err);
      } finally {
        if (Buffer.isBuffer(salt)) salt.fill(0);
      }
    }
    return {
      result: "PASS",
      completedRoles: completed,
      skippedRoles: skipped,
      independentLogin: "NOT-RUN",
      iterations,
    };
  } finally {
    if (canaryStarted) {
      try {
        await db.query(SQL_CANARY_DROP);
      } catch {
        log.event({ phase: "canary-cleanup", role: CANARY_ROLE, result: "FAIL", code: CODES.INTERNAL });
      }
    }
    zeroBuffers(buffers);
  }
}
