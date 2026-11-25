/**
 * Offline tests for the Option C administrative utility.
 * No network, no package install, and no live authorization in the process environment.
 */

import { EventEmitter } from "node:events";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import { ALLOWED_ROLES, REFUSED_ROLES } from "../lib/allowlist.mjs";
import { EXPECTED_EDGES, interpretLoginProbe } from "../lib/authority.mjs";
import { LIVE_AUTHORIZATION_ENV, LIVE_AUTHORIZATION_PHRASE } from "../lib/authorization.mjs";
import { CODES } from "../lib/errors.mjs";
import { createLogger } from "../lib/logger.mjs";
import { executePlan } from "../lib/orchestrator.mjs";
import { assertPasswordBuffer, assertUniqueRolePasswords } from "../lib/password-policy.mjs";
import { checkPublicExclusion } from "../lib/public-exclusion.mjs";
import {
  RFC7677,
  SYNTHETIC_SERIALIZATION,
  buildVerifier,
  rfc7677VectorMatches,
  syntheticSerializationMatches,
} from "../lib/scram.mjs";
import { runSelfTest } from "../lib/self-test.mjs";
import {
  SET_LOCAL_PGAUDIT,
  SQL_ADMIN_ATTRS,
  SQL_COMMIT,
  SQL_IDENTITY,
  SQL_LOG_READBACK,
  SQL_PGAUDIT_PROBE,
  SQL_SETTINGS,
  alterRolePasswordStatement,
} from "../lib/statements.mjs";
import { bindInterrupts, createTerminalController, readConfirmedPassword } from "../lib/terminal.mjs";
import { PATH_A_HOST, assessAdminTls, openAdminClient } from "../lib/tls-gate.mjs";
import { main } from "../bin/option-c-admin.mjs";

const root = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const cli = path.join(root, "tools", "option-c-admin", "bin", "option-c-admin.mjs");
const networkAttempts = [];
net.Socket.prototype.connect = function connectBlocked() {
  networkAttempts.push("connect");
  throw new Error("network forbidden");
};

const SYNTHETIC_CA = "-----BEGIN CERTIFICATE-----\nSYNTHETIC-NOT-A-CA\n-----END CERTIFICATE-----\n";
const ADMIN_PASSWORD = "synthetic-admin-password-not-secret";

function rolePasswords() {
  return {
    scs_intake_runtime: Buffer.from("CANARY-PASSWORD-NOT-SECRET-INTAKE01"),
    scs_notify_worker: Buffer.from("CANARY-PASSWORD-NOT-SECRET-NOTIFY01"),
    scs_owner_admin: Buffer.from("CANARY-PASSWORD-NOT-SECRET-OWNER001"),
    scs_test_admin: Buffer.from("CANARY-PASSWORD-NOT-SECRET-FIXTURE1"),
  };
}

function authEnv() {
  return { [LIVE_AUTHORIZATION_ENV]: LIVE_AUTHORIZATION_PHRASE };
}

function planOptions(extra = {}) {
  return {
    env: extra.env || authEnv(),
    argv: extra.argv || ["--live"],
    transport: extra.transport || "mock",
    passwords: extra.passwords || rolePasswords(),
    saltFor: extra.saltFor || (() => Buffer.from("0123456789abcdef")),
    canaryLogsClear: Object.hasOwn(extra, "canaryLogsClear") ? extra.canaryLogsClear : true,
    log: extra.log,
    resumeAfter: extra.resumeAfter,
    confirmCanary: extra.confirmCanary,
    skipCanary: extra.skipCanary,
  };
}

function edgesFor(role, edges = EXPECTED_EDGES[role]) {
  return edges.map((edge) => ({
    role_name: role,
    rolcanlogin: true,
    rolinherit: false,
    rolsuper: false,
    rolcreaterole: false,
    rolcreatedb: false,
    rolreplication: false,
    rolbypassrls: false,
    member_name: edge.member,
    grantor_name: edge.grantor,
    admin_option: edge.admin,
    inherit_option: edge.inherit,
    set_option: edge.set,
  }));
}

