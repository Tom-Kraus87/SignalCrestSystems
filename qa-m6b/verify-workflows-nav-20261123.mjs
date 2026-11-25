/**
 * Workflow expansion + Solutions Explorer interaction checks.
 * Serves dist/ with CSP from _headers. Playwright Chromium.
 *
 * Usage:
 *   node scripts/build-public.mjs
 *   node qa-m6b/verify-workflows-nav-20261123.mjs
 */
import http from "http";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const root = process.cwd();
const dist = path.join(root, "dist");
const outPath = path.join(root, "qa-m6b", "workflows-nav-results-20261123.json");
const shotDir = path.join(root, "qa-m6b", "screenshots-workflows-nav-20261123");
fs.mkdirSync(shotDir, { recursive: true });

const required = ["workflow-demos.js", "hero-systems.js", "index.html"];
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

const cspErrors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (msg) => {
  const t = msg.text();
  if (/Content Security Policy|Refused to|unsafe-inline|inline style/i.test(t)) cspErrors.push(t);
});

await page.goto(base + "/index.html", { waitUntil: "networkidle" });
await page.waitForSelector("#hs-map.is-enhanced");

const tabCount = await page.locator(".wf-tab").count();
push("five-workflow-tabs", tabCount === 5, { tabCount });

const systemsVisible = await page.locator("#wf-panel-systems").isVisible();
const mapVisible = await page.locator("#hs-map").isVisible();
push("original-systems-default", systemsVisible && mapVisible);

const chipCount = await page.locator(".hs-hero .hs-chip").count();
push("connected-scenario-chips", chipCount === 5, { chipCount });

await page.locator('.hs-chip[data-scenario="quote"]').click();
await page.waitForTimeout(200);
const quotePressed = await page.locator('.hs-chip[data-scenario="quote"]').getAttribute("aria-pressed");
push("original-quote-scenario", quotePressed === "true");

const ids = ["website", "leads", "software", "care"];
for (const id of ids) {
  await page.locator('.wf-tab[data-wf="' + id + '"]').click();
  await page.waitForTimeout(120);
  const panel = page.locator('#wf-panel-' + id);
  const selected = await page.locator('.wf-tab[data-wf="' + id + '"]').getAttribute("aria-selected");
  const visible = await panel.isVisible();
  const systemsHidden = await page.locator("#wf-panel-systems").isHidden();
  const mapStays = await page.locator(".hs-hero #hs-map").isVisible();
  push("switch-" + id, selected === "true" && visible && systemsHidden && mapStays);
}

await page.locator('.wf-tab[data-wf="systems"]').click();
await page.waitForTimeout(150);
push(
  "return-to-original",
  (await page.locator("#wf-panel-systems").isVisible()) &&
    (await page.locator(".hs-hero #hs-map").isVisible())
);

await page.screenshot({ path: path.join(shotDir, "desktop-workflow-systems.png"), fullPage: false });
await page.locator('.wf-tab[data-wf="website"]').click();
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(shotDir, "desktop-workflow-website.png"), fullPage: false });

// Solutions Explorer desktop
const details = page.locator(".nav-explorer");
await page.locator(".nav-more-toggle").first().click();
await page.waitForTimeout(100);
push("solutions-open-desktop", await details.evaluate((el) => el.open));
push("solutions-panel-visible", await page.locator(".nav-explorer-panel").isVisible());
push("solutions-four-categories", (await page.locator(".nav-explorer-cat").count()) === 4);

await page.keyboard.press("Escape");
await page.waitForTimeout(80);
push("solutions-escape-close", !(await details.evaluate((el) => el.open)));

await page.locator(".nav-more-toggle").first().click();
await page.waitForTimeout(80);
await page.screenshot({ path: path.join(shotDir, "desktop-solutions-explorer.png"), fullPage: false });
await page.keyboard.press("Escape");

// Mobile
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base + "/index.html", { waitUntil: "networkidle" });
await page.locator(".nav-toggle").click();
await page.waitForTimeout(120);
push("mobile-nav-open", (await page.locator("#site-nav").getAttribute("class") || "").includes("is-open"));
await page.locator(".nav-more-toggle").first().click();
await page.waitForTimeout(100);
push("mobile-solutions-open", await page.locator(".nav-explorer").evaluate((el) => el.open));
push("mobile-solutions-close-btn", await page.locator(".nav-explorer-close").isVisible());
await page.locator(".nav-explorer-close").click();
await page.waitForTimeout(80);
push("mobile-solutions-closed", !(await page.locator(".nav-explorer").evaluate((el) => el.open)));

await page.locator(".nav-toggle").click(); // ensure closed or open for workflows
await page.waitForTimeout(80);
await page.locator('.wf-tab[data-wf="leads"]').click();
await page.waitForTimeout(150);
await page.screenshot({ path: path.join(shotDir, "mobile-workflow-leads.png"), fullPage: false });
await page.locator(".nav-toggle").click();
await page.waitForTimeout(100);
await page.locator(".nav-more-toggle").first().click();
await page.waitForTimeout(100);
await page.screenshot({ path: path.join(shotDir, "mobile-solutions-explorer.png"), fullPage: false });

// Link integrity for explorer destinations (relative in dist pages)
const home = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const panelMatch = home.match(/class="nav-explorer-panel"[\s\S]*?<\/div>\s*<\/details>/);
const hrefs = panelMatch ? panelMatch[0] : "";
const linkMatches = [...hrefs.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
let broken = [];
for (const href of linkMatches) {
  const clean = href.replace(/^\//, "").split("#")[0].split("?")[0];
  if (!clean) continue;
  if (!fs.existsSync(path.join(dist, clean))) broken.push(href);
}
push("solutions-links-exist-in-dist", broken.length === 0, { broken, linkCount: linkMatches.length });

push("no-studio-in-dist", !fs.existsSync(path.join(dist, "transformation-studio")));
push("workflow-asset-in-dist", fs.existsSync(path.join(dist, "workflow-demos.js")));
push("no-csp-console-errors", cspErrors.length === 0, { cspErrors });

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
console.log(JSON.stringify(payload, null, 2));

await browser.close();
server.close();
process.exit(failed.length ? 1 : 0);
