/**
 * Signal Crest 2.0 integrated smoke checks (T2–T4, T9, T14–T18).
 * Serves dist/ with real _headers CSP. Does not loosen CSP.
 *
 * Usage:
 *   node scripts/build-public.mjs
 *   node qa-m6b/verify-sc20-integrated.mjs
 */
import http from "http";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const root = process.cwd();
const dist = path.join(root, "dist");
const outPath = path.join(root, "qa-m6b", "sc20-integrated-results.json");
const required = ["hero-systems.css", "hero-systems.js", "home.css", "home.js"];
const missing = required.filter((f) => !fs.existsSync(path.join(dist, f)));

if (missing.length) {
  const payload = {
    pass: false,
    blocked: true,
    reason: "SC 2.0 assets not in dist yet — integration not started",
    missing
  };
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
const cspErrors = [];
page.on("console", (msg) => {
  const t = msg.text();
  if (/Content Security Policy|Applying inline style|violates/i.test(t)) cspErrors.push(t);
});

const results = [];
const push = (check, pass, extra = {}) => results.push({ check, pass, ...extra });

await page.goto(base + "/index.html", { waitUntil: "networkidle" });

push("site-header-present", (await page.locator(".site-header").count()) === 1);
push("nav-toggle-present", (await page.locator(".nav-toggle").count()) === 1);
push("no-proto-header", (await page.locator(".proto-header").count()) === 0);
push("hs-hero-present", (await page.locator(".hs-hero").count()) === 1);
push("hs-map-present", (await page.locator("#hs-map").count()) === 1);
push("hs-map-enhanced", await page.locator("#hs-map.is-enhanced").count().then((n) => n === 1));
push("product-lab-present", (await page.locator("#product-lab").count()) === 1);
push("showroom-preview-present", (await page.locator("#showroom-preview").count()) === 1);

const primary = page.locator(".hs-actions a.hs-btn-primary").first();
const secondary = page.locator(".hs-actions a.hs-btn-secondary").first();
const primaryHref = (await primary.getAttribute("href")) || "";
const secondaryHref = (await secondary.getAttribute("href")) || "";
push("primary-cta-project-request", /project-request\.html/.test(primaryHref), { primaryHref });
push("secondary-cta-showroom", /showroom\.html/.test(secondaryHref), { secondaryHref });

const homeHtml = fs.readFileSync(path.join(dist, "index.html"), "utf8");
push(
  "honest-claims-copy",
  /Illustrative system map/.test(homeHtml) &&
    /Simulated data/.test(homeHtml) &&
    /Fictional sample data/.test(homeHtml)
);

const themes = [
  "midnight-tech",
  "obsidian-black",
  "stealth-carbon",
  "emerald-night",
  "royal-indigo",
  "industrial-slate",
  "clean-corporate",
  "blueprint-studio",
  "vintage-paper",
  "neural-future",
  "holographic",
  "cyberpunk-2099",
  "cyber-terminal",
  "retro-computing",
  "synthwave-sunset",
  "arcade-1995"
];

for (const theme of themes) {
  await page.evaluate((id) => {
    if (window.SCSTheme && typeof window.SCSTheme.setPreference === "function") {
      window.SCSTheme.setPreference(id);
    } else {
      document.documentElement.setAttribute("data-theme", id);
    }
  }, theme);
  await page.waitForTimeout(40);
  const ok = await page.evaluate(() => {
    const hero = document.querySelector(".hs-hero");
    const canvas = document.querySelector(".hs-canvas");
    if (!hero || !canvas) return false;
    const cs = getComputedStyle(hero);
    return Boolean(cs.color && cs.backgroundColor);
  });
  push("theme-render-" + theme, ok);
}

for (const width of [1440, 1024, 768, 390, 320]) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(80);
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
  push("no-h-overflow-" + width, !overflow, { overflow });
}

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(base + "/contact.html", { waitUntil: "networkidle" });
const contactHtml = fs.readFileSync(path.join(dist, "contact.html"), "utf8");
push(
  "netlify-form-attrs",
  /data-netlify=["']true["']/.test(contactHtml) && /name=["']contact["']/.test(contactHtml)
);
await page.goto(base + "/contact.html?service=ai-automation", { waitUntil: "networkidle" });
const preselect = await page.evaluate(() => {
  const sel = document.querySelector('select[name="service"]');
  return sel ? sel.value : "";
});
push("contact-service-preselect", preselect === "ai-automation", { preselect });

await page.goto(base + "/showroom.html", { waitUntil: "networkidle" });
push("showroom-loads", (await page.locator("#demo-home-services-root, #demo-ecommerce-root").count()) >= 1);

push("no-csp-console-errors", cspErrors.length === 0, { cspErrors });

const failed = results.filter((r) => !r.pass);
const payload = {
  pass: failed.length === 0,
  total: results.length,
  passed: results.length - failed.length,
  failedCount: failed.length,
  results,
  failed
};
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));

await browser.close();
server.close();
process.exit(failed.length ? 1 : 0);