const DEFAULT_SETTINGS = [
  { name: "password_encryption", setting: "scram-sha-256" },
  { name: "scram_iterations", setting: "4096" },
  { name: "createrole_self_grant", setting: "" },
  { name: "server_version_num", setting: "170012" },
];

function createMock(behavior = {}) {
  const calls = [];
  let pgauditSet = false;
  const logRow = behavior.logRow || {
    log_statement: "none",
    log_min_error_statement: "panic",
    log_min_messages: "fatal",
    pg_stat_statements_track: "none",
  };
  return {
    calls,
    async query(text) {
      calls.push(text);
      if (typeof behavior.before === "function") {
        const failure = behavior.before(text, calls);
        if (failure) throw failure;
      }
      if (text === SQL_IDENTITY) {
        return { rows: [behavior.identity || { current_user: "postgres", session_user: "postgres" }] };
      }
      if (text === SQL_ADMIN_ATTRS) {
        return { rows: [behavior.admin || { rolsuper: false, rolcreaterole: true, rolcanlogin: true }] };
      }
      if (text === SQL_SETTINGS) return { rows: behavior.settings || DEFAULT_SETTINGS };
      if (text === SQL_PGAUDIT_PROBE) {
        if (!behavior.pgaudit) return { rows: [{ pgaudit_log: null }] };
        return { rows: [{ pgaudit_log: pgauditSet ? "none" : "ddl" }] };
      }
      if (text === SET_LOCAL_PGAUDIT) {
        pgauditSet = true;
        return { rows: [] };
      }
      if (text === SQL_LOG_READBACK) return { rows: [{ ...logRow }] };
      if (text.startsWith("SELECT r.rolname")) {
        const role = ALLOWED_ROLES.find((name) => text.includes(`'${name}'`));
        if (behavior.membershipFor) return { rows: behavior.membershipFor(role) };
        return { rows: edgesFor(role) };
      }
      if (text.startsWith("SELECT rolcanlogin")) {
        return { rows: [behavior.shape || { rolcanlogin: true, has_secret: true, scram_form: true }] };
      }
      return { rows: [] };
    },
  };
}

function countPrefix(calls, prefix) {
  return calls.filter((sql) => sql.startsWith(prefix)).length;
}

function assertSuppressedBefore(calls, alterPrefix) {
  const alterAt = calls.findIndex((sql) => sql.startsWith(alterPrefix));
  assert.equal(alterAt > 0, true);
  let begin = -1;
  for (let i = alterAt - 1; i >= 0; i -= 1) {
    if (calls[i] === "BEGIN") {
      begin = i;
      break;
    }
  }
  assert.equal(begin >= 0, true);
  const slice = calls.slice(begin, alterAt);
  assert.equal(slice.includes("SET LOCAL log_statement = 'none'"), true);
  assert.equal(slice.includes("SET LOCAL log_min_error_statement = 'panic'"), true);
  assert.equal(slice.includes("SET LOCAL log_min_messages = 'fatal'"), true);
  assert.equal(slice.includes("SET LOCAL pg_stat_statements.track = 'none'"), true);
  assert.equal(slice.some((sql) => sql.startsWith("SELECT current_setting('log_statement')")), true);
}

function childEnv() {
  const env = { ...process.env };
  delete env[LIVE_AUTHORIZATION_ENV];
  delete env.DATABASE_URL;
  delete env.SUPABASE_DB_URL;
  delete env.PGPASSWORD;
  return env;
}

test("RFC 7677 vector and PostgreSQL verifier serialization", () => {
  assert.equal(rfc7677VectorMatches(), true);
  assert.equal(syntheticSerializationMatches(), true);
  const password = Buffer.from(SYNTHETIC_SERIALIZATION.password);
  const salt = Buffer.from(SYNTHETIC_SERIALIZATION.saltAscii);
  const verifier = buildVerifier(password, { salt, iterations: 4096 });
  assert.equal(verifier, SYNTHETIC_SERIALIZATION.verifier);
  const other = buildVerifier(password, { salt: Buffer.from(salt), iterations: 10000 });
  assert.equal(other.startsWith("SCRAM-SHA-256$10000:"), true);
  assert.equal(other === verifier, false);
  password.fill(0);
  salt.fill(0);
});

