/**
 * Production Postgres adapters (Supabase service-role / DATABASE_URL).
 *
 * COST OPTIMIZATION: PostgreSQL transactional UPSERT for counters, idempotency,
 * consent, leads, and notification outbox. Redis is NOT required.
 */

const { leadPayloadHash } = require("./payload-hash");
const { IdempotencyConflictError } = require("./repository");

/**
 * Production-shaped counter store.
 */
class PostgresAtomicCounterStore {
  /**
   * @param {{ query: Function }} client  SQL client with query(text, params)
   */
  constructor(client) {
    if (!client || typeof client.query !== "function") {
      throw new Error("PostgresAtomicCounterStore requires a SQL client.");
    }
    this.client = client;
  }

  async incr(key, by) {
    const delta = typeof by === "number" ? by : 1;
    const { rows } = await this.client.query(
      "SELECT public.atomic_counter_incr($1, $2) AS n",
      [key, delta]
    );
    return Number(rows[0].n);
  }

  async get(key) {
    const { rows } = await this.client.query(
      "SELECT public.atomic_counter_get($1) AS n",
      [key]
    );
    return Number(rows[0].n);
  }

  async expire(key, ttlSeconds) {
    await this.client.query("SELECT public.atomic_counter_expire($1, $2)", [
      key,
      ttlSeconds,
    ]);
  }

  async setNx(key, value, ttlSeconds) {
    const { rows } = await this.client.query(
      "SELECT public.idempotency_set_nx($1, $2, $3) AS created",
      [key, String(value), ttlSeconds == null ? 86400 : ttlSeconds]
    );
    return Boolean(rows[0].created);
  }

  async getString(key) {
    const { rows } = await this.client.query(
      `SELECT response_json FROM idempotency_keys
       WHERE idem_key = $1
         AND (expires_at IS NULL OR expires_at > now())`,
      [key]
    );
    return rows[0] ? rows[0].response_json : null;
  }
}

/**
 * Lead repository backed by insert_lead_bundle RPC (migration 005).
 */
class PostgresLeadRepository {
  /**
   * @param {{ query: Function }} client
   */
  constructor(client) {
    if (!client || typeof client.query !== "function") {
      throw new Error("PostgresLeadRepository requires a SQL client.");
    }
    this.client = client;
  }

  async persistLeadTransaction(input) {
    const lead = input.lead;
    const payloadHash = leadPayloadHash(lead);
    try {
      const { rows } = await this.client.query(
        `SELECT * FROM public.insert_lead_bundle(
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
        )`,
        [
          lead.formName,
          lead.name,
          lead.email,
          lead.company,
          lead.phone,
          lead.service,
          lead.timeline,
          lead.budget,
          lead.message,
          lead.source,
          lead.advisorBrief,
          lead.pagePath,
          lead.privacyVersion,
          input.ipHash,
          input.userAgent,
          Boolean(lead.isTest),
          input.idempotencyKey,
          input.receivedAt,
          payloadHash,
        ]
      );
      const row = rows[0];
      if (!row || !row.submission_id || !row.received_at) {
        const err = new Error("persist_unconfirmed");
        err.code = "PERSISTENCE_FAILURE";
        throw err;
      }
      // Prefer DB-persisted received_at (original receipt survives cache expiry).
      const persistedReceivedAt =
        row.received_at instanceof Date
          ? row.received_at.toISOString()
          : String(row.received_at);
      return {
        leadId: row.lead_id,
        consentId: row.consent_id,
        submissionId: row.submission_id,
        receivedAt: persistedReceivedAt,
        duplicate: Boolean(row.duplicate),
        outboxId: row.outbox_id || null,
      };
    } catch (err) {
      if (
        err &&
        (err.code === "IDEMPOTENCY_CONFLICT" ||
          err.message === "idempotency_payload_conflict" ||
          (err.message && err.message.includes("idempotency_payload_conflict")))
      ) {
        throw new IdempotencyConflictError();
      }
      if (
        err &&
        (err.message === "idempotency_key_deleted" ||
          (err.message && err.message.includes("idempotency_key_deleted")))
      ) {
        const deleted = new Error("idempotency_key_deleted");
        deleted.code = "IDEMPOTENCY_KEY_DELETED";
        throw deleted;
      }
      throw err;
    }
  }
}

/**
 * Rate limiter backed by Postgres atomic_counter_incr.
 */
class PostgresRateLimiter {
  /**
   * @param {PostgresAtomicCounterStore|import('./transactional-primitives').InMemoryAtomicCounterStore} store
   */
  constructor(store) {
    this.store = store;
  }

  async check(key, limit, windowMs) {
    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
    const n = await this.store.incr(key, 1);
    if (n === 1) await this.store.expire(key, windowSeconds);
    const resetAtMs = Date.now() + windowMs;
    if (n > limit) {
      return { allowed: false, remaining: 0, resetAtMs, reason: "rate_limited" };
    }
    return {
      allowed: true,
      remaining: Math.max(0, limit - n),
      resetAtMs,
    };
  }
}

/**
 * Response-cache idempotency store backed by Postgres idempotency_keys.
 * Primary uniqueness still lives in submission_requests via insert_lead_bundle.
 */
class PostgresIdempotencyStore {
  /**
   * @param {{ query: Function }} client
   */
  constructor(client) {
    if (!client || typeof client.query !== "function") {
      throw new Error("PostgresIdempotencyStore requires a SQL client.");
    }
    this.client = client;
  }

  async putIfAbsent(key, record) {
    const payload = JSON.stringify(record);
    const { rows } = await this.client.query(
      "SELECT public.idempotency_set_nx($1, $2, $3) AS created",
      [key, payload, 86400]
    );
    const created = Boolean(rows[0] && rows[0].created);
    if (!created) {
      const prior = await this.get(key);
      return { created: false, record: prior || record };
    }
    return { created: true, record };
  }

  async get(key) {
    const { rows } = await this.client.query(
      `SELECT response_json FROM idempotency_keys
       WHERE idem_key = $1
         AND (expires_at IS NULL OR expires_at > now())`,
      [key]
    );
    if (!rows[0]) return null;
    try {
      return JSON.parse(rows[0].response_json);
    } catch {
      return null;
    }
  }
}

module.exports = {
  PostgresAtomicCounterStore,
  PostgresLeadRepository,
  PostgresRateLimiter,
  PostgresIdempotencyStore,
};
