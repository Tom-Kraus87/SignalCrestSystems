/**
 * M7A-R4 real PostgreSQL integration suite.
 *
 * Repairs the R2 methodology:
 * - Uses actual function signatures (not a one-argument probe).
 * - SET ROLE failure fails the test.
 * - Effective role is read back with current_user before privilege probes.
 * - SQLSTATE 42501 is permission denied. 42883 / 42704 are missing objects.
 * - Any other database exception is an execution error, never a successful denial.
 * - Authorized calls have positive controls.
 *
 * THIS PASS: the 13 cases are NOT RUN.
 * Real PostgreSQL execution is not authorized. Do not start Docker, install
 * PostgreSQL, or contact an external database. A future run requires
 * SCS_AUTHORIZE_REAL_PG_TESTS=true plus provisioned URLs. That flag is not set.
 *
 * Evidence class: (3) real PostgreSQL integration — NOT mock.
 * A NOT RUN result is not a pass.
 *
 * Usage (only after a separate Owner authorization):
 *   set SCS_AUTHORIZE_REAL_PG_TESTS=true
 *   set DATABASE_PROJECT_ADMIN_URL=postgresql://postgres:...   (SOLE migration executor)
 *   set DATABASE_INTAKE_URL=postgresql://scs_intake_runtime:...
 *   set DATABASE_NOTIFY_URL=postgresql://scs_notify_worker:...
 *   set DATABASE_OWNER_URL=postgresql://scs_owner_admin:...
 *   set DATABASE_TEST_ADMIN_URL=postgresql://scs_test_admin:...  (fixtures only)
 *   # optional CA (same as application): DATABASE_SSL_CA / DATABASE_SSL_CA_PATH / PGSSLROOTCERT
 *   node qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs
 *
 * M7B: DATABASE_PROJECT_ADMIN_URL is exclusive. DATABASE_MIGRATION_URL must NOT be set
 * (presence is rejected). Harness pools use application TLS (explicit fields + CA), never
 * unrestricted connectionString. Fixture identity is scs_test_admin only.
 *
 * M7B-G2-R4 (Path A): before fixture DML or cases 1–13, independently authenticate all
 * five pools and require both current_user and session_user to match the expected bare
 * role. Admin pool must prove CREATEROLE (or SUPERUSER). SET ROLE is not independent auth.
 * Pooler / transaction-pooler configs are rejected. No administrator credential fallback.
 * All constructed pools are closed in finally on partial or complete preflight failure.
 */
import fs from "node:fs";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

export const CASES = [
  { id: 1, name: "Runtime identities and effective grants" },
  { id: 2, name: "Warm-cache and cold-cache idempotency" },
  { id: 3, name: "Concurrent same-key submissions" },
  { id: 4, name: "Concurrent conflicting payloads" },
  { id: 5, name: "Deleted-key replay with cached receipts" },
  { id: 6, name: "Role-bootstrap failure conditions" },
  { id: 7, name: "TLS certificate and hostname rejection" },
  // Case 8 is simulated JWT claims via set_config — NOT hosted Supabase Auth.
  { id: 8, name: "Simulated JWT claims owner allowlist (set_config) — not hosted Auth" },
  { id: 9, name: "Expired and reclaimed worker leases" },
  { id: 10, name: "Unauthorized notification invocation" },
  { id: 11, name: "Missing hosted IP-hash salt" },
  { id: 12, name: "Administrative runtime credential rejection" },
  { id: 13, name: "Retention purge and outbox foreign keys" },
  // Separate evidence class: genuine hosted Supabase Auth + AAL2 (always NOT RUN here).
  { id: 14, name: "Genuine hosted Supabase Auth + AAL2 verification", evidenceClass: "hosted-auth" },
];

const INSERT_SIGNATURE =
  "public.insert_lead_bundle(text,text,citext,text,text,text,text,text,text,text,text,text,text,text,text,boolean,text,timestamptz,text)";

const INSERT_SQL =
  "SELECT * FROM public.insert_lead_bundle($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)";

/**
 * Classify a database error. Permission denial is only SQLSTATE 42501.
 * @param {unknown} err
 * @returns {'permission_denied'|'missing_function'|'execution_error'}
 */
export function classifyDatabaseError(err) {
  const state = err && typeof err.code === "string" ? err.code : "";
  if (state === "42501") return "permission_denied";
  if (state === "42883" || state === "42704") return "missing_function";
  return "execution_error";
}

function notRunReport() {
  return {
    suite: "m7b-postgres-integration-20261124",
    evidenceClass: "real-postgresql",
    executed: false,
    result: "NOT RUN",
    ok: null,
    authorization: "SCS_AUTHORIZE_REAL_PG_TESTS is not true. Real PostgreSQL tests are not authorized.",
    note:
      "Historical R4/R6/R7 NOT RUN preserved. Case 8 is simulated JWT claims only; case 14 hosted Auth/AAL2 remains a separate NOT RUN evidence class. M7B local mock/static corrections do NOT constitute real-PG evidence.",
    cases: CASES.map((item) => ({
      id: item.id,
      name: item.name,
      status: "NOT RUN",
      pass: null,
      evidenceClass: item.evidenceClass || "real-postgresql",
    })),
  };
}

/** Fixture identity selected for real-PG setup/teardown (never Function runtime). */
export const FIXTURE_TEST_ADMIN_ROLE = "scs_test_admin";

/**
 * Minimum privileges for scs_test_admin (document + enforce identity locally).
 * Do not grant SUPERUSER, CREATEROLE, REPLICATION, or BYPASSRLS.
 */
export const FIXTURE_TEST_ADMIN_MIN_PRIVILEGES = Object.freeze({
  role: FIXTURE_TEST_ADMIN_ROLE,
  login: true,
  inherit: false,
  superuser: false,
  createrole: false,
  replication: false,
  bypassrls: false,
  purpose: "Integration fixture setup/teardown only",
  allowed: [
    "DML on fixture tables used by cases 2–5, 9, 13 (leads, idempotency_keys, lead_deletion_markers, notification_outbox, usage_counters) for setup/cleanup",
    "Optional GRANT of switchable test roles for SET ROLE probes when Owner provisions them",
  ],
  forbidden: [
    "Function runtime (DATABASE_INTAKE_URL / DATABASE_NOTIFY_URL / DATABASE_URL)",
    "Production databases",
    "Migration/bootstrap executor (use DATABASE_PROJECT_ADMIN_URL)",
    "Unnecessary administrative attributes (SUPERUSER, CREATEROLE, REPLICATION, BYPASSRLS)",
  ],
});

