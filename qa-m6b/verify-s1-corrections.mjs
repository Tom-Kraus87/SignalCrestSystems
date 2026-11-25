import http from "http";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const root = process.cwd();
const dist = path.join(root, "dist");
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
const port = server.address().port;
const base = "http://127.0.0.1:" + port;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const cspErrors = [];
page.on("console", (msg) => {
  const t = msg.text();
  if (/Content Security Policy|Applying inline style|violates/i.test(t)) cspErrors.push(t);
});

const results = [];

const ecSrc = fs.readFileSync(path.join(dist, "showroom/ecommerce.js"), "utf8");
results.push({ check: "no-inline-style-ecommerce", pass: !/style\s*=/.test(ecSrc) });

const css = fs.readFileSync(path.join(dist, "showroom.css"), "utf8");
results.push({ check: "steps-5-cols", pass: /grid-template-columns:\s*repeat\(5/.test(css) });
results.push({
  check: "product-grid-margin-class",
  pass: /\.sh-product-grid[\s\S]*?margin-top:\s*0\.85rem/.test(css)
});
results.push({
  check: "checkout-actions-class",
  pass: /\.sh-checkout-actions[\s\S]*?margin-top:\s*0\.85rem/.test(css)
});

const html = fs.readFileSync(path.join(dist, "showroom.html"), "utf8");
results.push({
  check: "demo-roots-no-aria-live",
  pass: !/demo-(home-services|ecommerce)-root"[^>]*aria-live/.test(html)
});

await page.goto(base + "/showroom.html", { waitUntil: "networkidle" });

await page.fill('#demo-home-services-root input[name="name"]', "Ada Test");
await page.fill('#demo-home-services-root input[name="phone"]', "555-0100");
await page.selectOption('#demo-home-services-root select[name="service"]', "hvac");
await page.click("#hs-submit");
await page.waitForTimeout(50);
let active = await page.evaluate(() => (document.activeElement && document.activeElement.id) || "");
results.push({ check: "hs-focus-after-submit", pass: active === "hs-advance", active });

await page.click("#hs-advance");
await page.waitForTimeout(50);
active = await page.evaluate(() => (document.activeElement && document.activeElement.id) || "");
results.push({ check: "hs-focus-after-advance", pass: active === "hs-advance", active });

for (let i = 0; i < 3; i++) {
  await page.click("#hs-advance");
  await page.waitForTimeout(30);
}
active = await page.evaluate(() => (document.activeElement && document.activeElement.id) || "");
results.push({ check: "hs-focus-after-final-advance", pass: active === "hs-send-followup", active });

await page.click("#hs-send-followup");
await page.waitForTimeout(50);
active = await page.evaluate(() => (document.activeElement && document.activeElement.id) || "");
results.push({
  check: "hs-focus-after-send",
  pass: active === "hs-send-followup" || active === "hs-live-status",
  active
});

const hsLive = await page.getAttribute("#hs-live-status", "aria-live");
results.push({ check: "hs-live-region", pass: hsLive === "polite" });

const stepsCount = await page.locator(".sh-steps .sh-step").count();
const stepsCols = await page.evaluate(() =>
  getComputedStyle(document.querySelector(".sh-steps")).gridTemplateColumns.split(" ").length
);
results.push({ check: "hs-steps-5-items", pass: stepsCount === 5, stepsCount });
results.push({ check: "hs-steps-5-columns-desktop", pass: stepsCols === 5, stepsCols });

await page.click("#tab-ecommerce");
await page.waitForTimeout(80);
await page.click("#ec-add");
await page.waitForTimeout(50);
active = await page.evaluate(() => (document.activeElement && document.activeElement.id) || "");
results.push({ check: "ec-focus-after-add", pass: active === "ec-checkout", active });

await page.click("#ec-checkout");
await page.waitForTimeout(50);
active = await page.evaluate(() => (document.activeElement && document.activeElement.id) || "");
results.push({ check: "ec-focus-after-checkout", pass: active === "ec-confirm", active });

await page.click("#ec-confirm");
await page.waitForTimeout(50);
active = await page.evaluate(() => (document.activeElement && document.activeElement.id) || "");
results.push({ check: "ec-focus-after-confirm", pass: active === "ec-reset", active });

const ecLive = await page.getAttribute("#ec-live-status", "aria-live");
results.push({ check: "ec-live-region", pass: ecLive === "polite" });

const inlineCount = await page.evaluate(
  () => document.querySelectorAll("#demo-ecommerce-root [style]").length
);
results.push({ check: "ec-dom-no-inline-style", pass: inlineCount === 0, inlineCount });

results.push({ check: "no-csp-console-errors", pass: cspErrors.length === 0, cspErrors });

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({ pass: failed.length === 0, results, failed }, null, 2));

await browser.close();
server.close();
process.exit(failed.length ? 1 : 0);
