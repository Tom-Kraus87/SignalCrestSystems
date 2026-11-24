/**
 * Scheduled / manual notification outbox worker (M7A-R2 B).
 *
 * Does NOT activate live email delivery. Modes: disabled | simulated | operational.
 * Encrypted recovery journal remains separately gated — not implemented here.
 *
 * Wire to a Netlify scheduled function only after Owner/Atlas authorization.
 */

const { createPgQueryClient, resolveDatabaseConfig } = require("./_lib/pg-client");
const { createLeadDependencies, DependencyConfigurationError } = require("./_lib/deps");
const {
  processNotificationOutbox,
  getNotificationFailureStatus,
  resolveNotifyIntegrationMode,
} = require("./_lib/notify-worker");
const { logInfo, logWarn, logError } = require("./_lib/safe-log");

exports.handler = async function notifyWorkerHandler(event) {
  const env = process.env;
  const mode = resolveNotifyIntegrationMode(env);

  if (mode === "disabled") {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: true, mode, skipped: true, reason: "notify_disabled" }),
    };
  }

  const cfg = resolveDatabaseConfig(env);
  if (cfg.mode !== "postgres_required" && !env.DATABASE_URL && !env.DATABASE_INTAKE_URL && !env.DATABASE_NOTIFY_URL) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: false, code: "notify_misconfigured", mode }),
    };
  }

  let client;
  try {
    // Prefer dedicated notify URL when present.
    const notifyEnv = Object.assign({}, env);
    if (env.DATABASE_NOTIFY_URL) {
      notifyEnv.DATABASE_INTAKE_URL = env.DATABASE_NOTIFY_URL;
      notifyEnv.DATABASE_URL = env.DATABASE_NOTIFY_URL;
    }
    client = createPgQueryClient(notifyEnv);
    const deps = createLeadDependencies(notifyEnv, { sqlClient: client });
    const result = await processNotificationOutbox(client, deps.notifier, {
      mode,
      env: notifyEnv,
      workerId: `nf-${Date.now()}`,
    });
    const status = await getNotificationFailureStatus(client);
    logInfo("notify_worker_run", {
      mode: result.mode,
      claimed: result.claimed,
      sent: result.sent,
      failed: result.failed,
    });
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      body: JSON.stringify({
        ok: true,
        mode: result.mode,
        claimed: result.claimed,
        sent: result.sent,
        failed: result.failed,
        ownerStatus: status,
      }),
    };
  } catch (err) {
    if (err instanceof DependencyConfigurationError || (err && err.code)) {
      logWarn("notify_worker_config", { code: err.code || "config" });
    } else {
      logError("notify_worker_failure", { code: "worker_error" });
    }
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: false, code: "notify_worker_unavailable", mode }),
    };
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
