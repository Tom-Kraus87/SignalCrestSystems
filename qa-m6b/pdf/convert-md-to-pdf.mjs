/**
 * Convert sibling Markdown sources under ../ into presentable PDFs in this folder.
 * Usage: node convert-md-to-pdf.mjs [file.md ...]
 * If no files given, converts the default M7A Owner/Atlas handoff set.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "..");
const OUT_DIR = __dirname;

const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const DEFAULT_BASENAMES = [
  "M7A-NETLIFY-PRO-VERIFIED-ACCOUNT-20261123.md",
  "M7A-OWNER-COST-ESTIMATE-REVISED-NETLIFY-PRO-20261123.md",
  "M7A-OWNER-RELEASE-READINESS-NETLIFY-PRO-ADDENDUM-20261123.md",
  "M7A-OWNER-RELEASE-READINESS-20261123.md",
  "M7A-OWNER-COST-ESTIMATE-PROVISIONING-MATRIX-20261123.md",
  "M7A-RELEASE-READINESS-20261123.md",
  "M7A-OWNER-AUTHORIZATION-IMPLEMENTATION-20261123.md",
  "M7A-IMPLEMENTATION-REPORT-20261123.md",
  "M7A-OWNER-LOCAL-TEST-RESULTS-20261123.md",
  "M7A-PRIVACY-POLICY-DECISION-MATRIX-20261123.md",
  "M7A-PROVISIONING-REQUIREMENTS-20261123.md",
  "M7A-OWNER-PROVISIONING-INSTRUCTIONS-20261123.md",
  "M7A-OWNER-THREAT-MODEL-20261123.md",
  "M7A-HOSTED-STAGING-VERIFICATION-PLAN-20261123.md",
  "M7A-LEGACY-BYPASS-ELIMINATION-EVIDENCE-20261123.md",
  "M7A-R1-IMPLEMENTATION-REPORT-20261123.md",
  "M7A-R1-CODEX-FINDING-RECONCILIATION-20261123.md",
  "M7A-R1-DATABASE-MIGRATION-PERMISSION-INVENTORY-20261123.md",
  "M7A-R1-LOCAL-TEST-EVIDENCE-20261123.md",
  "M7A-R1-HOSTED-STAGING-ACCEPTANCE-CHECKLIST-20261123.md",
  "M7A-R1-OWNER-RELEASE-READINESS-20261123.md",
  "M7A-R1-OWNER-COST-PROVISIONING-UPDATE-20261123.md",
];

const CSS = `
  @page { size: Letter; margin: 0.75in 0.7in 0.75in 0.7in; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: "Segoe UI", "Calibri", "Helvetica Neue", Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #1a1a1a;
    max-width: 100%;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: "Segoe UI Semibold", "Segoe UI", Calibri, sans-serif;
    line-height: 1.25;
    color: #0f172a;
    page-break-after: avoid;
    break-after: avoid;
  }
  h1 { font-size: 20pt; margin: 0 0 0.6em; border-bottom: 2px solid #1e3a5f; padding-bottom: 0.25em; }
  h2 { font-size: 14pt; margin: 1.2em 0 0.45em; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.15em; }
  h3 { font-size: 12pt; margin: 1em 0 0.35em; }
  h4 { font-size: 11pt; margin: 0.85em 0 0.3em; }
  p { margin: 0.45em 0; }
  ul, ol { margin: 0.4em 0 0.6em; padding-left: 1.4em; }
  li { margin: 0.2em 0; page-break-inside: avoid; }
  li > ul, li > ol { margin: 0.15em 0; }
  strong { font-weight: 600; }
  a { color: #1e3a5f; text-decoration: none; }
  code {
    font-family: "Cascadia Mono", "Consolas", "Courier New", monospace;
    font-size: 0.92em;
    background: #f1f5f9;
    padding: 0.08em 0.28em;
    border-radius: 3px;
  }
  pre {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 0.75em 0.9em;
    overflow-x: visible;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
    font-size: 8.5pt;
    line-height: 1.35;
    page-break-inside: auto;
    break-inside: auto;
  }
  pre code {
    background: none;
    padding: 0;
    white-space: inherit;
    overflow-wrap: inherit;
    word-break: inherit;
  }
  blockquote {
    margin: 0.6em 0;
    padding: 0.35em 0.8em;
    border-left: 3px solid #1e3a5f;
    background: #f8fafc;
    color: #334155;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.7em 0 1em;
    font-size: 9.5pt;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 0.35em 0.5em;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #e8eef5;
    font-weight: 600;
    color: #0f172a;
  }
  hr {
    border: none;
    border-top: 1px solid #cbd5e1;
    margin: 1.2em 0;
  }
  .doc-meta {
    font-size: 9pt;
    color: #64748b;
    margin-bottom: 1.2em;
  }
`;

function resolveChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  throw new Error("No Chrome/Edge executable found for headless PDF printing.");
}

function wrapHtml(title, bodyHtml, sourceName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${CSS}</style>
</head>
<body>
  <p class="doc-meta">Atlas upload copy · Source of truth: <code>${escapeHtml(sourceName)}</code></p>
  ${bodyHtml}
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function convertOne(browser, mdPath) {
  const abs = path.resolve(mdPath);
  const base = path.basename(abs, ".md");
  const outPath = path.join(OUT_DIR, `${base}.pdf`);
  const md = fs.readFileSync(abs, "utf8");
  const bodyHtml = await marked.parse(md, { gfm: true, breaks: false });
  const html = wrapHtml(base, bodyHtml, path.basename(abs));

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({
    path: outPath,
    format: "Letter",
    printBackground: true,
    margin: { top: "0.7in", right: "0.65in", bottom: "0.7in", left: "0.65in" },
    displayHeaderFooter: true,
    headerTemplate: `<div></div>`,
    footerTemplate: `
      <div style="font-size:8pt; color:#64748b; width:100%; padding:0 0.65in; display:flex; justify-content:space-between;">
        <span>${escapeHtml(base)}</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>`,
  });
  await page.close();
  return outPath;
}

async function main() {
  const args = process.argv.slice(2);
  const targets =
    args.length > 0
      ? args.map((a) => (path.isAbsolute(a) ? a : path.join(SRC_DIR, a)))
      : DEFAULT_BASENAMES.map((n) => path.join(SRC_DIR, n));

  for (const t of targets) {
    if (!fs.existsSync(t)) throw new Error(`Missing source: ${t}`);
  }

  const executablePath = resolveChrome();
  console.log(`Using browser: ${executablePath}`);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    for (const t of targets) {
      const out = await convertOne(browser, t);
      console.log(`OK ${out}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
