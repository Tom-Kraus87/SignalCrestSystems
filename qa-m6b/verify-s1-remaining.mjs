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

function lineEndingStats(filePath) {
  const bytes = fs.readFileSync(filePath);
  let crlf = 0;
  let lf = 0;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 13 && bytes[i + 1] === 10) {
      crlf++;
      i++;
    } else if (bytes[i] === 10) {
      lf++;
    }
  }
  return { crlf, lf };
}

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
const port = server.address().port;
const base = "http://127.0.0.1:" + port;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const cspErrors = [];
page.on("console", (msg) => {
  const t = msg.text();
  if (/Content Security Policy|Applying inline style|violates/i.test(t)) cspErrors.push(t);
});

const results = [];

const cssFiles = [
  "showroom.css",
  "packages-pricing.css",
  "styles.css",
  path.join("dist", "showroom.css"),
  path.join("dist", "packages-pricing.css"),
  path.join("dist", "styles.css")
];
for (const rel of cssFiles) {
  const full = path.isAbsolute(rel) ? rel : path.join(root, rel);
  const stats = lineEndingStats(full);
  results.push({
    check: "lf-only:" + rel.replace(/\\/g, "/"),
    pass: stats.crlf === 0 && stats.lf > 0,
    ...stats
  });
}

const showroomHtml = fs.readFileSync(path.join(dist, "showroom.html"), "utf8");
results.push({
  check: "no-public-batch-s1",
  pass: !/Batch\s*S1/i.test(showroomHtml)
});
results.push({
  check: "eyebrow-interactive-showroom",
  pass: /class="eyebrow">Interactive Showroom</.test(showroomHtml)
});

const showroomCss = fs.readFileSync(path.join(dist, "showroom.css"), "utf8");
results.push({
  check: "active-tab-text-color-rule",
  pass: /\.showroom-demo-tab\.is-active\s+\.showroom-demo-tab-kicker[\s\S]*?color:\s*var\(--color-text\)/.test(
    showroomCss
  )
});
results.push({
  check: "rail-meta-link-underline-rule",
  pass: /\.showroom-rail-meta\s+a\s*\{[\s\S]*?text-decoration:\s*underline/.test(showroomCss)
});

const stylesCss = fs.readFileSync(path.join(dist, "styles.css"), "utf8");
results.push({
  check: "nav-active-underline-rule",
  pass: /\.site-nav\s+a\.is-active\s*\{[\s\S]*?text-decoration:\s*underline/.test(stylesCss)
});

await page.goto(base + "/showroom.html", { waitUntil: "networkidle" });

const eyebrow = await page.locator(".page-hero .eyebrow").innerText();
results.push({
  check: "dom-eyebrow-no-batch-s1",
  pass: /interactive\s+showroom/i.test(eyebrow) && !/Batch\s*S1/i.test(eyebrow),
  eyebrow
});

const workLink = await page.evaluate(() => {
  const link = document.querySelector('.showroom-rail-meta a[href*="work"]');
  const nav = document.querySelector('.site-nav a.is-active[href="work.html"]');
  const cs = (el) => getComputedStyle(el);
  return {
    railDeco: cs(link).textDecorationLine,
    navDeco: nav ? cs(nav).textDecorationLine : "missing"
  };
});
results.push({
  check: "rail-work-link-underlined",
  pass: workLink.railDeco.includes("underline"),
  workLink
});
results.push({
  check: "nav-work-active-underlined",
  pass: workLink.navDeco.includes("underline"),
  workLink
});

const themes = await page.$$eval(".theme-option[data-theme-id]", (btns) =>
  btns.map((b) => b.getAttribute("data-theme-id")).filter(Boolean)
);

const contrastFails = [];
for (const t of themes) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
  }, t);
  await page.waitForTimeout(20);
  const measured = await page.evaluate(() => {
    function parse(c) {
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?/);
      if (!m) return null;
      return { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] };
    }
    function lum({ r, g, b }) {
      const rgb = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    }
    function composite(fg, bg) {
      const a = fg.a;
      return {
        r: Math.round(fg.r * a + bg.r * (1 - a)),
        g: Math.round(fg.g * a + bg.g * (1 - a)),
        b: Math.round(fg.b * a + bg.b * (1 - a)),
        a: 1
      };
    }
    function ratio(fg, bg) {
      const L1 = lum(fg);
      const L2 = lum(bg);
      const [a, b] = L1 > L2 ? [L1, L2] : [L2, L1];
      return (a + 0.05) / (b + 0.05);
    }
    function effectiveBg(el) {
      const stack = [];
      let cur = el;
      while (cur && cur !== document.documentElement) {
        const bg = parse(getComputedStyle(cur).backgroundColor);
        if (bg && bg.a > 0) stack.unshift(bg);
        cur = cur.parentElement;
      }
      let acc = parse(getComputedStyle(document.body).backgroundColor) || {
        r: 255,
        g: 255,
        b: 255,
        a: 1
      };
      acc = { ...acc, a: 1 };
      for (const layer of stack) acc = composite(layer, acc);
      return acc;
    }
    const tab = document.querySelector(".showroom-demo-tab.is-active");
    const bg = effectiveBg(tab);
    const out = {};
    for (const k of ["label", "kicker", "desc"]) {
      const el = tab.querySelector(".showroom-demo-tab-" + (k === "label" ? "label" : k));
      out[k] = +ratio(parse(getComputedStyle(el).color), bg).toFixed(2);
    }
    return out;
  });
  for (const part of ["label", "kicker", "desc"]) {
    if (measured[part] < 4.5) {
      contrastFails.push({ theme: t, part, ratio: measured[part] });
    }
  }
}

results.push({
  check: "selected-tab-contrast-16-themes",
  pass: contrastFails.length === 0,
  themes: themes.length,
  contrastFails
});

await page.screenshot({
  path: path.join(shotDir, "s1-remaining-showroom-tabs-1440.png"),
  fullPage: false
});
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: path.join(shotDir, "s1-remaining-showroom-tabs-390.png"),
  fullPage: false
});

results.push({
  check: "no-csp-console-errors",
  pass: cspErrors.length === 0,
  cspErrors
});

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({ pass: failed.length === 0, results, failed }, null, 2));

await browser.close();
server.close();
process.exit(failed.length ? 1 : 0);
