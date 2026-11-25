/**
 * Server-only Postgres client factory (Supabase Postgres / DATABASE_URL).
 * Credentials must never be exposed to the browser bundle.
 *
 * TLS policy (M7A-R2 / M7A-R7):
 * - Production-like configs REQUIRE certificate + hostname verification.
 * - rejectUnauthorized:false is FORBIDDEN in prod-like modes.
 * - Trusted CA may be supplied via DATABASE_SSL_CA / PGSSLROOTCERT.
 * - Connection URLs are strictly parsed; the client is built from explicit
 *   approved fields only. Unrestricted connectionString is NEVER passed to
 *   `pg` alongside the secure TLS object (pg@8.13.1 ConnectionParameters
 *   otherwise Object.assign-overwrites ssl from the parsed URL).
 * - TLS downgrade params, uselibpqcompat, alternate SSL injection, and
 *   duplicate security-sensitive parameters are rejected.
 * - Never log DB credentials or connection URLs.
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

/** Query keys that must never reach the driver / must not appear as duplicates. */
const SECURITY_SENSITIVE_QUERY_KEYS = new Set([
  "sslmode",
  "ssl-mode",
  "uselibpqcompat",
  "ssl",
  "sslcert",
  "sslkey",
  "sslrootcert",
  "sslpassword",
  "sslcrl",
  "sslnegotiation",
  "rejectunauthorized",
  "checkserveridentity",
]);

/** Allowed informational query keys (never forwarded as driver SSL). */
const ALLOWED_INFORMATIONAL_QUERY_KEYS = new Set([
  "pgbouncer", // Supabase pooler documentation hint; not a TLS control
  "application_name",
]);

const FORBIDDEN_SSLMODES = new Set([
  "disable",
  "allow",
  "prefer",
  "no-verify",
  "verify-ca",
]);

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

  if (sslmode === "disable" || sslmode === "allow" || sslmode === "prefer" || sslmode === "no-verify") {
    return { insecure: true, reason: `sslmode_${sslmode}_forbidden`, sslmode };
  }
  if (sslmode === "require") {
    // libpq "require" does NOT verify CA/hostname. Flag for callers; R7 factory
    // rejects passing this mode through to pg and forces verified TLS instead.
    return { insecure: true, reason: "sslmode_require_no_verify", sslmode };
  }
  if (sslmode === "verify-ca") {
    return { insecure: true, reason: "sslmode_verify_ca_no_hostname", sslmode };
  }
  return { insecure: false, reason: null, sslmode };
}

/**
 * @param {string} message
 * @param {string} code
 */
function configError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * Canonicalize security-sensitive query aliases before duplicate detection.
 * `ssl-mode` and `sslmode` are the same TLS control — mixed aliases must collide.
 * @param {string} key
 * @returns {string}
 */
function canonicalizeQueryKey(key) {
  const k = String(key || "").toLowerCase();
  if (k === "ssl-mode") return "sslmode";
  return k;
}

/**
 * Count raw query-string key occurrences (detect duplicates before URLSearchParams collapse).
 * sslmode / ssl-mode are canonicalized to the same key (M7B mixed-alias P2).
 * @param {string} connectionString
 * @returns {Map<string, number>}
 */
