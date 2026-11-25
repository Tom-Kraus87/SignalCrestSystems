# M6B — Portfolio Regression Root-Cause Report

**Branch:** `feature/website-modernization`  
**Baseline HEAD:** `c2c2d8d069803a6856a292ecaa1d846b33b6515d` (M5B)  
**Date:** 2026-11-17  
**Safety:** No commit / push / merge / deploy. Uncommitted M6B Batch 1 work preserved.

---

## Verdict

Interactive Evergreen landscaping concept demos were **not deleted from the repo** and were **not broken by missing assets or allowlist**. They became **hard to discover** after M6B Batch 1 removed the homepage concept section without relocating the preview+demo UI onto Work (M6A requires demos under Work/Pricing).

Case Studies content did **not** regress beyond Batch 1 nav/footer/CTA renames.

---

## What existed at M5B (verified via `git show c2c2d8d:…`)

| Surface | Verified content |
|---------|------------------|
| `index.html` | `#work` / `.concept-examples` with 3× `concept-preview-*.png`, demo buttons (`starter` / `business` / `modernization`), modal + templates |
| `packages.html` | Website package demo buttons + same modal/templates (no preview thumbs) |
| `work.html` | Capability cards + case-studies teaser; **no** Evergreen interactive demos |
| `case-studies.html` | 3 before/after concept cards (text patterns) |
| Assets | `assets/concept-preview-{starter,professional,advanced}.png` + gallery webps present |

---

## What Batch 1 changed (working tree vs HEAD)

| File | Portfolio impact |
|------|------------------|
| `index.html` | Concept examples + demo modal removed (AI-first homepage hierarchy). **Intentional per M6A** (“Reposition under Work/Pricing”). |
| `packages.html` | Nav/footer/CTA only (until this round added preview thumbs + Work cross-link). Demos remained functional. |
| `work.html` | Nav/footer/CTA only initially → **gap:** demos not relocated here. |
| `case-studies.html` | Nav/footer/CTA only; concept cards intact. |
| CSS/JS/assets | Demo CSS in `styles.css` and handlers in `script.js` still present. Assets still on disk. |

---

## Root cause (ranked)

1. **HTML information architecture / incomplete relocation** — Homepage demos removed; Work page not updated to host verified demos.  
2. **Not** routing, build allowlist, missing PNGs, or broken `script.js` (packages demos still wired).  
3. **Not** external demo hosting — demos are inline templates.

---

## Restoration performed (verified only — no fabricated portfolio)

1. Restored Evergreen concept cards + modal + templates onto `work.html#concept-demos` using M5B markup/assets.  
2. Added verified preview thumbs to Starter/Professional/Advanced on `packages.html`.  
3. Cross-links: Work ↔ Pricing; Case Studies → Work demos.  
4. **Did not** restore homepage concept section (M6A hierarchy: demos belong under Work/Pricing).  
5. Linked Interactive Showroom (Batch S1) from Work CTAs.

---

## Evidence artifacts

- Before: `qa-m6b/screenshots/before-work-desktop-1440.png`, `before-homepage-desktop-1440.png`  
- After: `qa-m6b/screenshots/after-*` (capture script)  
- Link validation: `qa-m6b/link-validation-report.md`
