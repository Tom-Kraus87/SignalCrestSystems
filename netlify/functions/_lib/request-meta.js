/**
 * Trusted request metadata helpers for lead intake (M7A-R2 A6).
 *
 * Netlify documents `x-nf-client-connection-ip` as the platform connection IP.
 * Arbitrary visitor-controlled `X-Forwarded-For` / `X-Real-IP` are NOT trusted
 * for rate limits or persistence hashing on hosted runtimes.
 */

/**
 * @param {object} event
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string|null}
 */
function clientIpFromEvent(event, env) {
  const headers = (event && event.headers) || {};
  const e = env || process.env;
  const lower = {};
  for (const [k, v] of Object.entries(headers)) {
    lower[String(k).toLowerCase()] = v;
  }

  // Netlify trusted connection IP (preferred).
  const nf =
    lower["x-nf-client-connection-ip"] ||
    lower["client-ip"] ||
    null;
  if (nf && String(nf).trim()) {
    return String(nf).trim().slice(0, 64);
  }

  // Local / non-hosted fallback only — never prefer visitor XFF on Netlify.
  const hosted =
    Boolean(e.NETLIFY || e.CONTEXT || e.Netlify_CONTEXT) ||
    String(e.SCS_ENV || "").toLowerCase() === "staging" ||
    String(e.SCS_ENV || "").toLowerCase() === "production";

  if (hosted) {
    return null;
  }

  // Local mock/dev: allow XFF for harnesses that inject it.
  const xf = lower["x-forwarded-for"] || "";
  if (xf) return String(xf).split(",")[0].trim().slice(0, 64) || null;
  return null;
}

/**
 * Client-supplied isTest must NOT change persistence/notification/retention
 * unless the server explicitly allows it in non-prod-like environments.
 * @param {boolean} clientFlag
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {boolean}
 */
function resolveIsTestFlag(clientFlag, env) {
  const e = env || process.env;
  const scsEnv = String(e.SCS_ENV || "").toLowerCase();
  const nodeEnv = String(e.NODE_ENV || "").toLowerCase();
  const ctx = String(e.CONTEXT || e.Netlify_CONTEXT || "").toLowerCase();
  const prodLike =
    scsEnv === "production" ||
    scsEnv === "prod" ||
    scsEnv === "staging" ||
    nodeEnv === "production" ||
    ctx === "production" ||
    ctx === "deploy-preview" ||
    ctx === "branch-deploy";

  if (prodLike) return false;
  if (String(e.SCS_ALLOW_CLIENT_TEST_FLAG || "").toLowerCase() !== "true") {
    return false;
  }
  return Boolean(clientFlag);
}

module.exports = {
  clientIpFromEvent,
  resolveIsTestFlag,
};
