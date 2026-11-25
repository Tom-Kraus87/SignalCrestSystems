/**
 * Polish pass functional checks: nav, mobile menu, CTAs, contact form, CSP console.
 */
import http from "http";
import fs from "fs";
import path from "path";
import { chromium, webkit } from "playwright";

const root = process.cwd();
const dist = path.join(root, "dist");
const outPath = path.join(root, "qa-m6b", "sc20-polish-functional-results.json");

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
    // Local http://127.0.0.1 cannot satisfy upgrade-insecure-requests under WebKit;
    // Chromium often tolerates localhost. Strip only that token for local QA — production _headers unchanged.
    headers["Content-Security-Policy"] = cspMatch[1].trim().replace(/\s*;?\s*upgrade-insecure-requests/gi, "");
  }
  res.writeHead(200, headers);
  res.end(fs.readFileSync(filePath));
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({ headless: true });
const checks = [];
const pass = (id, detail) => checks.push({ id, ok: true, detail });
const fail = (id, detail) => checks.push({ id, ok: false, detail });

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleHits = [];
page.on("console", (msg) => {
  const t = msg.type();
  const text = msg.text();
  if (t === "error" || /Content Security Policy|Refused to|unsafe-inline|inline style/i.test(text)) {
    consoleHits.push({ type: t, text });
  }
});

await page.goto(base + "/index.html", { waitUntil: "networkidle" });
await page.waitForSelector("#hs-map.is-enhanced");

const hasSiteHeader = await page.locator(".site-header").count();
const hasProtoHeader = await page.locator(".proto-header").count();
hasSiteHeader ? pass("T3-site-header", "present") : fail("T3-site-header", "missing");
!hasProtoHeader ? pass("T3-no-proto-header", "absent") : fail("T3-no-proto-header", "still present");

const primary = await page.locator(".hs-hero a.hs-btn-primary").first().getAttribute("href");
const secondary = await page.locator(".hs-hero a.hs-btn-secondary").first().getAttribute("href");
primary === "project-request.html" ? pass("CTA-primary", primary) : fail("CTA-primary", primary);
secondary === "showroom.html" ? pass("CTA-secondary", secondary) : fail("CTA-secondary", secondary);

const closingPrimary = await page.locator(".hm-cta a.hs-btn-primary").getAttribute("href");
const closingSecondary = await page.locator(".hm-cta a.hs-btn-secondary").getAttribute("href");
closingPrimary === "project-request.html" ? pass("CTA-closing-primary", closingPrimary) : fail("CTA-closing-primary", closingPrimary);
closingSecondary === "showroom.html" ? pass("CTA-closing-secondary", closingSecondary) : fail("CTA-closing-secondary", closingSecondary);

const navCta = await page.locator(".site-header a.nav-cta").getAttribute("href");
navCta === "project-request.html" ? pass("nav-cta", navCta) : fail("nav-cta", navCta);

await page.close();

// Mobile menu
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(base + "/index.html", { waitUntil: "networkidle" });
const toggle = mobile.locator(".nav-toggle, button.menu-toggle, [aria-controls='site-nav'], button[aria-expanded]").first();
const toggleCount = await mobile.locator(".nav-toggle, .menu-toggle, .site-header button[aria-expanded]").count();
if (toggleCount) {
  const btn = mobile.locator(".nav-toggle").first();
  await btn.click();
  const expanded = await btn.getAttribute("aria-expanded");
  expanded === "true" ? pass("mobile-menu-open", "aria-expanded=true") : fail("mobile-menu-open", expanded);
  const navState = await mobile.evaluate(() => {
    const nav = document.querySelector("#site-nav");
    if (!nav) return { ok: false, reason: "missing #site-nav" };
    return {
      ok: nav.classList.contains("is-open"),
      reason: nav.className,
      linkCount: nav.querySelectorAll("a[href]").length
    };
  });
  navState.ok && navState.linkCount > 0
    ? pass("mobile-menu-visible", `is-open links=${navState.linkCount}`)
    : fail("mobile-menu-visible", JSON.stringify(navState));
} else {
  fail("mobile-menu-toggle", "no toggle found");
}
await mobile.close();

// Contact form + Netlify + service preselect
const contact = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await contact.goto(base + "/contact.html?service=ai-automation", { waitUntil: "networkidle" });
const formMeta = await contact.evaluate(() => {
  const form = document.querySelector("form[name], form[data-netlify], form");
  if (!form) return null;
  const service = form.querySelector("[name='service'], #service, select#service");
  return {
    name: form.getAttribute("name"),
    netlify: form.hasAttribute("data-netlify") || form.getAttribute("netlify") != null,
    method: (form.getAttribute("method") || "").toLowerCase(),
    serviceValue: service ? service.value : null,
    serviceOptions: service
      ? Array.from(service.options || []).map((o) => o.value).filter(Boolean)
      : []
  };
});
if (formMeta && formMeta.netlify) pass("contact-netlify", formMeta.name || "form");
else fail("contact-netlify", JSON.stringify(formMeta));
if (formMeta && formMeta.serviceValue === "ai-automation") pass("contact-service-preselect", formMeta.serviceValue);
else fail("contact-service-preselect", formMeta && formMeta.serviceValue);
await contact.close();

// Showroom S1 landing smoke
const showroom = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await showroom.goto(base + "/showroom.html", { waitUntil: "networkidle" });
const showroomOk = await showroom.locator("main, #main, .showroom").count();
showroomOk ? pass("showroom-loads", "ok") : fail("showroom-loads", "missing main");
await showroom.close();

consoleHits.length === 0
  ? pass("csp-console", "0 CSP/error hits on homepage load path")
  : fail("csp-console", consoleHits.slice(0, 5));

// WebKit quick load
let webkitResult = { available: false };
let wk = null;
try {
  wk = await webkit.launch({ headless: true });
  const wkPage = await wk.newPage({ viewport: { width: 390, height: 844 } });
  const wkConsole = [];
  wkPage.on("console", (msg) => {
    if (msg.type() === "error") wkConsole.push(msg.text());
  });
  await wkPage.goto(base + "/index.html", { waitUntil: "domcontentloaded", timeout: 20000 });
  await wkPage.waitForSelector(".hs-hero", { timeout: 10000 });
  let enhanced = false;
  for (let i = 0; i < 40; i++) {
    enhanced = await wkPage.evaluate(() => !!document.querySelector("#hs-map.is-enhanced"));
    if (enhanced) break;
    await wkPage.waitForTimeout(250);
  }
  const cta = await wkPage.locator(".hs-actions a.hs-btn-primary").first().getAttribute("href");
  webkitResult = {
    available: true,
    mapEnhanced: enhanced,
    primaryCta: cta,
    consoleErrors: wkConsole.slice(0, 5),
    note: "Playwright WebKit ≠ real iOS Safari"
  };
  enhanced && cta === "project-request.html"
    ? pass("webkit-hero", "enhanced + CTA ok")
    : fail("webkit-hero", JSON.stringify(webkitResult));
  await wkPage.close();
} catch (err) {
  webkitResult = { available: false, error: String(err.message || err) };
  fail("webkit-hero", webkitResult.error);
} finally {
  if (wk) await wk.close().catch(() => {});
}

const summary = {
  passed: checks.filter((c) => c.ok).length,
  failed: checks.filter((c) => !c.ok).length,
  checks,
  webkit: webkitResult
};
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
await browser.close();
server.close();
process.exit(summary.failed ? 1 : 0);
