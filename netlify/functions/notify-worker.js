/**
 * Authenticated notification outbox worker (M7A-R4).
 *
 * Unauthenticated HTTP calls fail before any database access.
 * Scheduler headers supplied by the visitor are not trusted.
 * Live notification delivery stays disabled. Simulated mode is the only
 * path that claims jobs, and only after a server-side bearer secret matches.
 */

const { authorizeNotifyWorkerInvocation } = require("./_lib/worker-auth");
const { createPgQueryClient } = require("./_lib/pg-client");
const {
  processNotificationOutbox,
  resolveNotifyIntegrationMode,
} = require("./_lib/notify-worker");
const { logInfo, logWarn, logError } = require("./_lib/safe-log");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async function notifyWorkerHandler(event) {
  const env = process.env;
  const authz = authorizeNotifyWorkerInvocation(event, env);
  if (!authz.ok) {
    return json(authz.statusCode, { ok: false, code: authz.code });
  }

  const mode = resolveNotifyIntegrationMode(env);
  if (mode !== "simulated") {
    return json(200, {
      ok: true,
      mode,
      skipped: true,
      reason: mode === "disabled" ? "notify_disabled" : "live_delivery_disabled",
    });
  }

  let client;
  try {
    const notifyEnv = Object.assign({}, env);
    if (env.DATABASE_NOTIFY_URL) {
      notifyEnv.DATABASE_INTAKE_URL = env.DATABASE_NOTIFY_URL;
      notifyEnv.DATABASE_URL = env.DATABASE_NOTIFY_URL;
    }
    client = createPgQueryClient(notifyEnv, { expectedRole: "scs_notify_worker" });
    const result = await processNotificationOutbox(client, null, {
      mode,
      env: notifyEnv,
      workerId: `nf-${Date.now()}`,
    });
    logInfo("notify_worker_run", {
      mode: result.mode,
      claimed: result.claimed,
      sent: result.sent,
      failed: result.failed,
    });
    return json(200, {
      ok: true,
      mode: result.mode,
      claimed: result.claimed,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
    });
  } catch (err) {
    if (err && err.code) {
      logWarn("notify_worker_config", { code: err.code });
    } else {
      logError("notify_worker_failure", { code: "worker_error" });
    }
    return json(503, { ok: false, code: "notify_worker_unavailable", mode });
  } finally {
    if (client && typeof client.end === "function") {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
};
