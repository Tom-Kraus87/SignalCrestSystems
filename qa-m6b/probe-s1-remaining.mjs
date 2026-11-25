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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base + "/showroom.html", { waitUntil: "networkidle" });

const themes = await page.$$eval(".theme-option[data-theme-id]", (btns) =>
  btns.map((b) => b.getAttribute("data-theme-id")).filter(Boolean)
);

const rows = [];
for (const t of themes) {
  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
  }, t);
  await page.waitForTimeout(30);

  const m = await page.evaluate(async () => {
    function parse(c) {
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?/);
      if (!m) return null;
      return {
        r: +m[1],
        g: +m[2],
        b: +m[3],
        a: m[4] == null ? 1 : +m[4]
      };
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
      let cur = el;
      let acc = { r: 255, g: 255, b: 255, a: 1 };
      const stack = [];
      while (cur && cur !== document.documentElement) {
        const bg = parse(getComputedStyle(cur).backgroundColor);
        if (bg && bg.a > 0) stack.unshift(bg);
        cur = cur.parentElement;
      }
      const rootBg = parse(getComputedStyle(document.body).backgroundColor) || {
        r: 255,
        g: 255,
        b: 255,
        a: 1
      };
      acc = { ...rootBg, a: 1 };
      for (const layer of stack) {
        acc = composite(layer, acc);
      }
      return acc;
    }

    const tab = document.querySelector(".showroom-demo-tab.is-active");
    const parts = {
      label: tab.querySelector(".showroom-demo-tab-label"),
      kicker: tab.querySelector(".showroom-demo-tab-kicker"),
      desc: tab.querySelector(".showroom-demo-tab-desc")
    };
    const bg = effectiveBg(tab);
    const out = {};
    for (const [k, el] of Object.entries(parts)) {
      const fg = parse(getComputedStyle(el).color);
      out[k] = { ratio: +ratio(fg, bg).toFixed(2), fg, bg };
    }
    const link = document.querySelector('.showroom-rail-meta a[href*="work"]');
    const linkBg = effectiveBg(link);
    const linkFg = parse(getComputedStyle(link).color);
    out.link = {
      deco: getComputedStyle(link).textDecorationLine,
      ratio: +ratio(linkFg, linkBg).toFixed(2)
    };
    out.eyebrow = document.querySelector(".page-hero .eyebrow")?.textContent?.trim() || "";
    return out;
  });

  rows.push({ theme: t, ...m });
}

const fails = rows.flatMap((r) =>
  ["label", "kicker", "desc"]
    .filter((k) => r[k].ratio < 4.5)
    .map((k) => ({ theme: r.theme, part: k, ratio: r[k].ratio }))
);

console.log(
  JSON.stringify(
    {
      themes: themes.length,
      failCount: fails.length,
      fails,
      link: rows[0].link,
      eyebrow: rows[0].eyebrow,
      mins: Object.fromEntries(
        ["label", "kicker", "desc"].map((k) => [
          k,
          Math.min(...rows.map((r) => r[k].ratio))
        ])
      )
    },
    null,
    2
  )
);

await browser.close();
server.close();
