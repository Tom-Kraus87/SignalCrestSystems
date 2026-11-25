/**
 * Static proof that this utility is outside the public allowlist and the
 * Netlify Functions bundle. Does not run the site build and does not modify
 * the allowlist.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const UTILITY_SEGMENT = "tools/option-c-admin";
const root = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function walk(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

export function checkPublicExclusion() {
  const reasons = [];
  const build = read("scripts/build-public.mjs");
  const toml = read("netlify.toml");
  if (build.includes("option-c-admin") || build.includes("tools/option-c")) {
    reasons.push("build-allowlist-mentions-utility");
  }
  if (!/functions\s*=\s*"netlify\/functions"/.test(toml)) {
    reasons.push("netlify-functions-dir-unexpected");
  }
  if (toml.includes("option-c-admin")) reasons.push("netlify-toml-mentions-utility");
  const allowlistBlock = build.slice(build.indexOf("const ALLOWED_FILES"), build.indexOf("const SEO_HTML_PAGES"));
  if (allowlistBlock.includes("tools/") || allowlistBlock.includes("option-c") || allowlistBlock.includes("netlify/functions")) {
    reasons.push("allowlist-contains-utility-or-functions");
  }
  const functionRoot = path.join(root, "netlify", "functions");
  const functionFiles = walk(functionRoot, []);
  for (const file of functionFiles) {
    const rel = path.relative(root, file).split(path.sep).join("/");
    if (rel.startsWith("netlify/functions/node_modules")) continue;
    if (rel.includes("option-c-admin")) reasons.push("function-tree-contains-utility");
    const text = fs.readFileSync(file, "utf8");
    if (text.includes("option-c-admin") || text.includes("tools/option-c-admin")) {
      reasons.push(`function-source-imports-utility:${rel}`);
    }
  }
  const inventory = JSON.parse(read("qa-m6b/M7B-G2-R4-SUCCESSOR-HASH-INVENTORY-20261124.json"));
  if (inventory.some((entry) => String(entry.Path).replace(/\\/g, "/").includes("option-c-admin"))) {
    reasons.push("frozen-inventory-contains-utility");
  }
  const utilityRoot = path.join(root, "tools", "option-c-admin");
  const utilityRel = path.relative(root, utilityRoot).split(path.sep).join("/");
  if (utilityRel !== UTILITY_SEGMENT) reasons.push("utility-path-unexpected");
  if (utilityRel.startsWith("netlify/functions") || utilityRel.startsWith("dist")) {
    reasons.push("utility-inside-publish-or-functions");
  }
  const dist = path.join(root, "dist");
  if (fs.existsSync(dist)) {
    const published = walk(dist, []);
    for (const file of published) {
      const rel = path.relative(dist, file).split(path.sep).join("/");
      if (rel.includes("option-c-admin")) reasons.push("dist-contains-utility");
    }
  }
  return {
    ok: reasons.length === 0,
    utilityPath: utilityRel,
    functionDirectory: "netlify/functions",
    allowlistMentionsUtility: false,
    reasons,
  };
}