function rawQueryKeyCounts(connectionString) {
  const raw = String(connectionString || "");
  const qIndex = raw.indexOf("?");
  const counts = new Map();
  if (qIndex < 0) return counts;
  const query = raw.slice(qIndex + 1);
  for (const part of query.split("&")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    const keyRaw = eq >= 0 ? part.slice(0, eq) : part;
    let key;
    try {
      key = decodeURIComponent(keyRaw).toLowerCase();
    } catch {
      key = keyRaw.toLowerCase();
    }
    key = canonicalizeQueryKey(key);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

/**
 * Strictly validate a database URL and return approved connection fields only.
 * Does not return or log the original URL. Rejects TLS downgrade / injection.
 *
 * Supported shapes (Supabase direct + pooler hostnames/ports):
 *   postgresql://USER:PASS@HOST:PORT/DB
 *   postgres://USER:PASS@HOST:PORT/DB
 * Optional query: sslmode=verify-full|require (require normalized away),
 *   pgbouncer=true, application_name=...
 *
 * @param {string} connectionString
 * @returns {{
 *   user: string,
 *   password: string,
 *   host: string,
 *   port: number,
 *   database: string,
 *   sslmode: string|null,
 *   normalizedSslmode: 'verify-full',
 *   informational: Record<string, string>
 * }}
 */
function parseApprovedConnectionFields(connectionString) {
  const raw = String(connectionString || "").trim();
  if (!raw) {
    throw configError("database_url_missing", "DATABASE_CONFIG_MISSING");
  }

  let url;
  try {
    url = new URL(raw.replace(/^postgresql:/i, "postgres:"));
  } catch {
    throw configError("database_url_unparseable", "DATABASE_CONFIG_INVALID");
  }

  if (url.protocol !== "postgres:") {
    throw configError("database_url_protocol_unsupported", "DATABASE_CONFIG_INVALID");
  }

  const counts = rawQueryKeyCounts(raw);
  for (const [key, n] of counts) {
    if (n > 1) {
      const sensitive =
        SECURITY_SENSITIVE_QUERY_KEYS.has(key) ||
        key === "user" ||
        key === "password" ||
        key === "host" ||
        key === "port" ||
        key === "dbname" ||
        key === "database";
      if (sensitive) {
        throw configError("database_url_duplicate_security_param", "DATABASE_SSL_INSECURE");
      }
      throw configError("database_url_duplicate_param", "DATABASE_CONFIG_INVALID");
    }
  }

  /** @type {Record<string, string>} */
  const informational = {};
  let sslmode = null;

  for (const [keyRaw, value] of url.searchParams.entries()) {
    const key = String(keyRaw).toLowerCase();
    if (key === "sslmode" || key === "ssl-mode") {
      sslmode = String(value || "").toLowerCase();
      continue;
    }
    if (key === "uselibpqcompat") {
      throw configError("database_url_uselibpqcompat_forbidden", "DATABASE_SSL_INSECURE");
    }
    if (
      key === "ssl" ||
      key === "sslcert" ||
      key === "sslkey" ||
      key === "sslrootcert" ||
      key === "sslpassword" ||
      key === "sslcrl" ||
      key === "sslnegotiation" ||
      key === "rejectunauthorized" ||
      key === "checkserveridentity"
    ) {
      throw configError("database_url_ssl_injection_forbidden", "DATABASE_SSL_INSECURE");
    }
    if (key === "user" || key === "password" || key === "host" || key === "port" || key === "dbname" || key === "database") {
      throw configError("database_url_ambiguous_identity_param", "DATABASE_CONFIG_INVALID");
    }
    if (ALLOWED_INFORMATIONAL_QUERY_KEYS.has(key)) {
      informational[key] = String(value);
      continue;
    }
    throw configError("database_url_unsupported_param", "DATABASE_CONFIG_INVALID");
  }

  if (sslmode && FORBIDDEN_SSLMODES.has(sslmode)) {
    throw configError(
      sslmode === "verify-ca" ? "sslmode_verify_ca_no_hostname" : `sslmode_${sslmode}_forbidden`,
      "DATABASE_SSL_INSECURE"
    );
  }
  if (sslmode && sslmode !== "require" && sslmode !== "verify-full") {
    throw configError("sslmode_unsupported", "DATABASE_SSL_INSECURE");
  }

  const user = decodeURIComponent(url.username || "");
  const password = decodeURIComponent(url.password || "");
  const host = decodeURIComponent(url.hostname || "").replace(/^\[(.+)\]$/, "$1");
  if (!host) {
    throw configError("database_url_host_missing", "DATABASE_CONFIG_INVALID");
  }

  let port = 5432;
  if (url.port) {
    port = Number.parseInt(url.port, 10);
    if (!Number.isFinite(port) || port <= 0 || port > 65535) {
      throw configError("database_url_port_invalid", "DATABASE_CONFIG_INVALID");
    }
  }

  const pathname = url.pathname || "";
  const database = decodeURIComponent(pathname.replace(/^\//, "") || "postgres");
  if (!database || database.includes("/")) {
    throw configError("database_url_database_invalid", "DATABASE_CONFIG_INVALID");
  }

  if (informational.pgbouncer != null) {
    const pb = String(informational.pgbouncer).toLowerCase();
    if (pb !== "true" && pb !== "1" && pb !== "yes") {
      throw configError("database_url_pgbouncer_invalid", "DATABASE_CONFIG_INVALID");
    }
  }

  return {
    user,
    password,
    host,
    port,
    database,
    sslmode,
    // Application always forces verified TLS regardless of URL sslmode=require.
    normalizedSslmode: "verify-full",
    informational,
  };
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
      throw configError("database_ssl_verification_required", "DATABASE_SSL_INSECURE");
    }
    // Local non-prod only: allow plaintext when explicitly requested.
    return false;
  }

  // Fail closed on URL-level TLS policy before constructing the client.
  // parseApprovedConnectionFields is the authoritative gate; this remains defense-in-depth.
  parseApprovedConnectionFields(cfg.databaseUrl);

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
      throw configError("database_ssl_ca_unreadable", "DATABASE_SSL_CA_INVALID");
    }
  }

  // Guard: never allow rejectUnauthorized to be flipped off.
  if (ssl.rejectUnauthorized !== true) {
    throw configError("database_ssl_reject_unauthorized_required", "DATABASE_SSL_INSECURE");
  }
  if (typeof ssl.checkServerIdentity !== "function") {
    throw configError("database_ssl_hostname_verification_required", "DATABASE_SSL_INSECURE");
  }

  return ssl;
}

