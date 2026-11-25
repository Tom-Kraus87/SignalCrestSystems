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
  // Live provider delivery stays disabled. Only the simulated mode may claim jobs.
  if (mode !== "simulated") {
    return {
      mode,
      claimed: 0,
      sent: 0,
      failed: 0,
      skipped: true,
      reason: mode === "disabled" ? "notify_disabled" : "live_delivery_disabled",
    };
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
    // Simulated mode does not call a provider and does not forward customer fields.
    let acknowledged = false;
    try {
      // Simulated completion only. Operational delivery is refused before claims.
      acknowledged = await acknowledgeOutbox(sqlClient, row, workerId, true, null);
      if (acknowledged) {
        sent += 1;
        logInfo("notify_worker_simulated", { outboxId: String(row.id).slice(0, 8) });
      }
    } catch {
      acknowledged = false;
      logWarn("notify_worker_complete_failed", { outboxId: String(row.id).slice(0, 8) });
    }
    if (!acknowledged) failed += 1;
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
 * Acknowledge a claim only when the RPC returns true.
 * A false acknowledgement or a thrown error is a failure. The caller must
 * not treat it as a successful delivery.
 * @param {{ query: Function }} sqlClient
 * @param {{ id: string, claim_token?: string }} row
 * @param {string} workerId
 * @param {boolean} ok
 * @param {string|null} errorText
 */
async function acknowledgeOutbox(sqlClient, row, workerId, ok, errorText) {
  if (!row || !row.id || !row.claim_token) return false;
  const { rows } = await sqlClient.query(
    "SELECT public.complete_notification_outbox($1, $2, $3, $4, $5) AS acknowledged",
    [row.id, workerId, row.claim_token, ok, errorText]
  );
  return Boolean(rows && rows[0] && rows[0].acknowledged === true);
}

/**
 * Owner monitoring aggregate. EXECUTE is granted to scs_owner_admin only.
 * The notify worker must not call this with worker credentials.
 * @param {{ query: Function }} sqlClient
 */
async function getNotificationFailureStatus(sqlClient) {
  if (!sqlClient || typeof sqlClient.query !== "function") {
    return { available: false, pending: 0, failed: 0, dead: 0 };
  }
  const { rows } = await sqlClient.query(
    "SELECT pending_count, failed_count, dead_count FROM public.notification_outbox_status_counts()"
  );
  const row = (rows && rows[0]) || {};
  return {
    available: true,
    pending: Number(row.pending_count) || 0,
    failed: Number(row.failed_count) || 0,
    dead: Number(row.dead_count) || 0,
  };
}

module.exports = {
  resolveNotifyIntegrationMode,
  processNotificationOutbox,
  getNotificationFailureStatus,
};
