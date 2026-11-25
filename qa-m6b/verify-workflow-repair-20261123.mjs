/**
 * V1 workflow functional repair regression.
 * Detects Connected Systems scenarios disappearing/nonfunctional and
 * Illustrative Workflows disappearing/nonfunctional; verifies coexistence
 * with theme switching. Serves dist/ under CSP from _headers.
 *
 * Usage:
 *   node scripts/build-public.mjs
 *   node qa-m6b/verify-workflow-repair-20261123.mjs
 */
import http from "http";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const root = process.cwd();
const dist = path.join(root, "dist");
const stamp = "20261123";
const outPath = path.join(root, "qa-m6b", `workflow-repair-results-${stamp}.json`);
const shotDir = path.join(root, "qa-m6b", `screenshots-workflow-repair-${stamp}`);
fs.mkdirSync(shotDir, { recursive: true });

const required = ["workflow-demos.js", "hero-systems.js", "index.html", "theme.js", "themes.css"];
const missing = required.filter((f) => !fs.existsSync(path.join(dist, f)));
if (missing.length) {
  const payload = { pass: false, blocked: true, missing };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
  process.exit(2);
}

const mime = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml"
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
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
const base = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({ headless: true });
const results = [];
const push = (check, pass, extra = {}) => results.push({ check, pass, ...extra });
const pageErrors = [];

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (err) => pageErrors.push(String(err)));
page.on("console", (msg) => {
  if (msg.type() === "error") pageErrors.push(msg.text());
});

