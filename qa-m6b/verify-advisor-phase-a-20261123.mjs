/**
 * Phase A AI Solutions Advisor — local verification (no network LLM).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = {
  ok: true,
  checks: [],
  failures: [],
  matrix: [],
};

function check(name, pass, detail) {
  out.checks.push({ name, pass, detail: detail || "" });
  if (!pass) {
    out.ok = false;
    out.failures.push(name + (detail ? ": " + detail : ""));
  }
}

// --- Static file presence ---
[
  "advisor.html",
  "advisor.js",
  "advisor.css",
  "advisor-kb.json",
].forEach((f) => {
  check("file:" + f, fs.existsSync(path.join(ROOT, f)));
});

const kb = JSON.parse(fs.readFileSync(path.join(ROOT, "advisor-kb.json"), "utf8"));
check("kb.usesLanguageModel=false", kb.advisor && kb.advisor.usesLanguageModel === false);
check("kb.freeIssueLimit=3", kb.troubleshooting && kb.troubleshooting.freeIssueLimit === 3);
check("kb.hasTopics", kb.troubleshooting.topics.length >= 5);

const advisorHtml = fs.readFileSync(path.join(ROOT, "advisor.html"), "utf8");
check("honest disclosure in HTML", /not live conversational AI/i.test(advisorHtml));
check("no third-party script hosts in advisor.html", !/cdn\.|googleapis\.com\/js|openai|anthropic/i.test(advisorHtml.replace(/fonts\.googleapis/g, "")));
check("Solutions Explorer preserved on advisor page", /Solutions Explorer/i.test(advisorHtml));

const pr = fs.readFileSync(path.join(ROOT, "project-request.html"), "utf8");
check("project-request source default contact", /name="source"[^>]*value="contact"/.test(pr) || /name="source" id="request-source" value="contact"/.test(pr));
check("project-request privacy-version", /name="privacy-version"/.test(pr));
check("project-request advisor-brief", /name="advisor-brief"/.test(pr));

const build = fs.readFileSync(path.join(ROOT, "scripts/build-public.mjs"), "utf8");
check("allowlist advisor.html", build.includes('"advisor.html"'));
check("allowlist advisor.js", build.includes('"advisor.js"'));
check("allowlist advisor-kb.json", build.includes('"advisor-kb.json"'));
check("studio still excluded comment", /Transformation Studio[\s\S]*omitted from the public allowlist/i.test(build));
check("json extension allowed", build.includes('".json"'));

// Nav sample
const index = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
check("index nav Guided Advisor", /href="advisor\.html">Guided Advisor/.test(index));
check("index Solutions Explorer intact", /aria-label="Solutions Explorer"/.test(index));

// --- Engine matrix via vm ---
const code = fs.readFileSync(path.join(ROOT, "advisor.js"), "utf8");
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  document: {
    readyState: "complete",
    getElementById: function () {
      return null;
    },
    addEventListener: function () {},
  },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(code + "\nthis.__SCS = SCSAdvisor;", sandbox);
const Eng = sandbox.__SCS.Engine;
Eng.hydrateKb(kb);

const matrix = [
  [{ project_type: "not_sure" }, "other"],
  [{ project_type: "website", detail: "landing", primary_need: "local_seo" }, "package-landing"],
  [{ project_type: "website", detail: "starter" }, "package-starter"],
  [{ project_type: "website", detail: "professional" }, "package-professional"],
  [{ project_type: "website", detail: "advanced" }, "package-advanced"],
  [{ project_type: "website", detail: "care" }, "care-plan"],
  [{ project_type: "website", detail: "not_sure" }, "other"],
  [{ project_type: "custom_software", primary_need: "testing" }, "custom-software"],
  [{ project_type: "ai_automation", primary_need: "local_seo" }, "ai-automation"],
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
  out.matrix.push({ id: "T" + String(i + 1).padStart(2, "0"), expected, got, pass, answers });
  check("matrix " + (i + 1) + " => " + expected, pass, "got " + got);
});

// Credit accounting
const st = Eng.createState();
Eng.hydrateKb(kb);
let r1 = Eng.startIssue(st, "wifi");
check("start issue consumes credit", r1.ok && st.tech.creditsUsed === 1);
const usedBeforeFollow = st.tech.creditsUsed;
// follow-up does not consume — complete without new start
Eng.completeIssue(st, "resolved");
check("follow-up path no extra credit on complete", st.tech.creditsUsed === usedBeforeFollow);
Eng.startIssue(st, "email");
Eng.completeIssue(st, "resolved");
Eng.startIssue(st, "printer");
check("third issue ok", st.tech.creditsUsed === 3);
Eng.completeIssue(st, "resolved");
const blocked = Eng.startIssue(st, "browser");
check("fourth issue soft-capped", !blocked.ok && blocked.reason === "soft_cap");

check("secret classifier password", Eng.classifySecret("my password is secret"));
check("secret classifier clean", !Eng.classifySecret("wifi drops on laptop"));

const reportPath = path.join(ROOT, "qa-m6b", "advisor-phase-a-test-results-20261123.json");
fs.writeFileSync(reportPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ ok: out.ok, checks: out.checks.length, failures: out.failures }, null, 2));
if (!out.ok) process.exit(1);