/**
 * Resolve real-PG harness URLs. No database connection.
 * DATABASE_PROJECT_ADMIN_URL is exclusive; DATABASE_MIGRATION_URL presence is rejected.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function resolveRealPgHarnessEnv(env) {
  const e = env || process.env;
  if (Object.prototype.hasOwnProperty.call(e, "DATABASE_MIGRATION_URL")) {
    return {
      ok: false,
      code: "DATABASE_MIGRATION_URL_UNSUPPORTED",
      missing: [],
      detail:
        "DATABASE_MIGRATION_URL is unsupported. Unset it and use DATABASE_PROJECT_ADMIN_URL exclusively.",
      urls: null,
    };
  }

  const projectAdminUrl = String(e.DATABASE_PROJECT_ADMIN_URL || "").trim();
  const intakeUrl = String(e.DATABASE_INTAKE_URL || "").trim();
  const notifyUrl = String(e.DATABASE_NOTIFY_URL || "").trim();
  const ownerUrl = String(e.DATABASE_OWNER_URL || "").trim();
  const testAdminUrl = String(e.DATABASE_TEST_ADMIN_URL || "").trim();

  const missing = [];
  if (!projectAdminUrl) missing.push("DATABASE_PROJECT_ADMIN_URL");
  if (!intakeUrl) missing.push("DATABASE_INTAKE_URL");
  if (!notifyUrl) missing.push("DATABASE_NOTIFY_URL");
  if (!ownerUrl) missing.push("DATABASE_OWNER_URL");
  if (!testAdminUrl) missing.push("DATABASE_TEST_ADMIN_URL");

  if (missing.length) {
    return {
      ok: false,
      code: "DATABASE_HARNESS_URLS_MISSING",
      missing,
      detail: "missing " + missing.join(", "),
      urls: null,
    };
  }

  return {
    ok: true,
    code: null,
    missing: [],
    detail: null,
    urls: {
      projectAdminUrl,
      intakeUrl,
      notifyUrl,
      ownerUrl,
      testAdminUrl,
    },
  };
}

/**
 * Assert fixture URL username is scs_test_admin. No connect.
 * @param {string} connectionUrl
 * @param {{ connectionUsername: (url: string) => string }} helpers
 */
export function assertFixtureTestAdminIdentity(connectionUrl, helpers) {
  const user = helpers.connectionUsername(connectionUrl);
  if (user !== FIXTURE_TEST_ADMIN_ROLE) {
    const err = new Error("database_test_admin_role_mismatch");
    err.code = "DATABASE_FIXTURE_IDENTITY_INVALID";
    err.expected = FIXTURE_TEST_ADMIN_ROLE;
    err.actual = user || "";
    throw err;
  }
  return { user, privileges: FIXTURE_TEST_ADMIN_MIN_PRIVILEGES };
}

/**
 * Build a Pool config aligned with application TLS (explicit fields + CA).
 * Never passes connectionString. Does not connect.
 * @param {string} connectionUrl
 * @param {NodeJS.ProcessEnv} env
 * @param {{
 *   parseApprovedConnectionFields: Function,
 *   buildSslOptions: Function,
 *   inspectEffectivePgSsl: Function,
 * }} pgClient
 */
export function buildHarnessPoolConfig(connectionUrl, env, pgClient) {
  const e = env || process.env;
  const fields = pgClient.parseApprovedConnectionFields(connectionUrl);
  const ssl = pgClient.buildSslOptions(e, {
    isProdLike: true,
    databaseUrl: connectionUrl,
  });
  if (!ssl || typeof ssl !== "object" || ssl.rejectUnauthorized !== true) {
    const err = new Error("database_ssl_verification_required");
    err.code = "DATABASE_SSL_INSECURE";
    throw err;
  }
  if (typeof ssl.checkServerIdentity !== "function") {
    const err = new Error("database_ssl_hostname_verification_required");
    err.code = "DATABASE_SSL_INSECURE";
    throw err;
  }
  const poolConfig = {
    user: fields.user,
    password: fields.password,
    host: fields.host,
    port: fields.port,
    database: fields.database,
    ssl,
    max: 1,
  };
  if (Object.prototype.hasOwnProperty.call(poolConfig, "connectionString")) {
    const err = new Error("database_connection_string_forbidden_with_tls");
    err.code = "DATABASE_SSL_INSECURE";
    throw err;
  }
  const effective = pgClient.inspectEffectivePgSsl(poolConfig);
  if (
    !effective.sslIsObject ||
    effective.rejectUnauthorized !== true ||
    !effective.hasCheckServerIdentity
  ) {
    const err = new Error("database_ssl_effective_verification_required");
    err.code = "DATABASE_SSL_INSECURE";
    throw err;
  }
  return {
    poolConfig,
    effective,
    tls: {
      rejectUnauthorized: ssl.rejectUnauthorized === true,
      hasCheckServerIdentity: typeof ssl.checkServerIdentity === "function",
      hasCa: Boolean(ssl.ca),
      hasConnectionString: false,
    },
  };
}

/** Path A direct host (Owner-selected). Pooler hosts are forbidden under Path A. */
export const PATH_A_DIRECT_HOST = "db.kfclinlrzfwodmichmci.supabase.co";
export const PATH_A_DIRECT_PORT = 5432;

/**
 * Independent pool identity matrix (M7B-G2-R4).
 * Both current_user and session_user must equal expectedUser.
 * Admin additionally requires CREATEROLE (or SUPERUSER via the same probe).
 */
export const INDEPENDENT_POOL_IDENTITY_MATRIX = Object.freeze([
  Object.freeze({
    key: "migration",
    label: "Project administrator",
    expectedUser: "postgres",
    requireCreaterole: true,
  }),
  Object.freeze({
    key: "intake",
    label: "Intake",
    expectedUser: "scs_intake_runtime",
    requireCreaterole: false,
  }),
  Object.freeze({
    key: "notify",
    label: "Notify",
    expectedUser: "scs_notify_worker",
    requireCreaterole: false,
  }),
  Object.freeze({
    key: "owner",
    label: "Owner",
    expectedUser: "scs_owner_admin",
    requireCreaterole: false,
  }),
  Object.freeze({
    key: "fixture",
    label: "Fixture",
    expectedUser: "scs_test_admin",
    requireCreaterole: false,
  }),
]);

const INDEPENDENT_POOL_IDENTITY_SQL = `
SELECT
  current_user AS current_user,
  session_user AS session_user,
  EXISTS (
    SELECT 1 FROM pg_roles r
    WHERE r.rolname = current_user
      AND (r.rolcreaterole OR r.rolsuper)
  ) AS admin_createrole_ok
`;

