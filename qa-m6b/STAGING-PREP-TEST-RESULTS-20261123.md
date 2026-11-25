# Staging Prep — Test Results

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot` @ `c2c2d8d`  
**Dist build:** `node scripts/build-public.mjs` (production-release **off**, `SITE_ORIGIN` **unset**)

---

## Summary scores

| Suite | Command | Result |
|---|---|---|
| Allowlist build | `node scripts/build-public.mjs` | **PASS** — 59 files |
| Link validation | `node qa-m6b/validate-links.mjs` | **PASS** — 0 failures |
| Integrated smoke | `node qa-m6b/verify-sc20-integrated.mjs` | **36/36 PASS** |
| axe-core | `node qa-m6b/verify-sc20-axe.mjs` | **32/32 PASS** |
| Polish functional | `node qa-m6b/verify-polish-functional.mjs` | **14/14 PASS** (WebKit OK) |
| Dist artifact / studio exclusion | Manual inventory + HTTP smoke | **PASS** |

Artifacts: `qa-m6b/link-validation-report.md`, `sc20-integrated-results.json`, `sc20-axe-results.json`, `sc20-polish-functional-results.json`.

---

## Smoke expectations (CTAs)

Primary / nav / closing CTAs intentionally target **`project-request.html`**. Existing smoke scripts already assert this; **no expectation changes required**.

Secondary CTAs remain `showroom.html`.

---

## Deployment-artifact checks

| Check | Result |
|---|---|
| `dist/` inventory matches allowlist (+ robots) | Yes |
| No `transformation-studio` in dist | Yes |
| No business folders (Fiverr / Growth Engine / Factory) in dist | Yes |
| `_headers` present in dist | Yes |
| `project-request.html` + `privacy.html` in dist | Yes |
| Preview `/` and `/project-request.html` | 200 |
| Preview `/transformation-studio/` | 404 |

---

## Environment vs application failures

| Incident | Classification |
|---|---|
| `Start-Process npx` → “not a valid Win32 application” | **Shell lifecycle** — use `npx.cmd`, `cmd /c npx`, or `python -m http.server` |
| Local Forms POST may 200 without storage | **Environment + soft client `response.ok` trust** — not a Netlify Forms defect |
| Playwright WebKit ≠ real iOS Safari | **Coverage gap** (documented) |
| Sitemap omitted without `SITE_ORIGIN` | **Expected** for local non-production-release builds |

No production-blocking application test failures observed in this pass.

---

## Local preview URL (this session)

**`http://127.0.0.1:59166`** (python http.server on ephemeral port; PID recorded in session helpers).
