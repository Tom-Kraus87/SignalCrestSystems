/**
 * Capture desktop previews for Public V1 + Stone Harbor studio pilot.
 * Serves dist/ with _headers CSP (same pattern as verify-sc20-integrated.mjs).
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
  ".woff2": "font/woff2",
};

const headersPath = path.join(dist, "_headers");
let csp = "";
if (fs.existsSync(headersPath)) {
  const raw = fs.readFileSync(headersPath, "utf8");
  const m = raw.match(/Content-Security-Policy:\s*(.+)/);
  if (m) csp = m[1].trim();
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath.endsWith("/")) urlPath += "index.html";
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(dist, urlPath.replace(/^\/+/, ""));
  if (!filePath.startsWith(dist) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("missing");
    return;
  }
  const ext = path.extname(filePath);
  const headers = { "Content-Type": mime[ext] || "application/octet-stream" };
  if (csp) headers["Content-Security-Policy"] = csp;
  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const shots = [
  ["/", "v1-home-desktop-20261123.png"],
  ["/project-request.html", "v1-project-request-20261123.png"],
  ["/transformation-studio/", "v1-stone-harbor-studio-20261123.png"],
];

for (const [route, name] of shots) {
  await page.goto(base + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(shotDir, name) });
  console.log("wrote", name);
}

await browser.close();
server.close();
console.log("capture complete");
