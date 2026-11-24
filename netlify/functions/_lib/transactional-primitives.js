/**
 * Shared transactional primitives for lead rate controls + future Phase B Advisor.
 *
 * COST OPTIMIZATION (Owner M7A authorization — OVERRIDES prior Redis recommendation):
 * - Prefer PostgreSQL atomic UPSERT / UPDATE … RETURNING (see db/migrations/004).
 * - Do NOT introduce Redis, Upstash, vector DB, or dedicated counter hosting without
 *   a demonstrated requirement (multi-region latency or sustained write volume).
 * - Netlify Blobs RMW remains FAIL for atomic counters.
 *
 * This module ships interfaces + an in-memory mock modeling atomic INCR semantics
 * for local tests. No live DB / Redis / AI provisioning.
 */

/**
 * @typedef {object} AtomicCounterStore
 * @property {(key: string, by?: number) => Promise<number>} incr
 * @property {(key: string) => Promise<number>} get
 * @property {(key: string, ttlSeconds: number) => Promise<void>} expire
 * @property {(key: string, value: string|number, ttlSeconds?: number) => Promise<boolean>} setNx
 * @property {(key: string) => Promise<string|null>} getString
 */

class InMemoryAtomicCounterStore {
  constructor() {
    /** @type {Map<string, { n: number, expireAt: number|null }>} */
    this.counters = new Map();
    /** @type {Map<string, { v: string, expireAt: number|null }>} */
    this.strings = new Map();
  }

  _alive(entry) {
    if (!entry) return false;
    if (entry.expireAt != null && entry.expireAt <= Date.now()) return false;
    return true;
  }

  async incr(key, by) {
    const delta = typeof by === "number" ? by : 1;
    let entry = this.counters.get(key);
    if (!this._alive(entry)) {
      entry = { n: 0, expireAt: null };
      this.counters.set(key, entry);
    }
    entry.n += delta;
    return entry.n;
  }

  async get(key) {
    const entry = this.counters.get(key);
    if (!this._alive(entry)) return 0;
    return entry.n;
  }

  async expire(key, ttlSeconds) {
    const entry = this.counters.get(key);
    if (entry) entry.expireAt = Date.now() + ttlSeconds * 1000;
    const s = this.strings.get(key);
    if (s) s.expireAt = Date.now() + ttlSeconds * 1000;
  }

  async setNx(key, value, ttlSeconds) {
    const existing = this.strings.get(key);
    if (this._alive(existing)) return false;
    this.strings.set(key, {
      v: String(value),
      expireAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
    return true;
  }

  async getString(key) {
    const existing = this.strings.get(key);
    if (!this._alive(existing)) return null;
    return existing.v;
  }

  reset() {
    this.counters.clear();
    this.strings.clear();
  }
}

/** Kill switch — env primary; optional store flag secondary. */
async function isKillSwitchOn(store, env) {
  const e = env || process.env;
  if (String(e.ADVISOR_LLM_ENABLED || "").toLowerCase() === "false") return true;
  if (String(e.LEADS_INTAKE_ENABLED || "true").toLowerCase() === "false") return true;
  if (!store) return false;
  const flag = await store.getString("advisor/kill");
  return flag === "1" || flag === "true";
}

/**
 * Issue credit gate: allow at most `maxCredits` successful increments per session key.
 * Production: Postgres atomic_counter_incr (or conditional UPDATE) — not Redis.
 */
async function reserveIssueCredit(store, sessionKey, maxCredits) {
  const key = `credits:${sessionKey}`;
  const n = await store.incr(key, 1);
  if (n > maxCredits) {
    await store.incr(key, -1);
    return { ok: false, remaining: 0, reason: "soft_cap" };
  }
  return { ok: true, remaining: Math.max(0, maxCredits - n), used: n };
}

/**
 * Atomic spend reservation (micros). Pre-debits estimate; caller commits or releases.
 */
async function reserveSpend(store, ceilingKey, estimateMicros, ceilingMicros) {
  const reservedKey = `${ceilingKey}:reserved`;
  const next = await store.incr(reservedKey, estimateMicros);
  if (next > ceilingMicros) {
    await store.incr(reservedKey, -estimateMicros);
    return { ok: false, reason: "ceiling", remaining: Math.max(0, ceilingMicros - (next - estimateMicros)) };
  }
  return {
    ok: true,
    reservationId: `${ceilingKey}:${next}`,
    remaining: Math.max(0, ceilingMicros - next),
  };
}

async function releaseSpend(store, ceilingKey, estimateMicros) {
  await store.incr(`${ceilingKey}:reserved`, -Math.abs(estimateMicros));
}

async function commitSpend(store, ceilingKey, actualMicros, estimateMicros) {
  const delta = actualMicros - estimateMicros;
  if (delta !== 0) await store.incr(`${ceilingKey}:reserved`, delta);
  await store.incr(`${ceilingKey}:spent`, actualMicros);
}

/** Daily / monthly ceiling key helpers (UTC). */
function dailySpendKey(scope, date) {
  const d = date || new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `spend:daily:${scope}:${y}${m}${day}`;
}

function monthlySpendKey(scope, date) {
  const d = date || new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `spend:monthly:${scope}:${y}${m}`;
}

async function checkRateWindow(store, key, limit, windowSeconds) {
  const n = await store.incr(key, 1);
  if (n === 1) await store.expire(key, windowSeconds);
  if (n > limit) {
    return { allowed: false, remaining: 0, count: n };
  }
  return { allowed: true, remaining: Math.max(0, limit - n), count: n };
}

/**
 * Idempotent response cache via SET NX (Postgres idempotency_set_nx / Blobs onlyIfNew).
 * Lead row uniqueness still relies on submission_requests UNIQUE(idempotency_key).
 */
async function rememberIdempotent(store, key, responseJson, ttlSeconds) {
  const created = await store.setNx(key, responseJson, ttlSeconds || 86400);
  if (!created) {
    const prior = await store.getString(key);
    return { created: false, body: prior ? JSON.parse(prior) : null };
  }
  return { created: true, body: JSON.parse(responseJson) };
}

module.exports = {
  InMemoryAtomicCounterStore,
  isKillSwitchOn,
  reserveIssueCredit,
  reserveSpend,
  releaseSpend,
  commitSpend,
  dailySpendKey,
  monthlySpendKey,
  checkRateWindow,
  rememberIdempotent,
};
