/**
 * M7A-R7 — Static migration executor definition (NO SQL execution).
 *
 * Atlas decision: the controlled Supabase project administrator is the SOLE
 * supported executor for bootstrap and migrations 001–007.
 * `scs_migration` is a reserved identity — not a supported migration executor
 * and must not receive unnecessary privileges.
 *
 * Validates that bootstrap + migrations 001–007 exist in the supported order
 * and prints the Owner-authorized provisioning process. Does not connect to
 * any database. Does not run psql. Does not elevate roles.
 *
 * Usage:
 *   node db/scripts/m7a-migration-executor-static.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Sole supported executor for every bootstrap / migration step. */
export const SOLE_SUPPORTED_EXECUTOR = "project_admin";

/** Supported apply order. Do not reorder. */
export const MIGRATION_ORDER = [
  {
    id: "bootstrap-001",
    rel: "db/bootstrap/001_m7a_r4_role_bootstrap.sql",
    executor: "project_admin",
    notes: "CREATE ROLE for scs_* principals. Requires CREATEROLE or SUPERUSER. Fail closed.",
  },
  {
    id: "mig-001",
    rel: "db/migrations/001_m7a_leads_foundation.sql",
    executor: "project_admin",
    notes: "Foundation tables. Object owner = project administrator.",
  },
  {
    id: "mig-002",
    rel: "db/migrations/002_m7a_rls_least_privilege.sql",
    executor: "project_admin",
    notes: "RLS enablement / least privilege.",
  },
  {
    id: "mig-003",
    rel: "db/migrations/003_m7a_retention_procedures.sql",
    executor: "project_admin",
    notes: "Retention procedures (SECURITY DEFINER owner = project admin).",
  },
  {
    id: "mig-004",
    rel: "db/migrations/004_m7a_counters_idempotency.sql",
    executor: "project_admin",
    notes: "Counters + idempotency primitives.",
  },
  {
    id: "mig-005",
    rel: "db/migrations/005_m7a_insert_lead_bundle.sql",
    executor: "project_admin",
    notes: "insert_lead_bundle SECURITY DEFINER.",
  },
  {
    id: "mig-006",
    rel: "db/migrations/006_m7a_r2_security_hardening.sql",
    executor: "project_admin",
    notes: "Historical draft. Role NOTICE path is NOT the provisioning path.",
  },
  {
    id: "mig-007",
    rel: "db/migrations/007_m7a_r4_security_corrections.sql",
    executor: "project_admin",
    notes: "Aborts if bootstrap roles missing. Runtime grants after this file.",
  },
];

export const ROLE_BOUNDARIES = {
  project_admin: {
    names: ["postgres", "supabase_admin"],
    purpose:
      "SOLE supported executor for bootstrap + migrations 001–007; schema ownership; SECURITY DEFINER ownership",
    function_runtime: false,
    supported_migration_executor: true,
  },
  scs_migration: {
    names: ["scs_migration"],
    purpose:
      "Reserved NOLOGIN identity only. NOT a supported migration executor. Must NOT receive LOGIN, SUPERUSER, CREATEROLE, or other unnecessary privileges",
    function_runtime: false,
    supported_migration_executor: false,
    login: false,
  },
  scs_intake_runtime: {
    names: ["scs_intake_runtime"],
    purpose: "Lead intake RPCs only (runtime)",
    function_runtime: true,
    supported_migration_executor: false,
  },
  scs_notify_worker: {
    names: ["scs_notify_worker"],
    purpose: "claim/complete notification outbox only (runtime)",
    function_runtime: true,
    supported_migration_executor: false,
  },
  scs_owner_admin: {
    names: ["scs_owner_admin"],
    purpose: "Owner monitoring / retention RPCs; never Function runtime",
    function_runtime: false,
    supported_migration_executor: false,
  },
  scs_test_admin: {
    names: ["scs_test_admin"],
    purpose: "Separate test-administration identity for fixture setup only",
    function_runtime: false,
    supported_migration_executor: false,
  },
};

