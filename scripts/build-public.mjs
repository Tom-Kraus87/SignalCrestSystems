#!/usr/bin/env node
/**
 * Allowlist-based public site builder.
 * Copies only approved website files into dist/ for Netlify publish.
 * Uses Node.js built-ins only. Cross-platform (Windows / Linux / macOS).
 *
 * Usage (local / origin-optional):
 *   node scripts/build-public.mjs
 *
 * Production-release mode (origin required — fail closed):
 *   set SCS_PRODUCTION_RELEASE=1
 *   set SITE_ORIGIN=https://signalcrestsystems.com
 *   node scripts/build-public.mjs
 *   — or —
 *   node scripts/build-public.mjs --production-release
 *   (with SITE_ORIGIN or site-origin.txt already configured)
 *
 * Do NOT rely on NODE_ENV=production for this safeguard; only
 * SCS_PRODUCTION_RELEASE=1|true or --production-release enable it.
 */

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Logical (non-dereferenced) repo root from this script's location. */
const ROOT_LOGICAL = path.resolve(__dirname, "..");

/** Canonical repo root — fails closed if ROOT cannot be resolved. */
let ROOT_REAL;
try {
  ROOT_REAL = fs.realpathSync(ROOT_LOGICAL);
} catch (err) {
  console.error(`build-public: cannot resolve real path for repository root: ${err.message}`);
  process.exit(1);
}

const DIST_LOGICAL = path.join(ROOT_LOGICAL, "dist");
const DIST_NAME = "dist";

/** Explicit file allowlist (relative to repo root, POSIX-style in source). */
const ALLOWED_FILES = [
  // HTML pages (10 public + branded 404)
  "index.html",
  "about.html",
  "ai-automation.html",
  "case-studies.html",
  "contact.html",
  "packages.html",
  "qa-process.html",
  "resources.html",
  "services.html",
  "work.html",
  "showroom.html",
  "project-request.html",
  "privacy.html",
  "advisor.html",
  "404.html",
  // Transformation Studio (Stone Harbor) stays in the working tree for private
  // local pilot review only — intentionally omitted from the public allowlist.
  // CSS / JS
  "styles.css",
  "themes.css",
  "theme.js",
  "theme-boot.js",
  "script.js",
  "hero-systems.css",
  "hero-systems.js",
  "workflow-demos.js",
  "home.css",
  "home.js",
  "ai-automation.css",
  "packages-pricing.css",
  "showroom.css",
  "showroom.js",
  "showroom/home-services.js",
  "showroom/ecommerce.js",
  "advisor.css",
  "advisor.js",
  "advisor-kb.json",
  // Netlify publish conventions (copied into dist/)
  "_headers",
  // Images
  "assets/gallery-1.webp",
  "assets/gallery-1-640.webp",
  "assets/gallery-2.webp",
  "assets/gallery-2-640.webp",
  "assets/gallery-3.webp",
  "assets/gallery-3-640.webp",
  "assets/gallery-4.webp",
  "assets/gallery-4-640.webp",
  "assets/gallery-5.webp",
  "assets/gallery-5-640.webp",
  "assets/gallery-6.webp",
  "assets/gallery-6-640.webp",
  "assets/hero-machine-1280.webp",
  "assets/hero-machine-800.webp",
  "assets/logo-shield.png",
  "assets/logo-banner.png",
  "assets/logo-mark.png",
  "assets/concept-preview-starter.png",
  "assets/concept-preview-professional.png",
  "assets/concept-preview-advanced.png",
  "assets/favicon.ico",
  "assets/favicon.png",
  "assets/apple-touch-icon.png",
  "assets/og-social.png",
  // Public PDFs
  "resources/pdfs/5-things-small-business-site.pdf",
  "resources/pdfs/pre-launch-qa-checklist.pdf",
  "resources/pdfs/website-leads-checklist.pdf",
  "resources/pdfs/website-modernization-roadmap.pdf",
];