/** Database roles that must never be a deployed Function identity. */
const ADMIN_RUNTIME_ROLES = new Set([
  "postgres",
  "supabase_admin",
  "supabase_auth_admin",
  "supabase_storage_admin",
  "supabase_replication_admin",
  "dashboard_user",
  "service_role",
  "scs_migration",
  "scs_owner_admin",
  // Fixture / integration harness only — never a deployed Function identity (M7A-R6-B).
  "scs_test_admin",
]);

const FUNCTION_RUNTIME_ROLES = new Set(["scs_intake_runtime", "scs_notify_worker"]);

/**
 * @param {string} connectionString
 * @returns {string}
 */
function connectionUsername(connectionString) {
  try {
    return parseApprovedConnectionFields(connectionString).user || "";
  } catch {
    const raw = String(connectionString || "");
    try {
      const u = new URL(raw.replace(/^postgresql:/i, "postgres:"));
      return decodeURIComponent(u.username || "");
    } catch {
      const match = raw.match(/^postgres(?:ql)?:\/\/([^:/?#]+)/i);
      return match ? decodeURIComponent(match[1]) : "";
    }
  }
}

/**
 * Reject administrative usernames in hosted / postgres-required contexts.
 * SCS_ALLOW_ADMIN_DB_USER is not consulted — there is no hosted bypass.
 * @param {string} connectionString
 * @param {NodeJS.ProcessEnv} env
 * @param {string} expectedRole
 */
function assertRuntimeConnectionIdentity(connectionString, env, expectedRole) {
  const cfg = resolveDatabaseConfig(env || process.env);
  const user = connectionUsername(connectionString);
  if (!cfg.isProdLike) return { user, isProdLike: false };
  if (!user || ADMIN_RUNTIME_ROLES.has(user) || !FUNCTION_RUNTIME_ROLES.has(user)) {
    throw configError("database_admin_user_forbidden", "DATABASE_IDENTITY_INSECURE");
  }
  if (expectedRole && user !== expectedRole) {
    throw configError("database_runtime_role_mismatch", "DATABASE_IDENTITY_INSECURE");
  }
  return { user, isProdLike: true };
}

/**
 * Verify the session's effective role. URL parsing alone is not sufficient:
 * session_user stays the login role even after SET ROLE.
 * @param {{ current_user?: string, session_user?: string, currentUser?: string, sessionUser?: string }} identity
 * @param {string} expectedRole
 * @param {NodeJS.ProcessEnv} env
 */
function assertEffectiveDatabaseIdentity(identity, expectedRole, env) {
  const cfg = resolveDatabaseConfig(env || process.env);
  if (!cfg.isProdLike) return { checked: false };
  const current = identity && (identity.current_user || identity.currentUser || "");
  const session = identity && (identity.session_user || identity.sessionUser || "");
  if (
    !current ||
    !session ||
    ADMIN_RUNTIME_ROLES.has(current) ||
    ADMIN_RUNTIME_ROLES.has(session) ||
    current !== expectedRole ||
    session !== expectedRole
  ) {
    throw configError("database_effective_admin_forbidden", "DATABASE_IDENTITY_INSECURE");
  }
  return { checked: true, current, session };
}

/**
 * Resolve the effective TLS object that pg@8.13.1 ConnectionParameters would use
 * for an explicit-field config (no connectionString). Does not connect.
 * @param {{ user: string, password: string, host: string, port: number, database: string, ssl: object|false }} poolConfig
 * @returns {{ rejectUnauthorized: boolean|undefined, hasCheckServerIdentity: boolean, sslIsObject: boolean, sslIsFalse: boolean }}
 */
function inspectEffectivePgSsl(poolConfig) {
  let ConnectionParameters;
  try {
    // Pin-local module — same tree Netlify Functions resolve.
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    ConnectionParameters = require("pg/lib/connection-parameters");
  } catch {
    throw configError("pg_module_missing", "DATABASE_CLIENT_UNAVAILABLE");
  }
  if (poolConfig && poolConfig.connectionString) {
    throw configError("database_connection_string_forbidden_with_tls", "DATABASE_SSL_INSECURE");
  }
  const cp = new ConnectionParameters({
    user: poolConfig.user,
    password: poolConfig.password,
    host: poolConfig.host,
    port: poolConfig.port,
    database: poolConfig.database,
    ssl: poolConfig.ssl,
  });
  const ssl = cp.ssl;
  return {
    rejectUnauthorized: ssl && typeof ssl === "object" ? ssl.rejectUnauthorized : undefined,
    hasCheckServerIdentity:
      Boolean(ssl && typeof ssl === "object" && typeof ssl.checkServerIdentity === "function"),
    sslIsObject: Boolean(ssl && typeof ssl === "object"),
    sslIsFalse: ssl === false,
    // Expose raw reference for evidence harnesses (never log credentials).
    ssl,
  };
}

/**
 * Create a minimal { query(text, params) } client using the `pg` package.
 * Throws fail-closed errors when configuration or module is invalid.
 * @param {NodeJS.ProcessEnv} env
 * @param {{ expectedRole?: 'scs_intake_runtime'|'scs_notify_worker' }} [options]
 */
function createPgQueryClient(env, options) {
  const cfg = resolveDatabaseConfig(env);
  if (!cfg.databaseUrl) {
    throw configError("database_url_missing", "DATABASE_CONFIG_MISSING");
  }
  if (/REPLACE_|YOUR_STAGING|YOUR_PRODUCTION|example\.com/i.test(cfg.databaseUrl)) {
    throw configError("database_url_placeholder", "DATABASE_CONFIG_INVALID");
  }

  // Prefer dedicated intake runtime credentials over administrative postgres URL.
  // DOCUMENTATION: node-postgres uses DB roles; Supabase service_role JWT is a
  // separate PostgREST identity and is NOT interchangeable with this pool.
  const runtimeUrl =
    ((env || process.env).DATABASE_INTAKE_URL &&
      String((env || process.env).DATABASE_INTAKE_URL).trim()) ||
    cfg.databaseUrl;

  if (/REPLACE_|YOUR_STAGING|YOUR_PRODUCTION|example\.com/i.test(runtimeUrl)) {
    throw configError("database_intake_url_placeholder", "DATABASE_CONFIG_INVALID");
  }

  const e = env || process.env;
  const expectedRole =
    (options && options.expectedRole) || "scs_intake_runtime";
  if (!FUNCTION_RUNTIME_ROLES.has(expectedRole)) {
    throw configError("database_expected_role_invalid", "DATABASE_IDENTITY_INSECURE");
  }
  // Hosted / postgres-required: reject admin credentials before connect.
  // Break-glass administrative access stays outside deployed Functions.
  assertRuntimeConnectionIdentity(runtimeUrl, e, expectedRole);

  // Strict URL parse + TLS policy BEFORE loading pg (fail closed; no credential logs).
  const fields = parseApprovedConnectionFields(runtimeUrl);
  const ssl = buildSslOptions(e, { isProdLike: cfg.isProdLike, databaseUrl: runtimeUrl });

  let pg;
  try {
    // Optional production dependency — not required for local mock tests.
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    pg = require("pg");
  } catch {
    throw configError("pg_module_missing", "DATABASE_CLIENT_UNAVAILABLE");
  }

  const Pool = pg.Pool || (pg.default && pg.default.Pool);
  if (!Pool) {
    throw configError("pg_pool_unavailable", "DATABASE_CLIENT_UNAVAILABLE");
  }

  // Explicit approved fields only — never pass connectionString with ssl.
  // pg@8.13.1 ConnectionParameters does Object.assign({}, config, parse(connectionString)),
  // which would overwrite a secure ssl object with uselibpqcompat/sslmode downgrades.
  const poolConfig = {
    user: fields.user,
    password: fields.password,
    host: fields.host,
    port: fields.port,
    database: fields.database,
    ssl,
    max: Number(e.DATABASE_POOL_MAX || 2) || 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
  };

  // Defense: refuse to construct if a connectionString key slipped in.
  if (Object.prototype.hasOwnProperty.call(poolConfig, "connectionString")) {
    throw configError("database_connection_string_forbidden_with_tls", "DATABASE_SSL_INSECURE");
  }

  const effective = inspectEffectivePgSsl(poolConfig);
  if (cfg.isProdLike || ssl) {
    if (
      !effective.sslIsObject ||
      effective.rejectUnauthorized !== true ||
      !effective.hasCheckServerIdentity
    ) {
      throw configError("database_ssl_effective_verification_required", "DATABASE_SSL_INSECURE");
    }
  }

  const pool = new Pool(poolConfig);

  let identityVerified = false;
  return {
    async query(text, params) {
      if (!identityVerified && cfg.isProdLike) {
        const probe = await pool.query(
          "SELECT current_user AS current_user, session_user AS session_user"
        );
        try {
          assertEffectiveDatabaseIdentity(probe.rows && probe.rows[0], expectedRole, e);
        } catch (err) {
          try {
            await pool.end();
          } catch {
            /* pool close is best-effort after identity rejection */
          }
          throw err;
        }
        identityVerified = true;
      }
      return pool.query(text, params);
    },
    async end() {
      await pool.end();
    },
    _pool: pool,
    _ssl: ssl,
    _poolConfig: {
      user: poolConfig.user,
      host: poolConfig.host,
      port: poolConfig.port,
      database: poolConfig.database,
      // password intentionally omitted from diagnostic surface
      hasConnectionString: false,
      ssl: ssl && typeof ssl === "object"
        ? {
            rejectUnauthorized: ssl.rejectUnauthorized,
            hasCheckServerIdentity: typeof ssl.checkServerIdentity === "function",
            hasCa: Boolean(ssl.ca),
          }
        : ssl,
    },
    _effectiveSsl: {
      rejectUnauthorized: effective.rejectUnauthorized,
      hasCheckServerIdentity: effective.hasCheckServerIdentity,
      sslIsObject: effective.sslIsObject,
    },
    _approvedFields: {
      user: fields.user,
      host: fields.host,
      port: fields.port,
      database: fields.database,
      sslmode: fields.sslmode,
      normalizedSslmode: fields.normalizedSslmode,
    },
  };
}

module.exports = {
  resolveDatabaseConfig,
  createPgQueryClient,
  inspectConnectionStringSsl,
  buildSslOptions,
  parseApprovedConnectionFields,
  inspectEffectivePgSsl,
  assertRuntimeConnectionIdentity,
  assertEffectiveDatabaseIdentity,
  connectionUsername,
  canonicalizeQueryKey,
  ADMIN_RUNTIME_ROLES,
};