test("malformed SCRAM inputs and verifier injection are refused", () => {
  const password = Buffer.from(SYNTHETIC_SERIALIZATION.password);
  assert.throws(
    () => buildVerifier(password, { salt: Buffer.alloc(15, 1), iterations: 4096 }),
    (err) => err.code === CODES.SCRAM_FORMAT
  );
  assert.throws(
    () => buildVerifier(password, { salt: Buffer.alloc(16, 1), iterations: 0 }),
    (err) => err.code === CODES.SCRAM_FORMAT
  );
  const evil = "SCRAM-SHA-256$4096:aa$bb:cc'; DROP ROLE postgres; --";
  assert.throws(
    () => alterRolePasswordStatement("scs_intake_runtime", evil),
    (err) => err.code === CODES.INJECTION && err.message === CODES.INJECTION
  );
  assert.throws(
    () => alterRolePasswordStatement("scs_intake_runtime'; DROP ROLE postgres; --", RFC7677.verifier),
    (err) => err.code === CODES.ALLOWLIST_DENIED && err.message === CODES.ALLOWLIST_DENIED
  );
  password.fill(0);
});

test("password policy rejects short, non-ASCII, and reused secrets", () => {
  assert.throws(() => assertPasswordBuffer(Buffer.from("short-password-value-31-chars!")), (err) => err.code === CODES.PASSWORD_POLICY);
  assert.equal(Buffer.from("short-password-value-31-chars!").length < 32, true);
  const spaced = Buffer.alloc(32, 0x41);
  spaced[0] = 0x20;
  assert.throws(() => assertPasswordBuffer(spaced), (err) => err.code === CODES.PASSWORD_POLICY);
  const del = Buffer.alloc(32, 0x41);
  del[31] = 0x7f;
  assert.throws(() => assertPasswordBuffer(del), (err) => err.code === CODES.PASSWORD_POLICY);
  const high = Buffer.alloc(32, 0x41);
  high[1] = 0xc3;
  assert.throws(() => assertPasswordBuffer(high), (err) => err.code === CODES.PASSWORD_POLICY);
  const reused = rolePasswords();
  reused.scs_notify_worker = Buffer.from(reused.scs_intake_runtime);
  assert.throws(() => assertUniqueRolePasswords(reused), (err) => err.code === CODES.PASSWORD_REUSED);
});

test("allowlist is the four password-bearing roles and refuses everyone else", () => {
  for (const role of REFUSED_ROLES) {
    assert.throws(() => alterRolePasswordStatement(role, RFC7677.verifier), (err) => err.code === CODES.ALLOWLIST_DENIED);
  }
  assert.throws(() => alterRolePasswordStatement("SCS_INTAKE_RUNTIME", RFC7677.verifier), (err) => err.code === CODES.ALLOWLIST_DENIED);
  assert.throws(() => alterRolePasswordStatement("scs_option_c_log_canary", RFC7677.verifier), (err) => err.code === CODES.ALLOWLIST_DENIED);
  assert.equal(ALLOWED_ROLES.length, 4);
});

test("logging helper drops secrets and non-allowlisted fields", () => {
  const lines = [];
  const log = createLogger((line) => lines.push(line));
  log.event({
    phase: "role",
    role: "scs_intake_runtime",
    result: "PASS",
    code: CODES.ROLE_PASS,
    password: "CANARY-PASSWORD-NOT-SECRET-INTAKE01",
    sql: "ALTER ROLE secret",
  });
  assert.equal(lines.length, 1);
  assert.equal(lines[0].includes("CANARY-PASSWORD-NOT-SECRET-INTAKE01"), false);
  assert.equal(lines[0].includes("ALTER ROLE"), false);
  log.event({ phase: "role", role: RFC7677.verifier, result: "PASS", code: CODES.ROLE_PASS });
  assert.equal(lines[1].includes("SCRAM-SHA-256$"), false);
  assert.equal(lines[1].includes(CODES.LOG_HYGIENE), true);
});

