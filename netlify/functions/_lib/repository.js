/**
 * Lead persistence repository interface + in-memory mock for local tests.
 *
 * Production: PostgresLeadRepository + insert_lead_bundle (migration 005).
 * Mock is restricted to explicit local/test dependency modes via deps.js.
 */

const crypto = require("node:crypto");
const { leadPayloadHash } = require("./payload-hash");

function newId() {
  return crypto.randomUUID();
}

/**
 * @typedef {object} LeadPersistInput
 * @property {object} lead
 * @property {string} receivedAt ISO server timestamp
 * @property {string|null} ipHash
 * @property {string|null} userAgent
 * @property {string|null} idempotencyKey
 */

/**
 * @typedef {object} LeadPersistResult
 * @property {string} leadId
 * @property {string} consentId
 * @property {string} submissionId
 * @property {string} receivedAt
 * @property {boolean} duplicate
 * @property {string} [outboxId]
 */

class IdempotencyConflictError extends Error {
  constructor(message) {
    super(message || "idempotency_payload_conflict");
    this.name = "IdempotencyConflictError";
    this.code = "IDEMPOTENCY_CONFLICT";
  }
}

class MockLeadRepository {
  constructor(options) {
    this.options = options || {};
    this.leads = [];
    this.consentRecords = [];
    this.submissionRequests = [];
    this.outbox = [];
    /** @type {Map<string, { lead_id: string|null, deleted_at: string, reason: string }>} */
    this.deletionMarkers = new Map();
    this.failNext = false;
    this.failMessage = "persistence_unavailable";
    /** @type {Map<string, Promise<void>>} */
    this._keyLocks = new Map();
  }

  /** Test hook: force next persist to throw. */
  setFailNext(flag, message) {
    this.failNext = Boolean(flag);
    if (message) this.failMessage = message;
  }

  reset() {
    this.leads = [];
    this.consentRecords = [];
    this.submissionRequests = [];
    this.outbox = [];
    this.deletionMarkers.clear();
    this.failNext = false;
    this._keyLocks.clear();
  }

