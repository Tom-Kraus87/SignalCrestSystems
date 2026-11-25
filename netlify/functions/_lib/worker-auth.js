/**
 * Server-only authentication for the notification worker.
 *
 * Visitor-supplied scheduler headers (x-nf-scheduled, x-netlify-event, and
 * similar) are ignored. Netlify does not strip those headers from public
 * HTTP calls, so they are not proof of a platform schedule.
 *
 * Invocation requires Authorization: Bearer <NOTIFY_WORKER_INVOKE_SECRET>.
 * The secret must be a non-placeholder server-side value of at least 32
 * characters. Missing or invalid configuration fails closed.
 */

const crypto = require("node:crypto");

/**
 * @param {string|undefined|null} secret
 */
function workerSecretAcceptable(secret) {
  const value = secret == null ? "" : String(secret).trim();
  if (value.length < 32) return false;
  return !/replace_|your_|change_me|placeholder|example|changeme/i.test(value);
}

/**
 * @param {string} presented
 * @param {string} secret
 */
function timingSafeEqualString(presented, secret) {
  const left = Buffer.from(String(presented));
  const right = Buffer.from(String(secret));
  if (left.length !== right.length) {
    crypto.timingSafeEqual(left, left);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

/**
 * @param {object} event
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ ok: true } | { ok: false, statusCode: number, code: string }}
 */
function authorizeNotifyWorkerInvocation(event, env) {
  const e = env || process.env;
  const secret = e.NOTIFY_WORKER_INVOKE_SECRET;
  if (!workerSecretAcceptable(secret)) {
    return { ok: false, statusCode: 401, code: "notify_invoke_unconfigured" };
  }

  const headers = (event && event.headers) || {};
  let authorization = "";
  for (const [name, value] of Object.entries(headers)) {
    if (String(name).toLowerCase() === "authorization") {
      authorization = String(value || "");
      break;
    }
  }
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const presented = match ? match[1].trim() : "";
  if (!presented || !timingSafeEqualString(presented, String(secret).trim())) {
    return { ok: false, statusCode: 401, code: "notify_invoke_unauthorized" };
  }
  return { ok: true };
}

module.exports = {
  authorizeNotifyWorkerInvocation,
  workerSecretAcceptable,
};
