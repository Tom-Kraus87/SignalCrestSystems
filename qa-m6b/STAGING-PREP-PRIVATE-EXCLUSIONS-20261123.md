# Staging Prep — Confirmed Private-Artifact Exclusions

**Date:** 2026-11-23  
**Policy:** Stone Harbor Transformation Studio remains in the **working tree** for private pilot review; it must **not** ship in the public/staging Netlify publish directory.

---

## Mechanisms

| Control | Status |
|---|---|
| Removed from `ALLOWED_FILES` in `scripts/build-public.mjs` | **Done** |
| Added `transformation-studio` to `FORBIDDEN_PREFIXES` | **Done** (fail closed if leaked) |
| Not present in `SEO_HTML_PAGES` / sitemap paths | **Confirmed** (never was) |
| Public Coming Soon deep-link removed from `index.html` | **Done** |
| `OWNER-REVIEW.md` not allowlisted; banner no longer hyperlinks a missing public file | **Done** |

---

## Dist verification (after `node scripts/build-public.mjs`)

| Check | Result |
|---|---|
| `dist/transformation-studio/` exists? | **No** |
| Any `transformation-studio` or `OWNER-REVIEW.md` string in `dist/*.html`? | **No** |
| File count | **59** files (allowlist + `robots.txt`; sitemap omitted without `SITE_ORIGIN`) |
| Local preview `GET /transformation-studio/` | **404** |
| Local preview `GET /transformation-studio/index.html` | **404** |
| Source tree `transformation-studio/` still present? | **Yes** (intact) |

---

## What remains private (source only)

- `transformation-studio/index.html` (+ CSS/JS/assets)
- `transformation-studio/OWNER-REVIEW.md`
- Sample Stone Harbor brand/config data

Local preview of the sandbox requires serving the **repo root**, not `dist/`.

---

## Staging implication

A Netlify deploy that runs `node scripts/build-public.mjs` and publishes `dist/` will **not** expose `/transformation-studio/` unless Atlas later re-allowlists it.
