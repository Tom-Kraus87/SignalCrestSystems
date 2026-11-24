/**
 * Durable notification outbox worker (M7A-R2 B).
 *
 * Modes:
 * - disabled: no delivery attempts
 * - simulated: claims + marks complete without external provider
 * - operational: claims + invokes notifier (provider still unprovisioned until authorized)
 *
 * Atomic claims / leases / retries live in Postgres RPCs (migration 006).
 * Encrypted recovery journal is separately gated — NOT implemented here.
 */

const { logInfo, logWarn } = require("./safe-log");

/**
 * @typedef {'disabled'|'simulated'|'operational'} NotifyIntegrationMode
 */

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {NotifyIntegrationMode}
 */
function resolveNotifyIntegrationMode(env) {
  const e = env || process.env;
  const raw = String(e.EMAIL_NOTIFY_MODE || "").toLowerCase().trim();
  if (raw === "simulated" || raw === "simulate") return "simulated";
  if (raw === "operational" || raw === "live") return "operational";
  if (String(e.EMAIL_NOTIFY_ENABLED || "").toLowerCase() === "true") {
    // Enabled without explicit mode → simulated until provider verified.
    return "simulated";
  }
  return "disabled";
}

/**
 * Process pending outbox rows with atomic claim + complete.
 * @param {{ query: Function }} sqlClient
 * @param {{ notifyLeadAccepted: Function }} notifier
 * @param {{ workerId?: string, limit?: number, leaseSeconds?: number, mode?: NotifyIntegrationMode, env?: NodeJS.ProcessEnv }} [options]
 */
async function processNotificationOutbox(sqlClient, notifier, options) {
  const opts = options || {};
  const env = opts.env || process.env;
  const mode = opts.mode || resolveNotifyIntegrationMode(env);
  if (mode === "disabled") {
    return { mode, claimed: 0, sent: 0, failed: 0, skipped: true };
  }
  if (!sqlClient || typeof sqlClient.query !== "function") {
    return { mode, claimed: 0, sent: 0, failed: 0, skipped: true, reason: "no_sql_client" };
  }

  const workerId = opts.workerId || `worker-${process.pid}-${Date.now()}`;
  const limit = opts.limit || 10;
  const leaseSeconds = opts.leaseSeconds || 60;

  const { rows } = await sqlClient.query(
    "SELECT * FROM public.claim_notification_outbox($1, $2, $3)",
    [workerId, limit, leaseSeconds]
  );

  let sent = 0;
  let failed = 0;

  for (const row of rows || []) {
    const payload = row.payload_json || row.payload || {};
    // Minimal content — receipt + form metadata only (no customer PII).
    const envelope = {
      receipt: payload.receipt || String(row.submission_id || "").slice(0, 8),
      formName: payload.formName || null,
      source: payload.source || null,
      receivedAt: payload.receivedAt || null,
      isTest: Boolean(payload.isTest),
      outboxId: row.id,
    };

    try {
      if (mode === "simulated") {
        // Mark complete without external provider call.
        await sqlClient.query(
          "SELECT public.complete_notification_outbox($1, $2, $3, $4)",
          [row.id, workerId, true, null]
        );
        sent += 1;
        logInfo("notify_worker_simulated", { outboxId: String(row.id).slice(0, 8) });
        continue;
      }

      // operational — invoke notifier; still fail-closed on provider errors
      if (!notifier || typeof notifier.notifyLeadAccepted !== "function") {
        await sqlClient.query(
          "SELECT public.complete_notification_outbox($1, $2, $3, $4)",
          [row.id, workerId, false, "notifier_unavailable"]
        );
        failed += 1;
        continue;
      }

      const result = await notifier.notifyLeadAccepted(envelope);
      const ok = result && result.sent === true && !result.skipped;
      await sqlClient.query(
        "SELECT public.complete_notification_outbox($1, $2, $3, $4)",
        [row.id, workerId, ok, ok ? null : (result && result.reason) || "delivery_failed"]
      );
      if (ok) sent += 1;
      else failed += 1;
    } catch (err) {
      failed += 1;
      try {
        await sqlClient.query(
          "SELECT public.complete_notification_outbox($1, $2, $3, $4)",
          [row.id, workerId, false, "worker_exception"]
        );
      } catch {
        logWarn("notify_worker_complete_failed", { outboxId: String(row.id).slice(0, 8) });
      }
    }
  }

  return {
    mode,
    claimed: (rows || []).length,
    sent,
    failed,
    skipped: false,
  };
}

/**
 * Owner-visible failure summary (non-PII).
 * @param {{ query: Function }} sqlClient
 */
async function getNotificationFailureStatus(sqlClient) {
  if (!sqlClient || typeof sqlClient.query !== "function") {
    return { available: false, pending: 0, failed: 0, dead: 0 };
  }
  const { rows } = await sqlClient.query(
    `SELECT status, COUNT(*)::int AS n
     FROM public.notification_outbox
     WHERE status IN ('pending', 'failed', 'dead')
     GROUP BY status`
  );
  const map = { pending: 0, failed: 0, dead: 0 };
  for (const r of rows || []) {
    map[r.status] = Number(r.n) || 0;
  }
  return { available: true, ...map };
}

module.exports = {
  resolveNotifyIntegrationMode,
  processNotificationOutbox,
  getNotificationFailureStatus,
};
