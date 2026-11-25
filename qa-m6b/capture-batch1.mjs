import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "screenshots");
fs.mkdirSync(OUT, { recursive: true });

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".png": "image/png",
      ".webp": "image/webp",
      ".ico": "image/x-icon",
    }[ext] || "application/octet-stream"
  );
}

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent((req.url || "/").split("?")[0]);
  if (rel === "/") rel = "/index.html";
  const fp = path.join(ROOT, rel.replace(/^\//, ""));
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { "Content-Type": contentType(fp) });
  fs.createReadStream(fp).pipe(res);
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

const shots = [
  { name: "m6b-homepage-desktop-1440", width: 1440, height: 900, path: "/index.html" },
  { name: "m6b-homepage-laptop-1024", width: 1024, height: 800, path: "/index.html" },
  { name: "m6b-homepage-tablet-768", width: 768, height: 1024, path: "/index.html" },
  { name: "m6b-homepage-mobile-390", width: 390, height: 844, path: "/index.html" },
  { name: "m6b-homepage-mobile-320", width: 320, height: 720, path: "/index.html" },
  { name: "m6b-nav-mobile-open-390", width: 390, height: 844, path: "/index.html", openNav: true },
  { name: "m6b-work-desktop-1440", width: 1440, height: 900, path: "/work.html" },
  { name: "m6b-contact-desktop-1440", width: 1440, height: 900, path: "/contact.html" },
];

for (const shot of shots) {
  const ctx = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
  });
  const page = await ctx.newPage();
  await page.goto(`${base}${shot.path}`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem("scs-theme-preference", "midnight-tech");
    document.documentElement.setAttribute("data-theme", "midnight-tech");
  });
  await page.reload({ waitUntil: "networkidle" });
  if (shot.openNav) {
    await page.locator(".nav-toggle").click();
    await page.waitForTimeout(250);
  }
  const file = path.join(OUT, `${shot.name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log("wrote", file);
  await ctx.close();
}

await browser.close();
server.close();
console.log("done");
