import http from "http";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const root = process.cwd();
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
  let u = decodeURIComponent((req.url || "/").split("?")[0]);
  if (u === "/") u = "/index.html";
  const fp = path.join(root, u.replace(/^\/+/, ""));
  if (!fp.startsWith(root) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
    res.writeHead(404);
    res.end("x");
    return;
  }
  const headers = { "Content-Type": mime[path.extname(fp)] || "application/octet-stream" };
  const raw = fs.readFileSync(path.join(root, "_headers"), "utf8");
  const m = raw.match(/Content-Security-Policy:\s*(.+)/);
  if (m) headers["Content-Security-Policy"] = m[1].trim();
  res.writeHead(200, headers);
  res.end(fs.readFileSync(fp));
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const targets = [
  ["/showroom.html", '.showroom-rail-meta a[href*="work"]'],
  ["/packages.html", 'a[href="work.html#concept-demos"]'],
  ["/work.html", ".concept-examples .section-header a"],
  ["/work.html", ".page-hero-lead a"]
];

const checks = [];
for (const [url, sel] of targets) {
  await page.goto(base + url, { waitUntil: "domcontentloaded" });
  const info = await page
    .$eval(sel, (el) => {
      const cs = getComputedStyle(el);
      return {
        text: el.textContent.trim(),
        deco: cs.textDecorationLine,
        color: cs.color
      };
    })
    .catch((e) => ({ error: String(e) }));
  checks.push({ url, sel, info });
}

console.log(JSON.stringify(checks, null, 2));
await browser.close();
server.close();
