/**
 * Email notification interface — provider-independent.
 * Do NOT provision Resend/Postmark/SES in this pass; local mock only.
 */

/**
 * @typedef {object} LeadNotifyPayload
 * @property {string} receipt
 * @property {string} formName
 * @property {string} source
 * @property {string} receivedAt
 * @property {boolean} [isTest]
 */

/**
 * @typedef {object} EmailNotifier
 * @property {(payload: LeadNotifyPayload) => Promise<{ sent: boolean, skipped?: boolean, reason?: string }>} notifyLeadAccepted
 */

/** No-op notifier for local/dev until Owner authorizes a vendor. */
class NoopEmailNotifier {
  async notifyLeadAccepted() {
    return { sent: false, skipped: true, reason: "notifier_unprovisioned" };
  }
}

/** In-memory capture for local tests (never sends mail). */
class MockEmailNotifier {
  constructor() {
    this.sent = [];
  }

  async notifyLeadAccepted(payload) {
    this.sent.push({
      receipt: payload.receipt,
      formName: payload.formName,
      source: payload.source,
      receivedAt: payload.receivedAt,
      isTest: Boolean(payload.isTest),
      // Never store email/name/message here — intake already holds PII in repository.
    });
    return { sent: true, skipped: false };
  }

  reset() {
    this.sent = [];
  }
}

module.exports = {
  NoopEmailNotifier,
  MockEmailNotifier,
};
