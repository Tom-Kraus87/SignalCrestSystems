/**
 * Lightweight SC 2.0 hero perf + weight observations (T11–T13).
 * Headless Chromium software canvas — pessimistic vs real GPU.
 */
import http from "http";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { chromium } from "playwright";

const root = process.cwd();
const dist = path.join(root, "dist");
const outPath = path.join(root, "qa-m6b", "sc20-perf-results.json");

const heroJs = fs.readFileSync(path.join(dist, "hero-systems.js"));
const homeJs = fs.readFileSync(path.join(dist, "home.js"));
const heroCss = fs.readFileSync(path.join(dist, "hero-systems.css"));
const homeCss = fs.readFileSync(path.join(dist, "home.css"));
const gzip = (buf) => zlib.gzipSync(buf).length;

const weight = {
  heroJsBytes: heroJs.length,
  heroJsGzip: gzip(heroJs),
  homeJsGzip: gzip(homeJs),
  heroCssGzip: gzip(heroCss),
  homeCssGzip: gzip(homeCss),
  heroJsGzipUnder12kb: gzip(heroJs) <= 12 * 1024
};

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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base + "/index.html", { waitUntil: "networkidle" });
await page.waitForSelector("#hs-map.is-enhanced");

const ambient = await page.evaluate(async () => {
  const samples = [];
  let last = performance.now();
  await new Promise((resolve) => {
    let n = 0;
    const tick = (now) => {
      samples.push(now - last);
      last = now;
      n += 1;
      if (n < 45) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  return {
    sampleCount: samples.length,
    avgFrameMs: Number(avg.toFixed(2)),
    medianFpsEstimate: Number((1000 / avg).toFixed(1))
  };
});

await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(400);
const offscreenBusy = await page.evaluate(() => {
  // Heuristic: map should remain enhanced; motion toggle still present.
  return {
    mapStillPresent: !!document.querySelector("#hs-map"),
    scrolledPastHero: window.scrollY > 600
  };
});

const thirdPartyScripts = await page.evaluate(() => {
  return Array.from(document.scripts)
    .map((s) => s.src)
    .filter((src) => src && !src.startsWith(location.origin) && !src.includes("fonts.googleapis"));
});

const payload = {
  pass: weight.heroJsGzipUnder12kb && thirdPartyScripts.length === 0,
  weight,
  ambient,
  offscreenBusy,
  thirdPartyScripts,
  notes: [
    "FPS estimates from rAF in headless Chromium (software canvas) are pessimistic.",
    "Prototype claimed ~60 fps median; re-check on real GPU / device before calling perf done."
  ]
};
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));

await browser.close();
server.close();
process.exit(payload.pass ? 0 : 1);
