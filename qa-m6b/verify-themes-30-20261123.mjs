/**
 * Theme engine correction QA — exactly 30 themes (5×6), Arcade fix,
 * picker viewport, overflow, axe sample + new themes, studio exclusion note.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createRequire } from "module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(__dirname, "screenshots-themes-30-20261123");
const RESULTS = path.join(__dirname, "theme-engine-30-results-20261123.json");
const REPORT = path.join(__dirname, "THEME-ENGINE-30-REPORT-20261123.md");
const INVENTORY = path.join(__dirname, "THEME-ENGINE-30-INVENTORY-20261123.md");

fs.mkdirSync(OUT_DIR, { recursive: true });

const EXPECTED = {
  "professional-dark": [
    ["midnight-tech", "Midnight Tech"],
    ["obsidian-black", "Obsidian Black"],
    ["stealth-carbon", "Stealth Carbon"],
    ["emerald-night", "Emerald Night"],
    ["royal-indigo", "Royal Indigo"],
    ["industrial-slate", "Industrial Slate"]
  ],
  "professional-light": [
    ["clean-corporate", "Clean Corporate"],
    ["blueprint-studio", "Blueprint Studio"],
    ["vintage-paper", "Vintage Paper"],
    ["swiss-precision", "Swiss Precision"],
    ["nordic-frost", "Nordic Frost"],
    ["ivory-atelier", "Ivory Atelier"]
  ],
  futuristic: [
    ["neural-future", "Neutral Future"],
    ["holographic", "Holographic"],
    ["cyberpunk-2099", "Cyberpunk 2099"],
    ["cyber-terminal", "Cyber Terminal"],
    ["liquid-chrome", "Liquid Chrome"],
    ["aurora-glass", "Aurora Glass"]
  ],
  retro: [
    ["retro-computing", "Retro Computing"],
    ["synthwave-sunset", "Synthwave Sunset"],
    ["arcade-1995", "Arcade 1995"],
    ["y2k-webcore", "Y2K Webcore"],
    ["terminal-green", "Terminal Green"],
    ["pixel-neon", "Pixel Neon"]
  ],
  creative: [
    ["solarpunk", "Solarpunk"],
    ["biophilic-studio", "Biophilic Studio"],
    ["neo-brutalist", "Neo Brutalist"],
    ["art-deco-luxe", "Art Deco Luxe"],
    ["tokyo-neon", "Tokyo Neon"],
    ["deep-ocean", "Deep Ocean"]
  ]
};

const ALL_IDS = Object.values(EXPECTED).flat().map(([id]) => id);
const NEW_IDS = [
  "swiss-precision",
  "nordic-frost",
  "ivory-atelier",
  "liquid-chrome",
  "aurora-glass",
  "y2k-webcore",
  "terminal-green",
  "pixel-neon",
  "solarpunk",
  "biophilic-studio",
  "neo-brutalist",
  "art-deco-luxe",
  "tokyo-neon",
  "deep-ocean"
];
const AXE_SAMPLE = [
  "midnight-tech",
  "clean-corporate",
  "arcade-1995",
  "pixel-neon",
  "neo-brutalist",
  "solarpunk",
  "liquid-chrome",
  "tokyo-neon"
];

function mime(p) {
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript",
      ".png": "image/png",
      ".webp": "image/webp",
      ".ico": "image/x-icon",
      ".woff2": "font/woff2",
      ".svg": "image/svg+xml"
    }[path.extname(p).toLowerCase()] || "application/octet-stream"
  );
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  if (urlPath === "/__qa__/axe.min.js") {
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(fs.readFileSync(axePath));
    return;
  }
  const filePath = path.join(ROOT, urlPath.replace(/^\/+/, ""));
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("missing");
    return;
  }
  const headers = { "Content-Type": mime(filePath) };
  const hdrFile = path.join(ROOT, "_headers");
  if (fs.existsSync(hdrFile)) {
    const raw = fs.readFileSync(hdrFile, "utf8");
    const cspMatch = raw.match(/Content-Security-Policy:\s*(.+)/);
    if (cspMatch) headers["Content-Security-Policy"] = cspMatch[1].trim();
  }
  res.writeHead(200, headers);
  res.end(fs.readFileSync(filePath));
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const results = {
  timestamp: new Date().toISOString(),
  expectedCount: 30,
  themeIds: ALL_IDS,
  checks: {},
  overflow: [],
  arcade: {},
  pickerViewport: {},
  axe: [],
  screenshots: [],
  build: {},
  conflicts: []
};

// Static inventory from theme.js
const themeJs = fs.readFileSync(path.join(ROOT, "theme.js"), "utf8");
const bootJs = fs.readFileSync(path.join(ROOT, "theme-boot.js"), "utf8");
const themeIdsFromJs = [...themeJs.matchAll(/["']([a-z0-9-]+)["']\s*:\s*\{\s*name:/g)].map((m) => m[1]);
const uniqueJs = new Set(themeIdsFromJs);
results.checks.themeJsCount = themeIdsFromJs.length;
results.checks.themeJsUnique = uniqueJs.size;
results.checks.themeJsMissing = ALL_IDS.filter((id) => !uniqueJs.has(id));
results.checks.themeJsExtra = [...uniqueJs].filter((id) => !ALL_IDS.includes(id));
results.checks.bootHasAll = ALL_IDS.every((id) => bootJs.includes(`"${id}"`) || bootJs.includes(`${id}:`));

const browser = await chromium.launch({ headless: true });

async function measureOverflow(page, theme) {
  await page.evaluate((id) => {
    if (window.SCSTheme) window.SCSTheme.setPreference(id);
    else {
      localStorage.setItem("scs-theme-preference", id);
      document.documentElement.setAttribute("data-theme", id);
    }
  }, theme);
  await page.waitForTimeout(60);
  return page.evaluate(() => {
    const doc = document.documentElement.scrollWidth;
    const win = window.innerWidth;
    const body = document.body.scrollWidth;
    return {
      overflow: doc > win + 1 || body > win + 1,
      doc,
      win,
      body,
      applied: document.documentElement.getAttribute("data-theme")
    };
  });
}

// Desktop inventory + selectability + overflow
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
  const picker = await page.evaluate(() => {
    const groups = [...document.querySelectorAll(".theme-group")].map((g) => ({
      title: g.querySelector(".theme-group-title")?.textContent?.trim() || "",
      ids: [...g.querySelectorAll("[data-theme-id]")].map((b) => b.getAttribute("data-theme-id")),
      labels: [...g.querySelectorAll("[data-theme-id]")].map((b) =>
        b.textContent.replace(/\s+/g, " ").trim()
      )
    }));
    const ids = [...document.querySelectorAll(".theme-option[data-theme-id]")].map((b) =>
      b.getAttribute("data-theme-id")
    );
    return {
      groupCount: groups.length,
      groups,
      optionCount: ids.length,
      unique: new Set(ids).size,
      ids,
      scsCount: window.SCSTheme ? Object.keys(window.SCSTheme.THEMES).length : 0,
      neuralLabel: window.SCSTheme?.THEMES?.["neural-future"]?.name || null
    };
  });
  results.checks.picker = picker;
  results.checks.pickerFiveBySix = picker.groupCount === 5 && picker.groups.every((g) => g.ids.length === 6);
  results.checks.pickerCount30 = picker.optionCount === 30 && picker.unique === 30;
  results.checks.scsThemeCount30 = picker.scsCount === 30;
  results.checks.neuralFutureLabel = picker.neuralLabel;

  for (const id of ALL_IDS) {
    const o = await measureOverflow(page, id);
    results.overflow.push({ viewport: 1440, theme: id, ...o });
  }

  // Arcade typography metrics
  await page.evaluate(() => window.SCSTheme.setPreference("arcade-1995"));
  await page.waitForTimeout(80);
  results.arcade = await page.evaluate(() => {
    const h1 = document.querySelector(".hero.hero-home h1") || document.querySelector("h1");
    const brand = document.querySelector(".hero-home .hero-brand") || document.querySelector(".hero-brand");
    const cs = h1 ? getComputedStyle(h1) : null;
    const rect = h1 ? h1.getBoundingClientRect() : null;
    return {
      applied: document.documentElement.getAttribute("data-theme"),
      h1Font: cs?.fontFamily || null,
      h1Size: cs?.fontSize || null,
      h1Width: rect ? Math.round(rect.width) : null,
      viewport: window.innerWidth,
      clipped: rect ? rect.right > window.innerWidth + 1 || rect.left < -1 : null,
      brandSize: brand ? getComputedStyle(brand).fontSize : null
    };
  });

  // Picker viewport containment
  await page.locator(".theme-picker-toggle").click();
  await page.waitForTimeout(80);
  results.pickerViewport.desktop = await page.evaluate(() => {
    const panel = document.querySelector(".theme-picker-panel");
    const r = panel.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      left: Math.round(r.left),
      right: Math.round(r.right),
      vh: window.innerHeight,
      vw: window.innerWidth,
      inViewport:
        r.top >= 0 &&
        r.left >= 0 &&
        r.right <= window.innerWidth + 1 &&
        r.bottom <= window.innerHeight + 1
    };
  });
  await page.screenshot({
    path: path.join(OUT_DIR, "desktop-theme-picker-open.png"),
    fullPage: false
  });
  results.screenshots.push("desktop-theme-picker-open.png");
  await page.close();
}

// Mobile overflow + picker
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
  for (const id of ["arcade-1995", "pixel-neon", "neo-brutalist", "y2k-webcore", "midnight-tech"]) {
    const o = await measureOverflow(page, id);
    results.overflow.push({ viewport: 390, theme: id, ...o });
  }
  await page.evaluate(() => window.SCSTheme.setPreference("arcade-1995"));
  await page.waitForTimeout(80);
  await page.screenshot({
    path: path.join(OUT_DIR, "mobile-arcade-1995-hero.png"),
    fullPage: false
  });
  results.screenshots.push("mobile-arcade-1995-hero.png");
  await page.locator(".theme-picker-toggle").click();
  await page.waitForTimeout(80);
  results.pickerViewport.mobile = await page.evaluate(() => {
    const panel = document.querySelector(".theme-picker-panel");
    const r = panel.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      left: Math.round(r.left),
      right: Math.round(r.right),
      vh: window.innerHeight,
      vw: window.innerWidth,
      inViewport:
        r.top >= 0 &&
        r.left >= -1 &&
        r.right <= window.innerWidth + 1 &&
        r.bottom <= window.innerHeight + 1
    };
  });
  await page.screenshot({
    path: path.join(OUT_DIR, "mobile-theme-picker-open.png"),
    fullPage: false
  });
  results.screenshots.push("mobile-theme-picker-open.png");
  await page.close();
}

// Screenshots for key themes
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const shotThemes = [
    "arcade-1995",
    "swiss-precision",
    "liquid-chrome",
    "y2k-webcore",
    "solarpunk",
    "neo-brutalist",
    "tokyo-neon",
    "neural-future"
  ];
  for (const id of shotThemes) {
    await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
    await page.evaluate((tid) => {
      localStorage.setItem("scs-theme-preference", tid);
      if (window.SCSTheme) window.SCSTheme.setPreference(tid);
    }, id);
    await page.waitForTimeout(120);
    const name = `desktop-${id}.png`;
    await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: false });
    results.screenshots.push(name);
  }
  await page.close();
}

// Axe: sample + new themes at 1440
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const theme of [...new Set([...AXE_SAMPLE, ...NEW_IDS])]) {
    await page.addInitScript((id) => {
      try {
        localStorage.setItem("scs-theme-preference", id);
      } catch (_) {}
    }, theme);
    await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
    await page.addScriptTag({ url: `${base}/__qa__/axe.min.js` });
    await page.evaluate((id) => {
      if (window.SCSTheme) window.SCSTheme.setPreference(id);
      document.documentElement.classList.remove("hm-reveal-on");
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        el.classList.add("is-visible");
        el.style.setProperty("opacity", "1");
        el.style.setProperty("transform", "none");
      });
    }, theme);
    await page.waitForTimeout(40);
    const axeResult = await page.evaluate(async () => {
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
          nodes: v.nodes.length
        }))
      };
    });
    results.axe.push({ theme, ...axeResult });
  }
  await page.close();
}

await browser.close();
server.close();

// Build public — studio exclusion
const build = spawnSync("node", ["scripts/build-public.mjs"], {
  cwd: ROOT,
  encoding: "utf8",
  timeout: 120000
});
results.build.exitCode = build.status;
results.build.stdoutTail = (build.stdout || "").split("\n").slice(-20).join("\n");
results.build.stderrTail = (build.stderr || "").split("\n").slice(-20).join("\n");
const distHasStudio =
  fs.existsSync(path.join(ROOT, "dist", "transformation-studio")) ||
  fs.existsSync(path.join(ROOT, "dist", "transformation-studio", "index.html"));
results.build.studioExcluded = !distHasStudio;

const overflowFails = results.overflow.filter((o) => o.overflow);
const axeFails = results.axe.filter((a) => a.violations.length > 0);
results.summary = {
  themeCountOk:
    results.checks.themeJsCount === 30 &&
    results.checks.themeJsUnique === 30 &&
    results.checks.pickerCount30 &&
    results.checks.scsThemeCount30 &&
    results.checks.pickerFiveBySix,
  overflowOk: overflowFails.length === 0,
  overflowFailCount: overflowFails.length,
  arcadeNotClipped: results.arcade.clipped === false,
  pickerInViewport:
    results.pickerViewport.desktop?.inViewport === true &&
    results.pickerViewport.mobile?.inViewport === true,
  axeViolationThemes: axeFails.length,
  axeTotalViolations: axeFails.reduce((n, a) => n + a.violations.length, 0),
  studioExcluded: results.build.studioExcluded,
  buildOk: results.build.exitCode === 0
};

fs.writeFileSync(RESULTS, JSON.stringify(results, null, 2));

const invLines = [
  "# Theme Engine 30 — Inventory (2026-11-23)",
  "",
  "Exactly **30** themes · **5** categories × **6** each.",
  "",
  "## 1. Professional Dark",
  ...EXPECTED["professional-dark"].map(([id, name]) => `- \`${id}\` — ${name}`),
  "",
  "## 2. Professional Light",
  ...EXPECTED["professional-light"].map(([id, name]) => `- \`${id}\` — ${name}`),
  "",
  "## 3. Futuristic",
  ...EXPECTED.futuristic.map(([id, name]) => `- \`${id}\` — ${name}`),
  "",
  "## 4. Retro & Arcade",
  ...EXPECTED.retro.map(([id, name]) => `- \`${id}\` — ${name}`),
  "",
  "## 5. Creative & Experimental",
  ...EXPECTED.creative.map(([id, name]) => `- \`${id}\` — ${name}`),
  "",
  "## Notes",
  "- Existing IDs preserved (16).",
  "- New IDs added (14): " + NEW_IDS.join(", "),
  "- `neural-future` ID preserved; display label **Neutral Future**.",
  "- Math note: brief said “add 18”; codebase had 16 → +14 = 30.",
  ""
];
fs.writeFileSync(INVENTORY, invLines.join("\n"));

const report = [
  "# Theme Engine 30 — QA Report (2026-11-23)",
  "",
  "## Verdict",
  results.summary.themeCountOk &&
  results.summary.overflowOk &&
  results.summary.arcadeNotClipped &&
  results.summary.pickerInViewport &&
  results.summary.studioExcluded &&
  results.summary.buildOk &&
  results.summary.axeViolationThemes === 0
    ? "**PASS** — 30-theme engine ready for Owner/Atlas review (local only; no commit)."
    : "**REVIEW** — see failures below.",
  "",
  "## Scores / checks",
  `- Theme inventory 5×6 / 30 unique: **${results.summary.themeCountOk ? "PASS" : "FAIL"}**`,
  `- Horizontal overflow (desktop all 30 + mobile sample): **${results.summary.overflowOk ? "PASS" : "FAIL"}** (${results.summary.overflowFailCount} fails)`,
  `- Arcade 1995 hero not clipped: **${results.summary.arcadeNotClipped ? "PASS" : "FAIL"}** (font-size ${results.arcade.h1Size})`,
  `- Theme picker in viewport (desktop+mobile): **${results.summary.pickerInViewport ? "PASS" : "FAIL"}**`,
  `- axe WCAG 2 A/AA (sample + 14 new themes @1440, main scope): **${results.summary.axeViolationThemes === 0 ? "PASS" : "FAIL"}** (${results.summary.axeTotalViolations} violation groups across ${results.summary.axeViolationThemes} themes)`,
  `- build-public + studio excluded from dist: **${results.summary.buildOk && results.summary.studioExcluded ? "PASS" : "FAIL"}**`,
  "",
  "## Arcade 1995 fix",
  "Reduced Press Start 2P hero clamp to `clamp(0.72rem, 0.55rem + 1.35vw, 1.15rem)`, added `overflow-wrap: anywhere` / `word-break: break-word`, tightened brand/tagline scales in `themes.css` + matching `styles.css` overrides.",
  "",
  "## Screenshots",
  `Folder: \`qa-m6b/screenshots-themes-30-20261123/\``,
  ...results.screenshots.map((s) => `- ${s}`),
  "",
  "## Conflicts with other agent",
  "This pass touched only theme system files + theme-picker markup in HTML + Arcade type overrides in `styles.css`. Did **not** modify Connected Systems / Solutions Explorer / `hero-systems.*` / `workflow-demos.*` / Solutions mega-menu CSS/JS. If agent eb893682 edited the same HTML headers for nav, reconcile theme-picker blocks carefully.",
  "",
  "## No-commit confirmation",
  "No git commit, push, Netlify deploy, or backend/Factory changes performed.",
  "",
  "## Artifacts",
  `- \`${path.basename(INVENTORY)}\``,
  `- \`${path.basename(RESULTS)}\``,
  `- \`${path.basename(REPORT)}\``,
  ""
];
fs.writeFileSync(REPORT, report.join("\n"));

console.log(JSON.stringify(results.summary, null, 2));
console.log("Wrote", REPORT);
process.exit(
  results.summary.themeCountOk &&
    results.summary.overflowOk &&
    results.summary.arcadeNotClipped &&
    results.summary.studioExcluded
    ? 0
    : 1
);