/**
 * Public HTML pages eligible for absolute SEO URL injection + sitemap.
 * Paths are site-root absolute; origin is applied only when configured.
 * Do not hardcode a production host into HTML source templates.
 */
const SEO_HTML_PAGES = {
  "index.html": "/",
  "services.html": "/services.html",
  "packages.html": "/packages.html",
  "contact.html": "/contact.html",
  "ai-automation.html": "/ai-automation.html",
  "about.html": "/about.html",
  "work.html": "/work.html",
  "showroom.html": "/showroom.html",
  "case-studies.html": "/case-studies.html",
  "qa-process.html": "/qa-process.html",
  "resources.html": "/resources.html",
  "project-request.html": "/project-request.html",
  "privacy.html": "/privacy.html",
  "advisor.html": "/advisor.html",
};

const SITEMAP_PATHS = Object.values(SEO_HTML_PAGES);

/** Approved public social image path used for og:image / twitter:image when origin is set. */
const SEO_IMAGE_PATH = "/assets/og-social.png";

const ALLOWED_EXTENSIONS = new Set([
  ".html",
  ".css",
  ".js",
  ".json",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
  ".pdf",
  ".ico",
  ".txt",
  ".xml",
  ".woff",
  ".woff2",
]);

/** Filenames with no extension that are explicitly approved for publish. */
const ALLOWED_EXTENSIONLESS = new Set(["_headers"]);

/** Hosts that must never be treated as a real production origin. */
const PLACEHOLDER_ORIGIN_HOSTS = new Set([
  "example.com",
  "www.example.com",
  "example.org",
  "www.example.org",
  "example.net",
  "www.example.net",
]);

/** Path prefixes that must never appear in dist (defense in depth). */
const FORBIDDEN_PREFIXES = [
  ".git",
  ".netlify",
  "deploy",
  "scripts",
  "node_modules",
  "site",
  "dist",
  "transformation-studio",
  "Fiverr Account info",
  "SignalCrest Systems Growth Engine",
  "SignalCrest Systems pdf downloads",
];

const FORBIDDEN_BASENAMES = new Set([
  "netlify-init-output.txt",
  "netlify-api-data.json",
  "github-webhook.json",
  "pricing-preview.html",
  "pricing-preview.css",
  ".env",
  ".env.local",
]);

function fail(message) {
  console.error(`build-public: ${message}`);
  process.exit(1);
}

function toPosix(relPath) {
  return relPath.split(path.sep).join("/");
}

/**
 * Separator-safe containment: candidate must be root itself or a descendant.
 * Uses path.relative so drive-letter / UNC differences are rejected.
 */
function isInsideRoot(candidateAbs, rootAbs) {
  const rel = path.relative(rootAbs, candidateAbs);
  if (!rel) return true; // same path
  if (path.isAbsolute(rel)) return false;
  if (rel === "..") return false;
  if (rel.startsWith(`..${path.sep}`)) return false;
  return true;
}

/**
 * Walk every path component from ROOT_LOGICAL down to absPath with lstatSync.
 * Rejects any symlinked intermediate directory under the repo (even if the
 * symlink target remains inside the repository). Does not inspect ancestors
 * above the repository root (host/OneDrive mounts are out of scope).
 */
function assertNoSymlinkComponentsUnderRoot(absPath, label, options = {}) {
  const rejectLeafSymlink = options.rejectLeafSymlink !== false;
  const target = path.resolve(absPath);
  const root = path.resolve(ROOT_LOGICAL);

  if (!isInsideRoot(target, root) && target !== root) {
    fail(`${label}: path is outside repository root: ${target}`);
  }

  const parts = [];
  let cur = target;
  while (true) {
    parts.unshift(cur);
    if (cur === root) break;
    const parent = path.dirname(cur);
    if (parent === cur) {
      fail(`${label}: failed to walk path components up to repository root`);
    }
    cur = parent;
  }

  for (let i = 0; i < parts.length; i++) {
    const component = parts[i];
    // The repository root directory itself is allowed (its realpath was validated).
    if (component === root) continue;

    let st;
    try {
      st = fs.lstatSync(component);
    } catch (err) {
      fail(`${label}: cannot lstat path component "${component}": ${err.message}`);
    }
    const isLeaf = i === parts.length - 1;
    if (st.isSymbolicLink()) {
      if (!isLeaf || rejectLeafSymlink) {
        const rel = toPosix(path.relative(root, component)) || ".";
        fail(`${label}: refusing symlinked path component "${rel}"`);
      }
    }
  }
}

