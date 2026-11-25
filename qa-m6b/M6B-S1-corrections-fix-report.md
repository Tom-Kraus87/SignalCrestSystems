# M6B S1 — Corrections Fix Report

**Date:** 2026-11-17  
**Scope:** Claude independent QA findings F-1 / F-2 / F-3 only  
**Branch:** `feature/website-modernization`  
**HEAD (unchanged):** `c2c2d8d` — no commit created  

## Verdict

Corrections C-1, C-2, and C-3 applied. Playwright verification under real `_headers` CSP: **18/18 checks pass**. CSP was not loosened. No commit / push / merge / deploy.

## What changed

| File | Change |
|------|--------|
| `showroom/ecommerce.js` | Removed both inline `style="margin-top:0.85rem"` usages; use `.sh-product-grid` / `.sh-checkout-actions`. After each re-render, restore focus to a sensible control. Dedicated `#ec-live-status` live region for status messages only. |
| `showroom/home-services.js` | After each re-render, restore focus (submit → advance → send / live status). Sync intake fields on input so Advance does not wipe unsaved text. Dedicated `#hs-live-status` live region. |
| `showroom.html` | Removed `aria-live="polite"` from `#demo-home-services-root` and `#demo-ecommerce-root` (whole-demo announcements). |
| `showroom.css` | `.sh-product-grid` / `.sh-checkout-actions` margin classes; `.sh-steps` → `repeat(5, …)` with 2-col wrap ≤720px; live-status empty/focus styles. |
| `dist/*` (via `node scripts/build-public.mjs`) | Rebuilt so public output matches source. |

**Not touched:** `_headers`, CSP, themes, contact CTAs, fictional-demo disclosures, Batch S2, Signal Crest 2.0 visuals.

## Focus restore targets

**Home Services:** submit → `#hs-advance`; advance → `#hs-advance` (or `#hs-send-followup` on final step); send → `#hs-send-followup`; reset → `#hs-submit`.

**E-commerce:** category/product → same control; add/remove → `#ec-checkout` (fallback `#ec-add` / live status); checkout → `#ec-confirm`; confirm → `#ec-reset`; cancel → `#ec-checkout`; reset → `#ec-add`.

## Verification

Script: `qa-m6b/verify-s1-corrections.mjs` (served `dist/` with CSP from `_headers`).

- No `style=` in `showroom/ecommerce.js` (source or DOM)
- Zero CSP console errors
- Focus lands correctly after submit / advance / send / add / checkout / confirm
- Demo roots no longer have `aria-live`; small `#hs-live-status` / `#ec-live-status` regions do
- Job status grid: 5 items, 5 desktop columns

## Residual risks

- Full `innerHTML` rebuild remains; focus restore mitigates WCAG 2.4.3 but is still a brittle pattern if new controls are added without focus keys.
- No automated axe / screen-reader pass after C-2 (recommend before release).
- Showroom still absent from global nav (accepted F-5).
- `source=` query on contact CTAs still unused (accepted F-4).
- QA docs / verify script under `qa-m6b/` are gitignored and will not travel with a future commit.

## Git status (no commit)

```
Branch: feature/website-modernization
HEAD:   c2c2d8d feat: implement redesigned homepage and concept demos

 M .gitignore
 M 404.html
 M about.html
 M ai-automation.html
 M case-studies.html
 M contact.html
 M index.html
 M packages-pricing.css
 M packages.html
 M qa-process.html
 M resources.html
 M scripts/build-public.mjs
 M services.html
 M styles.css
 M work.html
?? showroom.css
?? showroom.html
?? showroom.js
?? showroom/            (ecommerce.js, home-services.js)
```

Ignored / local-only: `dist/`, `qa-m6a/`, `qa-m6b/`.  
No new commit. Branch not pushed.
