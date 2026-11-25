# Signal Crest 2.0 — Integration Gate Report

**Date:** 2026-11-17  
**Branch:** `feature/website-modernization` (dirty tree; no commit/push/deploy)  
**Verdict:** **READY FOR ATLAS VISUAL + A11Y REVIEW** (automated gates largely green)

## What was integrated

| Piece | Path |
|-------|------|
| Hero engine CSS/JS | `hero-systems.css`, `hero-systems.js` |
| Homepage sections CSS/JS | `home.css`, `home.js` |
| Homepage markup | `index.html` (`.hs-hero` + `.hm-*` + preserved `#product-lab`) |
| Build allowlist | `scripts/build-public.mjs` (+4 files) |
| Real header / mobile nav | Preserved (`.site-header`; no `.proto-header`) |
| Primary CTA | Start a Project → `contact.html` |
| Secondary CTA | Explore Live Demos → `showroom.html` (Atlas decision) |

## Test summary

| Suite | Result | Detail |
|-------|--------|--------|
| T1 Build / allowlist | **PASS** | `build-public.mjs` ok; 56 allowlist → 57 dist files; repeat build log-identical |
| T2 CSP | **PASS** | 0 CSP / inline-style console errors on homepage |
| T3 Header preserve | **PASS** | `.site-header` present; `.proto-header` absent |
| T4 Themes render | **PASS** | All 16 themes apply via `SCSTheme` |
| T5 axe-core | **PASS** | 32/32 (16 themes × 1440 + 390) on `main#main` |
| T6–T8 Keyboard / reduced motion / pause | **PASS** | 10/10 |
| T9 Overflow | **PASS** | No horizontal overflow at 1440/1024/768/390/320 |
| T13 Weight / third-party | **PASS** | Hero JS gzip **8804 B** (≤12 KB); no new third-party scripts |
| T14 Contact / Netlify | **PASS** | Form attrs intact; `?service=ai-automation` preselect works |
| T15–T16 Showroom / S1 | **PASS** | `verify-s1-corrections` + `verify-s1-remaining` green |
| T17–T18 CTAs / honest claims | **PASS** | contact + showroom; Illustrative / Simulated / Fictional present |
| Link validation | **PASS** | `validate-links.mjs` updated for SC 2.0 homepage markers |
| T11–T12 Perf (headless) | **OBS** | ~60.6 fps ambient estimate; software canvas — recheck on real GPU |

**Automated counts (this gate):**  
- Integrated smoke: **36 pass / 0 fail**  
- Axe: **32 pass / 0 fail**  
- Keyboard/reduced-motion: **10 pass / 0 fail**  
- Perf weight gate: **pass**  
- S1 corrections: **18 pass**  
- S1 remaining: **16 pass**

## CSP / accessibility

- `_headers` unchanged: `script-src 'self'`; `style-src 'self' https://fonts.googleapis.com` — **no** `unsafe-inline`.
- Hero positions use `element.style.setProperty('--x'|'--y')` only (CSP-safe).
- Axe clean after cold theme loads (theme color transitions previously caused false mid-blend failures).
- Keyboard: single map tab stop, arrows, Enter, Esc, live region, Pause/Play motion.

## Performance observations

- `hero-systems.js` gzip **8.8 KB**; `home.js` gzip ~1.2 KB.
- Headless rAF ambient ~60 fps (optimistic loop timing; GPU device check still recommended).
- No new third-party scripts.

## Remaining issues / risks

1. **Mobile hero length** — system map + scenarios still tall on 390/320; brand + CTAs readable but map pushes fold (known plan risk).
2. **Dead CSS** — legacy `.hero.hero-home` / homepage pricing styles remain in `styles.css` (inert, not removed to limit churn).
3. **Prototype `.proto-*` rules** still present in copied CSS but unused (harmless).
4. **Real-device check** — mid-range Android + iOS Safari motion/pause not run in this pass.
5. **Homepage pricing / lead-path sections** removed from homepage in favor of prototype sections; Pricing remains via nav/`packages.html`.
6. **Theme transition composites** — rapid theme switching animates `background-color`/`color`; fine for users, can confuse mid-transition audits.

## Safety confirmation

- Prototype folder **not** modified  
- Retail Transformation Studio **not** integrated  
- S2 Automation/CRM **not** started  
- **No** commit / push / merge / deploy  

## Deliverable paths

- `qa-m6b/M6B-SC20-integration-gate.md` (this file)
- `qa-m6b/M6B-SC20-changed-file-inventory.md`
- `qa-m6b/M6B-SC20-csp-a11y-report.md`
- `qa-m6b/M6B-SC20-perf-observations.md`
- `qa-m6b/sc20-*-results.json`
- `qa-m6b/screenshots/sc20-home-*.png`