/**
 * Parse user/host/port from a connection URL without returning or logging secrets.
 * @param {string} connectionUrl
 * @returns {{ user: string, host: string, port: number }}
 */
function parseConnectionIdentityFields(connectionUrl) {
  const raw = String(connectionUrl || "").trim();
  if (!raw) {
    const err = new Error("database_path_a_url_missing");
    err.code = "DATABASE_PATH_A_CONFIG_INVALID";
    throw err;
  }
  const normalized = raw.replace(/^postgresql:/i, "http:").replace(/^postgres:/i, "http:");
  let url;
  try {
    url = new URL(normalized);
  } catch {
    const err = new Error("database_path_a_url_unparseable");
    err.code = "DATABASE_PATH_A_CONFIG_INVALID";
    throw err;
  }
  const user = decodeURIComponent(url.username || "");
  const host = decodeURIComponent(url.hostname || "")
    .replace(/^\[(.+)\]$/, "$1")
    .toLowerCase();
  const port = url.port ? Number(url.port) : 5432;
  if (!Number.isFinite(port)) {
    const err = new Error("database_path_a_port_invalid");
    err.code = "DATABASE_PATH_A_PORT_INVALID";
    throw err;
  }
  return { user, host, port };
}

/**
 * Path A host/port/bare-username gates. No connect. Never logs passwords or full URLs.
 * @param {string} connectionUrl
 * @param {string} expectedUser
 */
export function assertPathAConnectionShape(connectionUrl, expectedUser) {
  const expected = String(expectedUser || "");
  const { user, host, port } = parseConnectionIdentityFields(connectionUrl);

  if (
    host.includes("pooler.supabase") ||
    host.endsWith(".pooler.supabase.com") ||
    /\.pooler\.supabase\.com$/i.test(host)
  ) {
    const err = new Error("database_path_a_pooler_host_forbidden");
    err.code = "DATABASE_PATH_A_HOST_INVALID";
    err.poolLabel = expected;
    throw err;
  }
  if (port === 6543) {
    const err = new Error("database_path_a_transaction_pooler_port_forbidden");
    err.code = "DATABASE_PATH_A_PORT_INVALID";
    err.poolLabel = expected;
    throw err;
  }
  if (host !== PATH_A_DIRECT_HOST) {
    const err = new Error("database_path_a_host_mismatch");
    err.code = "DATABASE_PATH_A_HOST_INVALID";
    err.poolLabel = expected;
    throw err;
  }
  if (port !== PATH_A_DIRECT_PORT) {
    const err = new Error("database_path_a_port_mismatch");
    err.code = "DATABASE_PATH_A_PORT_INVALID";
    err.poolLabel = expected;
    throw err;
  }
  // Bare role only — project-qualified "<role>.<ref>" is rejected under Path A.
  if (!user || user.includes(".") || user !== expected) {
    const err = new Error("database_path_a_username_invalid");
    err.code = "DATABASE_PATH_A_USERNAME_INVALID";
    err.poolLabel = expected;
    err.expected = expected;
    err.actual = user || "";
    throw err;
  }
  return { user, host, port };
}

/**
 * Prove independent login identity on an already-authenticated client.
 * Requires BOTH current_user and session_user. SET ROLE cannot satisfy this.
 * @param {{ query: Function }} client
 * @param {{ expectedUser: string, requireCreaterole?: boolean, label?: string }} expected
 */
export async function assertIndependentPoolIdentity(client, expected) {
  const expectedUser = expected && expected.expectedUser;
  const label = (expected && expected.label) || expectedUser || "pool";
  if (!expectedUser) {
    const err = new Error("database_pool_identity_expectation_missing");
    err.code = "DATABASE_POOL_IDENTITY_MISMATCH";
    err.poolLabel = label;
    throw err;
  }

  let row;
  try {
    const res = await client.query(INDEPENDENT_POOL_IDENTITY_SQL);
    row = res && res.rows && res.rows[0];
  } catch (cause) {
    const err = new Error("database_pool_auth_or_query_failed");
    err.code = "DATABASE_POOL_AUTH_FAILED";
    err.poolLabel = label;
    err.causeCode = cause && typeof cause.code === "string" ? cause.code : undefined;
    throw err;
  }

  const current = row && row.current_user;
  const session = row && row.session_user;
  if (current !== expectedUser || session !== expectedUser) {
    const err = new Error("database_pool_identity_mismatch");
    err.code = "DATABASE_POOL_IDENTITY_MISMATCH";
    err.poolLabel = label;
    err.expectedUser = expectedUser;
    err.actualCurrentUser = current || "";
    err.actualSessionUser = session || "";
    throw err;
  }

  if (expected.requireCreaterole) {
    const createroleOk = row && row.admin_createrole_ok === true;
    if (!createroleOk) {
      const err = new Error("database_admin_createrole_required");
      err.code = "DATABASE_ADMIN_CREATEROLE_REQUIRED";
      err.poolLabel = label;
      throw err;
    }
  }

  return {
    current_user: current,
    session_user: session,
    admin_createrole_ok: row && row.admin_createrole_ok === true,
    poolLabel: label,
  };
}

/**
 * End all constructed pools quietly (partial or complete preflight failure safe).
 * @param {Record<string, { end?: Function }>|Array<{ end?: Function }>} pools
 */
export async function endPoolsQuietly(pools) {
  const list = Array.isArray(pools)
    ? pools.filter(Boolean)
    : Object.values(pools || {}).filter(Boolean);
  await Promise.allSettled(
    list.map((pool) =>
      pool && typeof pool.end === "function" ? Promise.resolve(pool.end()) : Promise.resolve()
    )
  );
}

/**
 * Fail-closed five-pool Path A shape + independent identity preflight.
 * Does not fall back to administrator credentials for any non-admin pool.
 * @param {Record<string, { query: Function }>} pools
 * @param {{
 *   urls: {
 *     migration: string,
 *     intake: string,
 *     notify: string,
 *     owner: string,
 *     fixture: string,
 *   },
 * }} options
 */