function main() {
  const missing = [];
  const present = [];
  for (const step of MIGRATION_ORDER) {
    const abs = path.join(ROOT, step.rel);
    if (fs.existsSync(abs)) {
      const bytes = fs.statSync(abs).size;
      present.push({ ...step, bytes });
    } else {
      missing.push(step.rel);
    }
  }

  const bootstrapText = fs.existsSync(path.join(ROOT, MIGRATION_ORDER[0].rel))
    ? fs.readFileSync(path.join(ROOT, MIGRATION_ORDER[0].rel), "utf8")
    : "";
  const mig7Text = fs.existsSync(path.join(ROOT, MIGRATION_ORDER[7].rel))
    ? fs.readFileSync(path.join(ROOT, MIGRATION_ORDER[7].rel), "utf8")
    : "";

  const soleExecutor = present.every((s) => s.executor === SOLE_SUPPORTED_EXECUTOR);
  const noAmbiguousExecutor = !present.some((s) =>
    String(s.executor).includes("scs_migration")
  );

  const checks = {
    allFilesPresent: missing.length === 0,
    bootstrapFailClosed: /lacks CREATEROLE or SUPERUSER/.test(bootstrapText),
    bootstrapPrefersProjectAdmin: /controlled Supabase project administrator|project administrator/i.test(
      bootstrapText
    ),
    bootstrapSoleExecutor: /SOLE supported executor|sole supported executor/i.test(bootstrapText),
    bootstrapScsMigrationReserved: /reserved|NOT a supported migration executor/i.test(bootstrapText),
    mig7AbortsWithoutRoles: /role bootstrap prerequisite failed/.test(mig7Text),
    soleExecutorProjectAdmin: soleExecutor,
    noProjectAdminOrScsMigrationAmbiguity: noAmbiguousExecutor,
    scsMigrationNotSupportedExecutor: ROLE_BOUNDARIES.scs_migration.supported_migration_executor === false,
    noSqlExecuted: true,
  };

  const report = {
    suite: "m7a-r7-migration-executor-static",
    evidenceClass: "static-process-definition",
    executedSql: false,
    soleSupportedExecutor: SOLE_SUPPORTED_EXECUTOR,
    result:
      checks.allFilesPresent &&
      checks.bootstrapFailClosed &&
      checks.mig7AbortsWithoutRoles &&
      checks.soleExecutorProjectAdmin &&
      checks.noProjectAdminOrScsMigrationAmbiguity &&
      checks.scsMigrationNotSupportedExecutor
        ? "PASS"
        : "FAIL",
    order: present,
    missing,
    roleBoundaries: ROLE_BOUNDARIES,
    checks,
    process: [
      "1. Connect as controlled project administrator (DATABASE_PROJECT_ADMIN_URL / postgres).",
      "2. Apply db/bootstrap/001_m7a_r4_role_bootstrap.sql (fail closed).",
      "3. Optionally CREATE ROLE scs_test_admin for fixtures (LOGIN NOINHERIT; not Function runtime).",
      "4. Apply migrations 001→007 in order as the SAME project administrator (SOLE supported executor).",
      "5. Do NOT use scs_migration as migration executor; keep it reserved without unnecessary privileges.",
      "6. Confirm tables, schema objects, and SECURITY DEFINER functions are owned by project admin.",
      "7. Confirm runtime grants match 007 (intake / notify / owner_admin only as granted).",
      "8. Set passwords out of band; wire Netlify secrets to least-privilege runtime URLs only.",
    ],
    ownershipExpectations: {
      tables: "project administrator (postgres)",
      schemaPublicObjects: "project administrator (postgres)",
      securityDefinerFunctions: "project administrator (postgres)",
      runtimeGrants: "least-privilege after migration 007",
    },
  };

  const outPath = path.join(ROOT, "qa-m6b", "M7A-R7-MIGRATION-EXECUTOR-STATIC-20261123.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        result: report.result,
        soleSupportedExecutor: SOLE_SUPPORTED_EXECUTOR,
        files: present.length,
        missing: missing.length,
        executedSql: false,
        reportPath: outPath,
      },
      null,
      2
    )
  );
  if (report.result !== "PASS") process.exit(1);
}

const invoked =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
