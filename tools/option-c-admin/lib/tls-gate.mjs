/**
 * Path A TLS gate. Reuses the frozen explicit-field helper at
 * netlify/functions/_lib/pg-client.js. This module does not modify that file
 * and does not connect.
 *
 * The helper accepts pooler-shaped URLs for the deployed Functions. Option C
 * adds a stricter gate: exact staging host, port 5432, user postgres,
 * database postgres, and rejection of pooler hosts, dotted pooler usernames,
 * port 6543, and any TLS mode other than verify-full with rejectUnauthorized.
 */

import { timingSafeEqual } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { CODES, coded } from "./errors.mjs";

const helperPath = fileURLToPath(
  new URL("../../../netlify/functions/_lib/pg-client.js", import.meta.url)
);
const requireFromHelper = createRequire(helperPath);

export const PATH_A_HOST = "db.kfclinlrzfwodmichmci.supabase.co";
export const PATH_A_PORT = 5432;
export const FROZEN_TLS_HELPER_PATH = "netlify/functions/_lib/pg-client.js";

/**
 * Fixed non-secret userinfo password for the frozen helper's URL parser.
 * The real administrator secret is never interpolated into this URL.
 * The helper can parse a connection string, and it also accepts a separate
 * password field on inspectEffectivePgSsl. Only the placeholder goes in the URL.
 * The real secret is passed as a Buffer on that separate field and on the
 * client config. If the real buffer equals this placeholder, assessment fails
 * closed so the placeholder cannot become the secret.
 */
export const ADMIN_URL_PASSWORD_PLACEHOLDER = "option-c-placeholder-not-a-secret";

export function adminHelperUrl() {
  return `postgresql://postgres:${ADMIN_URL_PASSWORD_PLACEHOLDER}@${PATH_A_HOST}:${PATH_A_PORT}/postgres?sslmode=verify-full`;
}

const SECRET_ENV_KEYS = ["DATABASE_URL", "SUPABASE_DB_URL", "PGPASSWORD"];

export function loadFrozenTlsHelper() {
  return requireFromHelper(helperPath);
}

function rejectSecretEnv(env) {
  for (const key of SECRET_ENV_KEYS) {
    if (env[key]) throw coded(CODES.ENV_SECRET_FORBIDDEN);
  }
}

function rejectInsecureRequest(target, env) {
  const sslmode = target.sslmode == null ? "" : String(target.sslmode).toLowerCase();
  if (sslmode && sslmode !== "verify-full") throw coded(CODES.TLS_INSECURE);
  const pgssl = String(env.PGSSLMODE || "").toLowerCase();
  const databaseSsl = String(env.DATABASE_SSL || "").toLowerCase();
  const rejectFlag = String(env.DATABASE_SSL_REJECT_UNAUTHORIZED || "").toLowerCase();
  if (
    rejectFlag === "false" ||
    pgssl === "disable" ||
    pgssl === "allow" ||
    pgssl === "prefer" ||
    pgssl === "require" ||
    pgssl === "verify-ca" ||
    databaseSsl === "disable"
  ) {
    throw coded(CODES.TLS_INSECURE);
  }
}