test("terminal state is restored on success, mismatch, error, interrupt byte, and signal", async () => {
  function fakeStdin() {
    const stdin = new EventEmitter();
    stdin.isTTY = true;
    stdin.isRaw = false;
    stdin.setRawMode = (value) => {
      stdin.isRaw = value;
    };
    return stdin;
  }

  const okStdin = fakeStdin();
  const ok = createTerminalController(okStdin);
  const pending = readConfirmedPassword(ok);
  const secret = "CANARY-PASSWORD-NOT-SECRET-INTAKE01";
  okStdin.emit("data", Buffer.from(`${secret}\n`));
  await Promise.resolve();
  okStdin.emit("data", Buffer.from(`${secret}\n`));
  const confirmed = await pending;
  assert.equal(confirmed.toString("utf8"), secret);
  assert.equal(okStdin.isRaw, false);
  confirmed.fill(0);

  const badStdin = fakeStdin();
  const bad = createTerminalController(badStdin);
  const mismatch = readConfirmedPassword(bad);
  badStdin.emit("data", Buffer.from(`${secret}\n`));
  await Promise.resolve();
  badStdin.emit("data", Buffer.from("CANARY-PASSWORD-NOT-SECRET-OTHER001\n"));
  await assert.rejects(mismatch, (err) => err.code === CODES.PASSWORD_MISMATCH);
  assert.equal(badStdin.isRaw, false);

  const errStdin = fakeStdin();
  const failing = createTerminalController(errStdin);
  const crashed = failing.readHiddenLine();
  assert.equal(errStdin.isRaw, true);
  errStdin.emit("error", new Error("stdin"));
  await assert.rejects(crashed, (err) => err.code === CODES.TERMINAL);
  assert.equal(errStdin.isRaw, false);

  const intStdin = fakeStdin();
  const interrupted = createTerminalController(intStdin);
  const stopped = interrupted.readHiddenLine();
  intStdin.emit("data", Buffer.from([0x03]));
  await assert.rejects(stopped, (err) => err.code === CODES.TERMINAL);
  assert.equal(intStdin.isRaw, false);

  const sigStdin = fakeStdin();
  const signaled = createTerminalController(sigStdin);
  const emitter = new EventEmitter();
  const unbind = bindInterrupts(emitter, signaled);
  const hanging = signaled.readHiddenLine();
  assert.equal(sigStdin.isRaw, true);
  emitter.emit("SIGINT");
  assert.equal(sigStdin.isRaw, false);
  sigStdin.emit("data", Buffer.from("\n"));
  await hanging;
  unbind();
  assert.equal(sigStdin.isRaw, false);
});

test("unauthorized plan and unsafe argv do not touch a database", async () => {
  const db = createMock();
  await assert.rejects(
    () => executePlan(db, planOptions({ env: {}, argv: ["--live"] })),
    (err) => err.code === CODES.LIVE_UNAUTHORIZED
  );
  assert.equal(db.calls.length, 0);
  const stdout = { chunks: [], write(line) { this.chunks.push(line); } };
  const status = await main(["--live", "--password=CANARY-PASSWORD-NOT-SECRET-INTAKE01"], {}, { stdout });
  assert.equal(status, 1);
  assert.equal(stdout.chunks.join("").includes("CANARY-PASSWORD"), false);
  assert.equal(stdout.chunks.join("").includes(CODES.ENV_SECRET_FORBIDDEN), true);
});

test("canary is mandatory and logging readback happens before every credential statement", async () => {
  const lines = [];
  const db = createMock();
  const log = createLogger((line) => lines.push(line));
  let duringConfirm = false;
  await executePlan(db, planOptions({
    log,
    canaryLogsClear: false,
    confirmCanary: async () => {
      duringConfirm = true;
      assert.equal(countPrefix(db.calls, 'ALTER ROLE "scs_option_c_log_canary"'), 1);
      assert.equal(countPrefix(db.calls, 'ALTER ROLE "scs_intake_runtime"'), 0);
      return true;
    },
  }));
  assert.equal(duringConfirm, true);
  assertSuppressedBefore(db.calls, 'ALTER ROLE "scs_option_c_log_canary"');
  for (const role of ALLOWED_ROLES) {
    assertSuppressedBefore(db.calls, `ALTER ROLE "${role}"`);
    assert.equal(countPrefix(db.calls, `ALTER ROLE "${role}"`), 1);
  }
  assert.equal(db.calls.at(-1), 'DROP ROLE IF EXISTS "scs_option_c_log_canary"');
  assert.equal(countPrefix(db.calls, SET_LOCAL_PGAUDIT), 0);
  const rendered = lines.join("");
  for (const password of Object.values(rolePasswords())) {
    assert.equal(rendered.includes(password.toString("utf8")), false);
    password.fill(0);
  }
  assert.equal(rendered.includes("SCRAM-SHA-256$"), false);
  assert.equal(rendered.includes("postgresql://"), false);
});

