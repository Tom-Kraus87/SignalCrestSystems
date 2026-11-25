/**
 * Option C administrative utility.
 * Default and --self-test are offline. --live refuses unless the owner
 * authorization flag is present. This process does not set that flag.
 */

import { randomBytes, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { assertArgvSafe, assertResumeRejected, liveAuthorized, LIVE_AUTHORIZATION_ENV, LIVE_AUTHORIZATION_PHRASE } from "../lib/authorization.mjs";
import { CODES, RESULTS, isFixedCode, isResult } from "../lib/errors.mjs";
import { CANARY_CONFIRMATION, executePlan } from "../lib/orchestrator.mjs";
import { runSelfTest } from "../lib/self-test.mjs";
import { PATH_A_HOST, PATH_A_PORT, withAdminClient } from "../lib/tls-gate.mjs";
import { bindInterrupts, createTerminalController, readConfirmedPassword } from "../lib/terminal.mjs";
import { ALLOWED_ROLES } from "../lib/allowlist.mjs";

function writeResult(stdout, result, code, extra) {
  const payload = { result, code };
  if (extra && isFixedCode(extra.secondaryCode)) payload.secondaryCode = extra.secondaryCode;
  if (extra && Array.isArray(extra.completedRoles)) payload.completedRoles = extra.completedRoles;
  if (extra && typeof extra.failedRole === "string") payload.failedRole = extra.failedRole;
  stdout.write(`${JSON.stringify(payload)}\n`);
}

export async function main(argv, env = {}, deps = {}) {
  const stdout = deps.stdout || process.stdout;
  const args = Array.isArray(argv) ? argv : [];
  try {
    assertArgvSafe(args);
    assertResumeRejected(args);
  } catch (err) {
    writeResult(stdout, RESULTS.FAILED, err.publicCode || CODES.ENV_SECRET_FORBIDDEN);
    return 1;
  }
  if (args.includes("--self-test") && !args.includes("--live")) {
    return runSelfTest((line) => stdout.write(line));
  }
  if (!args.includes("--live")) {
    writeResult(stdout, RESULTS.FAILED, CODES.MODE_REQUIRED);
    return 2;
  }
  if (!liveAuthorized(env, args)) {
    writeResult(stdout, RESULTS.FAILED, CODES.LIVE_UNAUTHORIZED);
    return 1;
  }
  if (deps.allowRealClient !== true && !deps.Client) {
    writeResult(stdout, RESULTS.FAILED, CODES.LIVE_UNAUTHORIZED);
    return 1;
  }
  try {
    const outcome = await runLive(args, env, deps);
    if (!outcome || outcome.result !== RESULTS.PROVISIONED_UNVERIFIED) {
      writeResult(stdout, RESULTS.FAILED, CODES.VERIFY_FAIL);
      return 1;
    }
    writeResult(stdout, RESULTS.PROVISIONED_UNVERIFIED, CODES.ROLE_PASS);
    return 0;
  } catch (err) {
    const result = err && isResult(err.result) ? err.result : RESULTS.FAILED;
    writeResult(stdout, result, err && err.publicCode ? err.publicCode : CODES.INTERNAL, {
      secondaryCode: err && err.secondaryCode,
      completedRoles: err && err.completedRoles,
      failedRole: err && err.failedRole,
    });
    return 1;
  }
}

async function runLive(argv, env, deps) {
  const stdin = deps.stdin || process.stdin;
  const terminal = createTerminalController(stdin);
  const unbind = bindInterrupts(deps.process || process, terminal, {
    onInterrupt: () => {
      if (deps.process == null) process.exit(1);
    },
  });
  const passwords = {};
  const held = [];
  let primary = null;
  try {
    for (const role of ALLOWED_ROLES) {
      const password = await readConfirmedPassword(terminal);
      passwords[role] = password;
      held.push(password);
    }
    const adminPassword = await readConfirmedPassword(terminal);
    held.push(adminPassword);
    const target = {
      host: PATH_A_HOST,
      port: PATH_A_PORT,
      user: "postgres",
      database: "postgres",
      passwordBuffer: adminPassword,
      sslmode: "verify-full",
    };
    const tlsEnv = {
      DATABASE_SSL_CA: env.DATABASE_SSL_CA,
      DATABASE_SSL_CA_PATH: env.DATABASE_SSL_CA_PATH,
    };
    return await withAdminClient(
      { env: { ...env, ...tlsEnv }, argv, target },
      { Client: deps.Client, allowRealClient: deps.allowRealClient === true },
      async (client) => {
        const db = deps.db || {
          query: (text, params) => client.query(text, params),
        };
        return executePlan(db, {
          env,
          argv,
          transport: "injected-client",
          passwords,
          saltFor: deps.saltFor || (() => randomBytes(16)),
          log: deps.log,
          confirmCanary: async () => {
            const typed = await terminal.readHiddenLine();
            const expected = Buffer.from(CANARY_CONFIRMATION, "utf8");
            try {
              return typed.length === expected.length && timingSafeEqual(typed, expected);
            } finally {
              typed.fill(0);
              expected.fill(0);
            }
          },
        });
      }
    );
  } catch (err) {
    primary = err && err.publicCode ? err : err;
    throw primary;
  } finally {
    unbind();
    terminal.restore();
    for (const buffer of held) buffer.fill(0);
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  const allowRealClient = process.env[LIVE_AUTHORIZATION_ENV] === LIVE_AUTHORIZATION_PHRASE;
  const status = await main(process.argv.slice(2), process.env, { allowRealClient });
  process.exit(status);
}
