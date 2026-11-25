# M6B S1 — Claude Independent Quality Gate

**Date:** 2026-11-17  
**Reviewer:** Claude (independent QA; no fixes implemented, no commit/push/merge/deploy)  
**Branch:** `feature/website-modernization`  
**HEAD:** `c2c2d8d069803a6856a292ecaa1d846b33b6515d` (committed 2026-11-16 22:24 -0500; matches expected baseline)

## VERDICT: CORRECTIONS REQUIRED

Scope is sound and nothing is a security or release blocker. The portfolio restore, both showroom demos, forms, themes, build allowlist and git hygiene all pass. Two small, scoped defects should be corrected before commit:

1. A CSP violation caused by an inline `style=` attribute in the e-commerce demo (F-1).
2. Keyboard focus is lost on every demo action, which is an accessibility failure (F-2).

Neither needs a design change. Re-verification should take about 15 minutes.

---

## Method

- Read the four mandatory documents plus the changed source files.
- Compared `dist/` byte-for-byte against source: 52 of 52 copied files are identical. The only extra is the generated `robots.txt`, so `dist/` is current.
- Served `dist/` with a throwaway local server (outside the repo, deleted afterwards). The server applied the exact `Content-Security-Policy` from `_headers`.
- Ran a scripted Playwright (Chromium) run using the repo's `node_modules`. It covered:
  - both showroom demos end to end;
  - Work and Pricing modals;
  - contact preselect;
  - contrast across 16 themes;
  - overflow at 320, 390, 768 and 1024 px;
  - a console/CSP check;
  - an external-request inventory.
- Reviewed git state, the reflog and the remotes.

---

## Findings table

| # | Area | Finding | Severity | Status |
|---|------|---------|----------|--------|
| **F-1** | Security / CSP | `showroom/ecommerce.js` line ~155 injects `style="margin-top:0.85rem"` through `innerHTML`. Production CSP is `style-src 'self' https://fonts.googleapis.com` with no `'unsafe-inline'`, so the browser blocks it. Observed under real headers: console error "Applying inline style violates … style-src", and computed `margin-top` is `0px`. The report claim "CSP unchanged / Pass" holds for scripts only. Not exploitable, but it is a CSP error on a production page and a visual defect. | Medium | **Correction required** |
| **F-2** | Accessibility | Both demos rebuild the whole `root.innerHTML` on every state change. Keyboard focus resets to `<body>` after "Request sample estimate", "Advance job status", "Simulate send", cart add/remove, filter and checkout. Measured: `activeElement` = `BODY` after submit and after send. Keyboard and screen-reader users lose their place on every action (WCAG 2.4.3). The demo roots also carry `aria-live="polite"` on the entire container, so a screen reader may re-announce the full demo on each render. The showroom report only claims a "manual keyboard check" of tab arrows and focus rings. | Medium | **Correction required** |
| F-3 | UI polish | `.sh-steps` is `repeat(4, 1fr)` but there are 5 statuses. "Complete" orphans onto its own row at desktop width (confirmed in screenshot). | Low | Recommended |
| F-4 | Content / UX | `?source=showroom-*` is not consumed by `script.js`. The contact page preselects only `service` (verified: `custom-software` is applied). The report already notes this as informational. | Info | Accept |
| F-5 | Discoverability | Showroom is absent from the global nav and from every page footer except its own. It is reachable from Work (`href="showroom.html"`) and the showroom footer. On `showroom.html` the nav marks "Work" as `is-active`. Already disclosed as a known limitation. | Low | Accept or backlog |
| F-6 | Home Services demo | Unsaved text typed into the intake form is lost if the user clicks "Advance" before submitting, because of the full re-render. Same root cause as F-2. | Low | Fixed by the F-2 correction |
| F-7 | Process / docs | The inventory says `qa-m6a/` and `qa-m6b/` are gitignored. This is correct now (`.gitignore` lines 32-33). The initial status snapshot listed them as `??`, which suggests it was taken before the ignore edit. QA artifacts will not be committed. Confirm that is intended. | Info | Confirm |
| F-8 | Docs | The link-validation and showroom reports use Playwright against a static server without `_headers`, which is why F-1 was missed. Add a CSP-header serve to the QA harness. | Low | Recommended |

---

## Verification results

### 1. Portfolio restore (Work / Pricing). PASS

