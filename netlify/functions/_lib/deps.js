/**
 * Environment-aware dependency factory for lead intake.
 *
 * Rules:
 * - Mock / in-memory adapters ONLY when SCS_DEPENDENCY_MODE=mock|test or
 *   SCS_ALLOW_MOCK_LEADS=true in non-production-like environments.
 * - staging/production/postgres modes FAIL CLOSED without valid DATABASE_URL.
 * - Never return a successful submission path that cannot persist.
 */

const { MockLeadRepository } = require("./repository");
const { InMemoryRateLimiter } = require("./rate-limit");
const { InMemoryIdempotencyStore } = require("./idempotency");
const { InMemoryAtomicCounterStore } = require("./transactional-primitives");
const { NoopEmailNotifier, MockEmailNotifier } = require("./notify");
const { HoneypotSpamProtector, TurnstileSpamProtector } = require("./spam-protection");
const {
  PostgresAtomicCounterStore,
  PostgresLeadRepository,
  PostgresRateLimiter,
  PostgresIdempotencyStore,
} = require("./postgres-adapters");
const { resolveDatabaseConfig, createPgQueryClient } = require("./pg-client");

class DependencyConfigurationError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "DependencyConfigurationError";
    this.code = code || "DEPENDENCY_CONFIG_INVALID";
  }
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {'mock'|'postgres'}
 */
function resolveDependencyMode(env) {
  const e = env || process.env;
  const cfg = resolveDatabaseConfig(e);
  if (cfg.mode === "postgres_required") return "postgres";
  const forced = String(e.SCS_DEPENDENCY_MODE || "").toLowerCase();
  if (forced === "postgres" || forced === "production") return "postgres";
  return "mock";
}

/**
 * Build runtime dependencies. Throws DependencyConfigurationError when
 * production-like config is incomplete (fail closed).
 * @param {NodeJS.ProcessEnv} [env]
 * @param {{ sqlClient?: { query: Function }, forceMock?: boolean }} [options]
 */
function createLeadDependencies(env, options) {
  const e = env || process.env;
  const opts = options || {};

  if (opts.forceMock) {
    return buildMockDeps(e, opts);
  }

  const mode = resolveDependencyMode(e);
  if (mode === "mock") {
    return buildMockDeps(e, opts);
  }

  // Postgres path — fail closed on missing/invalid config.
  let client = opts.sqlClient || null;
  if (!client) {
    try {
      client = createPgQueryClient(e);
    } catch (err) {
      throw new DependencyConfigurationError(
        "Lead intake database configuration is missing or invalid.",
        err.code || "DATABASE_CONFIG_MISSING"
      );
    }
  }

  const counterStore = new PostgresAtomicCounterStore(client);
  const repository = new PostgresLeadRepository(client);
  const rateLimiter = new PostgresRateLimiter(counterStore);
  const idempotency = new PostgresIdempotencyStore(client);

  return {
    mode: "postgres",
    repository,
    rateLimiter,
    idempotency,
    counterStore,
    notifier: buildNotifier(e),
    spamProtector: buildSpamProtector(e),
    sqlClient: client,
    env: e,
  };
}

function buildMockDeps(e, opts) {
  return {
    mode: "mock",
    repository: (opts && opts.repository) || new MockLeadRepository(),
    rateLimiter: (opts && opts.rateLimiter) || new InMemoryRateLimiter(),
    idempotency: (opts && opts.idempotency) || new InMemoryIdempotencyStore(),
    counterStore: (opts && opts.counterStore) || new InMemoryAtomicCounterStore(),
    notifier:
      (opts && opts.notifier) ||
      (String(e.SCS_MOCK_NOTIFIER || "").toLowerCase() === "true"
        ? new MockEmailNotifier()
        : new NoopEmailNotifier()),
    spamProtector: (opts && opts.spamProtector) || buildSpamProtector(e),
    sqlClient: null,
    env: e,
  };
}

function buildNotifier(e) {
  const mode = String(e.EMAIL_NOTIFY_MODE || "").toLowerCase().trim();
  const enabled = String(e.EMAIL_NOTIFY_ENABLED || "").toLowerCase() === "true";
  // Explicit separation: disabled | simulated | operational (B).
  // Operational still uses Noop until a provider adapter is authorized — never auto-activate.
  if (!enabled && mode !== "simulated" && mode !== "operational" && mode !== "live") {
    return new NoopEmailNotifier();
  }
  if (mode === "simulated" || mode === "simulate") {
    return new MockEmailNotifier();
  }
  // Provider wiring reserved — remain Noop until hosted vendor verification.
  // Never log API keys. Resend/Postmark adapters stay unprovisioned.
  return new NoopEmailNotifier();
}

function buildSpamProtector(e) {
  const required =
    String(e.TURNSTILE_REQUIRED || "").toLowerCase() === "true" ||
    String(e.TURNSTILE_REQUIRED || "").toLowerCase() === "1";
  if (required) {
    try {
      return new TurnstileSpamProtector({
        secretKey: e.TURNSTILE_SECRET_KEY || "REPLACE_REQUIRED_BUT_MISSING",
        requireToken: true,
      });
    } catch {
      // Fail closed: required Turnstile with broken config → reject-all protector.
      return {
        async evaluate() {
          return { action: "reject", reason: "turnstile_required_misconfigured" };
        },
      };
    }
  }
  if (e.TURNSTILE_SECRET_KEY && String(e.TURNSTILE_SECRET_KEY).indexOf("REPLACE_") !== 0) {
    try {
      return new TurnstileSpamProtector({
        secretKey: e.TURNSTILE_SECRET_KEY,
        requireToken: true,
      });
    } catch {
      return new HoneypotSpamProtector();
    }
  }
  return new HoneypotSpamProtector();
}

/**
 * Cached module-scope deps for Netlify cold-start reuse.
 * Rebuilt when env fingerprint changes (tests can call resetCachedDeps).
 */
let cachedDeps = null;
let cachedFingerprint = null;

function envFingerprint(env) {
  const e = env || process.env;
  return [
    e.SCS_DEPENDENCY_MODE,
    e.SCS_ENV,
    e.SCS_ALLOW_MOCK_LEADS,
    e.NODE_ENV,
    Boolean(e.DATABASE_URL),
    Boolean(e.SUPABASE_SERVICE_ROLE_KEY),
  ].join("|");
}

function getLeadDependencies(env) {
  const e = env || process.env;
  const fp = envFingerprint(e);
  if (cachedDeps && cachedFingerprint === fp) return cachedDeps;
  cachedDeps = createLeadDependencies(e);
  cachedFingerprint = fp;
  return cachedDeps;
}

function resetCachedDeps() {
  cachedDeps = null;
  cachedFingerprint = null;
}

/**
 * Fail-closed handler wrapper result when deps cannot be constructed.
 */
function dependencyFailureResponse() {
  return {
    statusCode: 503,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
    body: JSON.stringify({
      ok: false,
      code: "intake_misconfigured",
      message: "Lead intake is temporarily unavailable.",
    }),
  };
}

module.exports = {
  DependencyConfigurationError,
  resolveDependencyMode,
  createLeadDependencies,
  getLeadDependencies,
  resetCachedDeps,
  dependencyFailureResponse,
};
