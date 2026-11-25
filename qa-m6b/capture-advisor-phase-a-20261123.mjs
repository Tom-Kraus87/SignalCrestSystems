/**
 * Capture advisor Phase A screenshots + sample axe + smoke interactions.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const dist = path.join(ROOT, "dist");
const shotDir = path.join(__dirname, "screenshots-advisor-phase-a-20261123");
fs.mkdirSync(shotDir, { recursive: true });

const mime = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  if (urlPath === "/__qa__/axe.min.js") {
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(fs.readFileSync(axePath));
    return;
  }
  const filePath = path.join(dist, urlPath.replace(/^\/+/, ""));
  if (!filePath.startsWith(dist) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("missing");
    return;
  }
  const headers = { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" };
  const raw = fs.readFileSync(path.join(dist, "_headers"), "utf8");
  const cspMatch = raw.match(/Content-Security-Policy:\s*(.+)/);
  if (cspMatch) headers["Content-Security-Policy"] = cspMatch[1].trim();
  res.writeHead(200, headers);
  res.end(fs.readFileSync(filePath));
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ headless: true });
const results = { ok: true, shots: [], axe: null, checks: [], failures: [] };

function check(name, pass, detail) {
  results.checks.push({ name, pass, detail: detail || "" });
  if (!pass) {
    results.ok = false;
    results.failures.push(name);
  }
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/advisor.html`, { waitUntil: "networkidle" });
  await page.waitForSelector("#adv-heading, .adv-question");
  const disclosure = await page.textContent(".adv-disclosure, .adv-banner");
  check("disclosure visible", /not live conversational AI/i.test(disclosure || ""));
  await page.screenshot({ path: path.join(shotDir, "advisor-welcome-desktop.png"), fullPage: true });
  results.shots.push("advisor-welcome-desktop.png");

  // Commercial path smoke
  await page.getByRole("button", { name: "Find a Business Solution" }).click();
  await page.getByRole("button", { name: "Custom software / app" }).click();
  await page.getByRole("button", { name: "New build" }).click();
  await page.getByRole("button", { name: "Ready to scope" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "1–3 months" }).click();
  await page.waitForSelector(".adv-card >> text=Starting point");
  check(
    "recommendation shows custom software",
    /Custom Software/i.test((await page.locator(".adv-card").innerText()) || "")
  );
  await page.screenshot({ path: path.join(shotDir, "advisor-recommend-desktop.png"), fullPage: true });
  results.shots.push("advisor-recommend-desktop.png");

  await page.getByRole("button", { name: "Edit project brief" }).click();
  const send = page.locator("#adv-send");
  check("send disabled before consent", await send.isDisabled());
  await page.screenshot({ path: path.join(shotDir, "advisor-brief-consent-desktop.png"), fullPage: true });
  results.shots.push("advisor-brief-consent-desktop.png");

  // Tech path + credits
  await page.goto(`${base}/advisor.html?mode=tech`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Wi/ }).first().click();
  await page.getByRole("button", { name: "Windows" }).click();
  await page.getByRole("button", { name: "Laptop" }).click();
  const credit = await page.locator(".adv-credit").first().textContent();
  check("credit decremented", /2 of 3/.test(credit || ""));
  await page.screenshot({ path: path.join(shotDir, "advisor-tech-step-desktop.png"), fullPage: true });
  results.shots.push("advisor-tech-step-desktop.png");

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/advisor.html`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(shotDir, "advisor-welcome-mobile.png"), fullPage: true });
  results.shots.push("advisor-welcome-mobile.png");

  // Solutions Explorer still present
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
  const explorer = await page.locator("#nav-explorer-panel").count();
  check("solutions explorer present", explorer === 1);
  const advisorNav = await page.locator('a[href="advisor.html"]').count();
  check("advisor nav links present", advisorNav >= 1);

  // axe sample on advisor
  await page.goto(`${base}/advisor.html`, { waitUntil: "networkidle" });
  await page.addScriptTag({ url: `${base}/__qa__/axe.min.js` });
  const axeResult = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    return await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } });
  });
  results.axe = {
    violations: axeResult.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
    count: axeResult.violations.length,
  };
  check("axe critical/serious none", !axeResult.violations.some((v) => v.impact === "critical" || v.impact === "serious"), JSON.stringify(results.axe.violations));

  // Studio exclusion
  check("studio absent from dist", !fs.existsSync(path.join(dist, "transformation-studio")));
} catch (err) {
  results.ok = false;
  results.failures.push(String(err && err.stack ? err.stack : err));
} finally {
  await browser.close();
  server.close();
}

const out = path.join(__dirname, "advisor-phase-a-capture-results-20261123.json");
fs.writeFileSync(out, JSON.stringify(results, null, 2));
console.log(JSON.stringify({ ok: results.ok, shots: results.shots.length, failures: results.failures, axe: results.axe }, null, 2));
process.exit(results.ok ? 0 : 1);