export async function runIndependentPoolIdentityPreflight(pools, options) {
  const urls = (options && options.urls) || {};
  const shapeFailures = [];

  for (const entry of INDEPENDENT_POOL_IDENTITY_MATRIX) {
    const url = urls[entry.key];
    try {
      assertPathAConnectionShape(url, entry.expectedUser);
    } catch (err) {
      shapeFailures.push({
        poolLabel: entry.label,
        code: err && err.code ? err.code : "DATABASE_PATH_A_CONFIG_INVALID",
        message: err && err.message ? err.message : "path_a_shape_failed",
      });
    }
  }

  if (shapeFailures.length) {
    const err = new Error("independent_pool_identity_preflight_failed");
    err.code = "DATABASE_INDEPENDENT_IDENTITY_PREFLIGHT_FAILED";
    err.phase = "path_a_shape";
    err.failures = shapeFailures;
    err.poolLabel = shapeFailures[0].poolLabel;
    throw err;
  }

  const proofs = [];
  for (const entry of INDEPENDENT_POOL_IDENTITY_MATRIX) {
    const pool = pools && pools[entry.key];
    if (!pool || typeof pool.query !== "function") {
      const err = new Error("independent_pool_identity_preflight_failed");
      err.code = "DATABASE_INDEPENDENT_IDENTITY_PREFLIGHT_FAILED";
      err.phase = "pool_missing";
      err.poolLabel = entry.label;
      err.failures = [{ poolLabel: entry.label, code: "DATABASE_POOL_MISSING", message: "pool_missing" }];
      throw err;
    }
    try {
      const proof = await assertIndependentPoolIdentity(pool, entry);
      proofs.push(proof);
    } catch (cause) {
      const err = new Error("independent_pool_identity_preflight_failed");
      err.code = "DATABASE_INDEPENDENT_IDENTITY_PREFLIGHT_FAILED";
      err.phase = "identity";
      err.poolLabel = (cause && cause.poolLabel) || entry.label;
      err.causeCode = cause && cause.code;
      err.failures = [
        {
          poolLabel: (cause && cause.poolLabel) || entry.label,
          code: (cause && cause.code) || "DATABASE_POOL_IDENTITY_MISMATCH",
          message: cause && cause.message ? cause.message : "identity_failed",
        },
      ];
      throw err;
    }
  }

  return { ok: true, proofs };
}

const SWITCHABLE_ROLES = new Set([
  "anon",
  "authenticated",
  "scs_intake_runtime",
  "scs_notify_worker",
  "scs_owner_admin",
]);

/**
 * SET ROLE, then require current_user to match. A failure is a test failure.
 * @param {{ query: Function }} client
 * @param {string} role
 */
async function setRoleAndVerify(client, role) {
  if (!SWITCHABLE_ROLES.has(role)) {
    throw new Error("refusing unexpected role name");
  }
  await client.query(`SET ROLE ${role}`);
  const { rows } = await client.query("SELECT current_user AS current_user");
  const current = rows && rows[0] && rows[0].current_user;
  if (current !== role) {
    throw new Error(`effective role mismatch: expected ${role}, got ${current || "none"}`);
  }
  return current;
}

async function expectPermissionDenied(client, sql, params) {
  try {
    await client.query(sql, params);
    return { pass: false, detail: "statement succeeded; not a denial" };
  } catch (err) {
    const kind = classifyDatabaseError(err);
    if (kind === "permission_denied") return { pass: true, detail: "42501" };
    return {
      pass: false,
      detail: `${kind} SQLSTATE ${err && err.code ? err.code : "none"}: ${err && err.message ? err.message : err}`,
    };
  }
}

function insertArgs(overrides) {
  const base = [
    "project-request",
    "Integration Tester",
    "integration@example.com",
    null,
    null,
    "other",
    "exploring",
    "",
    "Staging integration probe — safe to purge.",
    "contact",
    null,
    "/project-request.html",
    "privacy-2026-11-23",
    null,
    "m7a-r4-it",
    true,
    "it-" + "00000000",
    new Date().toISOString(),
    "a".repeat(64),
  ];
  return Object.assign(base, overrides || {});
}

