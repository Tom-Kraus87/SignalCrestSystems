# Workflow Expansion + Solutions Explorer — Changed-File Inventory

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot` @ `c2c2d8d`  
**Scope:** Local frontend/UI only — **no commit, push, or deploy**

---

## This-pass edits (Task A + B)

| Path | Change |
|---|---|
| `index.html` | Five-workflow showcase wrapping preserved Connected Systems hero map; honest labels |
| `workflow-demos.js` | **New** — tab switching + illustrative step progression (CSP-safe) |
| `hero-systems.css` | Workflow picker + demo-panel styles; reduced-motion respected |
| `hero-systems.js` | **Unchanged behavior** — original map/scenarios preserved |
| `styles.css` | Solutions Explorer mega-menu / mobile expandable styles |
| `script.js` | Explorer close button; active-link matching for explorer destinations |
| `scripts/build-public.mjs` | Allowlist `workflow-demos.js`; Windows EBUSY dist empty fallback |
| `ai-automation.html` | Added `id="process"` for explorer deep-link |
| All public `*.html` (14) | Replaced Solutions dropdown with Solutions Explorer |
| `qa-m6b/validate-links.mjs` | Asset check for `workflow-demos.js` |
| `qa-m6b/verify-polish-functional.mjs` | Scope WebKit CTA to `.hs-actions` (avoid workflow CTAs) |
| `qa-m6b/verify-workflows-nav-20261123.mjs` | **New** interaction + screenshot harness |

---

## Untracked (carry-forward)

- `privacy.html`, `project-request.html`
- `transformation-studio/**` (private pilot — **excluded from dist**)
- `workflow-demos.js` (new public asset)

---

## Secrets / Factory

| Check | Result |
|---|---|
| `.env` / credentials in delta | None |
| Factory B3–B7 / Growth Engine / Fiverr in website delta | None |
| Studio published via allowlist | **No** |

---

## Dist allowlist note

`workflow-demos.js` added. `transformation-studio` remains omitted. Build wrote **60** files to `dist/` (allowlist + `robots.txt`).
