/**
 * POST /api/leads — secure lead intake (Netlify Function).
 *
 * Dependency wiring is environment-aware (see _lib/deps.js):
 * - Explicit mock/test local modes → in-memory adapters
 * - staging/production/postgres → Postgres adapters; FAIL CLOSED if misconfigured
 *
 * Production credentials remain server-only (never shipped to the browser).
 */

const { processLeadRequest } = require("./_lib/process-lead");
const {
  getLeadDependencies,
  createLeadDependencies,
  dependencyFailureResponse,
  DependencyConfigurationError,
  resetCachedDeps,
} = require("./_lib/deps");
const { logError, safeRequestMeta } = require("./_lib/safe-log");

exports.handler = async function leadsHandler(event) {
  let deps;
  try {
    deps = getLeadDependencies(process.env);
  } catch (err) {
    logError(
      "leads_dependency_config_failure",
      safeRequestMeta(event, {
        code: (err && err.code) || "intake_misconfigured",
        status: 503,
      })
    );
    return dependencyFailureResponse();
  }

  return processLeadRequest(event, deps);
};

exports.__test = {
  processLeadRequest,
  createLeadDependencies,
  getLeadDependencies,
  resetCachedDeps,
  DependencyConfigurationError,
};
