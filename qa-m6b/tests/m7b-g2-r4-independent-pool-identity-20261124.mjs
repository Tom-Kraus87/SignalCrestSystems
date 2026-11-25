/**
 * M7B-G2-R4 — Independent pool identity regression (mock/static doubles only).
 *
 * Evidence class: mock/static local. Does NOT constitute real PostgreSQL evidence.
 * No live database connections. No credential access. No dependency installation.
 *
 * Coverage: R4 regression plan items R1–R15 (local doubles where applicable).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import {
  PATH_A_DIRECT_HOST,
  PATH_A_DIRECT_PORT,
  INDEPENDENT_POOL_IDENTITY_MATRIX,
  assertPathAConnectionShape,
  assertIndependentPoolIdentity,
  runIndependentPoolIdentityPreflight,
  endPoolsQuietly,
  buildHarnessPoolConfig,
  CASES,
} from "../verify-m7a-r2-postgres-integration-20261123.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const require = createRequire(import.meta.url);

const out = {
  suite: "m7b-g2-r4-independent-pool-identity-20261124",
  evidenceClass: "mock-static-local",
  executed: true,
  ok: true,
  checks: [],
  note:
    "Mock/static doubles only. Results are NOT real PostgreSQL evidence. Real-PG 1–13 NOT RUN. Hosted Auth/AAL2 case 14 NOT RUN.",
};

function check(name, pass, detail) {
  out.checks.push({ name, pass: !!pass, detail: detail || "" });
  if (!pass) out.ok = false;
}

function pathAUrl(user, overrides) {
  const host = (overrides && overrides.host) || PATH_A_DIRECT_HOST;
  const port = (overrides && overrides.port) != null ? overrides.port : PATH_A_DIRECT_PORT;
  const db = (overrides && overrides.database) || "postgres";
  // Password is a placeholder for shape tests only — never logged by helpers under test.
  return `postgresql://${user}:redacted-test-secret@${host}:${port}/${db}?sslmode=verify-full`;
}

function makeIdentityClient(state) {
  const queries = [];
  return {
    queries,
    async query(sql) {
      queries.push(String(sql || ""));
      if (state && typeof state.onQuery === "function") {
        return state.onQuery(sql);
      }
      if (state && state.reject) {
        const err = new Error(state.rejectMessage || "auth_failed");
        err.code = state.rejectCode || "28P01";
        throw err;
      }
      return {
        rows: [
          {
            current_user: state.current_user,
            session_user: state.session_user,
            admin_createrole_ok: state.admin_createrole_ok === true,
          },
        ],
      };
    },
  };
}

function makePool(label, client) {
  let ended = 0;
  return {
    label,
    client,
    ended: () => ended,
    async query(sql, params) {
      return client.query(sql, params);
    },
    async end() {
      ended += 1;
    },
  };
}

function correctUrls() {
  return {
    migration: pathAUrl("postgres"),
    intake: pathAUrl("scs_intake_runtime"),
    notify: pathAUrl("scs_notify_worker"),
    owner: pathAUrl("scs_owner_admin"),
    fixture: pathAUrl("scs_test_admin"),
  };
}

function correctPools() {
  return {
    migration: makePool(
      "migration",
      makeIdentityClient({
        current_user: "postgres",
        session_user: "postgres",
        admin_createrole_ok: true,
      })
    ),
    intake: makePool(
      "intake",
      makeIdentityClient({
        current_user: "scs_intake_runtime",
        session_user: "scs_intake_runtime",
        admin_createrole_ok: false,
      })
    ),
    notify: makePool(
      "notify",
      makeIdentityClient({
        current_user: "scs_notify_worker",
        session_user: "scs_notify_worker",
        admin_createrole_ok: false,
      })
    ),
    owner: makePool(
      "owner",
      makeIdentityClient({
        current_user: "scs_owner_admin",
        session_user: "scs_owner_admin",
        admin_createrole_ok: false,
      })
    ),
    fixture: makePool(
      "fixture",
      makeIdentityClient({
        current_user: "scs_test_admin",
        session_user: "scs_test_admin",
        admin_createrole_ok: false,
      })
    ),
  };
}

async function run() {
  // ---- R1: all five correct ----
  {
    const pools = correctPools();
    let ok = false;
    let err = null;
    try {
      const result = await runIndependentPoolIdentityPreflight(pools, { urls: correctUrls() });
      ok = result && result.ok === true && Array.isArray(result.proofs) && result.proofs.length === 5;
    } catch (e) {
      err = e;
    }
    check("R1 all five pools correct identities + admin CREATEROLE", ok, err ? String(err.code || err.message) : "");
  }

  // ---- R2a–e: each pool auth failure ----
  const failKeys = ["migration", "intake", "notify", "owner", "fixture"];
  for (const failKey of failKeys) {
    const pools = correctPools();
    pools[failKey] = makePool(
      failKey,
      makeIdentityClient({
        reject: true,
        rejectCode: "28P01",
        rejectMessage: "password_authentication_failed",
      })
    );
    let failed = false;
    let code = "";
    let label = "";
    try {
      await runIndependentPoolIdentityPreflight(pools, { urls: correctUrls() });
    } catch (err) {
      failed = true;
      code = err && err.code;
      label = err && err.poolLabel;
    }
    const entry = INDEPENDENT_POOL_IDENTITY_MATRIX.find((row) => row.key === failKey);
    check(
      `R2 ${failKey} auth failure fails closed before cases`,
      failed &&
        code === "DATABASE_INDEPENDENT_IDENTITY_PREFLIGHT_FAILED" &&
        label === entry.label,
      `code=${code} label=${label}`
    );
  }

  // ---- R3 incorrect current_user ----
  {
    let failed = false;
    let code = "";
    try {
      await assertIndependentPoolIdentity(
        makeIdentityClient({
          current_user: "postgres",
          session_user: "scs_intake_runtime",
          admin_createrole_ok: false,
        }),
        { expectedUser: "scs_intake_runtime", label: "Intake" }
      );
    } catch (err) {
      failed = true;
      code = err && err.code;
    }
    check("R3 incorrect current_user fails closed", failed && code === "DATABASE_POOL_IDENTITY_MISMATCH", code);
  }

  // ---- R4 incorrect session_user ----
  {
    let failed = false;
    let code = "";
    try {
      await assertIndependentPoolIdentity(
        makeIdentityClient({
          current_user: "scs_intake_runtime",
          session_user: "postgres",
          admin_createrole_ok: false,
        }),
        { expectedUser: "scs_intake_runtime", label: "Intake" }
      );
    } catch (err) {
      failed = true;
      code = err && err.code;
    }
    check("R4 incorrect session_user fails closed", failed && code === "DATABASE_POOL_IDENTITY_MISMATCH", code);
  }

  // ---- R5 SET ROLE masquerade (current matches, session remains postgres) ----
  {
    let failed = false;
    let code = "";
    try {
      await assertIndependentPoolIdentity(
        makeIdentityClient({
          current_user: "scs_intake_runtime",
          session_user: "postgres",
          admin_createrole_ok: false,
        }),
        { expectedUser: "scs_intake_runtime", label: "Intake" }
      );
    } catch (err) {
      failed = true;
      code = err && err.code;
    }
    check(
      "R5 SET ROLE masquerade rejected (session_user must match)",
      failed && code === "DATABASE_POOL_IDENTITY_MISMATCH",
      code
    );
  }

  // ---- R6 admin without CREATEROLE ----
  {
    let failed = false;
    let code = "";
    try {
      await assertIndependentPoolIdentity(
        makeIdentityClient({
          current_user: "postgres",
          session_user: "postgres",
          admin_createrole_ok: false,
        }),
        { expectedUser: "postgres", requireCreaterole: true, label: "Project administrator" }
      );
    } catch (err) {
      failed = true;
      code = err && err.code;
    }
    check(
      "R6 admin without CREATEROLE fails closed",
      failed && code === "DATABASE_ADMIN_CREATEROLE_REQUIRED",
      code
    );
  }

  // ---- R7 invalid notification credentials ----
  {
    const pools = correctPools();
    pools.notify = makePool(
      "notify",
      makeIdentityClient({
        reject: true,
        rejectCode: "28P01",
        rejectMessage: "password_authentication_failed",
      })
    );
    let failed = false;
    let label = "";
    try {
      await runIndependentPoolIdentityPreflight(pools, { urls: correctUrls() });
    } catch (err) {
      failed = true;
      label = err && err.poolLabel;
    }
    check("R7 invalid notify credentials fail at preflight", failed && label === "Notify", `label=${label}`);
  }

  // ---- R8 failure before fixture mutations ----
  {
    const fixtureQueries = [];
    const pools = correctPools();
    pools.intake = makePool(
      "intake",
      makeIdentityClient({
        reject: true,
        rejectCode: "28P01",
      })
    );
    pools.fixture = makePool("fixture", {
      async query(sql) {
        fixtureQueries.push(String(sql || ""));
        return { rows: [] };
      },
    });
    // Replace fixture identity client so preflight still reaches intake failure first;
    // fixture pool.query spy must not be used for DML if preflight fails earlier.
    pools.fixture = makePool(
      "fixture",
      makeIdentityClient({
        current_user: "scs_test_admin",
        session_user: "scs_test_admin",
        admin_createrole_ok: false,
        onQuery(sql) {
          fixtureQueries.push(String(sql || ""));
          return {
            rows: [
              {
                current_user: "scs_test_admin",
                session_user: "scs_test_admin",
                admin_createrole_ok: false,
              },
            ],
          };
        },
      })
    );
    let failed = false;
    try {
      await runIndependentPoolIdentityPreflight(pools, { urls: correctUrls() });
    } catch {
      failed = true;
    }
    const dmlAttempted = fixtureQueries.some((q) => /insert|update|delete|truncate/i.test(q));
    check(
      "R8 preflight failure observes zero fixture DML",
      failed && !dmlAttempted,
      `fixtureQueries=${fixtureQueries.length}`
    );
  }

  // ---- R9 pool cleanup after partial preflight failure ----
  {
    const pools = correctPools();
    pools.notify = makePool(
      "notify",
      makeIdentityClient({
        reject: true,
        rejectCode: "28P01",
      })
    );
    let failed = false;
    try {
      await runIndependentPoolIdentityPreflight(pools, { urls: correctUrls() });
    } catch {
      failed = true;
    }
    await endPoolsQuietly(pools);
    const allEnded = Object.values(pools).every((p) => p.ended() === 1);
    check("R9 all constructed pools closed after partial preflight failure", failed && allEnded, "");
  }

  // ---- R10 TLS controls preserved ----
  {
    const {
      parseApprovedConnectionFields,
      buildSslOptions,
      inspectEffectivePgSsl,
    } = require(path.join(ROOT, "netlify", "functions", "_lib", "pg-client.js"));
    const pgClientApi = { parseApprovedConnectionFields, buildSslOptions, inspectEffectivePgSsl };
    const hosted = { SCS_ENV: "staging", SCS_DEPENDENCY_MODE: "postgres" };

    let insecureRejected = false;
    try {
      buildHarnessPoolConfig(
        "postgresql://scs_intake_runtime:secret@db.example.com:5432/postgres?sslmode=disable",
        hosted,
        pgClientApi
      );
    } catch (err) {
      insecureRejected = err && err.code === "DATABASE_SSL_INSECURE";
    }

    const caPem =
      "-----BEGIN CERTIFICATE-----\nMIIBtjCCASugAwIBAgIUTest\n-----END CERTIFICATE-----\n";
    let positiveTls = false;
    try {
      const built = buildHarnessPoolConfig(
        "postgresql://scs_intake_runtime:secret@db.r7-staging.supabase.co:5432/postgres?sslmode=verify-full",
        Object.assign({}, hosted, { DATABASE_SSL_CA: caPem }),
        pgClientApi
      );
      positiveTls =
        built.tls.rejectUnauthorized === true &&
        built.tls.hasCheckServerIdentity === true &&
        built.tls.hasConnectionString === false;
    } catch {
      positiveTls = false;
    }

    const harnessSrc = fs.readFileSync(
      path.join(ROOT, "qa-m6b", "verify-m7a-r2-postgres-integration-20261123.mjs"),
      "utf8"
    );
    const case7Preserved =
      /wrong\.invalid/.test(harnessSrc) &&
      /ERR_TLS_CERT_ALTNAME_INVALID/.test(harnessSrc) &&
      /rejectUnauthorized:\s*true/.test(harnessSrc);

    check("R10a TLS rejectUnauthorized required", insecureRejected, "");
    check("R10b/c TLS hostname verification + case 7 preserved", positiveTls && case7Preserved, "");
  }

  // ---- R11 pooler host ----
  {
    let failed = false;
    let code = "";
    try {
      assertPathAConnectionShape(
        pathAUrl("scs_intake_runtime", { host: "aws-1-us-east-2.pooler.supabase.com" }),
        "scs_intake_runtime"
      );
    } catch (err) {
      failed = true;
      code = err && err.code;
    }
    check("R11 pooler host rejected before connect", failed && code === "DATABASE_PATH_A_HOST_INVALID", code);
  }

  // ---- R12 transaction pooler port ----
  {
    let failed = false;
    let code = "";
    try {
      assertPathAConnectionShape(pathAUrl("scs_intake_runtime", { port: 6543 }), "scs_intake_runtime");
    } catch (err) {
      failed = true;
      code = err && err.code;
    }
    check("R12 transaction pooler port 6543 rejected", failed && code === "DATABASE_PATH_A_PORT_INVALID", code);
  }

  // ---- R13 qualified username under Path A ----
  {
    let failed = false;
    let code = "";
    try {
      assertPathAConnectionShape(
        pathAUrl("scs_test_admin.kfclinlrzfwodmichmci"),
        "scs_test_admin"
      );
    } catch (err) {
      failed = true;
      code = err && err.code;
    }
    check(
      "R13 project-qualified username rejected under Path A",
      failed && code === "DATABASE_PATH_A_USERNAME_INVALID",
      code
    );
  }

  // ---- R14 cases 1–13 preserved (assertion inventory / names) ----
  {
    const scored = CASES.filter((c) => c.id >= 1 && c.id <= 13);
    const case14 = CASES.find((c) => c.id === 14);
    const harnessSrc = fs.readFileSync(
      path.join(ROOT, "qa-m6b", "verify-m7a-r2-postgres-integration-20261123.mjs"),
      "utf8"
    );
    const preflightBeforeCases =
      /runIndependentPoolIdentityPreflight/.test(harnessSrc) &&
      /before fixture DML/.test(harnessSrc);
    const casesIntact =
      scored.length === 13 &&
      case14 &&
      case14.evidenceClass === "hosted-auth" &&
      /setCase\(\s*1,/.test(harnessSrc) &&
      /setCase\(\s*13,/.test(harnessSrc) &&
      /id:\s*14/.test(harnessSrc);
    check(
      "R14 cases 1–13 preserved; case 14 hosted-auth NOT RUN class",
      casesIntact && preflightBeforeCases,
      `scored=${scored.length}`
    );
  }

  // ---- R15 no credential / URL logging in failure paths ----
  {
    const secret = "super-secret-password-value-do-not-leak";
    const url = `postgresql://scs_notify_worker:${secret}@${PATH_A_DIRECT_HOST}:5432/postgres?sslmode=verify-full`;
    let serialized = "";
    try {
      assertPathAConnectionShape(
        pathAUrl("scs_intake_runtime", { host: "evil.pooler.supabase.com" }),
        "scs_intake_runtime"
      );
    } catch (err) {
      serialized = JSON.stringify({
        code: err.code,
        message: err.message,
        poolLabel: err.poolLabel,
        expected: err.expected,
        actual: err.actual,
      });
    }
    let authSerialized = "";
    try {
      await assertIndependentPoolIdentity(
        makeIdentityClient({
          reject: true,
          rejectMessage: "could not connect with " + url,
        }),
        { expectedUser: "scs_notify_worker", label: "Notify" }
      );
    } catch (err) {
      authSerialized = JSON.stringify({
        code: err.code,
        message: err.message,
        poolLabel: err.poolLabel,
        causeCode: err.causeCode,
      });
    }
    // Shape failure object must not echo secrets; auth wrapper must not echo full URL/password.
    const clean =
      !serialized.includes(secret) &&
      !serialized.includes("postgresql://") &&
      !authSerialized.includes(secret) &&
      !authSerialized.includes("postgresql://");
    check("R15 failures redact credentials and full URLs", clean, "");
  }

  // Matrix completeness
  check(
    "Identity matrix covers five expected roles",
    INDEPENDENT_POOL_IDENTITY_MATRIX.length === 5 &&
      INDEPENDENT_POOL_IDENTITY_MATRIX[0].expectedUser === "postgres" &&
      INDEPENDENT_POOL_IDENTITY_MATRIX[0].requireCreaterole === true &&
      INDEPENDENT_POOL_IDENTITY_MATRIX.map((r) => r.expectedUser).join(",") ===
        "postgres,scs_intake_runtime,scs_notify_worker,scs_owner_admin,scs_test_admin",
    ""
  );

  const passed = out.checks.filter((c) => c.pass).length;
  const failed = out.checks.filter((c) => !c.pass).length;
  out.summary = { passed, failed, total: out.checks.length };
  out.result = out.ok ? "PASS" : "FAIL";

  const reportPath = path.join(
    ROOT,
    "qa-m6b",
    "M7B-G2-R4-LOCAL-REGRESSION-RESULTS-20261124.json"
  );
  fs.writeFileSync(reportPath, JSON.stringify(out, null, 2));
  console.log(
    JSON.stringify(
      {
        result: out.result,
        passed,
        failed,
        total: out.checks.length,
        evidenceClass: out.evidenceClass,
        reportPath,
        note: out.note,
      },
      null,
      2
    )
  );
  process.exit(out.ok ? 0 : 1);
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
