/**
 * V1 owner-review corrections: Connected Systems (5 scenarios),
 * illustrative workflows separation, Solutions Explorer viewport containment.
 *
 * Usage:
 *   node scripts/build-public.mjs
 *   node qa-m6b/verify-user-review-20261123.mjs
 */
import http from "http";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const root = process.cwd();
const dist = path.join(root, "dist");
const stamp = "20261123";
const outPath = path.join(root, "qa-m6b", `user-review-results-${stamp}.json`);
const shotDir = path.join(root, "qa-m6b", `screenshots-user-review-${stamp}`);
fs.mkdirSync(shotDir, { recursive: true });

const required = ["workflow-demos.js", "hero-systems.js", "index.html", "styles.css"];
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

// Hero: Connected Systems always visible (not behind workflow tabs)
const mapInHero = await page.locator(".hs-hero #hs-map").isVisible();
const stageInHero = await page.locator(".hs-hero .hs-stage").isVisible();
push("connected-systems-in-hero", mapInHero && stageInHero);

const chipKeys = ["quote", "invoice", "update", "booking", "reporting"];
const chipCount = await page.locator(".hs-hero .hs-chip").count();
push("five-connected-scenarios", chipCount === 5, { chipCount });

for (const key of chipKeys) {
  const chip = page.locator(`.hs-hero .hs-chip[data-scenario="${key}"]`);
  await chip.click();
  await page.waitForTimeout(350);
  const pressed = await chip.getAttribute("aria-pressed");
  const title = await page.locator(".hs-hero .hs-panel-title").textContent();
  const stepsVisible = await page.locator(".hs-hero .hs-steps").isVisible();
  const stepCount = await page.locator(".hs-hero .hs-steps li").count();
  const mapFocused = await page.locator("#hs-map").evaluate((el) => el.classList.contains("has-focus"));
  push(`scenario-${key}`, pressed === "true" && stepsVisible && stepCount >= 3 && mapFocused && /illustrative/i.test(title || ""), {
    title,
    stepCount,
    mapFocused
  });
}

await page.screenshot({ path: path.join(shotDir, "desktop-connected-systems-reporting.png"), fullPage: false });
await page.locator('.hs-hero .hs-chip[data-scenario="booking"]').click();
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(shotDir, "desktop-connected-systems-booking.png"), fullPage: false });

// Escape clears scenario
await page.locator("#hs-map .hs-node").first().focus();
await page.keyboard.press("Escape");
await page.waitForTimeout(100);
push(
  "scenario-escape-clears",
  (await page.locator('.hs-hero .hs-chip[aria-pressed="true"]').count()) === 0
);

// Illustrative workflows separated from hero
const wfSection = page.locator("#illustrative-workflows");
push("illustrative-section-exists", await wfSection.count() === 1);
push("workflows-not-in-hero", (await page.locator(".hs-hero [data-wf-root]").count()) === 0);
const tabCount = await page.locator("#illustrative-workflows .wf-tab").count();
push("five-illustrative-tabs", tabCount === 5, { tabCount });

await page.locator("#illustrative-workflows").scrollIntoViewIfNeeded();
await page.waitForTimeout(150);
await page.screenshot({ path: path.join(shotDir, "desktop-illustrative-workflows.png"), fullPage: false });

for (const id of ["website", "leads", "software", "care"]) {
  await page.locator(`.wf-tab[data-wf="${id}"]`).click();
  await page.waitForTimeout(120);
  const selected = await page.locator(`.wf-tab[data-wf="${id}"]`).getAttribute("aria-selected");
  const visible = await page.locator(`#wf-panel-${id}`).isVisible();
  push(`illustrative-${id}`, selected === "true" && visible);
}

// Solutions Explorer desktop containment
await page.evaluate(() => window.scrollTo(0, 0));
await page.locator(".nav-more-toggle").first().click();
await page.waitForTimeout(120);
const details = page.locator(".nav-explorer");
push("solutions-open-desktop", await details.evaluate((el) => el.open));

const geom = await page.locator(".nav-explorer-panel").evaluate((el) => {
  const r = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  return {
    left: r.left,
    right: r.right,
    top: r.top,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
    vw: window.innerWidth,
    vh: window.innerHeight,
    overflowX: style.overflowX,
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth
  };
});
const margin = 2;
const contained =
  geom.left >= -margin &&
  geom.right <= geom.vw + margin &&
  geom.top >= 0 &&
  geom.width <= geom.vw + margin &&
  geom.scrollWidth <= geom.clientWidth + 2;
push("solutions-viewport-contained", contained, { geom });

const cats = await page.locator(".nav-explorer-cat").count();
push("solutions-four-cards", cats === 4, { cats });

