/**
 * Measure homepage hero stack height + capture polish before/after screenshots.
 * Usage:
 *   node qa-m6b/measure-polish-hero.mjs before
 *   node qa-m6b/measure-polish-hero.mjs after
 */
import http from "http";
import fs from "fs";
import path from "path";
import { chromium, webkit } from "playwright";

const phase = (process.argv[2] || "measure").toLowerCase();
const root = process.cwd();
const dist = path.join(root, "dist");
const shotDir = path.join(root, "qa-m6b", "screenshots");
const outJson = path.join(root, "qa-m6b", `sc20-polish-hero-metrics-${phase}.json`);
fs.mkdirSync(shotDir, { recursive: true });

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
  if (cspMatch) {
    // Strip upgrade-insecure-requests for local http QA only (needed for Playwright WebKit).
    headers["Content-Security-Policy"] = cspMatch[1].trim().replace(/\s*;?\s*upgrade-insecure-requests/gi, "");
  }
  res.writeHead(200, headers);
  res.end(fs.readFileSync(filePath));
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({ headless: true });
const widths = [1440, 1024, 768, 390, 320];
const metrics = { phase, widths: {}, overflow: {}, saved: [] };

async function measurePage(page, width) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("scs-theme-preference", "midnight-tech");
    } catch (_) {}
  });
  await page.goto(base + "/index.html", { waitUntil: "networkidle" });
  await page.waitForSelector("#hs-map.is-enhanced");
  await page.evaluate(() => {
    if (window.SCSTheme) window.SCSTheme.setPreference("midnight-tech");
  });
  await page.waitForTimeout(120);
  return page.evaluate(() => {
    const hero = document.querySelector(".hs-hero");
    const inner = document.querySelector(".hs-hero-inner");
    const copy = document.querySelector(".hs-copy");
    const stage = document.querySelector(".hs-stage");
    const map = document.querySelector("#hs-map");
    const panel = document.querySelector(".hs-panel");
    const doc = document.documentElement;
    return {
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      heroHeight: hero ? Math.round(hero.getBoundingClientRect().height) : null,
      innerHeight: inner ? Math.round(inner.getBoundingClientRect().height) : null,
      copyHeight: copy ? Math.round(copy.getBoundingClientRect().height) : null,
      stageHeight: stage ? Math.round(stage.getBoundingClientRect().height) : null,
      mapHeight: map ? Math.round(map.getBoundingClientRect().height) : null,
      panelHeight: panel ? Math.round(panel.getBoundingClientRect().height) : null,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowX: doc.scrollWidth > doc.clientWidth + 1
    };
  });
}

for (const width of widths) {
  const height = width <= 390 ? 844 : 900;
  const page = await browser.newPage({
    viewport: { width, height },
    colorScheme: "dark"
  });
  const m = await measurePage(page, width);
  metrics.widths[String(width)] = m;
  metrics.overflow[String(width)] = !m.overflowX;
  if (phase === "before" || phase === "after") {
    const file = path.join(shotDir, `sc20-polish-${phase}-${width}.png`);
    await page.screenshot({ path: file, fullPage: false });
    metrics.saved.push(file);
    if (width === 1440 || width === 390) {
      const full = path.join(shotDir, `sc20-polish-${phase}-full-${width}.png`);
      await page.screenshot({ path: full, fullPage: true });
      metrics.saved.push(full);
    }
  }
  await page.close();
}

// WebKit smoke if available (Playwright WebKit ≠ real iOS Safari device)
metrics.webkit = { available: false, note: "not run" };
let wk = null;
try {
  wk = await webkit.launch({ headless: true });
  metrics.webkit.available = true;
  const wkResults = {};
  for (const width of [1440, 390]) {
    const page = await wk.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
    try {
      await page.addInitScript(() => {
        try {
          localStorage.setItem("scs-theme-preference", "midnight-tech");
        } catch (_) {}
      });
      await page.goto(base + "/index.html", { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForSelector("#hs-map", { timeout: 15000 });
      // Enhancement may be slower on WebKit; poll class + fall back to partial metrics.
      let enhanced = false;
      for (let i = 0; i < 40; i++) {
        enhanced = await page.evaluate(() => !!document.querySelector("#hs-map.is-enhanced"));
        if (enhanced) break;
        await page.waitForTimeout(250);
      }
      const m = await page.evaluate(() => {
        const hero = document.querySelector(".hs-hero");
        const map = document.querySelector("#hs-map");
        const doc = document.documentElement;
        return {
          heroHeight: hero ? Math.round(hero.getBoundingClientRect().height) : null,
          mapHeight: map ? Math.round(map.getBoundingClientRect().height) : null,
          overflowX: doc.scrollWidth > doc.clientWidth + 1,
          mapClass: map ? map.className : null
        };
      });
      wkResults[String(width)] = { ...m, mapEnhanced: enhanced };
      if (phase === "after") {
        const file = path.join(shotDir, `sc20-polish-after-webkit-${width}.png`);
        await page.screenshot({ path: file, fullPage: false });
        metrics.saved.push(file);
      }
    } finally {
      await page.close().catch(() => {});
    }
  }
  metrics.webkit.results = wkResults;
  metrics.webkit.note = "Playwright WebKit (not real iOS Safari device)";
} catch (err) {
  metrics.webkit.error = String(err && err.message ? err.message : err);
  metrics.webkit.note = metrics.webkit.available
    ? "Playwright WebKit launched but smoke checks failed"
    : "WebKit browser binary unavailable in this environment";
} finally {
  if (wk) await wk.close().catch(() => {});
}

fs.writeFileSync(outJson, JSON.stringify(metrics, null, 2));
console.log(JSON.stringify(metrics, null, 2));
await browser.close().catch(() => {});
server.close();