/**
 * Resolve a relative allowlist path under ROOT without leaving the repo
 * or traversing symlinked parents / files.
 */
function resolveSafeSource(relPosix) {
  if (!relPosix || path.isAbsolute(relPosix)) {
    fail(`Rejecting absolute or empty allowlist path: ${relPosix}`);
  }
  if (relPosix.includes("\0")) {
    fail(`Rejecting path with null byte: ${relPosix}`);
  }
  const normalized = path.normalize(relPosix);
  const posixNorm = toPosix(normalized);
  if (posixNorm === ".." || posixNorm.startsWith("../")) {
    fail(`Path traversal blocked: ${relPosix}`);
  }
  for (const prefix of FORBIDDEN_PREFIXES) {
    if (posixNorm === prefix || posixNorm.startsWith(`${prefix}/`)) {
      fail(`Forbidden prefix in allowlist entry: ${relPosix}`);
    }
  }
  const base = path.basename(posixNorm);
  if (FORBIDDEN_BASENAMES.has(base)) {
    fail(`Forbidden basename in allowlist entry: ${relPosix}`);
  }

  const absLogical = path.resolve(ROOT_LOGICAL, normalized);
  if (!isInsideRoot(absLogical, ROOT_LOGICAL)) {
    fail(`Resolved path escapes repository root: ${relPosix} -> ${absLogical}`);
  }

  let st;
  try {
    st = fs.lstatSync(absLogical);
  } catch {
    fail(`Allowlisted file missing: ${relPosix}`);
  }
  if (st.isSymbolicLink()) {
    fail(`Refusing symlink (unsafe for publish): ${relPosix}`);
  }
  if (!st.isFile()) {
    fail(`Allowlisted path is not a regular file: ${relPosix}`);
  }

  // Reject symlinked parents (inside or outside repo) and verify realpath containment.
  assertNoSymlinkComponentsUnderRoot(absLogical, `source ${relPosix}`, { rejectLeafSymlink: true });

  let real;
  try {
    real = fs.realpathSync(absLogical);
  } catch (err) {
    fail(`Cannot resolve real path for source ${relPosix}: ${err.message}`);
  }
  if (!isInsideRoot(real, ROOT_REAL)) {
    fail(`Source real path escapes repository root: ${relPosix} -> ${real}`);
  }

  if (!isAllowedPublishExtension(relPosix, absLogical)) {
    const ext = path.extname(absLogical).toLowerCase();
    fail(`Unapproved file extension for publish: ${relPosix} (${ext || "none"})`);
  }

  return absLogical;
}

