/**
 * Signal Crest 2.0 axe-core sweep: 16 themes × 1440 + 390 (T5).
 */
import http from "http";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");

const root = process.cwd();
const dist = path.join(root, "dist");
const outPath = path.join(root, "qa-m6b", "sc20-axe-results.json");

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
  // QA-only: serve axe from same origin so script-src 'self' allows injection without loosening CSP.
  if (urlPath === "/__qa__/axe.min.js") {
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(fs.readFileSync(axePath));
    return;
  }
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

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({ headless: true });
const runs = [];

for (const width of [1440, 390]) {
  for (const theme of themes) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    // Load each theme cold so color transitions from a previous theme cannot poison axe samples.
    await page.addInitScript((id) => {
      try {
        localStorage.setItem("scs-theme-preference", id);
      } catch (_) {}
    }, theme);
    await page.goto(base + "/index.html", { waitUntil: "networkidle" });
    await page.addScriptTag({ url: base + "/__qa__/axe.min.js" });
    await page.evaluate((id) => {
      if (window.SCSTheme && typeof window.SCSTheme.setPreference === "function") {
        window.SCSTheme.setPreference(id);
      } else {
        document.documentElement.setAttribute("data-theme", id);
      }
      document.documentElement.classList.remove("hm-reveal-on");
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        el.classList.add("is-visible");
        el.style.setProperty("opacity", "1");
        el.style.setProperty("transform", "none");
        el.style.setProperty("transition", "none");
      });
    }, theme);
    await page.waitForTimeout(50);
    const result = await page.evaluate(async () => {
      const root = document.querySelector("main#main") || document;
      // eslint-disable-next-line no-undef
      const res = await axe.run(root, {
        resultTypes: ["violations"],
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }
      });
      return {
        appliedTheme: document.documentElement.getAttribute("data-theme"),
        violations: res.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.length,
          samples: v.nodes.slice(0, 3).map((n) => n.target)
        }))
      };
    });
    runs.push({
      theme,
      appliedTheme: result.appliedTheme,
      width,
      pass: result.violations.length === 0,
      violations: result.violations
    });
    await page.close();
  }
}

const failed = runs.filter((r) => !r.pass);
const payload = {
  pass: failed.length === 0,
  totalRuns: runs.length,
  passed: runs.length - failed.length,
  failedCount: failed.length,
  failed,
  runs
};
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(JSON.stringify({ pass: payload.pass, totalRuns: payload.totalRuns, passed: payload.passed, failedCount: payload.failedCount, failed: payload.failed }, null, 2));

await browser.close();
server.close();
process.exit(failed.length ? 1 : 0);
