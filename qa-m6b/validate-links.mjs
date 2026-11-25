import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PAGES = [
  "index.html",
  "work.html",
  "showroom.html",
  "case-studies.html",
  "packages.html",
  "services.html",
  "about.html",
  "contact.html",
  "project-request.html",
  "privacy.html",
  "advisor.html",
  "ai-automation.html",
  "qa-process.html",
  "resources.html",
  "404.html",
];

const ASSET_CHECKS = [
  "assets/concept-preview-starter.png",
  "assets/concept-preview-professional.png",
  "assets/concept-preview-advanced.png",
  "assets/gallery-1.webp",
  "assets/gallery-2.webp",
  "assets/gallery-3.webp",
  "assets/gallery-4.webp",
  "assets/gallery-5.webp",
  "assets/gallery-6.webp",
  "script.js",
  "styles.css",
  "themes.css",
  "packages-pricing.css",
  "showroom.css",
  "showroom.js",
  "showroom/home-services.js",
  "showroom/ecommerce.js",
  "hero-systems.css",
  "hero-systems.js",
  "workflow-demos.js",
  "home.css",
  "home.js",
];

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
    res.end("missing");
    return;
  }
  res.writeHead(200, { "Content-Type": contentType(fp) });
  fs.createReadStream(fp).pipe(res);
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

async function fetchStatus(urlPath) {
  const res = await fetch(`${base}${urlPath}`);
  return res.status;
}

const report = {
  generatedAt: new Date().toISOString(),
  base,
  pages: [],
  assets: [],
  anchors: [],
  demoWiring: [],
  failures: [],
};

for (const page of PAGES) {
  const status = await fetchStatus(`/${page}`);
  const entry = { page, status, ok: status === 200 };
  report.pages.push(entry);
  if (!entry.ok) report.failures.push(`PAGE ${page} → ${status}`);
}

for (const asset of ASSET_CHECKS) {
  const status = await fetchStatus(`/${asset}`);
  const entry = { asset, status, ok: status === 200 };
  report.assets.push(entry);
  if (!entry.ok) report.failures.push(`ASSET ${asset} → ${status}`);
}

const htmlTargets = {
  "work.html": [
    'id="concept-demos"',
    "assets/concept-preview-starter.png",
    'data-demo="starter"',
    'id="tpl-starter"',
    'id="demoModal"',
    'href="showroom.html"',
  ],
  "packages.html": [
    'id="websites"',
    "assets/concept-preview-starter.png",
    'data-demo="starter"',
    'id="tpl-starter"',
    'id="demoModal"',
  ],
  "case-studies.html": ['href="work.html#concept-demos"', "case-studies-grid"],
  "index.html": [
    'class="hs-hero"',
    'id="hs-map"',
    'href="showroom.html"',
    'id="product-lab"',
    'id="showroom-preview"',
    "hero-systems.js",
    "home.js",
  ],
  "showroom.html": [
    'id="demo-home-services-root"',
    'id="demo-ecommerce-root"',
    "showroom/home-services.js",
    "showroom/ecommerce.js",
    "contact.html?service=custom-software",
  ],
};

for (const [file, needles] of Object.entries(htmlTargets)) {
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  for (const needle of needles) {
    const ok = html.includes(needle);
    report.anchors.push({ file, needle, ok });
    if (!ok) report.failures.push(`MARKUP ${file} missing ${needle}`);
  }
}

const workHtml = fs.readFileSync(path.join(ROOT, "work.html"), "utf8");
const packagesHtml = fs.readFileSync(path.join(ROOT, "packages.html"), "utf8");
const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const showroomHtml = fs.readFileSync(path.join(ROOT, "showroom.html"), "utf8");
const allowlist = fs.readFileSync(path.join(ROOT, "scripts/build-public.mjs"), "utf8");

report.demoWiring.push({
  check: "homepage_has_no_concept_demo_modal",
  ok: !indexHtml.includes('id="demoModal"') && !indexHtml.includes("concept-examples"),
});
report.demoWiring.push({
  check: "work_has_three_demo_buttons",
  ok: (workHtml.match(/data-demo="/g) || []).length >= 3,
});
report.demoWiring.push({
  check: "packages_has_three_demo_buttons",
  ok: (packagesHtml.match(/data-demo="(starter|business|modernization)"/g) || []).length >= 3,
});
report.demoWiring.push({
  check: "work_templates_present",
  ok: ["tpl-starter", "tpl-business", "tpl-modernization"].every((id) =>
    workHtml.includes(`id="${id}"`)
  ),
});
report.demoWiring.push({
  check: "packages_templates_present",
  ok: ["tpl-starter", "tpl-business", "tpl-modernization"].every((id) =>
    packagesHtml.includes(`id="${id}"`)
  ),
});
report.demoWiring.push({
  check: "showroom_has_both_demos",
  ok:
    showroomHtml.includes('data-demo-id="home-services"') &&
    showroomHtml.includes('data-demo-id="ecommerce"'),
});
report.demoWiring.push({
  check: "allowlist_includes_showroom",
  ok:
    allowlist.includes('"showroom.html"') &&
    allowlist.includes('"showroom/home-services.js"') &&
    allowlist.includes('"showroom/ecommerce.js"'),
});

for (const item of report.demoWiring) {
  if (!item.ok) report.failures.push(`WIRING ${item.check}`);
}

const outJson = path.join(__dirname, "link-validation-report.json");
const outMd = path.join(__dirname, "link-validation-report.md");
fs.writeFileSync(outJson, JSON.stringify(report, null, 2));

const md = [
  "# M6B Link Validation Report",
  "",
  `Generated: ${report.generatedAt}`,
  "",
  `Result: **${report.failures.length === 0 ? "PASS" : "FAIL"}** (${report.failures.length} failure(s))`,
  "",
  "## Pages",
  "",
  ...report.pages.map((p) => `- \`${p.page}\`: ${p.status}`),
  "",
  "## Assets",
  "",
  ...report.assets.map((a) => `- \`${a.asset}\`: ${a.status}`),
  "",
  "## Markup / anchors",
  "",
  ...report.anchors.map((a) => `- ${a.ok ? "OK" : "MISSING"} — \`${a.file}\` contains \`${a.needle}\``),
  "",
  "## Demo wiring",
  "",
  ...report.demoWiring.map((d) => `- ${d.ok ? "OK" : "FAIL"} — ${d.check}`),
  "",
  report.failures.length
    ? ["## Failures", "", ...report.failures.map((f) => `- ${f}`), ""].join("\n")
    : "## Failures\n\nNone.\n",
].join("\n");

fs.writeFileSync(outMd, md);
console.log(md);
server.close();
process.exit(report.failures.length ? 1 : 0);