- `work.html` has `#concept-demos`, 3 preview thumbnails and 3 `data-demo` buttons (`starter`, `business`, `modernization`). It also has `#demoModal` and matching `tpl-*` templates.
- `packages.html` has the same 3 buttons and the same templates, plus preview thumbs.
- All 3 demos open on both pages. Starter is single-page. Professional and Advanced each have 5 tabs, and the Gallery tab activates with all images loaded. Escape closes the modal.
- All 6 preview thumbnails load (`naturalWidth > 0`).
- Not fabricated. The demo modal and templates trace to the older history commit `958d0f8` ("Restore multipage layout…"). `script.js` is **unchanged** vs HEAD; only the markup is reintroduced.
- Content is explicitly fictional:
  - "Evergreen Landscaping (fictional)" appears in cards, modal banners and footers.
  - Notes read "not a completed client project".
  - No client results, testimonials or performance numbers were added.
- `work.html` still states "concept examples, not attributed client results".
- `case-studies.html` only adds a link to `work.html#concept-demos` plus nav/CTA updates.
- Homepage has no concept-demo modal (by design).

### 2. Interactive Showroom demos. PASS functionally (see F-1, F-2)

**Home Services.**
- Submitting name, phone and service "HVAC" gave a sample estimate of $129–$174, a job ID `SP-####` and status "Received".
- "Advance" 4 times reached "Complete", after which the button disables and "Simulate send follow-up" enables.
- Sending shows "No email or SMS was sent."
- Reset works.
- Inputs are escaped. An `<img onerror>` payload in the name and a `"><b>` payload in the phone field did not execute (`window.__xss` unset).
- Confirmed in the screenshot that the payload text renders as literal text.

**E-commerce.**
- Category filter works (Camp shows 2 products).
- Selecting a product and adding to cart gave sleeping pad ×2 and lantern ×1, subtotal $204.00.
- Checkout moves to Review, then "Confirm sample order" gives `NL-####` with "No payment processed, no inventory updated, no email sent."
- The checkout area contains **0 inputs and 0 forms**, so no card or PII fields exist.
- Remove, cancel and reset paths are present.

**Shell.**
- Tab click and arrow-key navigation work.
- Hash deep link `#demo-ecommerce` opens the right panel.
- Both "Build Something Like This" CTAs go to `contact.html?service=custom-software&source=…`, and the contact `service` select is preselected to `custom-software`.

**Client-side and no payments.**
- Code review shows no `fetch`, XHR, WebSocket, `localStorage` or `form action` in `showroom*.js`.
- Randomness is used only for fictional IDs.
- The external-request inventory during the run contained only Google Fonts CSS and font files, and none came from showroom code.

### 3. Existing functionality preserved. PASS

- `script.js`, `theme.js`, `theme-boot.js`, `themes.css` and `_headers` have zero diff vs HEAD.
- The contact form diff is nav and logo only. The form still has `name="contact"`, `data-netlify="true"`, `data-netlify-honeypot="bot-field"`, `form-name` and `bot-field` hidden fields and fields `name, email, service, message`. `action="/"` is unchanged.
- Nav is consistent across pages (Solutions, Product Lab, Work, Pricing, About, Contact, Start a Project).
- SEO patterns hold:
  - `showroom.html` has one `og:description`, a title, a description and no hard-coded canonical or `og:url`, so the builder injection pattern works.
  - It is registered in `SEO_HTML_PAGES` and therefore in the sitemap.
  - `404.html` retains `noindex`.
- Link validation report (12 pages, assets and markup anchors): 0 failures, and I found no contradiction.

### 4. Security, a11y basics, themes, allowlist

**Security.**
- CSP is unchanged: `script-src 'self'`, `connect-src 'self'`, `form-action 'self'`, `object-src 'none'`, `frame-ancestors 'none'`.
- No new third-party scripts. All `<script>` tags in the changed pages are first-party. The only new external host usage is the existing Google Fonts pattern.
- `showroom.html` has no inline scripts and no `on*=` handlers.
- The only CSP error observed was F-1.

**Accessibility.**
- Positives:
  - skip link, landmarks, tablist/tab/tabpanel roles with arrow/Home/End keys;
  - labelled form controls;
  - visible `:focus-visible` outlines;
  - `prefers-reduced-motion` honoured;
  - modal closes on Escape.
- Negatives: F-2.
- Not performed: an automated axe pass, and screen-reader testing. The report also declares no axe CI.

**16 themes.**
- 16 theme IDs are present in the picker.
- `showroom.css` uses only theme variables (`--color-bg/-card/-text/-text-muted/-border/-accent/-accent-soft/-on-accent`, `--radius-*`). The one hex is a fallback.
- I forced each of the 16 `data-theme` values and measured contrast.

| | Primary button text on accent | Muted text on card | Input text on field |
|---|---|---|---|
| Minimum across 16 themes | 5.94:1 (Blueprint Studio) | 6.27:1 (Cyber Terminal) | 10.68:1 |
| WCAG AA (4.5:1) | all pass | all pass | all pass |

**Responsive.** No horizontal overflow at 320, 390, 768 or 1024 px for either demo.

