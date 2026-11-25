# Signal Crest 2.0 — Polish Test Results

**Date:** 2026-11-17  
**Against:** `dist/` built via `scripts/build-public.mjs` after polish CSS

## Summary

| Suite | Pass | Fail | Status |
|-------|------|------|--------|
| Integrated smoke (`verify-sc20-integrated.mjs`) | 36 | 0 | **PASS** |
| axe-core (`verify-sc20-axe.mjs`) | 32 | 0 | **PASS** |
| Keyboard / reduced-motion (`verify-sc20-keyboard-hero.mjs`) | 10 | 0 | **PASS** |
| Functional polish (`verify-polish-functional.mjs`) | 14 | 0 | **PASS** |
| S1 corrections (`verify-s1-corrections.mjs`) | 18 | 0 | **PASS** |
| S1 remaining (`verify-s1-remaining.mjs`) | 16 | 0 | **PASS** |
| Perf weight gate (`measure-sc20-hero-perf.mjs`) | — | — | **PASS** (hero JS gzip 8804 ≤ 12 KB) |

## Functional detail (14/14)

- Site header present; `.proto-header` absent  
- Hero CTAs: Start a Project → `contact.html`; Explore Live Demos → `showroom.html`  
- Closing CTA pair same targets  
- Nav CTA → `contact.html`  
- Mobile menu: `aria-expanded=true` + `#site-nav.is-open` (15 links)  
- Contact Netlify form attrs intact; `?service=ai-automation` preselect works  
- Showroom loads  
- Homepage CSP/console: **0** errors  
- Playwright WebKit: map `is-enhanced`, primary CTA ok  

## CSP

- Production `_headers` unchanged (`script-src 'self'`; `style-src 'self' https://fonts.googleapis.com`; **no** `unsafe-inline`)  
- Chromium homepage load with full CSP (including `upgrade-insecure-requests`): **0** console CSP errors  
- Local WebKit QA temporarily omits only `upgrade-insecure-requests` (localhost HTTP limitation); not a production change  

## Performance

| Asset | Gzip |
|-------|------|
| `hero-systems.js` | 8804 B |
| `home.js` | ~1150 B |
| `hero-systems.css` | ~3581 B |
| `home.css` | ~2763 B (↓ after proto cleanup) |

Ambient headless rAF ~60.3 fps (software canvas — recheck on real GPU).

## Responsive / overflow

No horizontal overflow at **1440 / 1024 / 768 / 390 / 320**.

## Hero height deltas

| Width | Before | After | Δ |
|-------|--------|-------|---|
| 390 | 1222 | 845 | −377 |
| 320 | 1326 | 969 | −357 |
| 768 | 1095 | 903 | −192 |
| 1024 | 1104 | 910 | −194 |
| 1440 | 793 | 793 | 0 |

## WebKit / real device

| Environment | Result |
|-------------|--------|
| Playwright WebKit (local, UIR stripped) | **PASS** — enhance + CTA; screenshots saved |
| Real iOS Safari device | **Not available** in this pass |
| Mid-range Android GPU / thermal | **Not available** in this pass |
| Production HTTPS Safari + full CSP | **Not available** in this pass |

## Raw JSON

- `qa-m6b/sc20-integrated-results.json` (prior / re-run via smoke script stdout)  
- `qa-m6b/sc20-axe-results.json`  
- `qa-m6b/sc20-keyboard-results.json`  
- `qa-m6b/sc20-perf-results.json`  
- `qa-m6b/sc20-polish-functional-results.json`  
- `qa-m6b/sc20-polish-hero-metrics-before.json`  
- `qa-m6b/sc20-polish-hero-metrics-after.json`  