  /**
   * Soft-delete a lead and record an idempotency tombstone (A7).
   * @param {string} leadId
   */
  softDeleteLead(leadId) {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead || lead.deleted_at) return false;
    lead.status = "deleted";
    lead.deleted_at = new Date().toISOString();
    lead.message = "[redacted]";
    lead.advisor_brief = null;
    lead.phone = null;
    lead.company = null;
    const sub = this.submissionRequests.find((s) => s.lead_id === leadId && s.idempotency_key);
    if (sub && sub.idempotency_key) {
      this.deletionMarkers.set(sub.idempotency_key, {
        lead_id: leadId,
        deleted_at: lead.deleted_at,
        reason: "soft_delete",
      });
    }
    return true;
  }

  /**
   * Purge soft-deleted leads, deleting outbox first (A7 FK integrity).
   * @param {number} [days]
   */
  purgeDeletedLeads(days) {
    const cutoffMs = Date.now() - (typeof days === "number" ? days : 365) * 86400000;
    const doomed = this.leads.filter(
      (l) => l.deleted_at && Date.parse(l.deleted_at) < cutoffMs
    );
    const ids = new Set(doomed.map((l) => l.id));
    this.outbox = this.outbox.filter((o) => !ids.has(o.lead_id));
    this.consentRecords = this.consentRecords.filter((c) => !ids.has(c.lead_id));
    for (const s of this.submissionRequests) {
      if (ids.has(s.lead_id)) {
        s.lead_id = null;
        s.consent_id = null;
      }
    }
    this.leads = this.leads.filter((l) => !ids.has(l.id));
    return doomed.length;
  }

  /**
   * Serialize concurrent persist attempts that share an idempotency key.
   * @param {string|null} key
   * @param {() => Promise<LeadPersistResult>} fn
   */
  async _withKeyLock(key, fn) {
    if (!key) return fn();
    const prev = this._keyLocks.get(key) || Promise.resolve();
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const chained = prev.then(() => gate);
    this._keyLocks.set(key, chained);
    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (this._keyLocks.get(key) === chained) this._keyLocks.delete(key);
    }
  }

  /**
   * Transactional persist: submission_requests + consent_records + leads + outbox.
   * Honors unique idempotency_key — identical replay returns prior ids;
   * different payload with same key throws IdempotencyConflictError.
   * @param {LeadPersistInput} input
   * @returns {Promise<LeadPersistResult>}
   */
  async persistLeadTransaction(input) {
    const key = input.idempotencyKey || null;
    return this._withKeyLock(key, async () => {
      if (this.failNext) {
        this.failNext = false;
        const err = new Error(this.failMessage);
        err.code = "PERSISTENCE_FAILURE";
        throw err;
      }

      const payloadHash = input.payloadHash || leadPayloadHash(input.lead);
      if (!payloadHash || String(payloadHash).length !== 64) {
        const err = new Error("idempotency_payload_hash_required");
        err.code = "PAYLOAD_HASH_REQUIRED";
        throw err;
      }

      if (key) {
        if (this.deletionMarkers.has(key)) {
          const err = new Error("idempotency_key_deleted");
          err.code = "IDEMPOTENCY_KEY_DELETED";
          throw err;
        }
        const prior = this.submissionRequests.find(
          (s) => s.idempotency_key === key && s.status === "accepted"
        );
        if (prior) {
          if (prior.payload_hash && prior.payload_hash !== payloadHash) {
            throw new IdempotencyConflictError();
          }
          return {
            leadId: prior.lead_id,
            consentId: prior.consent_id,
            submissionId: prior.id,
            // Durable original receipt timestamp from first persist.
            receivedAt: prior.received_at,
            duplicate: true,
            outboxId: prior.outbox_id || null,
          };
        }
      }

      const leadId = newId();
      const consentId = newId();
      const submissionId = newId();
      const outboxId = newId();
      const receivedAt = input.receivedAt;

      // Simulate atomicity: stage then commit; on mid-flight failure roll back.
      const leadRow = {
        id: leadId,
        form_name: input.lead.formName,
        name: input.lead.name,
        email: input.lead.email,
        company: input.lead.company,
        phone: input.lead.phone,
        service: input.lead.service,
        timeline: input.lead.timeline,
        budget: input.lead.budget,
        message: input.lead.message,
        source: input.lead.source,
        advisor_brief: input.lead.advisorBrief,
        page_path: input.lead.pagePath,
        privacy_version: input.lead.privacyVersion,
        status: "new",
        ip_hash: input.ipHash,
        user_agent: input.userAgent,
        honeypot_hit: input.lead.honeypotHit,
        is_test: input.lead.isTest,
        received_at: receivedAt,
        created_at: receivedAt,
        updated_at: receivedAt,
      };

      const consentRow = {
        id: consentId,
        lead_id: leadId,
        consent_given: true,
        privacy_version: input.lead.privacyVersion,
        consent_text_version: input.lead.privacyVersion,
        captured_at: receivedAt,
        source: input.lead.source,
        form_name: input.lead.formName,
      };

      const outboxRow = {
        id: outboxId,
        lead_id: leadId,
        submission_id: submissionId,
        channel: "owner_email",
        status: "pending",
        // No PII in outbox payload — receipt + form metadata only.
        payload: {
          receipt: submissionId.slice(0, 8),
          formName: input.lead.formName,
          source: input.lead.source,
          receivedAt,
          isTest: Boolean(input.lead.isTest),
        },
        created_at: receivedAt,
      };

      const submissionRow = {
        id: submissionId,
        lead_id: leadId,
        consent_id: consentId,
        outbox_id: outboxId,
        idempotency_key: key,
        payload_hash: payloadHash,
        status: "accepted",
        received_at: receivedAt,
        form_name: input.lead.formName,
      };

      this.leads.push(leadRow);
      this.consentRecords.push(consentRow);
      this.outbox.push(outboxRow);
      this.submissionRequests.push(submissionRow);

      return {
        leadId,
        consentId,
        submissionId,
        receivedAt,
        duplicate: false,
        outboxId,
      };
    });
  }
}

module.exports = {
  MockLeadRepository,
  IdempotencyConflictError,
};
