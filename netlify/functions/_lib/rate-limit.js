/**
 * Rate-limit integration interface for lead intake.
 *
 * COST OPTIMIZATION (Owner M7A authorization):
 * Production: PostgresAtomicCounterStore / PostgresRateLimiter (UPSERT INCR).
 * Local/tests: InMemoryRateLimiter.
 * Do NOT introduce Redis for rate limits without a demonstrated requirement.
 *
 * Netlify Blobs RMW is NOT acceptable for atomic counters (Atlas FAIL).
 */

/**
 * @typedef {object} RateLimitDecision
 * @property {boolean} allowed
 * @property {number} remaining
 * @property {number} resetAtMs
 * @property {string} [reason]
 */

/**
 * @typedef {object} RateLimiter
 * @property {(key: string, limit: number, windowMs: number) => Promise<RateLimitDecision>} check
 */

class InMemoryRateLimiter {
  constructor() {
    /** @type {Map<string, { count: number, resetAtMs: number }>} */
    this.buckets = new Map();
  }

  /**
   * @param {string} key
   * @param {number} limit
   * @param {number} windowMs
   * @returns {Promise<RateLimitDecision>}
   */
  async check(key, limit, windowMs) {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAtMs <= now) {
      bucket = { count: 0, resetAtMs: now + windowMs };
    }
    this.buckets.set(key, bucket);
    if (bucket.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAtMs: bucket.resetAtMs,
        reason: "rate_limited",
      };
    }
    bucket.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, limit - bucket.count),
      resetAtMs: bucket.resetAtMs,
    };
  }

  reset() {
    this.buckets.clear();
  }
}

/** Default lead intake: 8 submissions / hour / key (ip hash or email). */
const DEFAULT_LEAD_LIMIT = 8;
const DEFAULT_LEAD_WINDOW_MS = 60 * 60 * 1000;

/**
 * @param {RateLimiter} limiter
 * @param {{ ipHash?: string, email?: string }} identity
 */
async function enforceLeadRateLimits(limiter, identity) {
  const checks = [];
  if (identity.ipHash) {
    checks.push(
      limiter.check(
        `lead:ip:${identity.ipHash}`,
        DEFAULT_LEAD_LIMIT,
        DEFAULT_LEAD_WINDOW_MS
      )
    );
  }
  if (identity.email) {
    checks.push(
      limiter.check(
        `lead:email:${identity.email}`,
        DEFAULT_LEAD_LIMIT,
        DEFAULT_LEAD_WINDOW_MS
      )
    );
  }
  if (!checks.length) {
    return { allowed: true, remaining: DEFAULT_LEAD_LIMIT, resetAtMs: Date.now() + DEFAULT_LEAD_WINDOW_MS };
  }
  const results = await Promise.all(checks);
  const blocked = results.find((r) => !r.allowed);
  if (blocked) return blocked;
  return results.reduce((a, b) =>
    a.remaining <= b.remaining ? a : b
  );
}

module.exports = {
  InMemoryRateLimiter,
  DEFAULT_LEAD_LIMIT,
  DEFAULT_LEAD_WINDOW_MS,
  enforceLeadRateLimits,
};