function isAllowedPublishExtension(relPosix, absPath = relPosix) {
  const posix = toPosix(relPosix);
  if (ALLOWED_EXTENSIONLESS.has(posix) || ALLOWED_EXTENSIONLESS.has(path.basename(posix))) {
    return true;
  }
  const ext = path.extname(absPath).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

/**
 * Explicit production-release gate. Independent of NODE_ENV.
 * Enabled by SCS_PRODUCTION_RELEASE=1|true OR --production-release CLI arg.
 * When enabled, SITE_ORIGIN or a non-empty site-origin.txt is required.
 */
function isProductionReleaseMode() {
  const envFlag = (process.env.SCS_PRODUCTION_RELEASE || "").trim().toLowerCase();
  if (envFlag === "1" || envFlag === "true") return true;
  return process.argv.slice(2).includes("--production-release");
}

/**
 * Resolve optional absolute site origin for sitemap / robots Sitemap line.
 * Prefer SITE_ORIGIN env; fall back to gitignored site-origin.txt.
 * Returns null when unset (normal local builds still succeed; sitemap omitted).
 * Production-release mode fails closed when origin is missing — see main().
 */
function resolveSiteOrigin() {
  const fromEnv = (process.env.SITE_ORIGIN || "").trim();
  if (fromEnv) return validateSiteOrigin(fromEnv, "SITE_ORIGIN");

  const originFile = path.join(ROOT_LOGICAL, "site-origin.txt");
  if (!fs.existsSync(originFile)) return null;

  let st;
  try {
    st = fs.lstatSync(originFile);
  } catch (err) {
    fail(`Cannot stat site-origin.txt: ${err.message}`);
  }
  if (st.isSymbolicLink()) {
    fail("Refusing symlinked site-origin.txt");
  }
  if (!st.isFile()) {
    fail("site-origin.txt must be a regular file");
  }

  const raw = fs.readFileSync(originFile, "utf8");
  const line = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#"));
  if (!line) return null;
  return validateSiteOrigin(line, "site-origin.txt");
}

/**
 * True when the input authority includes an explicit :port.
 * Needed because URL.port is "" for scheme-default ports (e.g. https :443).
 */
function authorityHasExplicitPort(value) {
  const withoutScheme = value.replace(/^[A-Za-z][A-Za-z0-9+.-]*:\/\//, "");
  const authority = withoutScheme.split(/[/?#]/, 1)[0];
  const hostPart = authority.includes("@")
    ? authority.slice(authority.lastIndexOf("@") + 1)
    : authority;
  if (hostPart.startsWith("[")) {
    return /\]:\d+$/.test(hostPart);
  }
  return /:\d+$/.test(hostPart);
}

/**
 * Strip optional IPv6 brackets from a URL hostname for net.isIP checks.
 * Some Node/platform combinations keep brackets on url.hostname for [::1].
 */
function hostnameForIpCheck(hostname) {
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

/**
 * Strict origin validator for SEO absolute URLs / sitemap / robots.
 * Accepts only https://<hostname> with no userinfo, port, path, query, or hash.
 * Rejects localhost, bare IPs, placeholder example.* hosts, and FQDN trailing-dot hostnames.
 */
function validateSiteOrigin(value, sourceLabel) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${sourceLabel}: invalid URL "${value}"`);
  }
  if (url.protocol !== "https:") {
    fail(`${sourceLabel}: origin must use https (got ${url.protocol})`);
  }
  if (url.username || url.password) {
    fail(`${sourceLabel}: origin must not include username or password`);
  }
  if (url.port || authorityHasExplicitPort(value)) {
    const shown = url.port || "default-scheme-port";
    fail(`${sourceLabel}: origin must not include an explicit port (got :${shown})`);
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    fail(`${sourceLabel}: origin must be scheme + host only, no path/query/hash`);
  }
  if (value.endsWith("/")) {
    fail(`${sourceLabel}: origin must not end with a trailing slash`);
  }
  const host = url.hostname.toLowerCase();
  if (!host) {
    fail(`${sourceLabel}: origin hostname is empty`);
  }
  const hostUnbracketed = hostnameForIpCheck(host);
  // Reject FQDN-style trailing dots (e.g. https://www.example.com.).
  // URL.hostname preserves the final label terminator; do not normalize it away.
  if (host.endsWith(".") || hostUnbracketed.endsWith(".")) {
    fail(`${sourceLabel}: origin hostname must not end with a trailing dot (got "${hostUnbracketed}")`);
  }
  if (hostUnbracketed === "localhost" || hostUnbracketed.endsWith(".localhost")) {
    fail(`${sourceLabel}: refusing localhost origin "${hostUnbracketed}"`);
  }
  if (net.isIP(hostUnbracketed)) {
    fail(`${sourceLabel}: refusing bare IP address origin "${hostUnbracketed}"`);
  }
  if (PLACEHOLDER_ORIGIN_HOSTS.has(host) || PLACEHOLDER_ORIGIN_HOSTS.has(hostUnbracketed)) {
    fail(
      `${sourceLabel}: refusing placeholder host "${hostUnbracketed}". Set a real production origin or leave unset.`
    );
  }
  // Rebuild from protocol + hostname only (never echo userinfo/port/path).
  return `${url.protocol}//${hostUnbracketed}`;
}

function writeGeneratedFile(relPosix, contents) {
  const destAbs = path.resolve(DIST_LOGICAL, relPosix);
  if (!isInsideRoot(destAbs, DIST_LOGICAL) && destAbs !== DIST_LOGICAL) {
    fail(`Generated destination escapes dist/: ${relPosix}`);
  }
  if (!isAllowedPublishExtension(relPosix)) {
    fail(`Unapproved extension for generated file: ${relPosix}`);
  }
  const destDir = path.dirname(destAbs);
  fs.mkdirSync(destDir, { recursive: true });
  assertNoSymlinkComponentsUnderRoot(destDir, `destination dir for ${relPosix}`, {
    rejectLeafSymlink: true,
  });
  fs.writeFileSync(destAbs, contents, "utf8");
  const destStat = fs.lstatSync(destAbs);
  if (destStat.isSymbolicLink()) {
    fail(`Generated destination became a symlink: ${relPosix}`);
  }
}

function escAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function absolutePageUrl(siteOrigin, pagePath) {
  return pagePath === "/" ? `${siteOrigin}/` : `${siteOrigin}${pagePath}`;
}

/**
 * Remove only the four URL-dependent SEO tags (restricted patterns).
 * Does not touch titles, descriptions, or other metadata.
 */
function stripUrlDependentSeoTags(html) {
  return html
    .replace(/^[ \t]*<link\s+rel="canonical"\s+href="[^"]*"\s*>\s*\r?\n/gim, "")
    .replace(/^[ \t]*<meta\s+property="og:url"\s+content="[^"]*"\s*>\s*\r?\n/gim, "")
    .replace(/^[ \t]*<meta\s+property="og:image"\s+content="[^"]*"\s*>\s*\r?\n/gim, "")
    .replace(/^[ \t]*<meta\s+name="twitter:image"\s+content="[^"]*"\s*>\s*\r?\n/gim, "");
}

function hasUrlDependentSeoTags(html) {
  return (
    /rel="canonical"/i.test(html) ||
    /property="og:url"/i.test(html) ||
    /property="og:image"/i.test(html) ||
    /name="twitter:image"/i.test(html)
  );
}

/**
 * Inject absolute canonical / og:url / og:image / twitter:image after og:description.
 * Requires a single og:description meta and no pre-existing URL-dependent tags.
 */
function injectAbsoluteSeoUrls(html, pagePath, siteOrigin) {
  if (hasUrlDependentSeoTags(html)) {
    fail(`Refusing SEO URL injection: URL-dependent tags still present for path ${pagePath}`);
  }
  const pageUrl = absolutePageUrl(siteOrigin, pagePath);
  const imageUrl = `${siteOrigin}${SEO_IMAGE_PATH}`;
  const block = [
    `  <link rel="canonical" href="${escAttr(pageUrl)}">`,
    `  <meta property="og:url" content="${escAttr(pageUrl)}">`,
    `  <meta property="og:image" content="${escAttr(imageUrl)}">`,
    `  <meta name="twitter:image" content="${escAttr(imageUrl)}">`,
  ].join("\n");

  const descRe = /^([ \t]*<meta\s+property="og:description"\s+content="[^"]*"\s*>)\s*$/m;
  const match = html.match(descRe);
  if (!match) {
    fail(`Cannot inject SEO URLs: og:description meta not found for path ${pagePath}`);
  }
  const matches = html.match(new RegExp(descRe.source, "gm"));
  if (!matches || matches.length !== 1) {
    fail(`Cannot inject SEO URLs: expected exactly one og:description for path ${pagePath}`);
  }
  return html.replace(descRe, `${match[1]}\n${block}`);
}

/**
 * After copy: strip any accidental URL-dependent tags from HTML in dist/,
 * then inject absolute URLs for the 10 public pages when origin is configured.
 * 404.html is stripped only (no canonical; never inject absolute SEO URLs).
 */
function applyHtmlSeoUrls(siteOrigin) {
  for (const [relFile, pagePath] of Object.entries(SEO_HTML_PAGES)) {
    const destAbs = path.resolve(DIST_LOGICAL, relFile);
    if (!isInsideRoot(destAbs, DIST_LOGICAL)) {
      fail(`SEO HTML path escapes dist/: ${relFile}`);
    }
    let html = fs.readFileSync(destAbs, "utf8");
    html = stripUrlDependentSeoTags(html);
    if (siteOrigin) {
      html = injectAbsoluteSeoUrls(html, pagePath, siteOrigin);
      if (!html.includes(`rel="canonical" href="${escAttr(absolutePageUrl(siteOrigin, pagePath))}"`)) {
        fail(`SEO injection verification failed for ${relFile}`);
      }
    } else if (hasUrlDependentSeoTags(html)) {
      fail(`URL-dependent SEO tags remain in ${relFile} with origin unset`);
    }
    fs.writeFileSync(destAbs, html, "utf8");
  }

  const notFoundAbs = path.resolve(DIST_LOGICAL, "404.html");
  let notFoundHtml = fs.readFileSync(notFoundAbs, "utf8");
  notFoundHtml = stripUrlDependentSeoTags(notFoundHtml);
  if (hasUrlDependentSeoTags(notFoundHtml)) {
    fail("404.html still contains URL-dependent SEO tags after strip");
  }
  if (!/name="robots"\s+content="noindex"/i.test(notFoundHtml)) {
    fail('404.html must retain meta robots noindex');
  }
  fs.writeFileSync(notFoundAbs, notFoundHtml, "utf8");

  if (siteOrigin) {
    console.log(`build-public: absolute SEO URLs injected for ${Object.keys(SEO_HTML_PAGES).length} pages`);
  } else {
    console.log("build-public: URL-dependent SEO tags omitted (origin unset)");
  }
}

function generateSeoArtifacts(siteOrigin) {
  const robotsLines = ["User-agent: *", "Allow: /", ""];
  if (siteOrigin) {
    robotsLines.push(`Sitemap: ${siteOrigin}/sitemap.xml`, "");
  } else {
    robotsLines.push(
      "# Sitemap omitted until SITE_ORIGIN or site-origin.txt is configured.",
      ""
    );
  }
  writeGeneratedFile("robots.txt", robotsLines.join("\n"));

  const generated = ["robots.txt"];
  if (!siteOrigin) {
    console.log("build-public: SITE_ORIGIN unset — robots.txt written; sitemap.xml omitted");
    return generated;
  }

  // Omit lastmod so identical inputs produce byte-identical sitemap.xml.
  const urlEntries = SITEMAP_PATHS.map((p) => {
    const loc = p === "/" ? `${siteOrigin}/` : `${siteOrigin}${p}`;
    return `  <url>\n    <loc>${loc}</loc>\n  </url>`;
  }).join("\n");
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlEntries,
    "</urlset>",
    "",
  ].join("\n");
  writeGeneratedFile("sitemap.xml", sitemap);
  generated.push("sitemap.xml");
  console.log(`build-public: sitemap.xml written for origin ${siteOrigin}`);
  return generated;
}

/**
 * Validate the intended dist/ location before create/remove.
 * Rejects a symlinked dist/, and any symlinked parent of dist/.
 */
function assertSafeDistLocation() {
  const expectedLogical = path.join(ROOT_LOGICAL, DIST_NAME);
  if (path.resolve(DIST_LOGICAL) !== path.resolve(expectedLogical)) {
    fail(`dist/ path drift: expected ${expectedLogical}, got ${DIST_LOGICAL}`);
  }

  // dist/ must live directly under the real repository root.
  const distParent = path.dirname(DIST_LOGICAL);
  if (path.resolve(distParent) !== path.resolve(ROOT_LOGICAL)) {
    fail(`dist/ parent must be repository root (got ${distParent})`);
  }

  let parentReal;
  try {
    parentReal = fs.realpathSync(distParent);
  } catch (err) {
    fail(`Cannot resolve real path for dist parent: ${err.message}`);
  }
  if (parentReal !== ROOT_REAL) {
    fail(`dist parent real path must equal repository real root (got ${parentReal})`);
  }

  if (fs.existsSync(DIST_LOGICAL)) {
    let distStat;
    try {
      distStat = fs.lstatSync(DIST_LOGICAL);
    } catch (err) {
      fail(`Cannot stat dist/: ${err.message}`);
    }
    if (distStat.isSymbolicLink()) {
      fail("Refusing to use dist/ because it is a symlink");
    }
    // Existing dist directory components + realpath must stay inside root.
    assertNoSymlinkComponentsUnderRoot(DIST_LOGICAL, "dist/", { rejectLeafSymlink: true });
    let distReal;
    try {
      distReal = fs.realpathSync(DIST_LOGICAL);
    } catch (err) {
      fail(`Cannot resolve real path for dist/: ${err.message}`);
    }
    if (!isInsideRoot(distReal, ROOT_REAL)) {
      fail(`dist/ real path escapes repository root: ${distReal}`);
    }
  }
}

function emptyDirContents(dirAbs) {
  for (const name of fs.readdirSync(dirAbs)) {
    fs.rmSync(path.join(dirAbs, name), { recursive: true, force: true });
  }
}

function ensureCleanDist() {
  assertSafeDistLocation();

  if (fs.existsSync(DIST_LOGICAL)) {
    try {
      fs.rmSync(DIST_LOGICAL, { recursive: true, force: false });
    } catch (err) {
      // Windows/OneDrive can lock the dist directory handle even when contents
      // are deletable. Fall back to emptying in place, then recreate if needed.
      if (err && (err.code === "EBUSY" || err.code === "EPERM")) {
        emptyDirContents(DIST_LOGICAL);
      } else {
        throw err;
      }
    }
  }
  if (!fs.existsSync(DIST_LOGICAL)) {
    fs.mkdirSync(DIST_LOGICAL, { recursive: false });
  }

  // Re-validate after creation.
  assertNoSymlinkComponentsUnderRoot(DIST_LOGICAL, "dist/ (post-create)", { rejectLeafSymlink: true });
  const distReal = fs.realpathSync(DIST_LOGICAL);
  if (!isInsideRoot(distReal, ROOT_REAL)) {
    fail(`Newly created dist/ escapes repository root: ${distReal}`);
  }
}

function copyAllowlistedFile(relPosix) {
  const srcAbs = resolveSafeSource(relPosix);
  const destAbs = path.resolve(DIST_LOGICAL, relPosix);
  if (!isInsideRoot(destAbs, DIST_LOGICAL) && destAbs !== DIST_LOGICAL) {
    fail(`Destination escapes dist/: ${relPosix}`);
  }

  const destDir = path.dirname(destAbs);
  fs.mkdirSync(destDir, { recursive: true });

  // Destination parents under dist/ must not become symlinks.
  assertNoSymlinkComponentsUnderRoot(destDir, `destination dir for ${relPosix}`, {
    rejectLeafSymlink: true,
  });

  fs.copyFileSync(srcAbs, destAbs);

  let destStat;
  try {
    destStat = fs.lstatSync(destAbs);
  } catch (err) {
    fail(`Cannot stat copied file ${relPosix}: ${err.message}`);
  }
  if (destStat.isSymbolicLink()) {
    fail(`Copied destination became a symlink: ${relPosix}`);
  }

  const destReal = fs.realpathSync(destAbs);
  const distReal = fs.realpathSync(DIST_LOGICAL);
  if (!isInsideRoot(destReal, distReal)) {
    fail(`Copied file real path escapes dist/: ${relPosix} -> ${destReal}`);
  }
}

function assertDistSafe() {
  assertSafeDistLocation();
  const distReal = fs.realpathSync(DIST_LOGICAL);

  const stack = [DIST_LOGICAL];
  const found = [];
  while (stack.length) {
    const dir = stack.pop();
    assertNoSymlinkComponentsUnderRoot(dir, `dist walk ${toPosix(path.relative(DIST_LOGICAL, dir) || ".")}`, {
      rejectLeafSymlink: true,
    });
    for (const name of fs.readdirSync(dir)) {
      const abs = path.join(dir, name);
      const st = fs.lstatSync(abs);
      if (st.isSymbolicLink()) {
        fail(`Symlink found inside dist/ (forbidden): ${toPosix(path.relative(DIST_LOGICAL, abs))}`);
      }
      if (st.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (!st.isFile()) {
        fail(`Non-file entry in dist/: ${toPosix(path.relative(DIST_LOGICAL, abs))}`);
      }
      const real = fs.realpathSync(abs);
      if (!isInsideRoot(real, distReal)) {
        fail(`dist entry real path escapes dist/: ${toPosix(path.relative(DIST_LOGICAL, abs))} -> ${real}`);
      }
      const rel = toPosix(path.relative(DIST_LOGICAL, abs));
      found.push(rel);
      if (!isAllowedPublishExtension(rel, abs)) {
        fail(`Unapproved extension in dist/: ${rel}`);
      }
      for (const prefix of FORBIDDEN_PREFIXES) {
        if (rel === prefix || rel.startsWith(`${prefix}/`)) {
          fail(`Forbidden path leaked into dist/: ${rel}`);
        }
      }
      if (FORBIDDEN_BASENAMES.has(path.basename(rel))) {
        fail(`Forbidden file leaked into dist/: ${rel}`);
      }
    }
  }

  return found.sort();
}

function assertExpectedInventory(found, generatedFiles) {
  const expected = new Set([...ALLOWED_FILES.map(toPosix), ...generatedFiles.map(toPosix)]);
  const actual = new Set(found);
  for (const f of expected) {
    if (!actual.has(f)) fail(`Missing from dist/ after build: ${f}`);
  }
  for (const f of actual) {
    if (!expected.has(f)) fail(`Unexpected file in dist/ (not on allowlist): ${f}`);
  }
}

function main() {
  console.log(`build-public: root=${ROOT_LOGICAL}`);
  console.log(`build-public: rootReal=${ROOT_REAL}`);
  console.log(`build-public: dist=${DIST_LOGICAL}`);
  console.log(`build-public: allowlist entries=${ALLOWED_FILES.length}`);

  const productionRelease = isProductionReleaseMode();
  console.log(
    `build-public: productionRelease=${productionRelease ? "on" : "off"} (SCS_PRODUCTION_RELEASE / --production-release; not NODE_ENV)`
  );

  const siteOrigin = resolveSiteOrigin();
  if (productionRelease && !siteOrigin) {
    fail(
      "production-release mode requires SITE_ORIGIN or a non-empty site-origin.txt (fail closed)"
    );
  }
  if (siteOrigin) {
    console.log(`build-public: siteOrigin=${siteOrigin}`);
  } else {
    console.log("build-public: siteOrigin=(unset)");
  }

  ensureCleanDist();

  for (const rel of ALLOWED_FILES) {
    copyAllowlistedFile(toPosix(rel));
  }

  applyHtmlSeoUrls(siteOrigin);
  const generatedFiles = generateSeoArtifacts(siteOrigin);
  const inventory = assertDistSafe();
  assertExpectedInventory(inventory, generatedFiles);
  console.log(`build-public: wrote ${inventory.length} files to dist/`);
  for (const f of inventory) {
    console.log(`  ${f}`);
  }
  console.log("build-public: ok");
}

main();