test("pgaudit suppression is verified when the setting exists", async () => {
  const db = createMock({ pgaudit: true });
  await executePlan(db, planOptions());
  assert.equal(countPrefix(db.calls, SET_LOCAL_PGAUDIT) > 0, true);
  const alterAt = db.calls.findIndex((sql) => sql.startsWith('ALTER ROLE "scs_option_c_log_canary"'));
  const setAt = db.calls.lastIndexOf(SET_LOCAL_PGAUDIT, alterAt);
  assert.equal(setAt > 0 && setAt < alterAt, true);
});

test("a logging readback mismatch blocks the credential statement", async () => {
  const db = createMock({
    logRow: {
      log_statement: "ddl",
      log_min_error_statement: "panic",
      log_min_messages: "fatal",
      pg_stat_statements_track: "none",
    },
  });
  await assert.rejects(() => executePlan(db, planOptions()), (err) => err.code === CODES.LOG_SETTING);
  assert.equal(countPrefix(db.calls, "ALTER ROLE"), 0);
  assert.equal(db.calls.includes("ROLLBACK"), true);
});

test("exact membership edges are required before each role alteration", async () => {
  const db = createMock({
    membershipFor(role) {
      if (role === "scs_owner_admin") {
        return edgesFor(role, [
          EXPECTED_EDGES.scs_owner_admin[0],
          { member: "postgres", grantor: "postgres", admin: false, inherit: false, set: true },
        ]);
      }
      return edgesFor(role);
    },
  });
  await assert.rejects(() => executePlan(db, planOptions()), (err) => {
    assert.equal(err.code, CODES.PARTIAL);
    assert.equal(err.causeCode, CODES.MEMBERSHIP);
    assert.deepEqual(err.completedRoles, ["scs_intake_runtime", "scs_notify_worker"]);
    assert.equal(err.failedRole, "scs_owner_admin");
    assert.equal(err.independentLogin, "NOT-RUN");
    return true;
  });
  assert.equal(countPrefix(db.calls, 'ALTER ROLE "scs_owner_admin"'), 0);
  assert.equal(countPrefix(db.calls, 'ALTER ROLE "scs_test_admin"'), 0);
  assert.equal(countPrefix(db.calls, 'ALTER ROLE "scs_intake_runtime"'), 1);
});

test("missing administrative edge blocks alteration", async () => {
  const db = createMock({
    membershipFor(role) {
      if (role === "scs_intake_runtime") return edgesFor(role, [EXPECTED_EDGES.scs_intake_runtime[1]]);
      return edgesFor(role);
    },
  });
  await assert.rejects(
    () => executePlan(db, planOptions()),
    (err) => err.code === CODES.PARTIAL && err.causeCode === CODES.MEMBERSHIP && err.completedRoles.length === 0
  );
  assert.equal(countPrefix(db.calls, 'ALTER ROLE "scs_intake_runtime"'), 0);
});

test("canary attestation failure drops the canary and alters no target role", async () => {
  const db = createMock();
  await assert.rejects(
    () => executePlan(db, planOptions({ canaryLogsClear: false })),
    (err) => err.code === CODES.CANARY_ATTESTATION
  );
  assert.equal(countPrefix(db.calls, 'ALTER ROLE "scs_option_c_log_canary"'), 1);
  assert.equal(countPrefix(db.calls, 'ALTER ROLE "scs_intake_runtime"'), 0);
  assert.equal(db.calls.at(-1), 'DROP ROLE IF EXISTS "scs_option_c_log_canary"');
});