async function runAuthorized() {
  const results = CASES.map((item) => ({
    id: item.id,
    name: item.name,
    status: "FAIL",
    pass: false,
    detail: "",
  }));

  const resolved = resolveRealPgHarnessEnv(process.env);
  if (!resolved.ok) {
    for (const item of results) {
      if (item.id === 14) {
        item.status = "NOT RUN";
        item.pass = null;
        item.detail = "Hosted Auth/AAL2 requires separate authorization; not scored as real-PG.";
      } else {
        item.detail = resolved.detail || resolved.code || "harness env invalid";
      }
    }
    return results;
  }

  const { projectAdminUrl, intakeUrl, notifyUrl, ownerUrl, testAdminUrl } = resolved.urls;

  let pg;
  try {
    pg = require(path.join(ROOT, "netlify", "functions", "node_modules", "pg"));
  } catch {
    try {
      pg = require("pg");
    } catch (err) {
      for (const item of results) {
        if (item.id === 14) {
          item.status = "NOT RUN";
          item.pass = null;
          item.detail = "Hosted Auth/AAL2 requires separate authorization; not scored as real-PG.";
        } else {
          item.detail = "pg module unavailable: " + ((err && err.message) || err);
        }
      }
      return results;
    }
  }

  const { hashIp } = require(path.join(ROOT, "netlify", "functions", "_lib", "process-lead.js"));
  const {
    assertRuntimeConnectionIdentity,
    assertEffectiveDatabaseIdentity,
    parseApprovedConnectionFields,
    buildSslOptions,
    inspectEffectivePgSsl,
    connectionUsername,
  } = require(path.join(ROOT, "netlify", "functions", "_lib", "pg-client.js"));
  const { authorizeNotifyWorkerInvocation } = require(
    path.join(ROOT, "netlify", "functions", "_lib", "worker-auth.js")
  );

  const pgClientApi = {
    parseApprovedConnectionFields,
    buildSslOptions,
    inspectEffectivePgSsl,
  };

  let projectAdminCfg;
  let intakeCfg;
  let notifyCfg;
  let ownerCfg;
  let testAdminCfg;
  try {
    assertFixtureTestAdminIdentity(testAdminUrl, { connectionUsername });
    projectAdminCfg = buildHarnessPoolConfig(projectAdminUrl, process.env, pgClientApi);
    intakeCfg = buildHarnessPoolConfig(intakeUrl, process.env, pgClientApi);
    notifyCfg = buildHarnessPoolConfig(notifyUrl, process.env, pgClientApi);
    ownerCfg = buildHarnessPoolConfig(ownerUrl, process.env, pgClientApi);
    testAdminCfg = buildHarnessPoolConfig(testAdminUrl, process.env, pgClientApi);
  } catch (err) {
    for (const item of results) {
      if (item.id === 14) {
        item.status = "NOT RUN";
        item.pass = null;
        item.detail = "Hosted Auth/AAL2 requires separate authorization; not scored as real-PG.";
      } else {
        item.detail =
          "harness TLS/identity preflight failed: " +
          ((err && err.code) || "") +
          " " +
          ((err && err.message) || err);
      }
    }
    return results;
  }

  const Pool = pg.Pool || (pg.default && pg.default.Pool);
  // Application-aligned TLS only — never connectionString (M7B CA alignment).
  const migration = new Pool(Object.assign({}, projectAdminCfg.poolConfig, { max: 1 }));
  const intake = new Pool(Object.assign({}, intakeCfg.poolConfig, { max: 2 }));
  const notify = new Pool(Object.assign({}, notifyCfg.poolConfig, { max: 1 }));
  const owner = new Pool(Object.assign({}, ownerCfg.poolConfig, { max: 1 }));
  const fixture = new Pool(Object.assign({}, testAdminCfg.poolConfig, { max: 1 }));
  const pools = { migration, intake, notify, owner, fixture };

  function setCase(id, pass, detail) {
    const item = results.find((row) => row.id === id);
    item.pass = pass;
    item.status = pass ? "PASS" : "FAIL";
    item.detail = detail || "";
  }

  function markPreflightFailure(err) {
    const code = (err && err.code) || "DATABASE_INDEPENDENT_IDENTITY_PREFLIGHT_FAILED";
    const label = (err && err.poolLabel) || "";
    const causeCode = (err && err.causeCode) || "";
    const detail =
      "independent pool identity preflight failed: " +
      code +
      (label ? " pool=" + label : "") +
      (causeCode ? " cause=" + causeCode : "");
    for (const item of results) {
      if (item.id === 14) {
        item.status = "NOT RUN";
        item.pass = null;
        item.detail =
          "Hosted Auth/AAL2 requires separate authorization; not scored as real-PG.";
      } else {
        item.pass = false;
        item.status = "FAIL";
        item.detail = detail;
      }
    }
  }

  try {
    // M7B-G2-R4: Path A shape + five-pool independent identity BEFORE fixture DML / cases 1–13.
    // No administrator credential fallback. SET ROLE is not accepted as independent auth.
    try {
      await runIndependentPoolIdentityPreflight(pools, {
        urls: {
          migration: projectAdminUrl,
          intake: intakeUrl,
          notify: notifyUrl,
          owner: ownerUrl,
          fixture: testAdminUrl,
        },
      });
    } catch (err) {
      markPreflightFailure(err);
      return results;
    }

  try {
    await setRoleAndVerify(migration, "scs_intake_runtime");
    const priv = await migration.query(
      "SELECT has_function_privilege(current_user, $1, 'EXECUTE') AS exec_ok, has_table_privilege(current_user, 'public.idempotency_keys', 'SELECT') AS select_ok",
      [INSERT_SIGNATURE]
    );
    const execOk = priv.rows[0] && priv.rows[0].exec_ok === true;
    const selectOk = priv.rows[0] && priv.rows[0].select_ok === true;
    const positive = await migration.query("SELECT public.atomic_counter_get($1) AS n", ["m7a-r4-positive"]);
    const positiveOk = Number(positive.rows[0].n) === 0;
    await migration.query("RESET ROLE");
    await setRoleAndVerify(migration, "anon");
    const denied = await expectPermissionDenied(migration, INSERT_SQL, insertArgs());
    await migration.query("RESET ROLE");
    setCase(
      1,
      execOk && selectOk === false && positiveOk && denied.pass,
      `execute=${execOk} tableSelect=${selectOk} positive=${positiveOk} anon=${denied.detail}`
    );
  } catch (err) {
    setCase(1, false, "SET ROLE or identity check failed: " + ((err && err.message) || err));
    try { await migration.query("RESET ROLE"); } catch { /* already failed */ }
  }

  try {
    const key = "r4warm" + Date.now().toString(36);
    const args = insertArgs();
    args[16] = key;
    const first = await intake.query(INSERT_SQL, args);
    const received = first.rows[0] && first.rows[0].received_at;
    await intake.query("SELECT public.idempotency_set_nx($1, $2, $3)", [
      key,
      JSON.stringify({ status: 200, body: { ok: true, receivedAt: String(received) }, payloadHash: args[18] }),
      86400,
    ]);
    const warm = await intake.query(
      "SELECT deleted, fingerprint_match, response_json IS NOT NULL AS has_body FROM public.lookup_idempotency_response($1, $2)",
      [key, args[18]]
    );
    // Fixture mutation via scs_test_admin only (not project admin / not Function runtime).
    await fixture.query(
      "UPDATE public.idempotency_keys SET expires_at = now() - interval '1 minute' WHERE idem_key = $1",
      [key]
    );
    const cold = await intake.query(
      "SELECT expired, response_json IS NULL AS body_withheld FROM public.lookup_idempotency_response($1, $2)",
      [key, args[18]]
    );
    const warmOk = warm.rows[0] && warm.rows[0].deleted === false && warm.rows[0].has_body === true;
    const coldOk = cold.rows[0] && cold.rows[0].expired === true && cold.rows[0].body_withheld === true;
    setCase(2, warmOk && coldOk && !!received, `warm=${warmOk} cold=${coldOk}`);
  } catch (err) {
    setCase(2, false, classifyDatabaseError(err) + " " + ((err && err.message) || err));
  }

  try {
    const key = "r4same" + Date.now().toString(36);
    const args = insertArgs();
    args[16] = key;
    const [a, b] = await Promise.all([intake.query(INSERT_SQL, args), intake.query(INSERT_SQL, args.slice())]);
    const ids = new Set([a.rows[0].submission_id, b.rows[0].submission_id].map(String));
    const oneDuplicate = Boolean(a.rows[0].duplicate) !== Boolean(b.rows[0].duplicate);
    setCase(3, ids.size === 1 && oneDuplicate, `ids=${ids.size}`);
  } catch (err) {
    setCase(3, false, (err && err.message) || String(err));
  }

  try {
    // R5-C: genuine concurrent conflicting payloads (not sequential first-then-second).
    const key = "r4conf" + Date.now().toString(36);
    const firstArgs = insertArgs();
    firstArgs[16] = key;
    const secondArgs = firstArgs.slice();
    secondArgs[8] = "A different message body for the same key.";
    secondArgs[18] = "b".repeat(64);
    const settled = await Promise.allSettled([
      intake.query(INSERT_SQL, firstArgs),
      intake.query(INSERT_SQL, secondArgs),
    ]);
    const fulfilled = settled.filter((s) => s.status === "fulfilled");
    const rejected = settled.filter((s) => s.status === "rejected");
    const conflict = rejected.some((s) =>
      String(s.reason && s.reason.message).includes("idempotency_payload_conflict")
    );
    const oneWin = fulfilled.length === 1;
    // Positive control: concurrent identical args still converge on one submission id.
    const sameKey = "r4confpos" + Date.now().toString(36);
    const sameArgs = insertArgs();
    sameArgs[16] = sameKey;
    const [sa, sb] = await Promise.all([
      intake.query(INSERT_SQL, sameArgs),
      intake.query(INSERT_SQL, sameArgs.slice()),
    ]);
    const sameIds = new Set([sa.rows[0].submission_id, sb.rows[0].submission_id].map(String));
    setCase(
      4,
      oneWin && conflict && sameIds.size === 1,
      `win=${fulfilled.length} conflict=${conflict} sameIds=${sameIds.size}`
    );
  } catch (err) {
    setCase(4, false, (err && err.message) || String(err));
  }

  try {
    const key = "r4del" + Date.now().toString(36);
    const args = insertArgs();
    args[16] = key;
    const created = await intake.query(INSERT_SQL, args);
    const leadId = created.rows[0].lead_id;
    await intake.query("SELECT public.idempotency_set_nx($1, $2, $3)", [
      key,
      JSON.stringify({ status: 200, body: { ok: true }, payloadHash: args[18] }),
      86400,
    ]);
    await fixture.query(
      `INSERT INTO public.lead_deletion_markers (idempotency_key, lead_id, reason)
       VALUES ($1, $2, 'soft_delete')
       ON CONFLICT (idempotency_key) DO UPDATE
         SET deleted_at = now(), reason = EXCLUDED.reason`,
      [key, leadId]
    );
    const lookup = await intake.query(
      "SELECT deleted, response_json IS NULL AS withheld FROM public.lookup_idempotency_response($1, $2)",
      [key, args[18]]
    );
    let replayBlocked = false;
    try {
      await intake.query(INSERT_SQL, args);
    } catch (err) {
      replayBlocked = String(err && err.message).includes("idempotency_key_deleted");
      if (!replayBlocked) throw err;
    }
    const withheld = lookup.rows[0] && lookup.rows[0].deleted === true && lookup.rows[0].withheld === true;
    setCase(5, withheld && replayBlocked, `withheld=${withheld} replay=${replayBlocked}`);
  } catch (err) {
    setCase(5, false, "SET ROLE or replay failed: " + ((err && err.message) || err));
    try { await migration.query("RESET ROLE"); } catch { /* ignore */ }
  }

  try {
    const bootstrapProbe = `
      DO $$
      DECLARE
        v_super boolean;
        v_createrole boolean;
      BEGIN
        SELECT r.rolsuper, r.rolcreaterole INTO v_super, v_createrole
        FROM pg_catalog.pg_roles r
        WHERE r.rolname = current_user;
        IF NOT COALESCE(v_super, false) AND NOT COALESCE(v_createrole, false) THEN
          RAISE EXCEPTION 'role bootstrap prerequisite failed'
            USING ERRCODE = 'insufficient_privilege';
        END IF;
      END $$;`;
    let failedClosed = false;
    try {
      await intake.query(bootstrapProbe);
    } catch (err) {
      failedClosed = classifyDatabaseError(err) === "permission_denied";
      if (!failedClosed) throw err;
    }
    setCase(6, failedClosed, failedClosed ? "42501" : "bootstrap did not fail");
  } catch (err) {
    setCase(6, false, classifyDatabaseError(err) + " " + ((err && err.message) || err));
  }

  try {
    const host = new URL(intakeUrl.replace(/^postgresql:/i, "postgres:")).hostname;
    const tlsResult = await new Promise((resolve) => {
      const socket = tls.connect(
        {
          host,
          port: 5432,
          servername: "wrong.invalid",
          rejectUnauthorized: true,
          timeout: 8000,
        },
        () => {
          socket.end();
          resolve({ pass: false, detail: "connection succeeded with the wrong hostname" });
        }
      );
      socket.on("error", (err) => {
        const code = err && err.code;
        const certCodes = new Set([
          "ERR_TLS_CERT_ALTNAME_INVALID",
          "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
          "DEPTH_ZERO_SELF_SIGNED_CERT",
          "CERT_HAS_EXPIRED",
          "SELF_SIGNED_CERT_IN_CHAIN",
        ]);
        if (certCodes.has(code)) resolve({ pass: true, detail: code });
        else resolve({ pass: false, detail: "not a certificate rejection: " + (code || err.message) });
      });
    });
    setCase(7, tlsResult.pass, tlsResult.detail);
  } catch (err) {
    setCase(7, false, (err && err.message) || String(err));
  }

  try {
    // Simulated database JWT claims via set_config — NOT genuine hosted Supabase Auth.
    // Hosted Auth + AAL2 is case 14 and remains a separate evidence class.
    const reg = await migration.query("SELECT to_regprocedure('auth.uid()') AS fn");
    if (!reg.rows[0] || !reg.rows[0].fn) {
      const missing = new Error("auth.uid missing");
      missing.code = "42883";
      throw missing;
    }
    await setRoleAndVerify(migration, "authenticated");
    const negative = await migration.query("SELECT public.is_owner_aal2() AS allowed");
    const negativeOk = negative.rows[0] && negative.rows[0].allowed === false;
    await migration.query("SELECT set_config('request.jwt.claims', '{\"aal\":\"aal1\"}', true)");
    const aal1 = await migration.query("SELECT public.is_owner_aal2() AS allowed");
    const aal1Denied = aal1.rows[0] && aal1.rows[0].allowed === false;
    await migration.query("RESET ROLE");
    const userId = "00000000-0000-4000-8000-" + Date.now().toString().slice(-12).padStart(12, "0");
    await migration.query("BEGIN");
    let positiveOk = false;
    try {
      await migration.query(
        "INSERT INTO public.owner_allowlist (user_id, email) VALUES ($1::uuid, $2)",
        [userId, `r4-owner-${Date.now()}@example.com`]
      );
      await migration.query("SELECT set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, aal: "aal2" }),
      ]);
      const positive = await migration.query("SELECT public.is_owner_aal2() AS allowed");
      positiveOk = positive.rows[0] && positive.rows[0].allowed === true;
      await migration.query("ROLLBACK");
    } catch (err) {
      try { await migration.query("ROLLBACK"); } catch { /* ignore */ }
      throw err;
    }
    const ownerProbe = await owner.query("SELECT current_user AS current_user, session_user AS session_user");
    const ownerIdentity =
      ownerProbe.rows[0]
      && ownerProbe.rows[0].current_user === "scs_owner_admin"
      && ownerProbe.rows[0].session_user === "scs_owner_admin";
    setCase(
      8,
      negativeOk && aal1Denied && positiveOk && ownerIdentity,
      `simulated_jwt no_jwt=${negativeOk} aal1=${aal1Denied} aal2_allowlist=${positiveOk} ownerIdentity=${ownerIdentity}`
    );
  } catch (err) {
    setCase(8, false, classifyDatabaseError(err) + " " + ((err && err.message) || err));
    try { await migration.query("ROLLBACK"); } catch { /* ignore */ }
    try { await migration.query("RESET ROLE"); } catch { /* ignore */ }
  }

  try {
    await setRoleAndVerify(migration, "scs_notify_worker");
    const claimed = await migration.query(
      "SELECT id, claim_token, lease_owner FROM public.claim_notification_outbox($1, $2, $3)",
      ["worker-a", 1, 30]
    );
    const row = claimed.rows[0];
    let staleRejected = false;
    if (row) {
      // Lease expiry mutation uses fixture test-admin — worker has no table UPDATE.
      await migration.query("RESET ROLE");
      await fixture.query(
        "UPDATE public.notification_outbox SET lease_expires_at = now() - interval '1 minute' WHERE id = $1",
        [row.id]
      );
      await setRoleAndVerify(migration, "scs_notify_worker");
      const stale = await migration.query(
        "SELECT public.complete_notification_outbox($1, $2, $3, $4, $5) AS acknowledged",
        [row.id, "worker-a", row.claim_token, true, null]
      );
      staleRejected = stale.rows[0] && stale.rows[0].acknowledged === false;
      const reclaimed = await migration.query(
        "SELECT claim_token FROM public.claim_notification_outbox($1, $2, $3) WHERE id = $4",
        ["worker-b", 5, 30, row.id]
      );
      const newToken = reclaimed.rows[0] && reclaimed.rows[0].claim_token;
      const oldAck = await migration.query(
        "SELECT public.complete_notification_outbox($1, $2, $3, $4, $5) AS acknowledged",
        [row.id, "worker-a", row.claim_token, true, null]
      );
      const oldRejected = oldAck.rows[0] && oldAck.rows[0].acknowledged === false;
      const newAck = newToken
        ? await migration.query(
            "SELECT public.complete_notification_outbox($1, $2, $3, $4, $5) AS acknowledged",
            [row.id, "worker-b", newToken, false, "test_fail"]
          )
        : { rows: [{ acknowledged: false }] };
      staleRejected = staleRejected && oldRejected && newAck.rows[0].acknowledged === true;
    }
    await migration.query("RESET ROLE");
    setCase(9, Boolean(row) && staleRejected, row ? "fenced" : "no claimable outbox row");
  } catch (err) {
    setCase(9, false, "SET ROLE or lease probe failed: " + ((err && err.message) || err));
    try { await migration.query("RESET ROLE"); } catch { /* ignore */ }
  }

  try {
    // Exercise the actual notification handler (R5-C), not only the unit helper.
    const notifyWorker = require(path.join(ROOT, "netlify/functions/notify-worker.js"));
    const secret = "correct-horse-battery-staple-value-32";
    const saved = {
      NOTIFY_WORKER_INVOKE_SECRET: process.env.NOTIFY_WORKER_INVOKE_SECRET,
      EMAIL_NOTIFY_MODE: process.env.EMAIL_NOTIFY_MODE,
      DATABASE_NOTIFY_URL: process.env.DATABASE_NOTIFY_URL,
      DATABASE_INTAKE_URL: process.env.DATABASE_INTAKE_URL,
      DATABASE_URL: process.env.DATABASE_URL,
      SCS_ENV: process.env.SCS_ENV,
      SCS_DEPENDENCY_MODE: process.env.SCS_DEPENDENCY_MODE,
    };
    let missingOk = false;
    let wrongOk = false;
    let unauthorizedNoDb = false;
    let positiveOk = false;
    try {
      process.env.NOTIFY_WORKER_INVOKE_SECRET = secret;
      process.env.EMAIL_NOTIFY_MODE = "simulated";
      process.env.SCS_ENV = "staging";
      process.env.SCS_DEPENDENCY_MODE = "postgres";
      process.env.DATABASE_NOTIFY_URL =
        "postgresql://scs_notify_worker:x@db.example.com:5432/postgres?sslmode=verify-full";
      process.env.DATABASE_INTAKE_URL = process.env.DATABASE_NOTIFY_URL;
      process.env.DATABASE_URL = process.env.DATABASE_NOTIFY_URL;

      const missing = await notifyWorker.handler({ httpMethod: "POST", headers: {} });
      const wrong = await notifyWorker.handler({
        httpMethod: "POST",
        headers: { authorization: "Bearer wrong-secret-that-is-long-enough-xx" },
      });
      missingOk = missing.statusCode === 401;
      wrongOk = wrong.statusCode === 401;
      unauthorizedNoDb =
        missing.statusCode !== 503 &&
        wrong.statusCode !== 503 &&
        JSON.parse(missing.body).code !== "notify_worker_unavailable";

      process.env.EMAIL_NOTIFY_MODE = "disabled";
      const correct = await notifyWorker.handler({
        httpMethod: "POST",
        headers: { authorization: "Bearer " + secret },
      });
      const body = JSON.parse(correct.body);
      positiveOk = correct.statusCode === 200 && body.ok === true && body.skipped === true;
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
    setCase(
      10,
      missingOk && wrongOk && unauthorizedNoDb && positiveOk,
      `missing=${missingOk} wrong=${wrongOk} noDb=${unauthorizedNoDb} positive=${positiveOk}`
    );
  } catch (err) {
    setCase(10, false, (err && err.message) || String(err));
  }

  try {
    const missing = hashIp("203.0.113.10", { SCS_ENV: "staging", NETLIFY: "true" });
    const placeholder = hashIp("203.0.113.10", {
      SCS_ENV: "production",
      LEAD_IP_HASH_SALT: "REPLACE_WITH_STRONG_RANDOM_SALT_STAGING_OR_PROD",
    });
    const valid = hashIp("203.0.113.10", {
      SCS_ENV: "staging",
      LEAD_IP_HASH_SALT: "r4-hosted-salt-value-generated-server-side-32",
    });
    const noRaw = valid !== "203.0.113.10" && missing === null && placeholder === null && typeof valid === "string";
    setCase(11, noRaw, `missing=${missing} placeholder=${placeholder}`);
  } catch (err) {
    setCase(11, false, (err && err.message) || String(err));
  }

  try {
    const hosted = { SCS_ENV: "staging", SCS_DEPENDENCY_MODE: "postgres", SCS_ALLOW_ADMIN_DB_USER: "true" };
    let urlRejected = false;
    try {
      assertRuntimeConnectionIdentity(
        "postgresql://postgres:secret@db.example.com:5432/postgres",
        hosted,
        "scs_intake_runtime"
      );
    } catch (err) {
      urlRejected = err && err.code === "DATABASE_IDENTITY_INSECURE";
    }
    let effectiveRejected = false;
    try {
      assertEffectiveDatabaseIdentity(
        { current_user: "scs_intake_runtime", session_user: "postgres" },
        "scs_intake_runtime",
        hosted
      );
    } catch (err) {
      effectiveRejected = err && err.code === "DATABASE_IDENTITY_INSECURE";
    }
    const intakeIdentity = await intake.query("SELECT current_user AS current_user, session_user AS session_user");
    const matches =
      intakeIdentity.rows[0]
      && intakeIdentity.rows[0].current_user === "scs_intake_runtime"
      && intakeIdentity.rows[0].session_user === "scs_intake_runtime";
    setCase(12, urlRejected && effectiveRejected && matches, `url=${urlRejected} effective=${effectiveRejected} live=${matches}`);
  } catch (err) {
    setCase(12, false, (err && err.message) || String(err));
  }

  try {
    const key = "r4purge" + Date.now().toString(36);
    const args = insertArgs();
    args[16] = key;
    const created = await intake.query(INSERT_SQL, args);
    const leadId = created.rows[0].lead_id;
    const outboxId = created.rows[0].outbox_id;
    await migration.query("RESET ROLE");
    await fixture.query(
      "UPDATE public.leads SET deleted_at = now() - interval '400 days' WHERE id = $1",
      [leadId]
    );
    const reg = await migration.query("SELECT to_regprocedure('auth.uid()') AS fn");
    if (!reg.rows[0] || !reg.rows[0].fn) {
      const missing = new Error("auth.uid missing");
      missing.code = "42883";
      throw missing;
    }
    const userId = "00000000-0000-4000-8000-" + Date.now().toString().slice(-12).padStart(12, "0");
    await migration.query("BEGIN");
    await migration.query(
      "INSERT INTO public.owner_allowlist (user_id, email) VALUES ($1::uuid, $2)",
      [userId, `r4-purge-${Date.now()}@example.com`]
    );
    await migration.query("SELECT set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, aal: "aal2" }),
    ]);
    const gate = await migration.query("SELECT public.is_owner_aal2() AS allowed");
    if (!gate.rows[0] || gate.rows[0].allowed !== true) {
      throw new Error("purge refused: is_owner_aal2 positive control was not true");
    }
    const purged = await migration.query("SELECT public.purge_deleted_leads($1) AS n", [365]);
    const left = await migration.query(
      "SELECT (SELECT COUNT(*) FROM public.leads WHERE id = $1) AS leads, (SELECT COUNT(*) FROM public.notification_outbox WHERE id = $2) AS outbox",
      [leadId, outboxId]
    );
    await migration.query("COMMIT");
    const gone = Number(left.rows[0].leads) === 0 && Number(left.rows[0].outbox) === 0;
    setCase(13, gone && Number(purged.rows[0].n) >= 1, `purged=${purged.rows[0].n}`);
  } catch (err) {
    setCase(13, false, classifyDatabaseError(err) + " " + ((err && err.message) || err));
    try { await migration.query("ROLLBACK"); } catch { /* ignore */ }
  }

  // Case 14 — genuine hosted Supabase Auth + AAL2 is a separate evidence class.
  // Never mark PASS from simulated JWT (case 8) or from this local PG suite alone.
  const hostedAuth = results.find((row) => row.id === 14);
  if (hostedAuth) {
    hostedAuth.status = "NOT RUN";
    hostedAuth.pass = null;
    hostedAuth.detail =
      "Requires separate SCS_AUTHORIZE_HOSTED_AUTH_TESTS + live Supabase Auth session with AAL2. Simulated set_config JWT (case 8) is not hosted Auth evidence.";
  }

  return results;
  } finally {
    // Always close all five pools — including partial or complete preflight failure.
    await endPoolsQuietly(pools);
  }
}

