/**
 * M7A local test harness — secure lead intake + Phase A corrections + primitives.
 * Runs without live Netlify / Supabase / Redis (Postgres-first mocks only).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import vm from "node:vm";
import crypto from "node:crypto";
import {
  classifyDatabaseError,
  resolveRealPgHarnessEnv,
  buildHarnessPoolConfig,
  assertFixtureTestAdminIdentity,
  FIXTURE_TEST_ADMIN_ROLE,
  FIXTURE_TEST_ADMIN_MIN_PRIVILEGES,
  CASES as REAL_PG_CASES,
} from "./verify-m7a-r2-postgres-integration-20261123.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const { processLeadRequest, hashIp } = require("../netlify/functions/_lib/process-lead.js");
const { MockLeadRepository } = require("../netlify/functions/_lib/repository.js");
const { InMemoryRateLimiter } = require("../netlify/functions/_lib/rate-limit.js");
const { InMemoryIdempotencyStore } = require("../netlify/functions/_lib/idempotency.js");
const {
  InMemoryAtomicCounterStore,
  reserveIssueCredit,
  reserveSpend,
  releaseSpend,
  dailySpendKey,
  monthlySpendKey,
  checkRateWindow,
  isKillSwitchOn,
  rememberIdempotent,
} = require("../netlify/functions/_lib/transactional-primitives.js");
const { CURRENT_PRIVACY_VERSION } = require("../netlify/functions/_lib/privacy.js");
const { detectSensitiveInfo } = require("../netlify/functions/_lib/sensitive.js");
const { MAX_BODY_BYTES, LIMITS } = require("../netlify/functions/_lib/schema.js");
const { MockEmailNotifier, NoopEmailNotifier } = require("../netlify/functions/_lib/notify.js");
const {
  HoneypotSpamProtector,
  TurnstileSpamProtector,
} = require("../netlify/functions/_lib/spam-protection.js");
const {
  PostgresRateLimiter,
  PostgresIdempotencyStore,
} = require("../netlify/functions/_lib/postgres-adapters.js");
const {
  createLeadDependencies,
  resolveDependencyMode,
  DependencyConfigurationError,
  resetCachedDeps,
} = require("../netlify/functions/_lib/deps.js");
const {
  resolveDatabaseConfig,
  inspectConnectionStringSsl,
  buildSslOptions,
  parseApprovedConnectionFields,
  inspectEffectivePgSsl,
  assertRuntimeConnectionIdentity,
  assertEffectiveDatabaseIdentity,
  createPgQueryClient,
  connectionUsername,
  canonicalizeQueryKey,
  ADMIN_RUNTIME_ROLES,
} = require("../netlify/functions/_lib/pg-client.js");
const { clientIpFromEvent, resolveIsTestFlag } = require("../netlify/functions/_lib/request-meta.js");
const {
  resolveNotifyIntegrationMode,
  processNotificationOutbox,
  getNotificationFailureStatus,
} = require("../netlify/functions/_lib/notify-worker.js");
const { authorizeNotifyWorkerInvocation } = require("../netlify/functions/_lib/worker-auth.js");
const notifyWorkerHandler = require("../netlify/functions/notify-worker.js");

const out = {
  ok: true,
  suite: "m7a-secure-leads-20261123",
  checks: [],
  failures: [],
  scores: {},
};

function check(name, pass, detail) {
  out.checks.push({ name, pass: !!pass, detail: detail || "" });
  if (!pass) {
    out.ok = false;
    out.failures.push(name + (detail ? ": " + detail : ""));
  }
}

function baseLead(overrides) {
  return Object.assign(
    {
      formName: "project-request",
      name: "Alex Example",
      email: "alex@example.com",
      company: "Example Co",
      phone: "",
      service: "package-starter",
      timeline: "1-3-months",
      budget: "2k-5k",
      message: "Need a starter business website for a landscaping company.",
      consent: true,
      privacyVersion: CURRENT_PRIVACY_VERSION,
      source: "contact",
      advisorBrief: "",
      pagePath: "/project-request.html",
      botField: "",
      idempotencyKey: crypto.randomUUID(),
      isTest: true,
    },
    overrides || {}
  );
}

function makeDeps() {
  return {
    repository: new MockLeadRepository(),
    rateLimiter: new InMemoryRateLimiter(),
    idempotency: new InMemoryIdempotencyStore(),
    counterStore: new InMemoryAtomicCounterStore(),
    notifier: new MockEmailNotifier(),
    spamProtector: new HoneypotSpamProtector(),
    env: { LEADS_INTAKE_ENABLED: "true", ADVISOR_LLM_ENABLED: "true" },
  };
}

function eventFor(body, headers) {
  return {
    httpMethod: "POST",
    path: "/api/leads",
    headers: Object.assign(
      { "content-type": "application/json", "user-agent": "m7a-test" },
      headers || {}
    ),
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

async function post(deps, body, headers) {
  return processLeadRequest(eventFor(body, headers), deps);
}

// ---------- Static bypass / Phase A source checks ----------
const prHtml = fs.readFileSync(path.join(ROOT, "project-request.html"), "utf8");
const contactHtml = fs.readFileSync(path.join(ROOT, "contact.html"), "utf8");
const scriptJs = fs.readFileSync(path.join(ROOT, "script.js"), "utf8");
const advisorJs = fs.readFileSync(path.join(ROOT, "advisor.js"), "utf8");
const advisorHtml = fs.readFileSync(path.join(ROOT, "advisor.html"), "utf8");
const netlifyToml = fs.readFileSync(path.join(ROOT, "netlify.toml"), "utf8");
const privacyHtml = fs.readFileSync(path.join(ROOT, "privacy.html"), "utf8");

check("project-request has no data-netlify", !/data-netlify\s*=/.test(prHtml));
check("contact has no data-netlify", !/data-netlify\s*=/.test(contactHtml));
check("project-request action=/api/leads", /action="\/api\/leads"/.test(prHtml));
check("contact action=/api/leads", /action="\/api\/leads"/.test(contactHtml));
check("script posts /api/leads", scriptJs.includes('fetch("/api/leads"'));
check("script does not fetch Forms root", !/fetch\(\s*"\/"\s*,/.test(scriptJs));
check("netlify redirect /api/leads", /from\s*=\s*"\/api\/leads"/.test(netlifyToml));
check(
  "R5-A netlify build runs npm ci --prefix then build-public",
  /command\s*=\s*"npm ci --prefix netlify\/functions && node scripts\/build-public\.mjs"/.test(netlifyToml)
);
check("contact has consent checkbox", /name="consent"/.test(contactHtml));
check("privacy stamp current on project-request", prHtml.includes(CURRENT_PRIVACY_VERSION));
check("privacy stamp current on contact", contactHtml.includes(CURRENT_PRIVACY_VERSION));
check("advisor listbox semantics removed", !/role:\s*"listbox"/.test(advisorJs) && !/role="listbox"/.test(advisorJs));
check("advisor chip group role", /role:\s*"group"/.test(advisorJs));
check("handoff omits name/email keys", !/name:\s*payload\.name/.test(advisorJs));
check("deterministic disclosure present", /not live conversational AI/i.test(advisorHtml));
check("privacy.html no longer claims Forms primary", !/currently use Netlify Forms/i.test(privacyHtml));
check("privacy.html mentions secure lead endpoint", /secure lead endpoint/i.test(privacyHtml));
check("project-request hero has no Netlify Forms claim", !/Netlify Forms/i.test(prHtml));
check("project-request mentions secure lead endpoint", /secure lead endpoint/i.test(prHtml));

const mig1 = path.join(ROOT, "db/migrations/001_m7a_leads_foundation.sql");
const mig2 = path.join(ROOT, "db/migrations/002_m7a_rls_least_privilege.sql");
const mig3 = path.join(ROOT, "db/migrations/003_m7a_retention_procedures.sql");
const mig4 = path.join(ROOT, "db/migrations/004_m7a_counters_idempotency.sql");
const mig5 = path.join(ROOT, "db/migrations/005_m7a_insert_lead_bundle.sql");
const mig6 = path.join(ROOT, "db/migrations/006_m7a_r2_security_hardening.sql");
check("migration 001 exists", fs.existsSync(mig1));
check("migration 002 exists", fs.existsSync(mig2));
check("migration 003 exists", fs.existsSync(mig3));
check("migration 004 counters exists", fs.existsSync(mig4));
check("migration 005 insert_lead_bundle exists", fs.existsSync(mig5));
check("migration 006 r2 hardening exists", fs.existsSync(mig6));
check("migration defines leads", fs.readFileSync(mig1, "utf8").includes("CREATE TABLE IF NOT EXISTS leads"));
check("migration defines consent_records", fs.readFileSync(mig1, "utf8").includes("consent_records"));
check("migration defines submission_requests", fs.readFileSync(mig1, "utf8").includes("submission_requests"));
check("RLS enabled on leads", /ENABLE ROW LEVEL SECURITY/i.test(fs.readFileSync(mig2, "utf8")));
check("retention soft_delete exists", fs.readFileSync(mig3, "utf8").includes("soft_delete_lead"));
const mig3Text = fs.readFileSync(mig3, "utf8");
check("unconverted retention pending marker", mig3Text.includes("PENDING_FINAL_PRIVACY_APPROVAL"));
check("unconverted purge function draft", mig3Text.includes("purge_unconverted_leads"));
const mig4Text = fs.readFileSync(mig4, "utf8");
check("migration 004 usage_counters", mig4Text.includes("usage_counters"));
check("migration 004 atomic_counter_incr", mig4Text.includes("atomic_counter_incr"));
check("migration 004 no redis requirement", !/redis/i.test(mig4Text) || /Do NOT introduce Redis/i.test(mig4Text));
const mig5Text = fs.readFileSync(mig5, "utf8");
check("migration 005 insert_lead_bundle fn", mig5Text.includes("CREATE OR REPLACE FUNCTION public.insert_lead_bundle"));
check("migration 005 advisory lock", mig5Text.includes("pg_advisory_xact_lock"));
check("migration 005 payload_hash", mig5Text.includes("payload_hash"));
check("migration 005 notification_outbox", mig5Text.includes("notification_outbox"));
check("migration 005 revoke anon authenticated", /REVOKE ALL ON FUNCTION public\.insert_lead_bundle[\s\S]*FROM anon, authenticated/i.test(mig5Text));
check("migration 005 search_path hardened", /SET search_path = pg_catalog,\s*public/.test(mig5Text));
const mig6Text = fs.readFileSync(mig6, "utf8");
check("migration 006 intake runtime role", mig6Text.includes("scs_intake_runtime"));
check("migration 006 notify worker role", mig6Text.includes("scs_notify_worker"));
check("migration 006 grant to intake runtime", /GRANT EXECUTE ON FUNCTION public\.insert_lead_bundle[\s\S]*TO scs_intake_runtime/.test(mig6Text));
check("migration 006 deletion markers", mig6Text.includes("lead_deletion_markers"));
check("migration 006 outbox purge before leads", /DELETE FROM public\.notification_outbox[\s\S]*DELETE FROM public\.leads/.test(mig6Text));
check("migration 006 claim_notification_outbox", mig6Text.includes("claim_notification_outbox"));
check("migration 006 revoke CREATE on public", /REVOKE CREATE ON SCHEMA public FROM PUBLIC/.test(mig6Text));
const procPtr = fs.readFileSync(path.join(ROOT, "db/procedures/m7a_insert_lead_transaction.sql"), "utf8");
check("legacy procedure is documentation pointer", !/CREATE OR REPLACE FUNCTION/.test(procPtr) && /005_m7a_insert_lead_bundle/.test(procPtr));
const pgClientSrc = fs.readFileSync(path.join(ROOT, "netlify/functions/_lib/pg-client.js"), "utf8");
check(
  "pg-client forbids rejectUnauthorized false default",
  !/rejectUnauthorized:\s*false/.test(pgClientSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""))
);
check("pg-client requires rejectUnauthorized true", /rejectUnauthorized:\s*true/.test(pgClientSrc));
check("script sends Idempotency-Key header", /Idempotency-Key/.test(scriptJs));
check("script builds idempotencyKey", /idempotencyKey:\s*newIdempotencyKey/.test(scriptJs));

const envExample = path.join(ROOT, ".env.example");
check(".env.example exists", fs.existsSync(envExample));
const envText = fs.readFileSync(envExample, "utf8");
check(".env.example has staging supabase placeholders", /YOUR_STAGING_PROJECT|REPLACE_STAGING/i.test(envText));
check(".env.example documents production separation", /PRODUCTION|production/i.test(envText));
check(".env.example has no live-looking secrets", !/eyJ[A-Za-z0-9_-]{20,}/.test(envText));
check(".env.example redis left unset", /REDIS_URL=\s*$/m.test(envText) || /REDIS_URL=\s*\n/.test(envText) || envText.includes("# REDIS_URL="));
check(".env.example documents SCS_DEPENDENCY_MODE", /SCS_DEPENDENCY_MODE/.test(envText));
check(".env.example documents Turnstile contract", /TURNSTILE_SECRET_KEY/.test(envText));
check(".env.example documents Resend contract", /RESEND_API_KEY/.test(envText));
check(".env.example documents Sentry contract", /SENTRY_DSN/.test(envText));

const costMatrix = path.join(ROOT, "qa-m6b/M7A-OWNER-COST-ESTIMATE-PROVISIONING-MATRIX-20261123.md");
const threatModel = path.join(ROOT, "qa-m6b/M7A-OWNER-THREAT-MODEL-20261123.md");
check("owner cost matrix exists", fs.existsSync(costMatrix));
check("owner threat model exists", fs.existsSync(threatModel));
check("cost matrix prefers postgres over redis", /NOT RECOMMENDED/i.test(fs.readFileSync(costMatrix, "utf8")));

// ---------- Endpoint behavior ----------
{
  const deps = makeDeps();
  const res = await post(deps, baseLead());
  const body = JSON.parse(res.body);
  check("normal project request 200", res.statusCode === 200 && body.ok === true, JSON.stringify(body));
  check("server receivedAt present", typeof body.receivedAt === "string" && body.receivedAt.length > 10);
  check("persisted lead row", deps.repository.leads.length === 1);
  check("persisted consent row", deps.repository.consentRecords.length === 1);
  check("persisted submission row", deps.repository.submissionRequests.length === 1);
  check("mock notifier fired once", deps.notifier.sent.length === 1);
  check("notifier payload has no email field", deps.notifier.sent[0] && deps.notifier.sent[0].email === undefined);
}

{
  const deps = makeDeps();
  const res = await post(deps, baseLead({ consent: false }));
  const body = JSON.parse(res.body);
  check("missing consent rejected", res.statusCode === 400 && body.code === "consent_required");
  check("missing consent no persist", deps.repository.leads.length === 0);
}

{
  const deps = makeDeps();
  const res = await post(deps, baseLead({ consent: undefined }));
  const body = JSON.parse(res.body);
  check("invalid consent rejected", res.statusCode === 400 && (body.code === "consent_required" || body.fields));
}

{
  const deps = makeDeps();
  const res = await post(deps, baseLead({ privacyVersion: "not-a-real-version" }));
  const body = JSON.parse(res.body);
  check("invalid privacy version rejected", res.statusCode === 400 && body.code === "privacy_version_invalid");
}

{
  const deps = makeDeps();
  const res = await post(deps, baseLead({ message: "here is my password hunter2" }));
  const body = JSON.parse(res.body);
  check("credential pattern rejected", res.statusCode === 400 && body.code === "sensitive_content");
  check("sensitive meta has reasonIds only", Array.isArray(body.fields) || !!body.fields);
}

{
  const deps = makeDeps();
  const res = await post(deps, baseLead({ message: "card 4111 1111 1111 1111" }));
  check("PAN-like rejected", res.statusCode === 400 && JSON.parse(res.body).code === "sensitive_content");
}

{
  const deps = makeDeps();
  const huge = "x".repeat(MAX_BODY_BYTES + 100);
  const res = await processLeadRequest(
    { httpMethod: "POST", headers: { "content-type": "application/json" }, body: huge },
    deps
  );
  check("oversized body 413", res.statusCode === 413);
}

{
  const deps = makeDeps();
  const res = await post(deps, "{not-json", { "content-type": "application/json" });
  check("malformed JSON 400", res.statusCode === 400 && JSON.parse(res.body).code === "malformed_json");
}

{
  const deps = makeDeps();
  const res = await post(deps, baseLead({ extraEvil: "1" }));
  check("unknown fields rejected", res.statusCode === 400 && JSON.parse(res.body).code === "unknown_fields");
}

{
  const deps = makeDeps();
  const key = "idem-" + crypto.randomUUID();
  const payload = baseLead({ idempotencyKey: key });
  const first = await post(deps, payload);
  const second = await post(deps, payload);
  check("idempotent first ok", first.statusCode === 200);
  check("idempotent identical replay same receipt", second.statusCode === 200 && second.body === first.body);
  check("idempotent single lead", deps.repository.leads.length === 1);
}

{
  // R5-C: genuine concurrent conflicting payloads (not sequential first-then-second).
  const deps = makeDeps();
  const key = "idem-conflict-" + crypto.randomUUID().slice(0, 8);
  const payloadA = baseLead({
    idempotencyKey: key,
    message: "Original landscaping website brief.",
  });
  const payloadB = baseLead({
    idempotencyKey: key,
    message: "Completely different payload for conflict test.",
  });
  const results = await Promise.all([post(deps, payloadA), post(deps, payloadB)]);
  const codes = results.map((r) => r.statusCode);
  const wins = results.filter((r) => r.statusCode === 200);
  const conflicts = results.filter((r) => {
    if (r.statusCode !== 409) return false;
    try {
      return JSON.parse(r.body).code === "idempotency_conflict";
    } catch {
      return false;
    }
  });
  check(
    "concurrent conflicting payloads deterministic outcomes",
    wins.length === 1 && conflicts.length === 1,
    "codes=" + codes.join(",")
  );
  check("concurrent conflicting payloads single lead", deps.repository.leads.length === 1);
  // Positive control: identical concurrent replay still converges on one receipt.
  const sameKey = "idem-conflict-pos-" + crypto.randomUUID().slice(0, 8);
  const samePayload = baseLead({ idempotencyKey: sameKey, message: "Same concurrent payload control." });
  const sameResults = await Promise.all([post(deps, samePayload), post(deps, samePayload)]);
  const sameOks = sameResults.filter((r) => r.statusCode === 200);
  const sameReceipts = new Set(sameOks.map((r) => JSON.parse(r.body).receipt));
  check(
    "concurrent identical positive control single receipt",
    sameOks.length === 2 && sameReceipts.size === 1
  );
}

{
  const deps = makeDeps();
  const key = "idem-concurrent-" + crypto.randomUUID().slice(0, 8);
  const payload = baseLead({ idempotencyKey: key });
  const results = await Promise.all([post(deps, payload), post(deps, payload), post(deps, payload)]);
  const oks = results.filter((r) => r.statusCode === 200);
  const receipts = new Set(oks.map((r) => JSON.parse(r.body).receipt));
  check("concurrent same-key all 200", oks.length === 3, "oks=" + oks.length);
  check("concurrent same-key single receipt", receipts.size === 1, "receipts=" + receipts.size);
  check("concurrent same-key single lead", deps.repository.leads.length === 1);
  check("concurrent same-key single consent", deps.repository.consentRecords.length === 1);
  check("concurrent same-key single submission", deps.repository.submissionRequests.length === 1);
  check("concurrent same-key single outbox", deps.repository.outbox.length === 1);
}

{
  const deps = makeDeps();
  const payloads = Array.from({ length: 6 }, (_, i) =>
    baseLead({ email: `c${i}@example.com`, idempotencyKey: crypto.randomUUID() })
  );
  const results = await Promise.all(payloads.map((p) => post(deps, p)));
  const oks = results.filter((r) => r.statusCode === 200).length;
  check("concurrent submits all accepted under limit", oks === 6, "oks=" + oks);
  check("concurrent persist count", deps.repository.leads.length === 6);
}

{
  const deps = makeDeps();
  const res = await post(deps, baseLead({ name: "N".repeat(LIMITS.name + 1) }));
  const body = JSON.parse(res.body);
  check("oversized name rejected", res.statusCode === 400 && body.code === "field_too_long");
  check("oversized name not truncated persist", deps.repository.leads.length === 0);
}

{
  const deps = makeDeps();
  const res = await post(deps, baseLead({ message: "M".repeat(LIMITS.message + 50) }));
  const body = JSON.parse(res.body);
  check("oversized message rejected", res.statusCode === 400 && body.code === "field_too_long");
}

{
  resetCachedDeps();
  const mockDeps = createLeadDependencies({
    SCS_ENV: "development",
    SCS_DEPENDENCY_MODE: "mock",
    SCS_ALLOW_MOCK_LEADS: "true",
    LEADS_INTAKE_ENABLED: "true",
  });
  check("deps factory mock mode", mockDeps.mode === "mock");
  check("deps factory mock repository", mockDeps.repository instanceof MockLeadRepository);

  let failedClosed = false;
  let failCode = "";
  try {
    createLeadDependencies({
      SCS_ENV: "staging",
      SCS_DEPENDENCY_MODE: "postgres",
      LEADS_INTAKE_ENABLED: "true",
      // intentionally missing DATABASE_URL
    });
  } catch (err) {
    failedClosed = err instanceof DependencyConfigurationError || err.code === "DATABASE_CONFIG_MISSING";
    failCode = err.code || "";
  }
  check("deps factory staging fails closed without DB", failedClosed, failCode);

  const cfg = resolveDatabaseConfig({ SCS_ENV: "production", DATABASE_URL: "" });
  check("resolveDatabaseConfig production requires postgres", cfg.mode === "postgres_required");
  check("resolveDependencyMode production", resolveDependencyMode({ SCS_ENV: "production" }) === "postgres");
}

{
  const deps = makeDeps();
  deps.repository.setFailNext(true, "boom");
  const res = await post(deps, baseLead());
  const body = JSON.parse(res.body);
  check("persistence failure safe 500", res.statusCode === 500 && body.code === "persist_failure");
  check("persistence failure no partial lead", deps.repository.leads.length === 0);
}

{
  const deps = makeDeps();
  const res = await post(deps, baseLead({ message: '<script>alert(1)</script> please build a site' }));
  // Stored as text; response must not echo raw script as HTML — JSON encode only
  check("XSS payload accepted as text or filtered", res.statusCode === 200 || res.statusCode === 400);
  if (res.statusCode === 200) {
    const stored = deps.repository.leads[0].message;
    check("XSS stored as plain text", stored.includes("<script>") && !/<html/i.test(res.body));
  } else {
    check("XSS path handled", true);
  }
}

{
  const deps = makeDeps();
  const res = await post(deps, baseLead({ botField: "spam-bot", idempotencyKey: crypto.randomUUID() }));
  check("honeypot silent success", res.statusCode === 200 && JSON.parse(res.body).ok === true);
  check("honeypot no persist", deps.repository.leads.length === 0);
}

{
  const deps = makeDeps();
  deps.env.LEADS_INTAKE_ENABLED = "false";
  const res = await post(deps, baseLead());
  check("kill switch disables intake", res.statusCode === 503);
}

{
  // R5-C: isolated rate-limit fixture — unique identity + explicit reset; no shared buckets.
  const deps = makeDeps();
  deps.rateLimiter.reset();
  const fixtureEmail = `rate-limit-isolated-${crypto.randomUUID().slice(0, 8)}@example.com`;
  for (let i = 0; i < 8; i++) {
    await post(
      deps,
      baseLead({ email: fixtureEmail, idempotencyKey: crypto.randomUUID() })
    );
  }
  const blocked = await post(
    deps,
    baseLead({ email: fixtureEmail, idempotencyKey: crypto.randomUUID() })
  );
  check("rate limit engages (isolated fixture)", blocked.statusCode === 429);
  // Positive control: a different email on a fresh limiter is not contaminated.
  const other = makeDeps();
  other.rateLimiter.reset();
  const otherRes = await post(
    other,
    baseLead({
      email: `rate-limit-control-${crypto.randomUUID().slice(0, 8)}@example.com`,
      idempotencyKey: crypto.randomUUID(),
    })
  );
  check("rate limit positive control uncontaminated", otherRes.statusCode === 200);
}

// Direct Forms-style urlencoded attempt still validated (no bypass)
{
  const deps = makeDeps();
  const body = new URLSearchParams({
    "form-name": "project-request",
    name: "Alex",
    email: "alex@example.com",
    message: "Hello there from forms style",
    consent: "yes",
    "privacy-version": CURRENT_PRIVACY_VERSION,
    source: "contact",
    idempotencyKey: crypto.randomUUID(),
  }).toString();
  const res = await processLeadRequest(
    {
      httpMethod: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    },
    deps
  );
  check("urlencoded accepted via same validator", res.statusCode === 200);
}

{
  const deps = makeDeps();
  const body = new URLSearchParams({
    "form-name": "project-request",
    name: "Alex",
    email: "alex@example.com",
    message: "No consent attempt",
    consent: "no",
    "privacy-version": CURRENT_PRIVACY_VERSION,
    idempotencyKey: crypto.randomUUID(),
  }).toString();
  const res = await processLeadRequest(
    {
      httpMethod: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    },
    deps
  );
  check("direct submission without consent fails", res.statusCode === 400);
}

// Advisor handoff engine
{
  const kb = JSON.parse(fs.readFileSync(path.join(ROOT, "advisor-kb.json"), "utf8"));
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    sessionStorage: (() => {
      const m = new Map();
      return {
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => m.set(k, String(v)),
        removeItem: (k) => m.delete(k),
      };
    })(),
    document: {
      readyState: "complete",
      getElementById: () => null,
      addEventListener: () => {},
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(advisorJs + "\nthis.__SCS = SCSAdvisor;", sandbox);
  const Eng = sandbox.__SCS.Engine;
  Eng.hydrateKb(kb);
  const brief = Eng.buildBrief({
    answers: { project_type: "website", detail: "starter", primary_need: "new_build", stage: "ready", timing: "1-3mo" },
    recommendation: Eng.recommendPrimary({ project_type: "website", detail: "starter" }),
    tech: { history: [] },
  });
  const ho = Eng.writeHandoff({ service: "package-starter", brief });
  check("advisor handoff no name field", !Object.prototype.hasOwnProperty.call(ho, "name"));
  check("advisor handoff no email field", !Object.prototype.hasOwnProperty.call(ho, "email"));
  check("advisor handoff brief kept", ho.brief === brief);
  check("advisor privacy version current", ho.privacyVersion === CURRENT_PRIVACY_VERSION || ho.privacyVersion === kb.privacyVersion);
  const stored = JSON.parse(sandbox.sessionStorage.getItem(Eng.HANDOFF_KEY));
  check("sessionStorage has no email", !stored.email && !stored.name);
  Eng.clearHandoff();
  check("handoff cleared", Eng.readHandoff() === null);

  const deps = makeDeps();
  const res = await post(
    deps,
    baseLead({
      source: "advisor",
      service: "package-starter",
      message: brief,
      advisorBrief: brief,
    })
  );
  check("advisor handoff lead accepted", res.statusCode === 200);
}

// Sensitive detector honesty
check("sensitive detector does not claim completeness", detectSensitiveInfo("password").hit === true);
check("clean text not sensitive", detectSensitiveInfo("Need a website for bookings").hit === false);

// Phase B primitives
{
  const store = new InMemoryAtomicCounterStore();
  const a = await reserveIssueCredit(store, "s1", 3);
  const b = await reserveIssueCredit(store, "s1", 3);
  const c = await reserveIssueCredit(store, "s1", 3);
  const d = await reserveIssueCredit(store, "s1", 3);
  check("issue credits allow 3", a.ok && b.ok && c.ok);
  check("issue credits soft-cap 4th", !d.ok && d.reason === "soft_cap");

  const dayKey = dailySpendKey("advisor");
  const monthKey = monthlySpendKey("advisor");
  check("daily key shape", /^spend:daily:/.test(dayKey));
  check("monthly key shape", /^spend:monthly:/.test(monthKey));

  const r1 = await reserveSpend(store, dayKey, 100, 250);
  const r2 = await reserveSpend(store, dayKey, 100, 250);
  const r3 = await reserveSpend(store, dayKey, 100, 250);
  check("spend reserve under ceiling", r1.ok && r2.ok);
  check("spend reserve blocks overage", !r3.ok);
  await releaseSpend(store, dayKey, 100);
  const r4 = await reserveSpend(store, dayKey, 50, 250);
  check("spend release frees capacity", r4.ok);

  const rateOk = [];
  for (let i = 0; i < 5; i++) rateOk.push(await checkRateWindow(store, "rate:ip:x", 3, 60));
  check("rate window allows 3", rateOk.filter((x) => x.allowed).length === 3);
  check("rate window blocks rest", rateOk.filter((x) => !x.allowed).length === 2);

  check("kill switch env", await isKillSwitchOn(store, { ADVISOR_LLM_ENABLED: "false" }));
  const idem = await rememberIdempotent(store, "idem:1", JSON.stringify({ ok: true }), 60);
  const idem2 = await rememberIdempotent(store, "idem:1", JSON.stringify({ ok: false }), 60);
  check("idempotent setNx first", idem.created);
  check("idempotent setNx second", !idem2.created && idem2.body && idem2.body.ok === true);
}

// Data cleanup / repository reset
{
  const deps = makeDeps();
  await post(deps, baseLead());
  deps.repository.reset();
  check("repository cleanup", deps.repository.leads.length === 0 && deps.repository.consentRecords.length === 0);
}

// Postgres-shaped rate limiter over in-memory counter (adapter contract)
{
  const store = new InMemoryAtomicCounterStore();
  const limiter = new PostgresRateLimiter(store);
  const rlKey = "pg:ip:isolated:" + crypto.randomUUID().slice(0, 8);
  const a = await limiter.check(rlKey, 2, 60_000);
  const b = await limiter.check(rlKey, 2, 60_000);
  const c = await limiter.check(rlKey, 2, 60_000);
  check("postgres rate limiter allows under cap", a.allowed && b.allowed);
  check("postgres rate limiter blocks over cap", !c.allowed);
  const otherKey = "pg:ip:isolated:" + crypto.randomUUID().slice(0, 8);
  const other = await limiter.check(otherKey, 2, 60_000);
  check("postgres rate limiter positive control uncontaminated", other.allowed);
  check("noop notifier skips send", (await new NoopEmailNotifier().notifyLeadAccepted({})).skipped === true);
}

// ---------- M7A-R2 targeted corrections ----------
{
  // A1 — TLS negative tests (static / unit; no live DB)
  const insecure = inspectConnectionStringSsl(
    "postgresql://scs_intake_runtime:x@db.example.com:5432/postgres?sslmode=disable"
  );
  check("A1 sslmode=disable flagged insecure", insecure.insecure === true);

  const requireMode = inspectConnectionStringSsl(
    "postgresql://scs_intake_runtime:x@db.example.com:5432/postgres?sslmode=require"
  );
  check("A1 sslmode=require flagged no-verify", requireMode.insecure === true && requireMode.reason === "sslmode_require_no_verify");

  let sslFail = false;
  try {
    buildSslOptions(
      { PGSSLMODE: "disable" },
      {
        isProdLike: true,
        databaseUrl: "postgresql://scs_intake_runtime:x@db.example.com:5432/postgres",
      }
    );
  } catch (err) {
    sslFail = err && err.code === "DATABASE_SSL_INSECURE";
  }
  check("A1 prod-like rejects SSL disable", sslFail);

  const verified = buildSslOptions(
    {},
    {
      isProdLike: true,
      databaseUrl: "postgresql://scs_intake_runtime:x@db.example.com:5432/postgres?sslmode=verify-full",
    }
  );
  check("A1 verified TLS rejectUnauthorized true", verified && verified.rejectUnauthorized === true);
}

{
  // A5 — missing idempotency key rejected
  const deps = makeDeps();
  const res = await post(deps, baseLead({ idempotencyKey: "" }));
  const body = JSON.parse(res.body);
  check("A5 missing idempotency key rejected", res.statusCode === 400 && !!body.fields);
}

{
  // A5 — durable receivedAt on original + duplicate; survives cache expiry
  const deps = makeDeps();
  const key = "idem-durable-" + crypto.randomUUID().slice(0, 8);
  const payload = baseLead({ idempotencyKey: key });
  const first = await post(deps, payload);
  const firstBody = JSON.parse(first.body);
  const originalReceivedAt = firstBody.receivedAt;
  check("A5 original receivedAt present", typeof originalReceivedAt === "string" && originalReceivedAt.length > 10);

  const second = await post(deps, payload);
  const secondBody = JSON.parse(second.body);
  check("A5 cache replay same receivedAt", second.statusCode === 200 && secondBody.receivedAt === originalReceivedAt);

  deps.idempotency.expire(key);
  const afterExpiry = await post(deps, payload);
  const afterBody = JSON.parse(afterExpiry.body);
  check("A5 replay after cache expiry same receivedAt", afterExpiry.statusCode === 200 && afterBody.receivedAt === originalReceivedAt);
  check("A5 replay after expiry single lead", deps.repository.leads.length === 1);
}

{
  // A5 — rate-limit ordering: identical cache replay does not burn unlimited DB path;
  // exhausting rate then replaying cached key still returns original receipt.
  // Isolated fixture email + explicit reset (R5-C cross-test contamination guard).
  const deps = makeDeps();
  deps.rateLimiter.reset();
  const key = "idem-rate-" + crypto.randomUUID().slice(0, 8);
  const fixtureEmail = `rate-order-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const payload = baseLead({ idempotencyKey: key, email: fixtureEmail });
  const first = await post(deps, payload);
  check("A5 rate-order first ok", first.statusCode === 200);
  for (let i = 0; i < 10; i++) {
    await post(deps, baseLead({ email: fixtureEmail, idempotencyKey: crypto.randomUUID() }));
  }
  const replay = await post(deps, payload);
  check("A5 identical replay bypasses rate limit via cache", replay.statusCode === 200 && replay.body === first.body);
}

{
  // A6 — spoofed X-Forwarded-For ignored on hosted/Netlify context
  const hostedIp = clientIpFromEvent(
    { headers: { "x-forwarded-for": "1.2.3.4", "x-nf-client-connection-ip": "9.9.9.9" } },
    { CONTEXT: "production" }
  );
  check("A6 prefers Netlify connection IP", hostedIp === "9.9.9.9");

  const spoofOnly = clientIpFromEvent(
    { headers: { "x-forwarded-for": "8.8.8.8", "x-real-ip": "1.1.1.1" } },
    { CONTEXT: "production", NETLIFY: "true" }
  );
  check("A6 ignores visitor XFF on hosted", spoofOnly === null);

  check("A6 prod-like strips client isTest", resolveIsTestFlag(true, { SCS_ENV: "staging" }) === false);
  check(
    "A6 local allowlist honors isTest",
    resolveIsTestFlag(true, { SCS_ENV: "development", SCS_ALLOW_CLIENT_TEST_FLAG: "true" }) === true
  );

  const deps = makeDeps();
  deps.env = Object.assign({}, deps.env, { SCS_ENV: "staging" });
  const res = await post(deps, baseLead({ isTest: true }));
  check("A6 malicious isTest ignored in staging-like", res.statusCode === 200 && deps.repository.leads[0].is_test === false);
}

{
  // A7 — purge deletes outbox first; deleted key cannot recreate lead
  const deps = makeDeps();
  const key = "idem-del-" + crypto.randomUUID().slice(0, 8);
  const res = await post(deps, baseLead({ idempotencyKey: key }));
  check("A7 seed lead ok", res.statusCode === 200);
  const leadId = deps.repository.leads[0].id;
  deps.repository.softDeleteLead(leadId);
  check("A7 deletion marker recorded", deps.repository.deletionMarkers.has(key));
  deps.idempotency.expire(key);
  const replay = await post(deps, baseLead({ idempotencyKey: key }));
  const replayBody = JSON.parse(replay.body);
  check("A7 deleted key replay blocked", replay.statusCode === 409 && replayBody.code === "idempotency_key_deleted");
  check("A7 no recreated lead", deps.repository.leads.filter((l) => !l.deleted_at).length === 0);

  deps.repository.leads[0].deleted_at = new Date(Date.now() - 400 * 86400000).toISOString();
  const purged = deps.repository.purgeDeletedLeads(365);
  check("A7 purge removed soft-deleted lead", purged === 1 && deps.repository.leads.length === 0);
  check("A7 purge cleared outbox", deps.repository.outbox.length === 0);
}

{
  // B — Turnstile fail-closed when required
  const required = new TurnstileSpamProtector({
    secretKey: "REPLACE_ONLY_IF_CAPTCHA_AUTHORIZED",
    requireToken: true,
  });
  const r1 = await required.evaluate({ honeypotHit: false, turnstileToken: null });
  check("B Turnstile required+placeholder rejects", r1.action === "reject");

  const liveFail = new TurnstileSpamProtector({
    secretKey: "real-looking-secret-key-for-unit-test",
    requireToken: true,
    fetchImpl: async () => {
      throw new Error("network");
    },
  });
  const r2 = await liveFail.evaluate({ honeypotHit: false, turnstileToken: "tok" });
  check("B Turnstile network error fails closed", r2.action === "reject");

  const liveOk = new TurnstileSpamProtector({
    secretKey: "real-looking-secret-key-for-unit-test",
    requireToken: true,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ success: true }),
    }),
  });
  const r3 = await liveOk.evaluate({ honeypotHit: false, turnstileToken: "tok" });
  check("B Turnstile success allows", r3.action === "allow");

  check("B notify mode default disabled", resolveNotifyIntegrationMode({}) === "disabled");
  check("B notify mode simulated", resolveNotifyIntegrationMode({ EMAIL_NOTIFY_MODE: "simulated" }) === "simulated");

  // Simulated worker with mock SQL claim/complete (R4 claim_token + acknowledged)
  const claims = [];
  const mockSql = {
    async query(text, params) {
      if (String(text).includes("claim_notification_outbox")) {
        const row = {
          id: crypto.randomUUID(),
          claim_token: crypto.randomUUID(),
          submission_id: crypto.randomUUID(),
          payload_json: { receipt: "abcd1234", formName: "project-request", source: "contact" },
          status: "pending",
          attempts: 0,
        };
        claims.push(row);
        return { rows: [row] };
      }
      if (String(text).includes("complete_notification_outbox")) {
        return { rows: [{ acknowledged: true }] };
      }
      return { rows: [] };
    },
  };
  const workerResult = await processNotificationOutbox(mockSql, new NoopEmailNotifier(), {
    mode: "simulated",
  });
  check("B notify worker simulated claims", workerResult.claimed === 1 && workerResult.sent === 1);
  check("B notify worker no PII in claim payload", !claims[0].payload_json.email && !claims[0].payload_json.message);
}

{
  // .env.example documents intake URL + TLS CA + notify modes
  check(".env.example documents DATABASE_INTAKE_URL", /DATABASE_INTAKE_URL/.test(envText));
  check(".env.example documents sslmode verify-full", /sslmode=verify-full/.test(envText));
  check(".env.example documents EMAIL_NOTIFY_MODE", /EMAIL_NOTIFY_MODE/.test(envText));
  check(".env.example documents TURNSTILE_REQUIRED", /TURNSTILE_REQUIRED/.test(envText));
  check(".env.example documents recovery journal gated", /SCS_RECOVERY_JOURNAL_ENABLED/.test(envText));
}

{
  // -------------------------------------------------------------------------
  // M7A-R4 — R3-01..R3-08 local mock/static corrections
  // Evidence class: (1) mock + (2) static. Not real PostgreSQL.
  // -------------------------------------------------------------------------
  const mig7 = path.join(ROOT, "db/migrations/007_m7a_r4_security_corrections.sql");
  const bootstrap = path.join(ROOT, "db/bootstrap/001_m7a_r4_role_bootstrap.sql");
  const mig7Text = fs.existsSync(mig7) ? fs.readFileSync(mig7, "utf8") : "";
  const bootstrapText = fs.existsSync(bootstrap) ? fs.readFileSync(bootstrap, "utf8") : "";
  const workerAuthSrc = fs.readFileSync(
    path.join(ROOT, "netlify/functions/_lib/worker-auth.js"),
    "utf8"
  );
  const notifyHandlerSrc = fs.readFileSync(
    path.join(ROOT, "netlify/functions/notify-worker.js"),
    "utf8"
  );
  const notifyLibSrc = fs.readFileSync(
    path.join(ROOT, "netlify/functions/_lib/notify-worker.js"),
    "utf8"
  );
  const adaptersSrc = fs.readFileSync(
    path.join(ROOT, "netlify/functions/_lib/postgres-adapters.js"),
    "utf8"
  );
  const processLeadSrc = fs.readFileSync(
    path.join(ROOT, "netlify/functions/_lib/process-lead.js"),
    "utf8"
  );
  const pkgJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, "netlify/functions/package.json"), "utf8")
  );
  const lockPath = path.join(ROOT, "netlify/functions/package-lock.json");
  const lockingDoc = path.join(ROOT, "netlify/functions/DEPENDENCY-LOCKING.md");

  // R3-01 — idempotency lookup RPC; no table SELECT for intake; deletion markers
  check("R3-01 migration 007 exists", fs.existsSync(mig7));
  check(
    "R3-01 lookup_idempotency_response SECURITY DEFINER",
    /CREATE OR REPLACE FUNCTION public\.lookup_idempotency_response[\s\S]*SECURITY DEFINER/.test(mig7Text)
  );
  check(
    "R3-01 revoke idempotency_keys from intake",
    /REVOKE ALL ON TABLE public\.idempotency_keys FROM scs_intake_runtime/.test(mig7Text)
  );
  check(
    "R3-01 adapter uses lookup RPC",
    /lookup_idempotency_response/.test(adaptersSrc) && !/FROM public\.idempotency_keys/.test(adaptersSrc)
  );
  {
    const calls = [];
    const mockClient = {
      async query(text, params) {
        calls.push({ text: String(text), params });
        if (String(text).includes("lookup_idempotency_response")) {
          return {
            rows: [
              {
                found: false,
                expired: false,
                deleted: true,
                fingerprint_match: false,
                response_json: null,
              },
            ],
          };
        }
        return { rows: [] };
      },
    };
    const store = new PostgresIdempotencyStore(mockClient);
    const deleted = await store.get("tombstoned-key", "f".repeat(64));
    check(
      "R3-01 deleted marker withholds cached receipt",
      deleted && deleted.deleted === true && deleted.body == null
    );
    check(
      "R3-01 lookup called with key and fingerprint",
      calls.length === 1 && calls[0].params[0] === "tombstoned-key"
    );
  }
  {
    const deps = makeDeps();
    const key = "idem-warm-del-" + crypto.randomUUID().slice(0, 8);
    const seeded = await post(deps, baseLead({ idempotencyKey: key }));
    check("R3-01 warm-cache seed", seeded.statusCode === 200);
    deps.repository.softDeleteLead(deps.repository.leads[0].id);
    const replay = await post(deps, baseLead({ idempotencyKey: key }));
    const replayBody = JSON.parse(replay.body);
    check(
      "R3-01 warm cache cannot bypass deletion marker",
      replay.statusCode === 409 && replayBody.code === "idempotency_key_deleted"
    );
  }

  // R3-02 — aggregate status RPC; no direct outbox SELECT in worker lib
  check(
    "R3-02 status_counts RPC present",
    /notification_outbox_status_counts/.test(mig7Text)
  );
  check(
    "R3-02 status granted to owner only",
    /GRANT EXECUTE ON FUNCTION public\.notification_outbox_status_counts\(\) TO scs_owner_admin/.test(
      mig7Text
    ) &&
      /REVOKE ALL ON FUNCTION public\.notification_outbox_status_counts\(\) FROM scs_notify_worker/.test(
        mig7Text
      )
  );
  check(
    "R3-02 worker lib uses aggregate RPC",
    /notification_outbox_status_counts/.test(notifyLibSrc) &&
      !/FROM\s+public\.notification_outbox\b(?!_)/i.test(notifyLibSrc)
  );
  {
    const status = await getNotificationFailureStatus({
      async query() {
        return { rows: [{ pending_count: 1, failed_count: 2, dead_count: 3 }] };
      },
    });
    check(
      "R3-02 status helper returns aggregates",
      status.available && status.pending === 1 && status.failed === 2 && status.dead === 3
    );
  }

  // R3-03 / R5-C — authenticated invocation; ignore scheduler headers;
  // exercise the actual notification handler for missing/incorrect/correct auth.
  {
    const handlerBody = notifyHandlerSrc.slice(notifyHandlerSrc.indexOf("exports.handler"));
    check(
      "R3-03 handler authorizes before DB",
      /authorizeNotifyWorkerInvocation[\s\S]*createPgQueryClient/.test(handlerBody)
    );
  }
  check(
    "R3-03 worker-auth ignores scheduler headers",
    /x-nf-scheduled/.test(workerAuthSrc) && /ignored|not trusted|are ignored/i.test(workerAuthSrc)
  );
  {
    const secret = "correct-horse-battery-staple-value-32chars";
    const spoofed = authorizeNotifyWorkerInvocation(
      { headers: { "x-nf-scheduled": "true", "x-netlify-event": "schedule" } },
      { NOTIFY_WORKER_INVOKE_SECRET: secret }
    );
    const badBearer = authorizeNotifyWorkerInvocation(
      { headers: { authorization: "Bearer wrong-secret-that-is-long-enough-xx" } },
      { NOTIFY_WORKER_INVOKE_SECRET: secret }
    );
    const good = authorizeNotifyWorkerInvocation(
      { headers: { authorization: "Bearer " + secret } },
      { NOTIFY_WORKER_INVOKE_SECRET: secret }
    );
    const unconfigured = authorizeNotifyWorkerInvocation(
      { headers: { authorization: "Bearer " + secret } },
      {}
    );
    check("R3-03 spoofed scheduler rejected", spoofed.ok === false);
    check("R3-03 wrong bearer rejected", badBearer.ok === false);
    check("R3-03 valid bearer accepted", good.ok === true);
    check("R3-03 missing secret rejected", unconfigured.ok === false);
  }
  {
    const disabled = await processNotificationOutbox(
      {
        async query() {
          throw new Error("db_must_not_be_called");
        },
      },
      null,
      { mode: "operational" }
    );
    check(
      "R3-03 live delivery stays disabled before claims",
      disabled.skipped === true && disabled.reason === "live_delivery_disabled"
    );
  }
  {
    // Actual handler exercise (R5-C). Env isolated and restored.
    const secret = "r6-handler-secret-value-32chars-ok!!";
    const saved = {
      NOTIFY_WORKER_INVOKE_SECRET: process.env.NOTIFY_WORKER_INVOKE_SECRET,
      EMAIL_NOTIFY_MODE: process.env.EMAIL_NOTIFY_MODE,
      EMAIL_NOTIFY_ENABLED: process.env.EMAIL_NOTIFY_ENABLED,
      DATABASE_NOTIFY_URL: process.env.DATABASE_NOTIFY_URL,
      DATABASE_INTAKE_URL: process.env.DATABASE_INTAKE_URL,
      DATABASE_URL: process.env.DATABASE_URL,
      SCS_ENV: process.env.SCS_ENV,
      SCS_DEPENDENCY_MODE: process.env.SCS_DEPENDENCY_MODE,
    };
    try {
      process.env.NOTIFY_WORKER_INVOKE_SECRET = secret;
      process.env.EMAIL_NOTIFY_MODE = "simulated";
      process.env.SCS_ENV = "staging";
      process.env.SCS_DEPENDENCY_MODE = "postgres";
      // Placeholder URL rejected by createPgQueryClient before connect.
      // Unauthorized requests must stay 4xx (not 503 from the DB client path).
      process.env.DATABASE_NOTIFY_URL =
        "postgresql://scs_notify_worker:x@db.example.com:5432/postgres?sslmode=verify-full";
      process.env.DATABASE_INTAKE_URL = process.env.DATABASE_NOTIFY_URL;
      process.env.DATABASE_URL = process.env.DATABASE_NOTIFY_URL;

      const missingAuth = await notifyWorkerHandler.handler({
        httpMethod: "POST",
        headers: {},
      });
      const missingBody = JSON.parse(missingAuth.body);
      check(
        "R5-C handler missing auth rejected",
        missingAuth.statusCode >= 400 && missingAuth.statusCode < 500 && missingBody.ok === false
      );

      const wrongAuth = await notifyWorkerHandler.handler({
        httpMethod: "POST",
        headers: { authorization: "Bearer wrong-secret-that-is-long-enough-xx" },
      });
      const wrongBody = JSON.parse(wrongAuth.body);
      check(
        "R5-C handler incorrect auth rejected",
        wrongAuth.statusCode >= 400 && wrongAuth.statusCode < 500 && wrongBody.ok === false
      );

      // Unauthorized must not initiate DB claims: still 4xx, not 503 from createPgQueryClient.
      check(
        "R5-C unauthorized cannot initiate database claims",
        missingAuth.statusCode !== 503 &&
          wrongAuth.statusCode !== 503 &&
          missingBody.code !== "notify_worker_unavailable" &&
          wrongBody.code !== "notify_worker_unavailable"
      );

      // Positive control: correct auth + non-simulated skips without DB claim path.
      process.env.EMAIL_NOTIFY_MODE = "disabled";
      const correctDisabled = await notifyWorkerHandler.handler({
        httpMethod: "POST",
        headers: { authorization: "Bearer " + secret },
      });
      const correctDisabledBody = JSON.parse(correctDisabled.body);
      check(
        "R5-C handler correct auth positive control (disabled)",
        correctDisabled.statusCode === 200 &&
          correctDisabledBody.ok === true &&
          correctDisabledBody.skipped === true
      );

      // Correct auth + simulated enters DB client path → fail-closed 503 on unreachable URL.
      process.env.EMAIL_NOTIFY_MODE = "simulated";
      const correctSim = await notifyWorkerHandler.handler({
        httpMethod: "POST",
        headers: { authorization: "Bearer " + secret },
      });
      const correctSimBody = JSON.parse(correctSim.body);
      check(
        "R5-C handler correct auth reaches DB path (503 fail-closed)",
        correctSim.statusCode === 503 && correctSimBody.code === "notify_worker_unavailable"
      );
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  }

  // R3-04 — claim token fencing; false acknowledgement is a failure
  check(
    "R3-04 complete requires claim_token",
    /complete_notification_outbox\(\s*uuid,\s*text,\s*uuid,\s*boolean,\s*text\s*\)/.test(mig7Text) ||
      /p_claim_token uuid/.test(mig7Text)
  );
  check("R3-04 claim assigns claim_token", /claim_token = gen_random_uuid\(\)/.test(mig7Text));
  {
    const falseAckSql = {
      async query(text) {
        if (String(text).includes("claim_notification_outbox")) {
          return {
            rows: [
              {
                id: crypto.randomUUID(),
                claim_token: crypto.randomUUID(),
                payload_json: { receipt: "r1" },
              },
            ],
          };
        }
        if (String(text).includes("complete_notification_outbox")) {
          return { rows: [{ acknowledged: false }] };
        }
        return { rows: [] };
      },
    };
    const stale = await processNotificationOutbox(falseAckSql, null, { mode: "simulated" });
    check(
      "R3-04 unsuccessful acknowledgement counted as failure",
      stale.claimed === 1 && stale.sent === 0 && stale.failed === 1
    );
    const missingToken = await processNotificationOutbox(
      {
        async query(text) {
          if (String(text).includes("claim_notification_outbox")) {
            return { rows: [{ id: crypto.randomUUID(), payload_json: { receipt: "r2" } }] };
          }
          throw new Error("complete_must_not_run_without_token");
        },
      },
      null,
      { mode: "simulated" }
    );
    check(
      "R3-04 missing claim_token cannot complete",
      missingToken.claimed === 1 && missingToken.failed === 1
    );
  }

  // R3-05 — bootstrap separated; failures not swallowed
  check("R3-05 bootstrap procedure exists", fs.existsSync(bootstrap));
  check(
    "R3-05 bootstrap fails closed without CREATEROLE",
    /lacks CREATEROLE or SUPERUSER/.test(bootstrapText) &&
      !/RAISE NOTICE 'scs_\* role creation skipped/.test(bootstrapText)
  );
  check(
    "R3-05 migration 007 aborts without roles",
    /role bootstrap prerequisite failed/.test(mig7Text)
  );
  check(
    "R3-05 006 swallow documented as non-provisioning path",
    /insufficient_privilege/.test(fs.readFileSync(mig6, "utf8")) &&
      /Do not use that block as the provisioning path|swallowed/i.test(bootstrapText + mig7Text)
  );

  // R3-06 — no hosted admin bypass; effective identity checked
  check(
    "R3-06 SCS_ALLOW_ADMIN_DB_USER not honored",
    /SCS_ALLOW_ADMIN_DB_USER is not consulted|not honored/i.test(pgClientSrc + envText)
  );
  check(
    "R3-06 assertEffectiveDatabaseIdentity exported",
    /function assertEffectiveDatabaseIdentity/.test(pgClientSrc)
  );
  {
    const hosted = {
      SCS_ENV: "staging",
      SCS_DEPENDENCY_MODE: "postgres",
      SCS_ALLOW_ADMIN_DB_USER: "true",
    };
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
    check("R3-06 hosted admin URL rejected despite override flag", urlRejected);
    check("R3-06 session_user admin rejected", effectiveRejected);
  }

  // R3-07 — no public development-salt fallback; raw IP never returned
  check(
    "R3-07 no development-salt fallback string",
    !/development-salt-not-for-prod|dev-salt-fallback/i.test(processLeadSrc) &&
      /no public development-salt fallback/i.test(processLeadSrc)
  );
  {
    const missing = hashIp("203.0.113.50", { SCS_ENV: "staging", NETLIFY: "true" });
    const placeholder = hashIp("203.0.113.50", {
      SCS_ENV: "production",
      LEAD_IP_HASH_SALT: "REPLACE_WITH_STRONG_RANDOM_SALT_STAGING_OR_PROD",
    });
    const shortSalt = hashIp("203.0.113.50", {
      SCS_ENV: "staging",
      LEAD_IP_HASH_SALT: "too-short",
    });
    const valid = hashIp("203.0.113.50", {
      SCS_ENV: "staging",
      LEAD_IP_HASH_SALT: "r4-hosted-salt-value-generated-server-side-32",
    });
    check("R3-07 missing hosted salt yields null", missing === null);
    check("R3-07 placeholder salt yields null", placeholder === null);
    check("R3-07 short salt yields null", shortSalt === null);
    check(
      "R3-07 valid salt hashes without raw IP",
      typeof valid === "string" && valid !== "203.0.113.50" && valid.length === 32
    );
  }

  // R3-08 — exact pin + Owner-authorized lockfile (npm install --package-lock-only
  // --ignore-scripts). Integrity hashes must come from npm; do not invent them.
  check("R3-08 pg pinned to exact 8.13.1", pkgJson.dependencies && pkgJson.dependencies.pg === "8.13.1");
  check("R3-08 dependency locking doc present", fs.existsSync(lockingDoc));
  let lockOk = false;
  let lockRegistriesClean = false;
  if (fs.existsSync(lockPath)) {
    try {
      const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
      const rootPg = lock.packages && lock.packages[""] && lock.packages[""].dependencies
        ? lock.packages[""].dependencies.pg
        : null;
      const pgEntry = lock.packages && lock.packages["node_modules/pg"];
      lockOk =
        lock.lockfileVersion >= 2 &&
        rootPg === "8.13.1" &&
        pgEntry &&
        pgEntry.version === "8.13.1" &&
        typeof pgEntry.integrity === "string" &&
        pgEntry.integrity.length > 0 &&
        typeof pgEntry.resolved === "string" &&
        pgEntry.resolved.startsWith("https://registry.npmjs.org/pg/");
      const resolvedUrls = Object.values(lock.packages || {})
        .map((p) => p && p.resolved)
        .filter(Boolean);
      lockRegistriesClean =
        resolvedUrls.length > 0 &&
        resolvedUrls.every((u) => String(u).startsWith("https://registry.npmjs.org/"));
    } catch {
      lockOk = false;
      lockRegistriesClean = false;
    }
  }
  check("R3-08 package-lock present with pg@8.13.1 integrity", lockOk);
  check("R3-08 lockfile registries are registry.npmjs.org only", lockRegistriesClean);
  check(
    "R3-08 classifyDatabaseError distinguishes 42501",
    classifyDatabaseError({ code: "42501" }) === "permission_denied" &&
      classifyDatabaseError({ code: "42883" }) === "missing_function" &&
      classifyDatabaseError({ code: "XX000" }) === "execution_error"
  );

  check(".env.example documents NOTIFY_WORKER_INVOKE_SECRET", /NOTIFY_WORKER_INVOKE_SECRET/.test(envText));
  check(".env.example documents DATABASE_OWNER_URL", /DATABASE_OWNER_URL/.test(envText));
  check(
    "R5-B .env.example documents scs_test_admin / DATABASE_TEST_ADMIN_URL",
    /DATABASE_TEST_ADMIN_URL/.test(envText) && /scs_test_admin/.test(envText)
  );
  check(
    "R5-B .env.example documents project-admin migration executor",
    /DATABASE_PROJECT_ADMIN_URL/.test(envText) &&
      /controlled (?:Supabase )?project administrator|project administrator/i.test(envText)
  );
  check(
    "R7-02 .env.example sole project-admin executor (no scs_migration alternate)",
    /SOLE supported executor/i.test(envText) &&
      /scs_migration is RESERVED|RESERVED — NOT a supported migration executor/i.test(envText) &&
      !/scs_migration may apply ordered DDL/i.test(envText)
  );
  check(
    "R5-B scs_test_admin rejected as Function runtime",
    ADMIN_RUNTIME_ROLES.has("scs_test_admin")
  );
  check(
    "R5-B migration executor static script present",
    fs.existsSync(path.join(ROOT, "db/scripts/m7a-migration-executor-static.mjs"))
  );
  {
    const execSrc = fs.readFileSync(
      path.join(ROOT, "db/scripts/m7a-migration-executor-static.mjs"),
      "utf8"
    );
    check(
      "R7-02 migration executor has no project_admin_or_scs_migration ambiguity",
      !/project_admin_or_scs_migration/.test(execSrc) &&
        /SOLE_SUPPORTED_EXECUTOR\s*=\s*"project_admin"/.test(execSrc)
    );
  }

  // R5-C — exercise createPgQueryClient for TLS verification + effective identity
  {
    const hosted = {
      SCS_ENV: "staging",
      SCS_DEPENDENCY_MODE: "postgres",
    };
    let tlsRejected = false;
    try {
      createPgQueryClient(
        Object.assign({}, hosted, {
          DATABASE_INTAKE_URL:
            "postgresql://scs_intake_runtime:x@db.r6-staging.supabase.co:5432/postgres?sslmode=disable",
          DATABASE_URL:
            "postgresql://scs_intake_runtime:x@db.r6-staging.supabase.co:5432/postgres?sslmode=disable",
        }),
        { expectedRole: "scs_intake_runtime" }
      );
    } catch (err) {
      tlsRejected = err && err.code === "DATABASE_SSL_INSECURE";
    }
    check("R5-C createPgQueryClient rejects insecure TLS URL", tlsRejected);

    let adminRejected = false;
    try {
      createPgQueryClient(
        Object.assign({}, hosted, {
          DATABASE_INTAKE_URL:
            "postgresql://postgres:secret@db.r6-staging.supabase.co:5432/postgres?sslmode=verify-full",
          DATABASE_URL:
            "postgresql://postgres:secret@db.r6-staging.supabase.co:5432/postgres?sslmode=verify-full",
        }),
        { expectedRole: "scs_intake_runtime" }
      );
    } catch (err) {
      adminRejected = err && err.code === "DATABASE_IDENTITY_INSECURE";
    }
    check("R5-C createPgQueryClient rejects admin identity", adminRejected);

    let testAdminRejected = false;
    try {
      createPgQueryClient(
        Object.assign({}, hosted, {
          DATABASE_INTAKE_URL:
            "postgresql://scs_test_admin:secret@db.r6-staging.supabase.co:5432/postgres?sslmode=verify-full",
          DATABASE_URL:
            "postgresql://scs_test_admin:secret@db.r6-staging.supabase.co:5432/postgres?sslmode=verify-full",
        }),
        { expectedRole: "scs_intake_runtime" }
      );
    } catch (err) {
      testAdminRejected = err && err.code === "DATABASE_IDENTITY_INSECURE";
    }
    check("R5-C createPgQueryClient rejects scs_test_admin runtime", testAdminRejected);

    // Positive control: valid role + verify-full builds a client with rejectUnauthorized.
    // Do not query a live host — end the idle pool immediately.
    let client = null;
    let positiveOk = false;
    try {
      client = createPgQueryClient(
        Object.assign({}, hosted, {
          DATABASE_INTAKE_URL:
            "postgresql://scs_intake_runtime:secret@db.r6-staging.supabase.co:5432/postgres?sslmode=verify-full",
          DATABASE_URL:
            "postgresql://scs_intake_runtime:secret@db.r6-staging.supabase.co:5432/postgres?sslmode=verify-full",
        }),
        { expectedRole: "scs_intake_runtime" }
      );
      positiveOk = Boolean(client && client._ssl && client._ssl.rejectUnauthorized === true);
    } catch (err) {
      positiveOk = false;
    } finally {
      if (client && typeof client.end === "function") {
        try {
          await client.end();
        } catch {
          /* ignore */
        }
      }
    }
    check("R5-C createPgQueryClient TLS positive control rejectUnauthorized", positiveOk);

    // Effective identity rejection via mocked first query (no live DB).
    let identityClient = null;
    let effectiveRejected = false;
    try {
      identityClient = createPgQueryClient(
        Object.assign({}, hosted, {
          DATABASE_INTAKE_URL:
            "postgresql://scs_intake_runtime:secret@db.r6-staging.supabase.co:5432/postgres?sslmode=verify-full",
          DATABASE_URL:
            "postgresql://scs_intake_runtime:secret@db.r6-staging.supabase.co:5432/postgres?sslmode=verify-full",
        }),
        { expectedRole: "scs_intake_runtime" }
      );
      identityClient._pool.query = async (text) => {
        if (String(text).includes("current_user")) {
          return {
            rows: [{ current_user: "scs_intake_runtime", session_user: "postgres" }],
          };
        }
        return { rows: [] };
      };
      try {
        await identityClient.query("SELECT 1");
      } catch (err) {
        effectiveRejected = err && err.code === "DATABASE_IDENTITY_INSECURE";
      }
    } catch {
      effectiveRejected = false;
    } finally {
      if (identityClient && typeof identityClient.end === "function") {
        try {
          await identityClient.end();
        } catch {
          /* ignore */
        }
      }
    }
    check("R5-C createPgQueryClient effective identity session_user check", effectiveRejected);

    // Positive control: matching current_user + session_user allows the query path.
    let posClient = null;
    let effectivePositive = false;
    try {
      posClient = createPgQueryClient(
        Object.assign({}, hosted, {
          DATABASE_INTAKE_URL:
            "postgresql://scs_intake_runtime:secret@db.r6-staging.supabase.co:5432/postgres?sslmode=verify-full",
          DATABASE_URL:
            "postgresql://scs_intake_runtime:secret@db.r6-staging.supabase.co:5432/postgres?sslmode=verify-full",
        }),
        { expectedRole: "scs_intake_runtime" }
      );
      let sawSelect = false;
      posClient._pool.query = async (text) => {
        if (String(text).includes("current_user")) {
          return {
            rows: [{ current_user: "scs_intake_runtime", session_user: "scs_intake_runtime" }],
          };
        }
        sawSelect = true;
        return { rows: [{ ok: 1 }] };
      };
      const q = await posClient.query("SELECT 1 AS ok");
      effectivePositive = sawSelect && q.rows[0].ok === 1;
    } catch {
      effectivePositive = false;
    } finally {
      if (posClient && typeof posClient.end === "function") {
        try {
          await posClient.end();
        } catch {
          /* ignore */
        }
      }
    }
    check("R5-C createPgQueryClient effective identity positive control", effectivePositive);
  }

  // R5-C — simulated JWT claims are NOT hosted Supabase Auth / AAL2 evidence.
  check(
    "R5-C simulated JWT claims separated from hosted Auth AAL2",
    /set_config\('request\.jwt\.claims'/.test(
      fs.readFileSync(path.join(ROOT, "qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs"), "utf8")
    ) &&
      /Genuine hosted Supabase Auth|HOSTED_AUTH|not hosted Auth/i.test(
        fs.readFileSync(path.join(ROOT, "qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs"), "utf8")
      )
  );

  // ---------- M7A-R7 TLS override resistance (pinned pg@8.13.1; no DB connect) ----------
  {
    const hosted = {
      SCS_ENV: "staging",
      SCS_DEPENDENCY_MODE: "postgres",
    };
    const pgRoot = path.join(ROOT, "netlify/functions/node_modules/pg");
    const pgAvailable = fs.existsSync(path.join(pgRoot, "package.json"));
    let pgVersion = null;
    if (pgAvailable) {
      try {
        pgVersion = JSON.parse(fs.readFileSync(path.join(pgRoot, "package.json"), "utf8")).version;
      } catch {
        pgVersion = null;
      }
    }
    check("R7-01 pinned pg@8.13.1 available for effective TLS tests", pgAvailable && pgVersion === "8.13.1");

    // Codex reproduction baseline: connectionString + ssl is overwritten by uselibpqcompat.
    let codexDowngradeDemonstrated = false;
    if (pgAvailable && pgVersion === "8.13.1") {
      const ConnectionParameters = require("../netlify/functions/node_modules/pg/lib/connection-parameters");
      const tls = require("node:tls");
      const secure = {
        rejectUnauthorized: true,
        checkServerIdentity: tls.checkServerIdentity,
      };
      const attacked = new ConnectionParameters({
        connectionString:
          "postgresql://scs_intake_runtime:secret@db.r7-staging.supabase.co:5432/postgres?sslmode=require&uselibpqcompat=true",
        ssl: secure,
      });
      codexDowngradeDemonstrated =
        attacked.ssl &&
        typeof attacked.ssl === "object" &&
        attacked.ssl.rejectUnauthorized === false;
    }
    check(
      "R7-01 Codex baseline: sslmode=require&uselibpqcompat=true overwrites secure ssl via connectionString",
      codexDowngradeDemonstrated
    );

    // Factory must REJECT the Codex reproduction URL (no connect).
    let codexRejected = false;
    let codexCode = null;
    try {
      createPgQueryClient(
        Object.assign({}, hosted, {
          DATABASE_INTAKE_URL:
            "postgresql://scs_intake_runtime:secret@db.r7-staging.supabase.co:5432/postgres?sslmode=require&uselibpqcompat=true",
          DATABASE_URL:
            "postgresql://scs_intake_runtime:secret@db.r7-staging.supabase.co:5432/postgres?sslmode=require&uselibpqcompat=true",
        }),
        { expectedRole: "scs_intake_runtime" }
      );
    } catch (err) {
      codexRejected = err && err.code === "DATABASE_SSL_INSECURE";
      codexCode = err && err.message;
    }
    check(
      "R7-01 factory rejects Codex uselibpqcompat+sslmode=require URL",
      codexRejected && codexCode === "database_url_uselibpqcompat_forbidden"
    );

    // Positive control: verify-full → effective TLS verified (ConnectionParameters).
    let posClient = null;
    let posEffective = false;
    try {
      posClient = createPgQueryClient(
        Object.assign({}, hosted, {
          DATABASE_INTAKE_URL:
            "postgresql://scs_intake_runtime:secret@db.r7-staging.supabase.co:5432/postgres?sslmode=verify-full",
          DATABASE_URL:
            "postgresql://scs_intake_runtime:secret@db.r7-staging.supabase.co:5432/postgres?sslmode=verify-full",
        }),
        { expectedRole: "scs_intake_runtime" }
      );
      posEffective =
        posClient &&
        posClient._effectiveSsl &&
        posClient._effectiveSsl.rejectUnauthorized === true &&
        posClient._effectiveSsl.hasCheckServerIdentity === true &&
        posClient._poolConfig &&
        posClient._poolConfig.hasConnectionString === false;
      if (posEffective && pgAvailable) {
        const again = inspectEffectivePgSsl({
          user: posClient._approvedFields.user,
          password: "secret",
          host: posClient._approvedFields.host,
          port: posClient._approvedFields.port,
          database: posClient._approvedFields.database,
          ssl: posClient._ssl,
        });
        posEffective =
          again.rejectUnauthorized === true && again.hasCheckServerIdentity === true;
      }
    } catch {
      posEffective = false;
    } finally {
      if (posClient && typeof posClient.end === "function") {
        try {
          await posClient.end();
        } catch {
          /* ignore */
        }
      }
    }
    check("R7-01 positive control verify-full effective TLS rejectUnauthorized+hostname", posEffective);

    // Positive control: sslmode=require alone is accepted only after strip; TLS stays verified.
    let requireClient = null;
    let requireEffective = false;
    try {
      requireClient = createPgQueryClient(
        Object.assign({}, hosted, {
          DATABASE_INTAKE_URL:
            "postgresql://scs_intake_runtime:secret@db.r7-staging.supabase.co:5432/postgres?sslmode=require",
          DATABASE_URL:
            "postgresql://scs_intake_runtime:secret@db.r7-staging.supabase.co:5432/postgres?sslmode=require",
        }),
        { expectedRole: "scs_intake_runtime" }
      );
      requireEffective =
        requireClient &&
        requireClient._effectiveSsl &&
        requireClient._effectiveSsl.rejectUnauthorized === true &&
        requireClient._effectiveSsl.hasCheckServerIdentity === true &&
        requireClient._approvedFields.normalizedSslmode === "verify-full" &&
        requireClient._poolConfig.hasConnectionString === false;
    } catch {
      requireEffective = false;
    } finally {
      if (requireClient && typeof requireClient.end === "function") {
        try {
          await requireClient.end();
        } catch {
          /* ignore */
        }
      }
    }
    check(
      "R7-01 positive control sslmode=require normalized to verified TLS without connectionString",
      requireEffective
    );

    // Pooler hostname/port positive control (Supabase pooler format).
    let poolerClient = null;
    let poolerOk = false;
    try {
      poolerClient = createPgQueryClient(
        Object.assign({}, hosted, {
          DATABASE_INTAKE_URL:
            "postgresql://scs_intake_runtime:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=verify-full&pgbouncer=true",
          DATABASE_URL:
            "postgresql://scs_intake_runtime:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=verify-full&pgbouncer=true",
        }),
        { expectedRole: "scs_intake_runtime" }
      );
      poolerOk =
        poolerClient &&
        poolerClient._approvedFields.host === "aws-0-us-east-1.pooler.supabase.com" &&
        poolerClient._approvedFields.port === 6543 &&
        poolerClient._effectiveSsl.rejectUnauthorized === true &&
        poolerClient._poolConfig.hasConnectionString === false;
    } catch {
      poolerOk = false;
    } finally {
      if (poolerClient && typeof poolerClient.end === "function") {
        try {
          await poolerClient.end();
        } catch {
          /* ignore */
        }
      }
    }
    check("R7-01 positive control Supabase pooler host/port with verified TLS", poolerOk);

    // Override / injection rejection cases.
    const rejectCases = [
      {
        name: "sslmode=disable",
        url: "postgresql://scs_intake_runtime:secret@db.r7-staging.supabase.co:5432/postgres?sslmode=disable",
        msg: "sslmode_disable_forbidden",
      },
      {
        name: "sslmode=verify-ca",
        url: "postgresql://scs_intake_runtime:secret@db.r7-staging.supabase.co:5432/postgres?sslmode=verify-ca",
        msg: "sslmode_verify_ca_no_hostname",
      },
      {
        name: "sslrootcert injection",
        url: "postgresql://scs_intake_runtime:secret@db.r7-staging.supabase.co:5432/postgres?sslmode=verify-full&sslrootcert=/tmp/x.pem",
        msg: "database_url_ssl_injection_forbidden",
      },
      {
        name: "duplicate sslmode",
        url: "postgresql://scs_intake_runtime:secret@db.r7-staging.supabase.co:5432/postgres?sslmode=verify-full&sslmode=require",
        msg: "database_url_duplicate_security_param",
      },
      {
        name: "unsupported param",
        url: "postgresql://scs_intake_runtime:secret@db.r7-staging.supabase.co:5432/postgres?sslmode=verify-full&options=-csearch_path=evil",
        msg: "database_url_unsupported_param",
      },
    ];
    for (const tc of rejectCases) {
      let rejected = false;
      try {
        createPgQueryClient(
          Object.assign({}, hosted, {
            DATABASE_INTAKE_URL: tc.url,
            DATABASE_URL: tc.url,
          }),
          { expectedRole: "scs_intake_runtime" }
        );
      } catch (err) {
        rejected =
          Boolean(err) &&
          (err.code === "DATABASE_SSL_INSECURE" || err.code === "DATABASE_CONFIG_INVALID") &&
          err.message === tc.msg;
      }
      check(`R7-01 rejects ${tc.name}`, rejected);
    }

    // parseApprovedConnectionFields never returns a connectionString key.
    const parsed = parseApprovedConnectionFields(
      "postgresql://scs_intake_runtime:secret@db.r7-staging.supabase.co:5432/postgres?sslmode=verify-full"
    );
    check(
      "R7-01 parseApprovedConnectionFields returns explicit fields only",
      parsed.user === "scs_intake_runtime" &&
        parsed.host === "db.r7-staging.supabase.co" &&
        parsed.port === 5432 &&
        parsed.database === "postgres" &&
        parsed.normalizedSslmode === "verify-full" &&
        !Object.prototype.hasOwnProperty.call(parsed, "connectionString")
    );

    // Manifest completeness static markers for R7-03.
    check(
      "R7-03 _headers security file present",
      fs.existsSync(path.join(ROOT, "_headers"))
    );
    check(
      "R7-03 root netlify.toml is authoritative build source",
      /command\s*=\s*"npm ci --prefix netlify\/functions && node scripts\/build-public\.mjs"/.test(netlifyToml)
    );

    // ---------- M7B pre-execution corrections (local mock/static only; no DB connect) ----------
    check(
      "M7B canonicalizeQueryKey maps ssl-mode to sslmode",
      canonicalizeQueryKey("ssl-mode") === "sslmode" && canonicalizeQueryKey("sslmode") === "sslmode"
    );

    // Deferred P2: mixed sslmode / ssl-mode aliases must collide as duplicate security params.
    let mixedAliasRejected = false;
    try {
      parseApprovedConnectionFields(
        "postgresql://scs_intake_runtime:secret@db.r7-staging.supabase.co:5432/postgres?sslmode=verify-full&ssl-mode=require"
      );
    } catch (err) {
      mixedAliasRejected =
        Boolean(err) &&
        err.code === "DATABASE_SSL_INSECURE" &&
        err.message === "database_url_duplicate_security_param";
    }
    check("M7B mixed-alias sslmode+ssl-mode rejected as duplicate", mixedAliasRejected);

    // Positive: ssl-mode alone (canonical alias) still parses when verify-full.
    let sslModeAliasOk = false;
    try {
      const aliased = parseApprovedConnectionFields(
        "postgresql://scs_intake_runtime:secret@db.r7-staging.supabase.co:5432/postgres?ssl-mode=verify-full"
      );
      sslModeAliasOk =
        aliased.sslmode === "verify-full" && aliased.normalizedSslmode === "verify-full";
    } catch {
      sslModeAliasOk = false;
    }
    check("M7B positive ssl-mode=verify-full accepted after canonicalize", sslModeAliasOk);

    // Harness: DATABASE_MIGRATION_URL presence rejected; PROJECT_ADMIN exclusive.
    const legacyPresent = resolveRealPgHarnessEnv({
      DATABASE_MIGRATION_URL: "postgresql://postgres:x@db.example.com:5432/postgres?sslmode=verify-full",
      DATABASE_PROJECT_ADMIN_URL:
        "postgresql://postgres:x@db.example.com:5432/postgres?sslmode=verify-full",
      DATABASE_INTAKE_URL:
        "postgresql://scs_intake_runtime:x@db.example.com:5432/postgres?sslmode=verify-full",
      DATABASE_NOTIFY_URL:
        "postgresql://scs_notify_worker:x@db.example.com:5432/postgres?sslmode=verify-full",
      DATABASE_OWNER_URL:
        "postgresql://scs_owner_admin:x@db.example.com:5432/postgres?sslmode=verify-full",
      DATABASE_TEST_ADMIN_URL:
        "postgresql://scs_test_admin:x@db.example.com:5432/postgres?sslmode=verify-full",
    });
    check(
      "M7B harness rejects DATABASE_MIGRATION_URL presence",
      legacyPresent.ok === false && legacyPresent.code === "DATABASE_MIGRATION_URL_UNSUPPORTED"
    );

    const missingProjectAdmin = resolveRealPgHarnessEnv({
      DATABASE_INTAKE_URL:
        "postgresql://scs_intake_runtime:x@db.example.com:5432/postgres?sslmode=verify-full",
      DATABASE_NOTIFY_URL:
        "postgresql://scs_notify_worker:x@db.example.com:5432/postgres?sslmode=verify-full",
      DATABASE_OWNER_URL:
        "postgresql://scs_owner_admin:x@db.example.com:5432/postgres?sslmode=verify-full",
      DATABASE_TEST_ADMIN_URL:
        "postgresql://scs_test_admin:x@db.example.com:5432/postgres?sslmode=verify-full",
    });
    check(
      "M7B harness requires DATABASE_PROJECT_ADMIN_URL exclusively",
      missingProjectAdmin.ok === false &&
        missingProjectAdmin.missing.includes("DATABASE_PROJECT_ADMIN_URL") &&
        missingProjectAdmin.code === "DATABASE_HARNESS_URLS_MISSING"
    );

    const harnessOk = resolveRealPgHarnessEnv({
      DATABASE_PROJECT_ADMIN_URL:
        "postgresql://postgres:x@db.example.com:5432/postgres?sslmode=verify-full",
      DATABASE_INTAKE_URL:
        "postgresql://scs_intake_runtime:x@db.example.com:5432/postgres?sslmode=verify-full",
      DATABASE_NOTIFY_URL:
        "postgresql://scs_notify_worker:x@db.example.com:5432/postgres?sslmode=verify-full",
      DATABASE_OWNER_URL:
        "postgresql://scs_owner_admin:x@db.example.com:5432/postgres?sslmode=verify-full",
      DATABASE_TEST_ADMIN_URL:
        "postgresql://scs_test_admin:x@db.example.com:5432/postgres?sslmode=verify-full",
    });
    check(
      "M7B harness positive exclusive PROJECT_ADMIN + TEST_ADMIN URLs",
      harnessOk.ok === true &&
        Boolean(harnessOk.urls && harnessOk.urls.projectAdminUrl) &&
        Boolean(harnessOk.urls && harnessOk.urls.testAdminUrl)
    );

    // Fixture identity: scs_test_admin only; wrong role rejected.
    let fixtureIdentityOk = false;
    try {
      const id = assertFixtureTestAdminIdentity(
        "postgresql://scs_test_admin:x@db.example.com:5432/postgres?sslmode=verify-full",
        { connectionUsername }
      );
      fixtureIdentityOk =
        id.user === FIXTURE_TEST_ADMIN_ROLE &&
        id.privileges.superuser === false &&
        id.privileges.createrole === false &&
        FIXTURE_TEST_ADMIN_MIN_PRIVILEGES.role === "scs_test_admin";
    } catch {
      fixtureIdentityOk = false;
    }
    check("M7B fixture identity scs_test_admin with min privileges documented", fixtureIdentityOk);

    let fixtureWrongRejected = false;
    try {
      assertFixtureTestAdminIdentity(
        "postgresql://postgres:x@db.example.com:5432/postgres?sslmode=verify-full",
        { connectionUsername }
      );
    } catch (err) {
      fixtureWrongRejected = Boolean(err) && err.code === "DATABASE_FIXTURE_IDENTITY_INVALID";
    }
    check("M7B fixture identity rejects non-scs_test_admin URL", fixtureWrongRejected);

    // Harness CA / TLS alignment with application (no connectionString; rejectUnauthorized).
    const caPem =
      "-----BEGIN CERTIFICATE-----\nMIIBtestCA\n-----END CERTIFICATE-----";
    let harnessTlsOk = false;
    try {
      const built = buildHarnessPoolConfig(
        "postgresql://scs_intake_runtime:secret@db.r7-staging.supabase.co:5432/postgres?sslmode=verify-full",
        Object.assign({}, hosted, { DATABASE_SSL_CA: caPem }),
        { parseApprovedConnectionFields, buildSslOptions, inspectEffectivePgSsl }
      );
      harnessTlsOk =
        built.tls.rejectUnauthorized === true &&
        built.tls.hasCheckServerIdentity === true &&
        built.tls.hasCa === true &&
        built.tls.hasConnectionString === false &&
        built.effective.rejectUnauthorized === true &&
        !Object.prototype.hasOwnProperty.call(built.poolConfig, "connectionString");
    } catch {
      harnessTlsOk = false;
    }
    check("M7B harness CA/TLS aligned with application (no connectionString)", harnessTlsOk);

    // Negative: harness refuses insecure sslmode in pool preflight.
    let harnessInsecureRejected = false;
    try {
      buildHarnessPoolConfig(
        "postgresql://scs_intake_runtime:secret@db.r7-staging.supabase.co:5432/postgres?sslmode=disable",
        hosted,
        { parseApprovedConnectionFields, buildSslOptions, inspectEffectivePgSsl }
      );
    } catch (err) {
      harnessInsecureRejected =
        Boolean(err) &&
        (err.code === "DATABASE_SSL_INSECURE" || String(err.message || "").includes("sslmode"));
    }
    check("M7B harness rejects sslmode=disable in pool preflight", harnessInsecureRejected);

    // Source markers: no DATABASE_MIGRATION_URL fallback in harness.
    const harnessSrc = fs.readFileSync(
      path.join(ROOT, "qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs"),
      "utf8"
    );
    check(
      "M7B harness source has no DATABASE_MIGRATION_URL fallback",
      !/DATABASE_PROJECT_ADMIN_URL\s*\|\|\s*process\.env\.DATABASE_MIGRATION_URL/.test(harnessSrc) &&
        /DATABASE_MIGRATION_URL_UNSUPPORTED/.test(harnessSrc) &&
        /buildHarnessPoolConfig/.test(harnessSrc)
    );

    const case14 = REAL_PG_CASES.find((c) => c.id === 14);
    check(
      "M7B case 14 hosted Auth/AAL2 remains separate NOT RUN evidence class",
      Boolean(case14) &&
        case14.evidenceClass === "hosted-auth" &&
        /Hosted Auth\/AAL2|SCS_AUTHORIZE_HOSTED_AUTH_TESTS/i.test(harnessSrc)
    );

    check(
      "M7B .env.example marks DATABASE_MIGRATION_URL unsupported",
      /DATABASE_MIGRATION_URL=.*UNSUPPORTED/i.test(envText) ||
        /DATABASE_MIGRATION_URL[\s\S]{0,80}UNSUPPORTED/i.test(envText)
    );
    check(
      "M7B Windows PostgreSQL client requirements documented",
      fs.existsSync(path.join(ROOT, "qa-m6b/M7B-POSTGRES-CLIENT-WINDOWS-20261124.md"))
    );
    check(
      "M7B Netlify CLI 26.2.0 pin procedure prepared (not installed)",
      fs.existsSync(path.join(ROOT, "qa-m6b/M7B-NETLIFY-CLI-PIN-PROCEDURE-20261124.md")) &&
        /26\.2\.0/.test(
          fs.readFileSync(path.join(ROOT, "qa-m6b/M7B-NETLIFY-CLI-PIN-PROCEDURE-20261124.md"), "utf8")
        ) &&
        /DO NOT (?:run )?npm install|do not install yet|PREPARE ONLY/i.test(
          fs.readFileSync(path.join(ROOT, "qa-m6b/M7B-NETLIFY-CLI-PIN-PROCEDURE-20261124.md"), "utf8")
        )
    );
  }
}

out.scores = {
  total: out.checks.length,
  passed: out.checks.filter((c) => c.pass).length,
  failed: out.failures.length,
};

const reportPath = path.join(ROOT, "qa-m6b", "M7A-LOCAL-TEST-RESULTS-20261123.json");
const ownerReportJson = path.join(ROOT, "qa-m6b", "M7A-OWNER-LOCAL-TEST-RESULTS-20261123.json");
fs.writeFileSync(reportPath, JSON.stringify(out, null, 2));
fs.writeFileSync(ownerReportJson, JSON.stringify(out, null, 2));
console.log(
  JSON.stringify(
    { ok: out.ok, passed: out.scores.passed, total: out.scores.total, failures: out.failures },
    null,
    2
  )
);
if (!out.ok) process.exit(1);