test("skipping the canary is refused before any query", async () => {
  const db = createMock();
  await assert.rejects(() => executePlan(db, planOptions({ skipCanary: true })), (err) => err.code === CODES.CANARY_REQUIRED);
  assert.equal(db.calls.length, 0);
});

test("resume continues after a confirmed role and still repeats the canary", async () => {
  const db = createMock();
  const result = await executePlan(db, planOptions({ resumeAfter: "scs_notify_worker" }));
  assert.deepEqual(result.skippedRoles, ["scs_intake_runtime", "scs_notify_worker"]);
  assert.deepEqual(result.completedRoles, ["scs_owner_admin", "scs_test_admin"]);
  assert.equal(result.independentLogin, "NOT-RUN");
  assert.equal(countPrefix(db.calls, 'ALTER ROLE "scs_intake_runtime"'), 0);
  assert.equal(countPrefix(db.calls, 'ALTER ROLE "scs_notify_worker"'), 0);
  assert.equal(countPrefix(db.calls, 'ALTER ROLE "scs_option_c_log_canary"'), 1);
});

test("ambiguous commit is a partial result and does not continue", async () => {
  let commits = 0;
  const db = createMock({
    before(text) {
      if (text === SQL_COMMIT) {
        commits += 1;
        if (commits === 2) return new Error("commit failed");
      }
      return null;
    },
  });
  await assert.rejects(() => executePlan(db, planOptions()), (err) => {
    assert.equal(err.code, CODES.PARTIAL);
    assert.equal(err.ambiguous, true);
    assert.equal(err.failedRole, "scs_intake_runtime");
    assert.deepEqual(err.completedRoles, []);
    return true;
  });
  assert.equal(countPrefix(db.calls, 'ALTER ROLE "scs_notify_worker"'), 0);
});

test("preflight stops on encryption, iterations, and createrole_self_grant", async () => {
  const encryption = createMock({
    settings: DEFAULT_SETTINGS.map((row) => (
      row.name === "password_encryption" ? { ...row, setting: "md5" } : row
    )),
  });
  await assert.rejects(() => executePlan(encryption, planOptions()), (err) => err.code === CODES.ENCRYPTION);
  assert.equal(encryption.calls.includes("BEGIN"), false);

  const iterations = createMock({
    settings: DEFAULT_SETTINGS.filter((row) => row.name !== "scram_iterations"),
  });
  await assert.rejects(() => executePlan(iterations, planOptions()), (err) => err.code === CODES.ITERATIONS);

  const grant = createMock({
    settings: DEFAULT_SETTINGS.map((row) => (
      row.name === "createrole_self_grant" ? { ...row, setting: "set" } : row
    )),
  });
  await assert.rejects(() => executePlan(grant, planOptions()), (err) => err.code === CODES.PREFLIGHT);
  assert.equal(grant.calls.includes("BEGIN"), false);
});

test("independent login probe rules reject SET ROLE substitutes", () => {
  const pass = interpretLoginProbe({
    channel: "independent-login",
    currentUser: "scs_test_admin",
    sessionUser: "scs_test_admin",
    expectedRole: "scs_test_admin",
    wrongPasswordRejected: true,
  });
  assert.equal(pass.independentLogin, "PASS");
  assert.throws(
    () => interpretLoginProbe({
      channel: "set-role",
      currentUser: "scs_test_admin",
      sessionUser: "scs_test_admin",
      expectedRole: "scs_test_admin",
      wrongPasswordRejected: true,
    }),
    (err) => err.code === CODES.VERIFY_FAIL
  );
  assert.throws(
    () => interpretLoginProbe({
      channel: "independent-login",
      currentUser: "scs_test_admin",
      sessionUser: "scs_test_admin",
      expectedRole: "scs_test_admin",
      wrongPasswordRejected: false,
    }),
    (err) => err.code === CODES.VERIFY_FAIL
  );
});

