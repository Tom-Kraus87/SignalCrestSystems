import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "screenshots");
fs.mkdirSync(OUT, { recursive: true });

// Prefer local playwright, then qa-m5b
let chromiumLauncher = chromium;
try {
  createRequire(import.meta.url).resolve("playwright");
} catch {
  const require = createRequire(path.join(ROOT, "qa-m5b", "package.json"));
  chromiumLauncher = require("playwright").chromium;
}

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
const browser = await chromiumLauncher.launch({ headless: true });

const shots = [
  { name: "after-work-desktop-1440", width: 1440, height: 900, path: "/work.html", scroll: "#concept-demos" },
  { name: "after-work-mobile-390", width: 390, height: 844, path: "/work.html", scroll: "#concept-demos" },
  { name: "after-packages-demos-1440", width: 1440, height: 900, path: "/packages.html", scroll: "#websites" },
  { name: "after-work-demo-open-1440", width: 1440, height: 900, path: "/work.html", openDemo: "starter" },
  { name: "after-case-studies-desktop-1440", width: 1440, height: 900, path: "/case-studies.html" },
  { name: "after-homepage-desktop-1440", width: 1440, height: 900, path: "/index.html" },
  { name: "s1-showroom-home-1440", width: 1440, height: 900, path: "/showroom.html" },
  { name: "s1-showroom-home-1024", width: 1024, height: 800, path: "/showroom.html" },
  { name: "s1-showroom-home-768", width: 768, height: 1024, path: "/showroom.html" },
  { name: "s1-showroom-home-390", width: 390, height: 844, path: "/showroom.html" },
  { name: "s1-showroom-home-320", width: 320, height: 720, path: "/showroom.html" },
  { name: "s1-showroom-ecommerce-1440", width: 1440, height: 900, path: "/showroom.html#demo-ecommerce" },
  { name: "s1-showroom-ecommerce-390", width: 390, height: 844, path: "/showroom.html#demo-ecommerce" },
  {
    name: "s1-showroom-home-flow-1440",
    width: 1440,
    height: 900,
    path: "/showroom.html",
    homeFlow: true,
  },
  {
    name: "s1-showroom-ecom-cart-1440",
    width: 1440,
    height: 900,
    path: "/showroom.html#demo-ecommerce",
    ecomFlow: true,
  },
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

  if (shot.scroll) {
    await page.locator(shot.scroll).scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
  }
  if (shot.openDemo) {
    if (shot.path.includes("work")) {
      await page.locator("#concept-demos").scrollIntoViewIfNeeded();
    }
    await page.locator(`[data-demo="${shot.openDemo}"]`).first().click();
    await page.waitForSelector("#demoModal:not([hidden])");
    await page.waitForTimeout(250);
  }
  if (shot.path.includes("demo-ecommerce")) {
    await page.waitForSelector("#panel-ecommerce:not([hidden])");
  }
  if (shot.homeFlow) {
    await page.fill('#hs-inquiry input[name="name"]', "Alex Rivera");
    await page.fill('#hs-inquiry input[name="phone"]', "555-0100");
    await page.click('#hs-inquiry button[type="submit"]');
    await page.waitForTimeout(200);
    await page.click("#hs-advance");
    await page.waitForTimeout(150);
  }
  if (shot.ecomFlow) {
    await page.click("#ec-add");
    await page.waitForTimeout(150);
    await page.click("#ec-checkout");
    await page.waitForTimeout(150);
  }

  const file = path.join(OUT, `${shot.name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log("wrote", file);
  await ctx.close();
}

await browser.close();
server.close();
console.log("done");