**Build allowlist.**
- `showroom.html`, `showroom.css`, `showroom.js`, `showroom/home-services.js` and `showroom/ecommerce.js` are added.
- All allowlist guards are intact (forbidden prefixes, symlink checks, extension allowlist, inventory equality).
- The concept preview PNGs were already allowlisted and are in `dist/`.
- `dist/` contains exactly 52 source files plus the generated `robots.txt`, and no QA, docs or scripts leaked.

### 5. No unexpected commits, pushes, merges or deployments. PASS

- `git log -1`: `c2c2d8d`, committed 2026-11-16 22:24. The top three reflog entries are earlier commits; there are no new commits, merges, rebases or resets.
- No remote-tracking ref exists for this branch (`origin/feature/website-modernization` does not exist), so it has never been pushed. Branches: `feature/ai-services-content`, `feature/website-modernization` (current), `main`, `origin/main`.
- Stash `On main: temp-local-unstaged` is dated 2026-07-08, so it is pre-existing and unrelated.
- No deploy evidence: no `.netlify` changes and no new deploy artifacts. `dist/` is gitignored, local-only build output.

### 6. Framework matrix. PASS

`qa-m6a/M6B-framework-decision-matrix.md` recommends **A: stay on static HTML/CSS/JS**. It scores A=28, B (Vite)=20, C (Next)=16, and states "Do not migrate in M6B" and "Revisit only after separate approval". No Vite, Next or React scaffolding exists in the tree. Consistent with the showroom implementation.

---

## Corrections list

**C-1 (F-1, required).**
- Remove the inline `style="margin-top:0.85rem"` in `showroom/ecommerce.js`. Add a class such as `.sh-product-grid { margin-top: .85rem }` in `showroom.css` (or a `.sh-mt` utility class).
- Search `showroom/*.js` for any other `style=`. I found only this one.
- Re-test under the real `_headers` CSP and confirm there are no console violations.
- Do not loosen the CSP with `'unsafe-inline'`.

**C-2 (F-2, required).**
- Preserve focus across re-renders. Before `innerHTML`, record `document.activeElement.id` or a `data-focus-key`. After render, re-focus the same control, or the nearest logical target if it is gone or disabled. For example, after the final "Advance", focus the follow-up textarea or send button.
- Move `aria-live` off the large demo root. Put it only on the small `.sh-toast` / status region, or on a dedicated visually-hidden status element.
- Optionally keep form field values across renders (F-6).
- Re-test with the keyboard only: Tab → Enter on each primary action, and confirm focus lands somewhere sensible.

**C-3 (recommended).**
- Fix the 5-step layout. Use `repeat(5, 1fr)` at desktop and 2 columns at narrow widths, or `flex-wrap`.
- Extend `capture-restoration.mjs` or the validation script to serve `_headers` CSP and fail on console CSP errors (F-8).

---

## Residual risks

- Demo state is not persisted; a reload resets it. This is disclosed and acceptable.
- No automated axe or screen-reader testing. Only scripted keyboard and contrast checks were done. Recommend an axe pass after C-2.
- Showroom has weak site-wide discoverability (not in global nav). Consider adding it after approval, as a separate change.
- The `source=` attribution is not captured by the contact form. Leads from the showroom CTAs cannot be distinguished in Netlify Forms.
- Google Fonts is still loaded from a third party under the CSP allowance. This is pre-existing and not a regression.
- Showroom URL is in the sitemap and `robots: index,follow`. If the demos are not meant to be indexed yet, decide before release.
- Nothing is committed. QA docs are gitignored, so this report will not travel with the commit.
- A Windows CRLF warning on many files is cosmetic, but a mixed line-ending diff may occur on commit.
- `dist/` is local only. Rebuild after corrections, because it reflects pre-correction code.

---

## Git status snapshot (at review time)

```
Branch: feature/website-modernization
HEAD:   c2c2d8d069803a6856a292ecaa1d846b33b6515d  (2026-11-16 22:24:02 -0500)

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

- `git diff --stat`: 15 files changed, 1,204 insertions(+), 643 deletions(-).
- Ignored (not shown): `dist/`, `qa-m6a/`, `qa-m6b/`.
- Remotes: `origin` https://github.com/Tom-Kraus87/SignalCrestSystems.git. No branch ref pushed for this feature branch.
- This QA run wrote only this report. Temporary test scripts and server were created in the OS temp folder and removed.

---

## Re-gate note (2026-11-17)

The findings above (F-1, F-2, F-3, F-6) were re-verified after the corrections fix. Result: **PASS**. See qa-m6b/M6B-S1-claude-regate.md. The original verdict and findings in this file are left unchanged as the historical record.