test("TLS gate accepts only Path A and reuses the frozen helper", () => {
  const passwordBuffer = Buffer.from(ADMIN_PASSWORD);
  const env = { DATABASE_SSL_CA: SYNTHETIC_CA };
  const accepted = assessAdminTls({
    host: PATH_A_HOST,
    port: 5432,
    user: "postgres",
    database: "postgres",
    passwordBuffer,
    sslmode: "verify-full",
  }, env);
  assert.equal(accepted.host, PATH_A_HOST);
  assert.equal(accepted.port, 5432);
  assert.equal(accepted.rejectUnauthorized, true);
  assert.equal(accepted.connectionStringForwarded, false);
  assert.equal(JSON.stringify(accepted).includes(ADMIN_PASSWORD), false);
  passwordBuffer.fill(0);

  assert.throws(
    () => assessAdminTls({
      host: "aws-1-us-east-2.pooler.supabase.com",
      port: 5432,
      user: "postgres",
      database: "postgres",
      passwordBuffer: Buffer.from(ADMIN_PASSWORD),
    }, env),
    (err) => err.code === CODES.TLS_POOLER && err.message === CODES.TLS_POOLER
  );
  assert.throws(
    () => assessAdminTls({
      host: PATH_A_HOST,
      port: 6543,
      user: "postgres",
      database: "postgres",
      passwordBuffer: Buffer.from(ADMIN_PASSWORD),
    }, env),
    (err) => err.code === CODES.TLS_POOLER
  );
  assert.throws(
    () => assessAdminTls({
      host: PATH_A_HOST,
      port: 5432,
      user: "postgres.kfclinlrzfwodmichmci",
      database: "postgres",
      passwordBuffer: Buffer.from(ADMIN_PASSWORD),
    }, env),
    (err) => err.code === CODES.TLS_POOLER
  );
  assert.throws(
    () => assessAdminTls({
      host: `${PATH_A_HOST}.evil.example`,
      port: 5432,
      user: "postgres",
      database: "postgres",
      passwordBuffer: Buffer.from(ADMIN_PASSWORD),
    }, env),
    (err) => err.code === CODES.TLS_HOST
  );
  assert.throws(
    () => assessAdminTls({
      host: PATH_A_HOST,
      port: 5432,
      user: "postgres",
      database: "postgres",
      passwordBuffer: Buffer.from(ADMIN_PASSWORD),
      sslmode: "disable",
    }, env),
    (err) => err.code === CODES.TLS_INSECURE
  );
  assert.throws(
    () => assessAdminTls({
      host: PATH_A_HOST,
      port: 5432,
      user: "postgres",
      database: "postgres",
      passwordBuffer: Buffer.from(ADMIN_PASSWORD),
    }, { ...env, DATABASE_SSL_REJECT_UNAUTHORIZED: "false" }),
    (err) => err.code === CODES.TLS_INSECURE
  );
  const url = "postgresql://postgres:synthetic-admin-password-not-secret@db.kfclinlrzfwodmichmci.supabase.co:5432/postgres";
  assert.throws(
    () => assessAdminTls({
      host: PATH_A_HOST,
      port: 5432,
      user: "postgres",
      database: "postgres",
      passwordBuffer: Buffer.from(ADMIN_PASSWORD),
    }, { ...env, DATABASE_URL: url }),
    (err) => err.code === CODES.ENV_SECRET_FORBIDDEN && !err.message.includes("postgresql")
  );
});

test("live client construction refuses without the authorization flag", async () => {
  let constructed = 0;
  class FakeClient {
    constructor(config) {
      constructed += 1;
      this.options = config;
    }
    async connect() {
      this.connected = true;
    }
  }
  await assert.rejects(
    () => openAdminClient({
      env: {},
      argv: ["--live"],
      target: {
        host: PATH_A_HOST,
        port: 5432,
        user: "postgres",
        database: "postgres",
        passwordBuffer: Buffer.from(ADMIN_PASSWORD),
      },
    }, { Client: FakeClient }),
    (err) => err.code === CODES.LIVE_UNAUTHORIZED
  );
  assert.equal(constructed, 0);

  const passwordBuffer = Buffer.from(ADMIN_PASSWORD);
  const client = await openAdminClient({
    env: { ...authEnv(), DATABASE_SSL_CA: SYNTHETIC_CA },
    argv: ["--live"],
    target: {
      host: PATH_A_HOST,
      port: 5432,
      user: "postgres",
      database: "postgres",
      passwordBuffer,
      sslmode: "verify-full",
    },
  }, { Client: FakeClient });
  assert.equal(constructed, 1);
  assert.equal(client.connected, true);
  assert.equal(client.options.host, PATH_A_HOST);
  assert.equal(client.options.port, 5432);
  assert.equal(Object.hasOwn(client.options, "connectionString"), false);
  assert.equal(client.options.ssl.rejectUnauthorized, true);
  assert.equal(client.options.ssl.servername, PATH_A_HOST);
  passwordBuffer.fill(0);
});

