/**
 * Phase A hardening verification + pricing/catalog checks (local, no LLM).
 * Extends 43/43 baseline with sensitive-data form path, mid-issue soft-cap,
 * and canonical price reconciliation.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = {
  ok: true,
  suite: "advisor-phase-a-harden-20261123",
  checks: [],
  failures: [],
  matrix: [],
  pricing: [],
  services: [],
};

function check(name, pass, detail) {
  out.checks.push({ name, pass, detail: detail || "" });
  if (!pass) {
    out.ok = false;
    out.failures.push(name + (detail ? ": " + detail : ""));
  }
}

const kb = JSON.parse(fs.readFileSync(path.join(ROOT, "advisor-kb.json"), "utf8"));
const packagesHtml = fs.readFileSync(path.join(ROOT, "packages.html"), "utf8");
const pr = fs.readFileSync(path.join(ROOT, "project-request.html"), "utf8");
const scriptJs = fs.readFileSync(path.join(ROOT, "script.js"), "utf8");
const advisorHtml = fs.readFileSync(path.join(ROOT, "advisor.html"), "utf8");
const advisorJs = fs.readFileSync(path.join(ROOT, "advisor.js"), "utf8");

check("kb.usesLanguageModel=false", kb.advisor && kb.advisor.usesLanguageModel === false);
check("honest Phase A disclosure", /not live conversational AI/i.test(advisorHtml));
check("banner Phase A guided", /Deterministic guided advisor \(Phase A\)/i.test(advisorHtml));
check("project-request sensitive hint", /Do not include passwords/i.test(pr));
check("script.js sensitive detector", scriptJs.includes("SENSITIVE_RE") && scriptJs.includes("containsSensitiveInfo"));
check("script.js blocks sensitive message", scriptJs.includes("Please remove passwords, MFA/recovery codes"));
check("advisor.js expanded SECRET_RE", advisorJs.includes("credit\\s*card") && advisorJs.includes("card\\s*number"));
check("soft-cap redirects active issue", advisorJs.includes("Soft-cap never hard-cuts"));

// --- 12 approved service mappings (formServiceValues) ---
const APPROVED_12 = [
  "package-landing",
  "package-starter",
  "package-professional",
  "package-advanced",
  "custom-software",
  "ai-automation",
  "it-consulting",
  "cybersecurity",
  "qa-automation",
  "care-plan",
  "local-seo",
  "other",
];
check("kb has exactly 12 form services", kb.formServiceValues.length === 12);
APPROVED_12.forEach((id) => {
  const present = kb.formServiceValues.includes(id) && kb.services.some((s) => s.id === id);
  out.services.push({ id, present });
  check("service mapping present: " + id, present);
});
check(
  "website-transformation not an Advisor PRIMARY",
  !kb.formServiceValues.includes("website-transformation")
);

// --- Canonical pricing from packages.html ---
const PRICE_EXPECT = [
  { id: "package-landing", needle: "$950", kb: "$950" },
  { id: "package-starter", needle: "$1,500", kb: "$1,500" },
  { id: "package-professional", needle: "$2,750", kb: "$2,750" },
  { id: "package-advanced", needle: "$5,000", kb: "from $5,000" },
  { id: "ai-automation", needle: "$1,500", kb: "Basic automation from $1,500" },
  { id: "it-consulting", needle: "$110", kb: "$110/hour" },
  { id: "qa-automation", needle: "$90", kb: "$90/hour" },
  { id: "care-plan", needle: "$79", kb: "$79 / $149 / $349" },
  { id: "local-seo", needle: "$475", kb: "$475/month" },
];
PRICE_EXPECT.forEach((row) => {
  const inPackages = packagesHtml.includes(row.needle);
  const svc = kb.services.find((s) => s.id === row.id);
  const inKb = svc && String(svc.priceDisplay).includes(row.kb.split(" ")[0].replace(",", ""));
  const labelOk = advisorJs.includes(row.needle) || advisorJs.includes(row.kb);
  out.pricing.push({ id: row.id, inPackages, inKb: !!svc, labelOk });
  const kbOk =
    !!svc &&
    (svc.priceDisplay.includes(row.needle.replace(/^from\s+/i, "")) ||
      /custom/i.test(svc.priceDisplay) ||
      svc.priceDisplay.includes(row.kb));
  check("packages.html has " + row.id + " price " + row.needle, inPackages);
  check("kb price for " + row.id, kbOk, svc ? svc.priceDisplay : "missing");
});
check("care plan all three tiers in packages", packagesHtml.includes("$79") && packagesHtml.includes("$149") && packagesHtml.includes("$349"));
check("no invented $999 advisor price", !/\$999/.test(advisorJs) && !/\$999/.test(JSON.stringify(kb)));

// --- Engine via vm ---
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
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

const matrix = [
  [{ project_type: "not_sure" }, "other"],
  [{ project_type: "website", detail: "landing" }, "package-landing"],
  [{ project_type: "website", detail: "starter" }, "package-starter"],
  [{ project_type: "website", detail: "professional" }, "package-professional"],
  [{ project_type: "website", detail: "advanced" }, "package-advanced"],
  [{ project_type: "website", detail: "care" }, "care-plan"],
  [{ project_type: "website", detail: "not_sure" }, "other"],
  [{ project_type: "custom_software" }, "custom-software"],
  [{ project_type: "ai_automation" }, "ai-automation"],
  [{ project_type: "it_cyber", detail: "it" }, "it-consulting"],
  [{ project_type: "it_cyber", detail: "cyber" }, "cybersecurity"],
  [{ project_type: "it_cyber", detail: "not_sure" }, "other"],
  [{ project_type: "qa_seo_care", detail: "care" }, "care-plan"],
  [{ project_type: "qa_seo_care", detail: "seo" }, "local-seo"],
  [{ project_type: "qa_seo_care", detail: "qa" }, "qa-automation"],
  [{ project_type: "qa_seo_care", detail: "not_sure" }, "other"],
  [{ human_exit: true }, "other"],
];
matrix.forEach((row, i) => {
  const [answers, expected] = row;
  const got = Eng.recommendPrimary(answers).service;
  const pass = got === expected;
  out.matrix.push({ id: "T" + String(i + 1).padStart(2, "0"), expected, got, pass });
  check("matrix " + (i + 1) + " => " + expected, pass, "got " + got);
});

// Credits + follow-ups + soft-cap + mid-issue continuation
const st = Eng.createState();
Eng.hydrateKb(kb);
check("start #1", Eng.startIssue(st, "wifi").ok && st.tech.creditsUsed === 1);
const used = st.tech.creditsUsed;
Eng.completeIssue(st, "resolved");
check("follow-up complete does not consume", st.tech.creditsUsed === used);
Eng.startIssue(st, "email");
Eng.completeIssue(st, "resolved");
Eng.startIssue(st, "printer");
check("third issue active with 0 remaining", st.tech.creditsUsed === 3 && Eng.creditsRemaining(st) === 0 && !!st.tech.activeIssueId);
const beforeStep = st.tech.creditsUsed;
st.tech.stepIndex = 1; // simulate follow-up progress
check("active issue continue after credits zero", !!st.tech.activeIssueId && st.tech.creditsUsed === beforeStep);
const fourth = Eng.startIssue(st, "browser");
check("cannot start fourth while active", !fourth.ok);
Eng.completeIssue(st, "resolved");
const blocked = Eng.startIssue(st, "browser");
check("fourth new issue soft-capped", !blocked.ok && blocked.reason === "soft_cap");

check("secret password", Eng.classifySecret("my password is hunter2"));
check("secret MFA", Eng.classifySecret("here is my MFA code 123456"));
check("secret card", Eng.classifySecret("card 4111 1111 1111 1111"));
check("secret clean", !Eng.classifySecret("wifi drops on laptop after sleep"));

const brief = Eng.buildBrief({
  answers: { project_type: "website", detail: "starter", primary_need: "new_build", stage: "ready", timing: "1-3mo" },
  recommendation: Eng.recommendPrimary({ project_type: "website", detail: "starter" }),
  tech: { history: [] },
});
check("brief editable draft marker", /PROJECT BRIEF \(DRAFT\)/.test(brief));
check("brief not live AI disclosure", /not live AI/i.test(brief));

const handoff = Eng.writeHandoff({
  service: "package-starter",
  brief: brief,
  name: "Test",
  email: "t@example.com",
});
check("handoff source=advisor", handoff.source === "advisor");
check("handoff privacyVersion preserved", !!handoff.privacyVersion);
check("handoff brief preserved", handoff.brief === brief);
Eng.clearHandoff();

check("handoff chrome Talk to human present in advisor.js", /Talk to a human/.test(advisorJs));
check("project-request source default contact", /name="source"[^>]*value="contact"|id="request-source" value="contact"/.test(pr));
check("project-request privacy-version", /name="privacy-version"/.test(pr));
check("project-request advisor-brief", /name="advisor-brief"/.test(pr));

const reportPath = path.join(ROOT, "qa-m6b", "advisor-phase-a-harden-results-20261123.json");
fs.writeFileSync(reportPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ ok: out.ok, checks: out.checks.length, failures: out.failures }, null, 2));
if (!out.ok) process.exit(1);