const overlap = await page.locator(".nav-explorer-panel").evaluate((panel) => {
  const links = [...panel.querySelectorAll(".nav-explorer-links a")];
  const titles = [...panel.querySelectorAll(".nav-explorer-cat-title")];
  const boxes = [...links, ...titles].map((el) => {
    const r = el.getBoundingClientRect();
    return { t: r.top, b: r.bottom, l: r.left, r: r.right, text: (el.textContent || "").trim().slice(0, 40) };
  });
  let hits = 0;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l);
      const oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (ox > 2 && oy > 2) hits += 1;
    }
  }
  return { hits, sample: boxes.slice(0, 4) };
});
push("solutions-no-text-overlap", overlap.hits === 0, overlap);

const ariaExpanded = await page.locator(".nav-more-toggle").first().getAttribute("aria-expanded");
push("solutions-aria-expanded-open", ariaExpanded === "true");

await page.screenshot({ path: path.join(shotDir, "desktop-solutions-explorer.png"), fullPage: false });

await page.keyboard.press("Escape");
await page.waitForTimeout(80);
push("solutions-escape-close", !(await details.evaluate((el) => el.open)));
push(
  "solutions-aria-expanded-closed",
  (await page.locator(".nav-more-toggle").first().getAttribute("aria-expanded")) === "false"
);

await page.locator(".nav-more-toggle").first().click();
await page.waitForTimeout(80);
await page.mouse.click(10, 200);
await page.waitForTimeout(80);
push("solutions-outside-click-close", !(await details.evaluate((el) => el.open)));

// Mobile
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base + "/index.html", { waitUntil: "networkidle" });
await page.waitForSelector("#hs-map.is-enhanced");
push("mobile-five-chips", (await page.locator(".hs-hero .hs-chip").count()) === 5);
await page.locator('.hs-hero .hs-chip[data-scenario="quote"]').click();
await page.waitForTimeout(300);
push(
  "mobile-scenario-quote",
  (await page.locator('.hs-hero .hs-chip[data-scenario="quote"]').getAttribute("aria-pressed")) === "true"
);
await page.screenshot({ path: path.join(shotDir, "mobile-connected-systems.png"), fullPage: false });

await page.locator(".nav-toggle").click();
await page.waitForTimeout(120);
await page.locator(".nav-more-toggle").first().click();
await page.waitForTimeout(100);
const mobileGeom = await page.locator(".nav-explorer-panel").evaluate((el) => {
  const r = el.getBoundingClientRect();
  return {
    left: r.left,
    right: r.right,
    width: r.width,
    vw: window.innerWidth,
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth
  };
});
push(
  "mobile-solutions-contained",
  mobileGeom.left >= -2 &&
    mobileGeom.right <= mobileGeom.vw + 2 &&
    mobileGeom.scrollWidth <= mobileGeom.clientWidth + 2,
  { mobileGeom }
);
push("mobile-solutions-close-visible", await page.locator(".nav-explorer-close").isVisible());
await page.screenshot({ path: path.join(shotDir, "mobile-solutions-explorer.png"), fullPage: false });
await page.locator(".nav-explorer-close").click();
await page.waitForTimeout(80);
push("mobile-solutions-closed", !(await page.locator(".nav-explorer").evaluate((el) => el.open)));

await page.locator(".nav-toggle").click();
await page.waitForTimeout(80);
await page.locator("#illustrative-workflows").scrollIntoViewIfNeeded();
await page.waitForTimeout(120);
await page.locator('.wf-tab[data-wf="leads"]').click();
await page.waitForTimeout(150);
await page.screenshot({ path: path.join(shotDir, "mobile-illustrative-workflows.png"), fullPage: false });

// Studio exclusion + assets
push("no-studio-in-dist", !fs.existsSync(path.join(dist, "transformation-studio")));
const distHtml = fs.readdirSync(dist).filter((f) => f.endsWith(".html")).map((f) => fs.readFileSync(path.join(dist, f), "utf8")).join("\n");
push("no-studio-string-in-dist-html", !/transformation-studio/i.test(distHtml));
push("workflow-asset-in-dist", fs.existsSync(path.join(dist, "workflow-demos.js")));
push("hero-asset-in-dist", fs.existsSync(path.join(dist, "hero-systems.js")));

// Source: five scenarios present
const heroJs = fs.readFileSync(path.join(dist, "hero-systems.js"), "utf8");
push("source-booking-scenario", /booking:\s*\{/.test(heroJs) && /Appointment booking/.test(heroJs));
push("source-reporting-scenario", /reporting:\s*\{/.test(heroJs) && /Business reporting/.test(heroJs));

push("no-csp-console-errors", cspErrors.length === 0, { cspErrors: cspErrors.slice(0, 5) });

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
