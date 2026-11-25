# Test Results — Workflow Expansion + Solutions Explorer

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot` @ `c2c2d8d`  
**Dist:** `node scripts/build-public.mjs` → **60 files**, `workflow-demos.js` included, studio excluded

---

## Summary scores

| Suite | Command | Result |
|---|---|---|
| Allowlist build | `node scripts/build-public.mjs` | **PASS** — 60 files |
| Link validation | `node qa-m6b/validate-links.mjs` | **PASS** — 0 failures |
| Integrated smoke | `node qa-m6b/verify-sc20-integrated.mjs` | **36/36 PASS** |
| axe-core | `node qa-m6b/verify-sc20-axe.mjs` | **32/32 PASS** |
| Polish functional | `node qa-m6b/verify-polish-functional.mjs` | **14/14 PASS** (WebKit OK) |
| Workflow + Solutions nav | `node qa-m6b/verify-workflows-nav-20261123.mjs` | **21/21 PASS** |
| Studio / Factory exclusion | Inventory + harness | **PASS** |

Artifacts: `link-validation-report.md`, `sc20-integrated-results.json`, `sc20-axe-results.json`, `sc20-polish-functional-results.json`, `workflows-nav-results-20261123.json`, `studio-exclusion-20261123.json`.

---

## Exclusion checks

| Check | Result |
|---|---|
| No `dist/transformation-studio` | PASS |
| No `transformation-studio` string in dist HTML | PASS |
| No Factory / Fiverr / Growth Engine in dist | PASS |
| `workflow-demos.js` in dist | PASS |

---

## Environment notes

- Dist directory `EBUSY` on Windows/OneDrive mitigated by empty-in-place fallback in `build-public.mjs`.
- Playwright WebKit ≠ real iOS Safari (documented).
