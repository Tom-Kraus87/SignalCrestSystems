# Public V1 + Studio Pilot — Files Changed & Test Results

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot`  
**Commit status:** Uncommitted (by design). No push / no deploy.

---

## 1. Files changed (Stage 1 delta on top of staged SC 2.0 work)

### New

- `project-request.html` — project request form (Netlify Forms pattern)
- `privacy.html` — privacy page
- `transformation-studio/**` — Stone Harbor concept sandbox (HS Studio reuse + rebrand)
  - `index.html`, `studio.css`, `js/*.js`, `assets/logo-shield.png`, `OWNER-REVIEW.md`

### Modified (Stage 1 refinements)

- `index.html` — coming-soon section; CTAs → project-request; privacy footer
- `script.js` — supports `#project-request-form` + consent validation
- `home.css` — coming-soon poster styles
- `styles.css` — consent + prose helpers
- `scripts/build-public.mjs` — allowlist + SEO paths for privacy, project-request, studio
- Public HTML pages — nav CTA → `project-request.html`; privacy footer links
- `qa-m6b/verify-sc20-integrated.mjs`, `verify-polish-functional.mjs`, `validate-links.mjs` — CTA expectations updated for project-request

### Pre-existing on branch (staged SC 2.0 / showroom; carried forward)

- `hero-systems.*`, `home.js`, `showroom.*`, homepage modernization, etc.

---

## 2. Test results (2026-11-23 local)

| Check | Result |
|---|---|
| `node scripts/build-public.mjs` | **PASS** — 73 files to `dist/` including studio + new pages |
| `node qa-m6b/validate-links.mjs` | **PASS** — failures: none |
| `node qa-m6b/verify-sc20-integrated.mjs` | **PASS** — `failed: []` (CTA check updated to project-request) |
| `node qa-m6b/verify-sc20-axe.mjs` | **PASS** — 32/32 runs, 0 failures |
| `node qa-m6b/verify-polish-functional.mjs` | **PASS** — including WebKit hero + CTA |

---

## 3. Working local preview instructions

```bash
cd "C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC"
git checkout feature/public-v1-studio-pilot
node scripts/build-public.mjs

# Option A — any static server on dist/
npx --yes serve -l 5173 dist
# http://127.0.0.1:5173/
# http://127.0.0.1:5173/project-request.html
# http://127.0.0.1:5173/privacy.html
# http://127.0.0.1:5173/transformation-studio/

# Option B — source tree (studio works without build)
npx --yes serve -l 5174 .
# http://127.0.0.1:5174/transformation-studio/
```

**Notes**

- Netlify Forms POST only succeeds on a Netlify-hosted deploy; locally the UI validates and shows a fetch error fallback to email (expected).
- Studio is `noindex` and labeled concept; see `transformation-studio/OWNER-REVIEW.md` before sharing.
