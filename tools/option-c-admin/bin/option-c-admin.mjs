/**
 * Option C administrative utility.
 * Default and --self-test are offline. --live refuses unless the owner
 * authorization flag is present. This process does not set that flag.
 */

import { randomBytes, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { assertArgvSafe, liveAuthorized, LIVE_AUTHORIZATION_ENV, LIVE_AUTHORIZATION_PHRASE } from "../lib/authorization.mjs";
import { CODES } from "../lib/errors.mjs";
import { CANARY_CONFIRMATION, executePlan } from "../lib/orchestrator.mjs";
import { runSelfTest } from "../lib/self-test.mjs";
import { PATH_A_HOST, PATH_A_PORT, openAdminClient } from "../lib/tls-gate.mjs";
import { bindInterrupts, createTerminalController, readConfirmedPassword } from "../lib/terminal.mjs";
import { ALLOWED_ROLES } from "../lib/allowlist.mjs";

function writeResult(stdout, result, code) {
  stdout.write(`${JSON.stringify({ result, code })}\n`);
}

export async function main(argv, env = {}, deps = {}) {
  const stdout = deps.stdout || process.stdout;
  const args = Array.isArray(argv) ? argv : [];
  try {
    assertArgvSafe(args);
  } catch (err) {
    writeResult(stdout, "FAIL", err.publicCode || CODES.ENV_SECRET_FORBIDDEN);
    return 1;
  }
  if (args.includes("--self-test") && !args.includes("--live")) {
    return runSelfTest((line) => stdout.write(line));
  }
  if (!args.includes("--live")) {
    writeResult(stdout, "FAIL", CODES.MODE_REQUIRED);
    return 2;
  }
  if (!liveAuthorized(env, args)) {
    writeResult(stdout, "FAIL", CODES.LIVE_UNAUTHORIZED);
    return 1;
  }
  if (deps.allowRealClient !== true && !deps.Client) {
    writeResult(stdout, "FAIL", CODES.LIVE_UNAUTHORIZED);
    return 1;
  }
  try {
    await runLive(args, env, deps);
    writeResult(stdout, "PASS", CODES.ROLE_PASS);
    return 0;
  } catch (err) {
    writeResult(stdout, "FAIL", err && err.publicCode ? err.publicCode : CODES.INTERNAL);
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
    const client = await openAdminClient(
      { env: { ...env, ...tlsEnv }, argv, target },
      { Client: deps.Client, allowRealClient: deps.allowRealClient === true }
    );
    const db = deps.db || {
      query: (text, params) => client.query(text, params),
    };
    const resumeIndex = argv.indexOf("--resume-after");
    const resumeAfter = resumeIndex >= 0 ? argv[resumeIndex + 1] : undefined;
    await executePlan(db, {
      env,
      argv,
      transport: "injected-client",
      passwords,
      saltFor: deps.saltFor || (() => randomBytes(16)),
      resumeAfter,
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
    if (typeof client.end === "function") await client.end();
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
