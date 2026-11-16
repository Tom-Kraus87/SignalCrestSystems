#!/usr/bin/env node
/**
 * Allowlist-based public site builder.
 * Copies only approved website files into dist/ for Netlify publish.
 * Uses Node.js built-ins only. Cross-platform (Windows / Linux / macOS).
 *
 * Usage: node scripts/build-public.mjs
 */

import fs from "node:fs";
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
  // HTML pages (10)
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
  // CSS / JS
  "styles.css",
  "themes.css",
  "theme.js",
  "script.js",
  "ai-automation.css",
  "packages-pricing.css",
  // Images
  "assets/gallery-1.jpg",
  "assets/gallery-2.jpg",
  "assets/gallery-3.jpg",
  "assets/gallery-4.jpg",
  "assets/gallery-5.jpg",
  "assets/gallery-6.jpg",
  "assets/hero-machine-1280.webp",
  "assets/hero-machine-800.webp",
  "assets/logo-signalcrest.png",
  // Public PDFs
  "resources/pdfs/5-things-small-business-site.pdf",
  "resources/pdfs/pre-launch-qa-checklist.pdf",
  "resources/pdfs/website-leads-checklist.pdf",
  "resources/pdfs/website-modernization-roadmap.pdf",
];

const ALLOWED_EXTENSIONS = new Set([
  ".html",
  ".css",
  ".js",
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

/** Path prefixes that must never appear in dist (defense in depth). */
const FORBIDDEN_PREFIXES = [
  ".git",
  ".netlify",
  "deploy",
  "scripts",
  "node_modules",
  "site",
  "dist",
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

  const ext = path.extname(absLogical).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    fail(`Unapproved file extension for publish: ${relPosix} (${ext || "none"})`);
  }

  return absLogical;
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

function ensureCleanDist() {
  assertSafeDistLocation();

  if (fs.existsSync(DIST_LOGICAL)) {
    fs.rmSync(DIST_LOGICAL, { recursive: true, force: false });
  }
  fs.mkdirSync(DIST_LOGICAL, { recursive: false });

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
      const ext = path.extname(abs).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
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

  const expected = new Set(ALLOWED_FILES.map(toPosix));
  const actual = new Set(found);
  for (const f of expected) {
    if (!actual.has(f)) fail(`Missing from dist/ after build: ${f}`);
  }
  for (const f of actual) {
    if (!expected.has(f)) fail(`Unexpected file in dist/ (not on allowlist): ${f}`);
  }
  return found.sort();
}

function main() {
  console.log(`build-public: root=${ROOT_LOGICAL}`);
  console.log(`build-public: rootReal=${ROOT_REAL}`);
  console.log(`build-public: dist=${DIST_LOGICAL}`);
  console.log(`build-public: allowlist entries=${ALLOWED_FILES.length}`);

  ensureCleanDist();

  for (const rel of ALLOWED_FILES) {
    copyAllowlistedFile(toPosix(rel));
  }

  const inventory = assertDistSafe();
  console.log(`build-public: wrote ${inventory.length} files to dist/`);
  for (const f of inventory) {
    console.log(`  ${f}`);
  }
  console.log("build-public: ok");
}

main();