async function main() {
  const authorized = process.env.SCS_AUTHORIZE_REAL_PG_TESTS === "true";
  // Preserve historical R4/R6/R7 NOT RUN files untouched. Write NEW M7B evidence only.
  const reportPath = path.join(ROOT, "qa-m6b", "M7B-POSTGRES-INTEGRATION-NOT-RUN-20261124.json");
  const historicalR4 = path.join(ROOT, "qa-m6b", "M7A-R4-POSTGRES-INTEGRATION-NOT-RUN-20261123.json");
  const historicalR6 = path.join(ROOT, "qa-m6b", "M7A-R6-POSTGRES-INTEGRATION-NOT-RUN-20261123.json");
  const historicalR7 = path.join(ROOT, "qa-m6b", "M7A-R7-POSTGRES-INTEGRATION-NOT-RUN-20261123.json");
  if (!authorized) {
    const report = notRunReport();
    report.suite = "m7b-postgres-integration-20261124";
    report.note =
      "Historical R4/R6/R7 NOT RUN preserved unchanged. Case 8 is simulated JWT claims only; case 14 hosted Auth/AAL2 remains a separate NOT RUN evidence class. M7B local mock/static corrections do NOT constitute real PostgreSQL evidence.";
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify(
        {
          result: "NOT RUN",
          cases: report.cases.length,
          executed: false,
          reportPath,
          historicalR4Preserved: fs.existsSync(historicalR4),
          historicalR6Preserved: fs.existsSync(historicalR6),
          historicalR7Preserved: fs.existsSync(historicalR7),
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  const cases = await runAuthorized();
  // Case 14 must never count as a real-PG pass/fail — hosted Auth is separate.
  const scored = cases.filter((item) => item.id !== 14);
  const failed = scored.filter((item) => item.pass !== true);
  const hostedAuth = cases.find((item) => item.id === 14);
  if (hostedAuth) {
    hostedAuth.status = "NOT RUN";
    hostedAuth.pass = null;
  }
  const report = {
    suite: "m7b-postgres-integration-20261124",
    evidenceClass: "real-postgresql",
    executed: true,
    result: failed.length ? "FAIL" : "PASS",
    ok: failed.length === 0,
    note: "Case 14 hosted Auth/AAL2 remains NOT RUN unless separately authorized. Historical R4/R6/R7 NOT RUN preserved. Fixture identity = scs_test_admin via DATABASE_TEST_ADMIN_URL.",
    cases,
  };
  // Authorized runs still write a distinct M7B evidence path — never overwrite R7.
  const authorizedPath = path.join(ROOT, "qa-m6b", "M7B-POSTGRES-INTEGRATION-RESULTS-20261124.json");
  fs.writeFileSync(authorizedPath, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      { result: report.result, failed: failed.map((item) => item.name), reportPath: authorizedPath },
      null,
      2
    )
  );
  process.exit(failed.length ? 1 : 0);
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
