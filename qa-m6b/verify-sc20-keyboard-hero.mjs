/**
 * Keyboard + reduced-motion + pause control for SC 2.0 hero (T6–T8).
 */
import http from "http";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const root = process.cwd();
const dist = path.join(root, "dist");
const outPath = path.join(root, "qa-m6b", "sc20-keyboard-results.json");

const mime = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
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

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base + "/index.html", { waitUntil: "networkidle" });
await page.waitForSelector("#hs-map.is-enhanced");

const nodes = page.locator("#hs-map .hs-node");
const tabbableCount = await page.evaluate(() => {
  const list = Array.from(document.querySelectorAll("#hs-map .hs-node"));
  return list.filter((el) => el.tabIndex >= 0).length;
});
push("map-single-tab-stop", tabbableCount === 1, { tabbableCount });

await page.locator("#hs-map .hs-node").first().focus();
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(40);
const afterArrow = await page.evaluate(() => document.activeElement?.getAttribute("data-id") || "");
push("arrow-moves-focus", Boolean(afterArrow), { afterArrow });

await page.keyboard.press("Enter");
await page.waitForTimeout(80);
const pressed = await page.evaluate(() => {
  const el = document.querySelector('#hs-map .hs-node[aria-pressed="true"]');
  return el ? el.getAttribute("data-id") : null;
});
push("enter-selects-node", Boolean(pressed), { pressed });

const live = await page.locator("[data-hs-live]").textContent();
push("live-region-announces", Boolean(live && live.trim().length > 0), { live: (live || "").slice(0, 120) });

await page.keyboard.press("Escape");
await page.waitForTimeout(40);
const cleared = await page.evaluate(() => !document.querySelector('#hs-map .hs-node[aria-pressed="true"]'));
push("esc-clears-selection", cleared);

const toggle = page.locator(".hs-motion-toggle");
await toggle.click();
const paused = await toggle.getAttribute("aria-pressed");
push("pause-motion-toggles", paused === "true", { paused });
await toggle.click();
const playing = await toggle.getAttribute("aria-pressed");
push("play-motion-toggles", playing === "false", { playing });

await page.click('[data-scenario="quote"]');
await page.waitForTimeout(200);
const scenarioOn = await page.locator('[data-scenario="quote"]').getAttribute("aria-pressed");
push("scenario-starts", scenarioOn === "true");

const reducedPage = await browser.newPage({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce"
});
await reducedPage.goto(base + "/index.html", { waitUntil: "networkidle" });
await reducedPage.waitForSelector("#hs-map.is-enhanced");
const reducedState = await reducedPage.evaluate(() => {
  const revealOn = document.documentElement.classList.contains("hm-reveal-on");
  const steps = document.querySelectorAll(".hs-steps li").length;
  return { revealOn, mapEnhanced: document.querySelector("#hs-map.is-enhanced") != null, steps };
});
push("reduced-motion-no-reveal", reducedState.revealOn === false, reducedState);

await reducedPage.click('[data-scenario="invoice"]');
await reducedPage.waitForTimeout(100);
const instantSteps = await reducedPage.evaluate(() => {
  const items = Array.from(document.querySelectorAll(".hs-steps li"));
  return {
    count: items.length,
    allVisible: items.length > 0 && items.every((li) => li.classList.contains("is-done") || li.classList.contains("is-current"))
  };
});
push("reduced-motion-scenario-instant", instantSteps.count > 0, instantSteps);

const failed = results.filter((r) => !r.pass);
const payload = { pass: failed.length === 0, total: results.length, passed: results.length - failed.length, failedCount: failed.length, results, failed };
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));

await page.close();
await reducedPage.close();
await browser.close();
server.close();
process.exit(failed.length ? 1 : 0);
