# Signal Crest 2.0 — Polish Changed File Inventory

**Branch:** `feature/website-modernization`  
**Status:** Local polish only — **not** committed, pushed, or deployed.

## Modified (product)

| File | Change |
|------|--------|
| `hero-systems.css` | Mobile/tablet density polish; removed unused `.proto-*` chrome |
| `home.css` | Removed unused `.proto-*` + `.hm-footer*` / `.hm-copy` |
| `styles.css` | Comment only — keep inert `.hero.hero-home` (conservative) |

## Added / updated (QA only under `qa-m6b/`)

| File | Role |
|------|------|
| `measure-polish-hero.mjs` | Before/after hero metrics + screenshots + WebKit |
| `verify-polish-functional.mjs` | Nav / menu / CTAs / contact / CSP / WebKit |
| `M6B-SC20-polish-evidence.md` | Polish evidence + measurements |
| `M6B-SC20-polish-changed-file-inventory.md` | This inventory |
| `M6B-SC20-polish-test-results.md` | Test matrix |
| `sc20-polish-hero-metrics-before.json` | Before metrics |
| `sc20-polish-hero-metrics-after.json` | After metrics |
| `sc20-polish-functional-results.json` | Functional suite |
| `screenshots/sc20-polish-before-*.png` | Before shots |
| `screenshots/sc20-polish-after-*.png` | After + WebKit shots |

## Unchanged (intentionally)

- `index.html` markup / CTA targets
- `hero-systems.js` / `home.js` behavior
- `scripts/build-public.mjs` allowlist
- `_headers` CSP (no `unsafe-inline`; production tokens intact)
- Showroom S1 assets / behavior
- `SignalCrest-2.0-Prototype/`
- Themes (16) / theme JS

## Not in scope

- Retail Transformation Studio
- Showroom S2
- Commit / push / merge / deploy
