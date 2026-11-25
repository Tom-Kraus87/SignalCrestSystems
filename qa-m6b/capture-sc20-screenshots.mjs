/**
 * Capture before/after-style SC 2.0 homepage screenshots into qa-m6b/screenshots/.
 */
import http from "http";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const root = process.cwd();
const dist = path.join(root, "dist");
const shotDir = path.join(root, "qa-m6b", "screenshots");
fs.mkdirSync(shotDir, { recursive: true });

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
const saved = [];

for (const width of [1440, 1024, 768, 390, 320]) {
  const page = await browser.newPage({
    viewport: { width, height: 900 },
    colorScheme: "dark"
  });
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
  const file = path.join(shotDir, `sc20-home-${width}.png`);
  await page.screenshot({ path: file, fullPage: false });
  saved.push(file);
  if (width === 1440) {
    const full = path.join(shotDir, "sc20-home-full-1440.png");
    await page.screenshot({ path: full, fullPage: true });
    saved.push(full);
  }
  await page.close();
}

const themeSamples = ["clean-corporate", "vintage-paper", "cyber-terminal", "synthwave-sunset"];
const themePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await themePage.goto(base + "/index.html", { waitUntil: "networkidle" });
await themePage.waitForSelector("#hs-map.is-enhanced");
for (const theme of themeSamples) {
  await themePage.evaluate((id) => {
    if (window.SCSTheme) window.SCSTheme.setPreference(id);
    else document.documentElement.setAttribute("data-theme", id);
  }, theme);
  await themePage.waitForTimeout(80);
  const file = path.join(shotDir, `sc20-home-theme-${theme}-1440.png`);
  await themePage.screenshot({ path: file, fullPage: false });
  saved.push(file);
}
await themePage.close();

const reduced = await browser.newPage({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce"
});
await reduced.goto(base + "/index.html", { waitUntil: "networkidle" });
await reduced.waitForSelector("#hs-map.is-enhanced");
const reducedFile = path.join(shotDir, "sc20-reduced-motion-390.png");
await reduced.screenshot({ path: reducedFile, fullPage: false });
saved.push(reducedFile);
await reduced.close();

console.log(JSON.stringify({ saved }, null, 2));
await browser.close();
server.close();
