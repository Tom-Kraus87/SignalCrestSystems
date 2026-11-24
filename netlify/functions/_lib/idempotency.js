/**
 * Idempotency store interface for lead intake.
 *
 * Production (preferred — cost optimized):
 * - Postgres UNIQUE(idempotency_key) on submission_requests (transactional insert)
 * - Optional Postgres idempotency_keys SET NX for response cache
 * - Netlify Blobs onlyIfNew acceptable for create-once response cache only
 * Redis is NOT required.
 *
 * Replays must return the prior safe response without double-persisting.
 * Cache expiry must NOT lose the original receipt — repository remains source of truth.
 */

class InMemoryIdempotencyStore {
  /**
   * @param {{ defaultTtlMs?: number }} [options]
   */
  constructor(options) {
    /** @type {Map<string, { status: number, body: object, payloadHash: string|null, createdAt: number, expiresAt: number|null }>} */
    this.map = new Map();
    this.defaultTtlMs =
      options && typeof options.defaultTtlMs === "number" ? options.defaultTtlMs : null;
  }

  /**
   * Attempt to reserve a key. Returns prior record if already present.
   * @param {string} key
   * @param {{ status: number, body: object, payloadHash?: string|null, ttlMs?: number }} record
   * @returns {Promise<{ created: boolean, record: { status: number, body: object, payloadHash: string|null } }>}
   */
  async putIfAbsent(key, record) {
    this._purgeExpired(key);
    const existing = this.map.get(key);
    if (existing) {
      return {
        created: false,
        record: {
          status: existing.status,
          body: existing.body,
          payloadHash: existing.payloadHash || null,
        },
      };
    }
    const ttl =
      typeof record.ttlMs === "number"
        ? record.ttlMs
        : this.defaultTtlMs;
    this.map.set(key, {
      status: record.status,
      body: record.body,
      payloadHash: record.payloadHash || null,
      createdAt: Date.now(),
      expiresAt: ttl != null ? Date.now() + ttl : null,
    });
    return { created: true, record };
  }

  async get(key) {
    this._purgeExpired(key);
    const existing = this.map.get(key);
    if (!existing) return null;
    return {
      status: existing.status,
      body: existing.body,
      payloadHash: existing.payloadHash || null,
    };
  }

  /** Test helper: force-expire a cached key (simulates TTL elapse). */
  expire(key) {
    const existing = this.map.get(key);
    if (existing) existing.expiresAt = Date.now() - 1;
    this._purgeExpired(key);
  }

  _purgeExpired(key) {
    const existing = this.map.get(key);
    if (existing && existing.expiresAt != null && existing.expiresAt <= Date.now()) {
      this.map.delete(key);
    }
  }

  reset() {
    this.map.clear();
  }
}

module.exports = {
  InMemoryIdempotencyStore,
};
