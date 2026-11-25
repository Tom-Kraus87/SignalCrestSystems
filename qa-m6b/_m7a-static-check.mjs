import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const themes = fs.readFileSync(path.join(ROOT, "themes.css"), "utf8");
const ids = [...themes.matchAll(/\[data-theme=["']([^"']+)["']\]/g)].map((m) => m[1]);
const uniq = [...new Set(ids)];
const m7a = JSON.parse(fs.readFileSync(path.join(ROOT, "qa-m6b/M7A-LOCAL-TEST-RESULTS-20261123.json"), "utf8"));
console.log(
  JSON.stringify(
    {
      themeCount: uniq.length,
      studioExcluded: !fs.existsSync(path.join(ROOT, "dist/transformation-studio")),
      m7aScores: m7a.scores,
      formsBypassGone:
        !/data-netlify/.test(fs.readFileSync(path.join(ROOT, "project-request.html"), "utf8")) &&
        !/data-netlify/.test(fs.readFileSync(path.join(ROOT, "contact.html"), "utf8")),
    },
    null,
    2
  )
);