test("CLI self-test passes and live mode stays unauthorized", async () => {
  assert.notEqual(process.env[LIVE_AUTHORIZATION_ENV], LIVE_AUTHORIZATION_PHRASE);
  const chunks = [];
  const status = await main(["--self-test"], childEnv(), { stdout: { write: (line) => chunks.push(line) } });
  assert.equal(status, 0);
  const rendered = chunks.join("");
  assert.equal(rendered.includes("SCRAM-SHA-256$"), false);
  assert.equal(rendered.includes("pencil"), false);
  assert.equal(rendered.includes(CODES.SELF_TEST), true);

  const missing = await main([], childEnv(), { stdout: { write() {} } });
  assert.equal(missing, 2);
  const live = await main(["--live"], childEnv(), { stdout: { write() {} }, Client: class { constructor() { throw new Error("constructed"); } } });
  assert.equal(live, 1);

  const spawned = spawnSync(process.execPath, [cli, "--self-test"], { encoding: "utf8", env: childEnv() });
  assert.equal(spawned.status, 0);
  assert.equal(String(spawned.stdout).includes("SCRAM-SHA-256$"), false);
  assert.equal(String(spawned.stderr).includes("SCRAM-SHA-256$"), false);
  const refused = spawnSync(process.execPath, [cli, "--live"], { encoding: "utf8", env: childEnv() });
  assert.equal(refused.status, 1);
  assert.equal(String(refused.stdout).includes(CODES.LIVE_UNAUTHORIZED), true);
  assert.equal(networkAttempts.length, 0);
});

test("public build allowlist and Netlify functions exclude the utility", () => {
  const report = checkPublicExclusion();
  assert.equal(report.ok, true, report.reasons.join(","));
  assert.equal(report.utilityPath, "tools/option-c-admin");
  assert.equal(report.functionDirectory, "netlify/functions");
});

test("frozen R4 inventory is unchanged", () => {
  const inventoryPath = path.join(root, "qa-m6b", "M7B-G2-R4-SUCCESSOR-HASH-INVENTORY-20261124.json");
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  assert.equal(inventory.length, 64);
  for (const entry of inventory) {
    const body = fs.readFileSync(path.join(root, entry.Path));
    const hash = crypto.createHash("sha256").update(body).digest("hex");
    assert.equal(hash, entry.Sha256);
    assert.equal(body.length, entry.Bytes);
  }
  const ps1 = path.join(os.tmpdir(), "scs-option-c-frozen-digest.ps1");
  fs.writeFileSync(
    ps1,
    [
      "$j = Get-Content -Raw -Path $args[0] | ConvertFrom-Json",
      "$lines = foreach ($e in ($j | Sort-Object Path)) { \"{0}`t{1}`t{2}\" -f $e.Path, $e.Sha256, $e.Bytes }",
      "$body = $lines -join \"`n\"",
      "$sha = [System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($body))",
      "($sha | ForEach-Object { $_.ToString('x2') }) -join ''",
    ].join("\n"),
    "utf8"
  );
  const digest = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1, inventoryPath],
    { encoding: "utf8" }
  );
  assert.equal(digest.status, 0);
  assert.equal(String(digest.stdout).trim(), "683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d");
});

test("self-test writer stays free of verifier text", () => {
  const lines = [];
  const status = runSelfTest((line) => lines.push(line));
  assert.equal(status, 0);
  assert.equal(lines.join("").includes(RFC7677.verifier), false);
  assert.equal(lines.join("").includes("pencil"), false);
});