export function assessAdminTls(target, env, deps = {}) {
  if (!target || typeof target !== "object" || !env || typeof env !== "object") {
    throw coded(CODES.TLS_INSECURE);
  }
  rejectSecretEnv(env);
  const host = typeof target.host === "string" ? target.host : "";
  const port = target.port;
  const user = typeof target.user === "string" ? target.user : "";
  const database = typeof target.database === "string" ? target.database : "";
  const hostLower = host.toLowerCase();
  if (hostLower.includes("pooler") || port === 6543 || user.includes(".")) {
    throw coded(CODES.TLS_POOLER);
  }
  if (hostLower !== PATH_A_HOST) throw coded(CODES.TLS_HOST);
  if (port !== PATH_A_PORT) throw coded(CODES.TLS_PORT);
  if (user !== "postgres" || database !== "postgres") throw coded(CODES.TLS_HOST);
  rejectInsecureRequest(target, env);
  if (!Buffer.isBuffer(target.passwordBuffer) || target.passwordBuffer.length < 1) {
    throw coded(CODES.TLS_INSECURE);
  }
  if (!env.DATABASE_SSL_CA && !env.DATABASE_SSL_CA_PATH) throw coded(CODES.TLS_INSECURE);
  const placeholder = Buffer.from(ADMIN_URL_PASSWORD_PLACEHOLDER, "utf8");
  try {
    if (
      target.passwordBuffer.length === placeholder.length &&
      timingSafeEqual(target.passwordBuffer, placeholder)
    ) {
      throw coded(CODES.SECRET_IN_URL);
    }
  } finally {
    placeholder.fill(0);
  }

  const url = adminHelperUrl();
  const helper = deps.helper || loadFrozenTlsHelper();
  let fields;
  let ssl;
  try {
    fields = helper.parseApprovedConnectionFields(url);
    ssl = helper.buildSslOptions(
      {
        SCS_ENV: "staging",
        DATABASE_SSL_CA: env.DATABASE_SSL_CA,
        DATABASE_SSL_CA_PATH: env.DATABASE_SSL_CA_PATH,
      },
      { isProdLike: true, databaseUrl: url }
    );
  } catch {
    throw coded(CODES.TLS_HELPER);
  }
  if (
    !ssl ||
    ssl === false ||
    ssl.rejectUnauthorized !== true ||
    typeof ssl.checkServerIdentity !== "function" ||
    !ssl.ca
  ) {
    throw coded(CODES.TLS_INSECURE);
  }
  if (
    fields.host !== PATH_A_HOST ||
    fields.port !== PATH_A_PORT ||
    fields.user !== "postgres" ||
    fields.database !== "postgres" ||
    fields.normalizedSslmode !== "verify-full"
  ) {
    throw coded(CODES.TLS_HOST);
  }
  const sslOptions = {
    rejectUnauthorized: true,
    checkServerIdentity: ssl.checkServerIdentity,
    ca: ssl.ca,
    servername: PATH_A_HOST,
  };
  let effective;
  try {
    effective = helper.inspectEffectivePgSsl({
      user: "postgres",
      password: target.passwordBuffer,
      host: PATH_A_HOST,
      port: PATH_A_PORT,
      database: "postgres",
      ssl: sslOptions,
    });
  } catch {
    throw coded(CODES.TLS_HELPER);
  }
  if (
    !effective ||
    effective.sslIsFalse ||
    !effective.sslIsObject ||
    effective.rejectUnauthorized !== true ||
    !effective.hasCheckServerIdentity
  ) {
    throw coded(CODES.TLS_INSECURE);
  }
  return {
    host: PATH_A_HOST,
    port: PATH_A_PORT,
    database: "postgres",
    user: "postgres",
    normalizedSslmode: "verify-full",
    rejectUnauthorized: true,
    hasCheckServerIdentity: true,
    hasCa: true,
    servername: PATH_A_HOST,
    connectionStringForwarded: false,
    ssl: sslOptions,
  };
}

/**
 * Opens a client only after the live authorization flag and only with an
 * injected constructor, or with the real pg constructor when allowRealClient
 * is set by the CLI after that same flag. This assignment does not call it
 * with allowRealClient.
 */
export async function openAdminClient(spec, deps = {}) {
  const env = spec && spec.env;
  const argv = spec && spec.argv;
  const { liveAuthorized } = await import("./authorization.mjs");
  if (!liveAuthorized(env, argv)) throw coded(CODES.LIVE_UNAUTHORIZED);
  const assessed = assessAdminTls(spec.target, env, deps);
  let Client = deps.Client;
  if (!Client) {
    if (deps.allowRealClient !== true) throw coded(CODES.LIVE_UNAUTHORIZED);
    const pg = requireFromHelper("pg");
    Client = pg.Client || (pg.default && pg.default.Client);
    if (!Client) throw coded(CODES.TLS_HELPER);
  }
  const client = new Client({
    host: assessed.host,
    port: assessed.port,
    user: assessed.user,
    database: assessed.database,
    password: spec.target.passwordBuffer,
    ssl: assessed.ssl,
  });
  const options = client && client.options ? client.options : client;
  if (options && Object.prototype.hasOwnProperty.call(options, "connectionString")) {
    const secondary = await closeClient(client);
    const rejected = coded(CODES.TLS_INSECURE);
    if (secondary) rejected.secondaryCode = secondary;
    throw rejected;
  }
  try {
    if (typeof client.connect === "function") await client.connect();
    return client;
  } catch (err) {
    const primary = err && err.publicCode ? err : coded(CODES.INTERNAL);
    const secondary = await closeClient(client);
    if (secondary && !primary.secondaryCode) primary.secondaryCode = secondary;
    throw primary;
  }
}

async function closeClient(client) {
  if (!client || typeof client.end !== "function") return null;
  try {
    await client.end();
    return null;
  } catch {
    return CODES.CLIENT_CLEANUP;
  }
}

/**
 * Allocates one client and closes it on every exit, including connection
 * failure, work failure, and cancellation. A close failure does not replace
 * the primary error. It is recorded as secondaryCode.
 */
export async function withAdminClient(spec, deps, work) {
  if (typeof work !== "function") throw coded(CODES.INTERNAL);
  let client = null;
  let primary = null;
  let result;
  try {
    client = await openAdminClient(spec, deps || {});
    result = await work(client);
  } catch (err) {
    primary = err && err.publicCode ? err : coded(CODES.INTERNAL);
  }
  if (client) {
    const secondary = await closeClient(client);
    if (secondary) {
      if (primary) {
        if (!primary.secondaryCode) primary.secondaryCode = secondary;
      } else {
        primary = coded(secondary);
      }
    }
  }
  if (primary) throw primary;
  return result;
}
