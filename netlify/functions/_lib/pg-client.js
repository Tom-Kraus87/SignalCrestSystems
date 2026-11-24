/**
 * Server-only Postgres client factory (Supabase Postgres / DATABASE_URL).
 * Credentials must never be exposed to the browser bundle.
 *
 * TLS policy (M7A-R2):
 * - Production-like configs REQUIRE certificate + hostname verification.
 * - rejectUnauthorized:false is FORBIDDEN in prod-like modes.
 * - Trusted CA may be supplied via DATABASE_SSL_CA / PGSSLROOTCERT.
 * - Connection-string sslmode values that disable verification are rejected.
 */

const fs = require("node:fs");
const tls = require("node:tls");

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ mode: 'mock_allowed'|'postgres_required', databaseUrl: string|null, missing: string[], isProdLike: boolean }}
 */
function resolveDatabaseConfig(env) {
  const e = env || process.env;
  const mode = String(e.SCS_DEPENDENCY_MODE || "").toLowerCase().trim();
  const scsEnv = String(e.SCS_ENV || "").toLowerCase();
  const nodeEnv = String(e.NODE_ENV || "").toLowerCase();
  const netlifyContext = String(e.CONTEXT || e.Netlify_CONTEXT || "").toLowerCase();
  const explicitMock =
    mode === "mock" ||
    mode === "test" ||
    String(e.SCS_ALLOW_MOCK_LEADS || "").toLowerCase() === "true";

  const databaseUrl =
    (e.DATABASE_URL && String(e.DATABASE_URL).trim()) ||
    (e.SUPABASE_DB_URL && String(e.SUPABASE_DB_URL).trim()) ||
    null;

  const missing = [];
  if (!databaseUrl) missing.push("DATABASE_URL");

  const isProdLike =
    scsEnv === "production" ||
    scsEnv === "prod" ||
    scsEnv === "staging" ||
    nodeEnv === "production" ||
    netlifyContext === "production" ||
    netlifyContext === "deploy-preview" ||
    netlifyContext === "branch-deploy" ||
    mode === "postgres" ||
    mode === "production";

  // Explicit mock is never honored in prod-like / hosted contexts — fail closed to postgres.
  if (explicitMock && !isProdLike) {
    return { mode: "mock_allowed", databaseUrl, missing, isProdLike: false };
  }
  if (isProdLike || mode === "postgres") {
    return {
      mode: "postgres_required",
      databaseUrl,
      missing: databaseUrl ? [] : ["DATABASE_URL"],
      isProdLike: true,
    };
  }
  return { mode: "mock_allowed", databaseUrl, missing, isProdLike: false };
}

/**
 * Detect connection-string options that silently disable TLS verification.
 * @param {string} connectionString
 * @returns {{ insecure: boolean, reason: string|null, sslmode: string|null }}
 */
function inspectConnectionStringSsl(connectionString) {
  const raw = String(connectionString || "");
  let sslmode = null;
  try {
    const u = new URL(raw.replace(/^postgresql:/i, "postgres:"));
    sslmode = (u.searchParams.get("sslmode") || u.searchParams.get("ssl-mode") || "").toLowerCase() || null;
  } catch {
    const m = raw.match(/[?&]sslmode=([^&]+)/i);
    sslmode = m ? decodeURIComponent(m[1]).toLowerCase() : null;
  }

  const insecureModes = new Set([
    "disable",
    "allow",
    "prefer",
    "require", // libpq "require" does NOT verify CA/hostname
    "no-verify",
    "verify-ca", // verify-ca alone is insufficient without hostname check for our policy;
  ]);
  // Accept only verify-full (or absent + our explicit ssl config).
  if (sslmode === "disable" || sslmode === "allow" || sslmode === "prefer" || sslmode === "no-verify") {
    return { insecure: true, reason: `sslmode_${sslmode}_forbidden`, sslmode };
  }
  if (sslmode === "require") {
    // Treated as insecure for verification purposes — we override with verified TLS
    // only when our factory builds ssl.rejectUnauthorized=true. Flag for callers.
    return { insecure: true, reason: "sslmode_require_no_verify", sslmode };
  }
  return { insecure: false, reason: null, sslmode };
}

/**
 * Build verified TLS options. Fails closed when verification cannot be guaranteed.
 * @param {NodeJS.ProcessEnv} env
 * @param {{ isProdLike: boolean, databaseUrl: string }} cfg
 * @returns {false|{ rejectUnauthorized: true, checkServerIdentity: Function, ca?: string|Buffer|string[] }}
 */