const heroJs = fs.readFileSync(path.join(dist, "hero-systems.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const themeJs = fs.readFileSync(path.join(dist, "theme.js"), "utf8");

const scenarioKeys = ["quote", "invoice", "update", "booking", "reporting"];
const scenarioTitles = {
  quote: "Quote request",
  invoice: "Invoice email",
  update: "Customer update",
  booking: "Appointment booking",
  reporting: "Business reporting"
};
const expectedNodes = {
  quote: ["forms", "auto", "sw", "portal", "follow"],
  invoice: ["email", "ai", "sw", "dash"],
  update: ["crm", "sw", "auto", "portal", "follow"],
  booking: ["forms", "apis", "auto", "sw", "portal", "follow"],
  reporting: ["crm", "email", "ai", "sw", "dash"]
};

push("source-has-booking-data", /booking:\s*\{/.test(heroJs) && /Appointment booking/.test(heroJs));
push("source-has-reporting-data", /reporting:\s*\{/.test(heroJs) && /Business reporting/.test(heroJs));
push("source-startScenario-guard", /scenario is unavailable/.test(heroJs));
push(
  "html-chips-match-scenarios",
  scenarioKeys.every((k) => new RegExp(`data-scenario="${k}"`).test(indexHtml))
);
push("html-illustrative-section", /id="illustrative-workflows"/.test(indexHtml));
const themeIdCount = (themeJs.match(/"[a-z0-9-]+":\s*\{\s*name:/g) || []).length;
push("theme-registry-30", themeIdCount === 30, { themeIdCount });
push("html-theme-options-30", (indexHtml.match(/data-theme-id="/g) || []).length === 30);
push("arcade-typography-rule", /arcade-1995[\s\S]*\.hs-hero h1/.test(fs.readFileSync(path.join(dist, "themes.css"), "utf8")));

await page.goto(base + "/index.html", { waitUntil: "networkidle" });
await page.waitForSelector("#hs-map.is-enhanced");

push("coexist-map-in-hero", await page.locator(".hs-hero #hs-map").isVisible());
push("coexist-illustrative-section", await page.locator("#illustrative-workflows").count() === 1);
push("coexist-wf-not-in-hero", (await page.locator(".hs-hero [data-wf-root]").count()) === 0);
push("coexist-map-is-canvas-not-cards", await page.locator(".hs-hero #hs-map canvas.hs-canvas").count() === 1);

const chipCount = await page.locator(".hs-hero .hs-chip").count();
push("connected-five-chips", chipCount === 5, { chipCount });

async function closeThemePicker() {
  const panel = page.locator("#theme-picker-panel");
  if (await panel.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(80);
    if (await panel.isVisible().catch(() => false)) {
      await page.locator(".theme-picker-toggle").click();
      await page.waitForTimeout(80);
    }
  }
}

async function assertScenario(key, label) {
  await closeThemePicker();
  const chip = page.locator(`.hs-hero .hs-chip[data-scenario="${key}"]`);
  await chip.scrollIntoViewIfNeeded();
  await chip.click({ force: false });
  await page.waitForTimeout(500);
  const pressed = await chip.getAttribute("aria-pressed");
  const title = (await page.locator(".hs-hero .hs-panel-title").textContent()) || "";
  const stepsVisible = await page.locator(".hs-hero .hs-steps").isVisible();
  const stepCount = await page.locator(".hs-hero .hs-steps li").count();
  const mapFocused = await page.locator("#hs-map").evaluate((el) => el.classList.contains("has-focus"));
  const lit = await page.locator("#hs-map").evaluate((map, expectIds) => {
    const linked = [...map.querySelectorAll(".hs-node.is-linked")].map((n) => n.getAttribute("data-id"));
    const dimmed = map.querySelectorAll(".hs-node.is-dim").length;
    const hit = expectIds.filter((id) => linked.includes(id));
    return { linked, dimmed, hitCount: hit.length };
  }, expectedNodes[key]);
  const ok =
    pressed === "true" &&
    stepsVisible &&
    stepCount >= 3 &&
    mapFocused &&
    title.includes(scenarioTitles[key]) &&
    /illustrative/i.test(title) &&
    lit.hitCount >= 1 &&
    lit.dimmed >= 1;
  push(label || `scenario-${key}`, ok, { title, stepCount, mapFocused, lit });
  return ok;
}

for (const key of scenarioKeys) {
  await assertScenario(key);
}

// Repeatability: clear, re-run booking
await page.locator("#hs-map .hs-node").first().focus();
await page.keyboard.press("Escape");
await page.waitForTimeout(80);
await assertScenario("booking", "scenario-booking-repeat");
await page.locator("#hs-map .hs-node").first().focus();
await page.keyboard.press("Escape");
await page.waitForTimeout(80);
push(
  "scenario-cleared",
  (await page.locator('.hs-hero .hs-chip[aria-pressed="true"]').count()) === 0
);

await assertScenario("booking", "scenario-booking-shot");
await page.screenshot({ path: path.join(shotDir, "desktop-connected-systems-booking.png"), fullPage: false });
await assertScenario("reporting", "scenario-reporting-shot");
await page.screenshot({ path: path.join(shotDir, "desktop-connected-systems-reporting.png"), fullPage: false });

// Theme switch while scenario active, then again
await page.locator(".theme-picker-toggle").click();
await page.waitForTimeout(80);
await page.locator('[data-theme-id="arcade-1995"]').click();
await page.waitForTimeout(200);
await closeThemePicker();
push("theme-arcade-applied", await page.evaluate(() => document.documentElement.getAttribute("data-theme") === "arcade-1995"));
await assertScenario("booking", "scenario-booking-after-arcade");
await page.locator(".theme-picker-toggle").click();
await page.waitForTimeout(60);
await page.locator('[data-theme-id="clean-corporate"]').click();
await page.waitForTimeout(200);
await closeThemePicker();
await assertScenario("reporting", "scenario-reporting-after-corporate");
push(
  "theme-switch-no-pageerror",
  pageErrors.filter((e) => !/favicon|net::ERR/i.test(e)).length === 0,
  { pageErrors: pageErrors.slice(0, 5) }
);

await page.screenshot({ path: path.join(shotDir, "desktop-both-experiences.png"), fullPage: true });

// Illustrative workflows
await page.locator("#illustrative-workflows").scrollIntoViewIfNeeded();
const tabIds = ["systems", "website", "leads", "software", "care"];
push("illustrative-five-tabs", (await page.locator("#illustrative-workflows .wf-tab").count()) === 5);

for (const id of tabIds) {
  await page.locator(`.wf-tab[data-wf="${id}"]`).click();
  await page.waitForTimeout(100);
  const selected = await page.locator(`.wf-tab[data-wf="${id}"]`).getAttribute("aria-selected");
  const panelVisible = await page.locator(`#wf-panel-${id}`).isVisible();
  const mapStill = await page.locator(".hs-hero #hs-map").isVisible();
  const advance = page.locator(`#wf-panel-${id} [data-wf-advance]`);
  const before = await page.locator(`#wf-panel-${id} [data-wf-status]`).textContent();
  await advance.click();
  await page.waitForTimeout(80);
  const after = await page.locator(`#wf-panel-${id} [data-wf-status]`).textContent();
  const current = await page.locator(`#wf-panel-${id} .wf-step.is-current`).count();
  push(`illustrative-${id}`, selected === "true" && panelVisible && mapStill && current === 1 && before !== after, {
    before,
    after,
    mapStill
  });
}

await page.locator('.wf-tab[data-wf="software"]').click();
await page.waitForTimeout(100);
for (let i = 0; i < 3; i++) {
  await page.locator('#wf-panel-software [data-wf-advance]').click();
  await page.waitForTimeout(60);
}
await page.screenshot({ path: path.join(shotDir, "desktop-illustrative-custom-software.png"), fullPage: false });
await page.locator("#illustrative-workflows").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(shotDir, "desktop-illustrative-workflows.png"), fullPage: false });

// Solutions still present
await page.evaluate(() => window.scrollTo(0, 0));
await page.locator(".nav-more-toggle").first().click();
await page.waitForTimeout(100);
push("solutions-open", await page.locator(".nav-explorer").evaluate((el) => el.open));
push("solutions-four-cats", (await page.locator(".nav-explorer-cat").count()) === 4);
await page.keyboard.press("Escape");

// Reduced motion
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto(base + "/index.html", { waitUntil: "networkidle" });
await page.waitForSelector("#hs-map.is-enhanced");
await page.locator('.hs-hero .hs-chip[data-scenario="booking"]').click();
await page.waitForTimeout(200);
push(
  "reduced-motion-booking",
  (await page.locator('.hs-hero .hs-chip[data-scenario="booking"]').getAttribute("aria-pressed")) === "true" &&
    (await page.locator(".hs-hero .hs-steps li").count()) >= 3
);

// Mobile
await page.emulateMedia({ reducedMotion: "no-preference" });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base + "/index.html", { waitUntil: "networkidle" });
await page.waitForSelector("#hs-map.is-enhanced");
push("mobile-five-chips", (await page.locator(".hs-hero .hs-chip").count()) === 5);
await page.locator('.hs-hero .hs-chip[data-scenario="booking"]').click();
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(shotDir, "mobile-connected-systems-booking.png"), fullPage: false });
await page.locator("#illustrative-workflows").scrollIntoViewIfNeeded();
await page.locator('.wf-tab[data-wf="software"]').click();
await page.waitForTimeout(120);
await page.screenshot({ path: path.join(shotDir, "mobile-illustrative-workflows.png"), fullPage: false });

// Arcade 1995 responsive
await closeThemePicker();
await page.evaluate(() => window.scrollTo(0, 0));
await page.locator(".theme-picker-toggle").click();
await page.waitForTimeout(80);
await page.locator('[data-theme-id="arcade-1995"]').click();
await page.waitForTimeout(200);
await closeThemePicker();
const arcadeMetrics = await page.locator(".hs-hero h1").evaluate((el) => {
  const r = el.getBoundingClientRect();
  return {
    width: r.width,
    right: r.right,
    vw: window.innerWidth,
    fontSize: parseFloat(getComputedStyle(el).fontSize),
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1
  };
});
push(
  "arcade-1995-mobile-fit",
  arcadeMetrics.right <= arcadeMetrics.vw + 2 && !arcadeMetrics.overflowX && arcadeMetrics.fontSize <= 22,
  arcadeMetrics
);
await page.screenshot({ path: path.join(shotDir, "mobile-arcade-1995.png"), fullPage: false });

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(base + "/index.html", { waitUntil: "networkidle" });
await page.locator(".theme-picker-toggle").click();
await page.waitForTimeout(80);
await page.locator('[data-theme-id="arcade-1995"]').click();
await page.waitForTimeout(200);
await closeThemePicker();
await page.screenshot({ path: path.join(shotDir, "desktop-arcade-1995.png"), fullPage: false });

push("no-studio-in-dist", !fs.existsSync(path.join(dist, "transformation-studio")));
push("workflow-demos-in-dist", fs.existsSync(path.join(dist, "workflow-demos.js")));

const failed = results.filter((r) => !r.pass);
const payload = {
  pass: failed.length === 0,
  total: results.length,
  passed: results.length - failed.length,
  failedCount: failed.length,
  results,
  failed,
  screenshots: fs.readdirSync(shotDir)
};
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(JSON.stringify({ pass: payload.pass, total: payload.total, passed: payload.passed, failedCount: payload.failedCount, failed: payload.failed }, null, 2));

await browser.close();
server.close();
process.exit(failed.length ? 1 : 0);
