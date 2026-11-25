# M6B S1 — Claude Re-Gate (post-corrections)

**Date:** 2026-11-17
**Reviewer:** Claude (independent re-verification; no fixes implemented, no commit/push/merge/deploy)
**Branch:** `feature/website-modernization`
**HEAD:** `c2c2d8d069803a6856a292ecaa1d846b33b6515d` (unchanged baseline, dirty tree)
**Prior verdict:** CORRECTIONS REQUIRED (`M6B-S1-claude-independent-qa.md`)

## VERDICT: PASS

All previously failing items (F-1, F-2, F-3, F-6) are fixed and independently verified. No new blocker found. The remaining items are non-blocking (see "Residual notes").

## Method

- Static review of `showroom/home-services.js`, `showroom/ecommerce.js`, `showroom.css`, `showroom.html`, `_headers`, `scripts/build-public.mjs`.
- SHA-256 comparison of source against `dist/` for all showroom files and `_headers`.
- My own Playwright (Chromium) script, written to the OS temp dir and deleted afterwards. It is independent of `verify-s1-corrections.mjs`. It served `dist/` and applied the exact CSP from `_headers`. **34 checks, 34 pass.**
- Re-ran the author's `verify-s1-corrections.mjs`: `failed: []`.
- Git reflog, stash, branch and diff checks.

## Results by re-check item

### 1. Inline styles and CSP (F-1) — PASS

- Search of `showroom/*.js`, `showroom.js` and `showroom.html` for `style=`, `.style`, `cssText`: **0 matches**.
- `showroom.css` now has `.sh-product-grid { margin-top: .85rem }` and `.sh-checkout-actions { margin-top: .85rem }`.
- Under the real CSP, computed `margin-top` is `13.6px` on both. The F-1 defect was `0px`.
- Demo DOM contains 0 elements with a `style` attribute after render.
- Console and page errors, including CSP violations, across the whole run (showroom, Work, Pricing): **0**.
- `_headers`: zero diff vs HEAD. CSP is still `style-src 'self' https://fonts.googleapis.com` and `script-src 'self'`, with no `'unsafe-inline'`. `dist/_headers` is identical to the source.
- External requests: only `fonts.googleapis.com` and `fonts.gstatic.com`, which is the pre-existing pattern.

### 2. Focus restore and aria-live (F-2, F-6) — PASS

Keyboard-driven (focus plus Enter). `activeElement` after each action:

| Demo | Action | Focus lands on |
|---|---|---|
| Home Services | Submit | `#hs-advance` |
| Home Services | Advance (1st to 3rd) | `#hs-advance` |
| Home Services | Final advance (Complete) | `#hs-send-followup` |
| Home Services | Simulate send | `#hs-send-followup` |
| Home Services | Reset | `#hs-submit` |
| E-commerce | Category filter | same category button (`cat-Camp`) |
| E-commerce | Product select | same product button |
| E-commerce | Add to cart | `#ec-checkout` |
| E-commerce | Start checkout | `#ec-confirm` |
| E-commerce | Confirm | `#ec-reset` |
| E-commerce | Reset | `#ec-add` |
| E-commerce | Remove | `#ec-add` (cart then empty) |
| E-commerce | Back to cart | `#ec-checkout` |

- Neither demo root nor any ancestor has `aria-live`. In `showroom.html`, the remaining `aria-live` elements are:
  - the visually-hidden theme picker label;
  - the small `#showroom-stage-banner` status line;
  - the dedicated `#hs-live-status` / `#ec-live-status` regions, which are `role="status"`, `aria-live="polite"` and `aria-atomic`.
- F-6: text typed into "Job notes" is retained after clicking Advance before submit. Verified.
- Status text still shows "No email or SMS was sent." and "No payment processed, no inventory updated, no email sent."

### 3. Job-status steps layout (F-3) — PASS

`.sh-steps` is now `repeat(5, minmax(0,1fr))`, with 2 columns at 720px and below.

| Viewport | Items | Columns | Rows | Clipped text | Page overflow |
|---|---|---|---|---|---|
| 1440 | 5 | 5 | 1 | no | no |
| 1024 | 5 | 5 | 1 | no | no |
| 768 | 5 | 5 | 1 | no | no |
| 390 | 5 | 2 | 3 (2+2+1) | no | no |
| 320 | 5 | 2 | 3 | no | no |

No broken 4-column wrap and no orphaned "Complete" on desktop. The 390px screenshot is `qa-m6b/screenshots/regate-hs-steps-390.png`. Other captures: `regate-hs-steps-1440.png`, `regate-hs-complete-1440.png`, `regate-ec-1440.png`.

### 4. Smoke, allowlist, git hygiene — PASS

- **Home Services.** Submit gave estimate $129–$174 for HVAC. Five statuses reached Complete. Send simulated. Reset works. An `<img onerror>` payload in the name field stayed inert.
- **E-commerce.** Filter shows 2 Camp products. Add, remove, checkout, confirm and cancel all work. Order ID matches `NL-####`. The checkout area has 0 inputs and 0 forms.
- **CTAs.** `contact.html?service=custom-software&source=showroom-*` links are present.
- **Work and Pricing.** All 3 demos (starter, business, modernization) open the modal on both pages. Escape closes.
- **Allowlist.** `scripts/build-public.mjs` still lists `showroom.html`, `showroom.css`, `showroom.js`, `showroom/home-services.js`, `showroom/ecommerce.js`. Allowlist guards are unchanged. `dist/` has 53 files (52 source plus generated `robots.txt`). Source and `dist` hashes are identical for all five showroom files and `_headers`, so `dist` is current. I did not rebuild.
- **Git.**
  - `HEAD` is `c2c2d8d`.
  - The reflog top entry is the original `c2c2d8d` commit, so there are no new commits, merges or resets.
  - `feature/website-modernization` has no remote-tracking ref, so it is not pushed.
  - The stash is the old 2026-07 `main` stash.
  - `_headers`, `script.js`, `theme.js`, `theme-boot.js` and `themes.css` have zero diff vs HEAD.
  - The working tree is dirty as expected (19 status entries).

## Residual notes (non-blocking, no action required for this gate)

1. **Live-region timing.** The status `<p>` is re-created inside each `innerHTML` rebuild already containing its text. Some screen readers announce a live region only when text changes inside an existing node, so announcement is not guaranteed. Focus restore means users still hear the focused control. I could not verify with a screen reader. Consider a persistent live node outside the rebuilt subtree if SR testing shows silence.
2. **No axe / screen-reader pass** has been done, as in the original gate and the fix report.
3. **Brittle rebuild pattern.** Full `innerHTML` re-render with a hand-maintained focus map. New controls need focus keys.
4. **Carried from the original report and accepted:** F-4 (`source=` unused), F-5 (showroom not in global nav), F-7 (QA artifacts gitignored), and the sitemap/indexing decision for `showroom.html`.
5. F-8 is addressed in `verify-s1-corrections.mjs`, which serves the `_headers` CSP and fails on console CSP errors. It is not yet folded into `capture-restoration.mjs`.

## Corrections required

None.