function buildSslOptions(env, cfg) {
  const e = env || process.env;
  const pgssl = String(e.PGSSLMODE || "").toLowerCase().trim();
  const explicitDisable =
    pgssl === "disable" ||
    String(e.DATABASE_SSL || "").toLowerCase() === "disable" ||
    String(e.DATABASE_SSL_REJECT_UNAUTHORIZED || "").toLowerCase() === "false";

  if (explicitDisable) {
    if (cfg.isProdLike) {
      const err = new Error("database_ssl_verification_required");
      err.code = "DATABASE_SSL_INSECURE";
      throw err;
    }
    // Local non-prod only: allow plaintext when explicitly requested.
    return false;
  }

  const connSsl = inspectConnectionStringSsl(cfg.databaseUrl);
  if (connSsl.sslmode === "disable" || connSsl.sslmode === "allow" || connSsl.sslmode === "prefer" || connSsl.sslmode === "no-verify") {
    const err = new Error(connSsl.reason || "database_ssl_insecure_connection_string");
    err.code = "DATABASE_SSL_INSECURE";
    throw err;
  }
  // sslmode=require in the URL is ignored for verification — we always verify in prod-like.
  if (connSsl.sslmode === "require" && cfg.isProdLike) {
    // Continue with verified TLS (do not honor require-as-no-verify).
  }

  /** @type {{ rejectUnauthorized: true, checkServerIdentity: typeof tls.checkServerIdentity, ca?: Buffer|string|string[] }} */
  const ssl = {
    rejectUnauthorized: true,
    checkServerIdentity: tls.checkServerIdentity,
  };

  const caInline = e.DATABASE_SSL_CA || e.PGSSLROOTCERT_PEM || null;
  const caPath = e.DATABASE_SSL_CA_PATH || e.PGSSLROOTCERT || null;
  if (caInline && String(caInline).trim()) {
    ssl.ca = String(caInline).replace(/\\n/g, "\n");
  } else if (caPath && String(caPath).trim()) {
    try {
      ssl.ca = fs.readFileSync(String(caPath));
    } catch {
      const err = new Error("database_ssl_ca_unreadable");
      err.code = "DATABASE_SSL_CA_INVALID";
      throw err;
    }
  }

  // Guard: never allow rejectUnauthorized to be flipped off.
  if (ssl.rejectUnauthorized !== true) {
    const err = new Error("database_ssl_reject_unauthorized_required");
    err.code = "DATABASE_SSL_INSECURE";
    throw err;
  }

  return ssl;
}

/**
 * Create a minimal { query(text, params) } client using the `pg` package.
 * Throws fail-closed errors when configuration or module is invalid.
 * @param {NodeJS.ProcessEnv} env
 */
function createPgQueryClient(env) {
  const cfg = resolveDatabaseConfig(env);
  if (!cfg.databaseUrl) {
    const err = new Error("database_url_missing");
    err.code = "DATABASE_CONFIG_MISSING";
    throw err;
  }
  if (/REPLACE_|YOUR_STAGING|YOUR_PRODUCTION|example\.com/i.test(cfg.databaseUrl)) {
    const err = new Error("database_url_placeholder");
    err.code = "DATABASE_CONFIG_INVALID";
    throw err;
  }

  // Prefer dedicated intake runtime credentials over administrative postgres URL.
  // DOCUMENTATION: node-postgres uses DB roles; Supabase service_role JWT is a
  // separate PostgREST identity and is NOT interchangeable with this pool.
  const runtimeUrl =
    ((env || process.env).DATABASE_INTAKE_URL &&
      String((env || process.env).DATABASE_INTAKE_URL).trim()) ||
    cfg.databaseUrl;

  if (/REPLACE_|YOUR_STAGING|YOUR_PRODUCTION|example\.com/i.test(runtimeUrl)) {
    const err = new Error("database_intake_url_placeholder");
    err.code = "DATABASE_CONFIG_INVALID";
    throw err;
  }

  // Reject administrative default user in prod-like when a dedicated URL is expected.
  const e = env || process.env;
  if (cfg.isProdLike && String(e.SCS_ALLOW_ADMIN_DB_USER || "").toLowerCase() !== "true") {
    try {
      const u = new URL(runtimeUrl.replace(/^postgresql:/i, "postgres:"));
      const user = decodeURIComponent(u.username || "");
      if (user === "postgres" || user === "supabase_admin") {
        const err = new Error("database_admin_user_forbidden");
        err.code = "DATABASE_IDENTITY_INSECURE";
        throw err;
      }
    } catch (err) {
      if (err && err.code === "DATABASE_IDENTITY_INSECURE") throw err;
      // URL parse failure → continue; pg will fail later if truly invalid.
    }
  }

  let pg;
  try {
    // Optional production dependency — not required for local mock tests.
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    pg = require("pg");
  } catch {
    const err = new Error("pg_module_missing");
    err.code = "DATABASE_CLIENT_UNAVAILABLE";
    throw err;
  }

  const Pool = pg.Pool || (pg.default && pg.default.Pool);
  if (!Pool) {
    const err = new Error("pg_pool_unavailable");
    err.code = "DATABASE_CLIENT_UNAVAILABLE";
    throw err;
  }

  const ssl = buildSslOptions(e, { isProdLike: cfg.isProdLike, databaseUrl: runtimeUrl });

  const pool = new Pool({
    connectionString: runtimeUrl,
    ssl,
    max: Number(e.DATABASE_POOL_MAX || 2) || 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
  });

  return {
    async query(text, params) {
      return pool.query(text, params);
    },
    async end() {
      await pool.end();
    },
    _pool: pool,
    _ssl: ssl,
  };
}

module.exports = {
  resolveDatabaseConfig,
  createPgQueryClient,
  inspectConnectionStringSsl,
  buildSslOptions,
};
