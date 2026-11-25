# Signal Crest 2.0 — Homepage Polish Evidence

**Date:** 2026-11-17  
**Branch:** `feature/website-modernization` (dirty tree; **no** commit / push / merge / deploy)  
**Verdict:** **READY FOR ATLAS REVIEW** — focused polish only; architecture unchanged

## What changed

### 1. Mobile hero density (`hero-systems.css`)

Tightened the stacked (≤1100px / ≤480px / ≤360px) hero rhythm **without** removing map, scenarios, keyboard, or reduced-motion behavior:

- Less vertical padding / gap on `.hs-hero-inner`
- Compact stage / scenarios / panel spacing
- Map height: tablet **400→320**, phone **340→260**, ≤360 **240**
- Panel text `min-height` **9em→~5.2em** (still reserves scenario space)
- Side-by-side CTAs at 390; stack only ≤360 for label readability
- Slightly smaller mobile headline / lead / chips (touch targets ≥44px on primary CTAs; chips 36px)

### 2. Dead CSS cleanup (conservative)

| Action | Detail |
|--------|--------|
| **Removed** | `.proto-*` chrome from `hero-systems.css` and `home.css` — **0** matches in production HTML |
| **Removed** | Unused prototype `.hm-footer*` / `.hm-copy` from `home.css` — production uses `.site-footer` |
| **Kept** | `.hero.hero-home` blocks in `styles.css` — unused but interleaved with theme rules; documented inert |

### 3. Not changed

- Hero engine JS / map interaction model
- Transformation Studio / Retail Transformation Studio (**not** integrated)
- Showroom S2 (**not** started)
- `SignalCrest-2.0-Prototype/` (**not** modified)
- 16 themes, production `_headers` CSP, static build allowlist

## Mobile hero height (before → after)

Measured Chromium headless against `dist/` (`qa-m6b/measure-polish-hero.mjs`).

| Width | Before (px) | After (px) | Δ | Notes |
|-------|-------------|------------|---|-------|
| **390** | **1222** | **845** | **−377** | ≈ one 844px viewport |
| **320** | **1326** | **969** | **−357** | CTAs stack ≤360 |
| 768 | 1095 | 903 | −192 | Map 320 |
| 1024 | 1104 | 910 | −194 | Map 320 |
| 1440 | 793 | 793 | 0 | Desktop layout unchanged |

Map heights after: 390→260, 320→240, tablet→320, desktop clamp unchanged (~396).

No horizontal overflow at 1440 / 1024 / 768 / 390 / 320.

## Screenshots

| Phase | Paths |
|-------|-------|
| Before | `qa-m6b/screenshots/sc20-polish-before-{1440,1024,768,390,320}.png` (+ full 1440/390) |
| After | `qa-m6b/screenshots/sc20-polish-after-{1440,1024,768,390,320}.png` (+ full 1440/390) |
| WebKit | `qa-m6b/screenshots/sc20-polish-after-webkit-{1440,390}.png` |

## Test scores (polish recheck)

| Suite | Result |
|-------|--------|
| Integrated smoke | **36/36** |
| axe (`main#main`, 16 themes × 1440+390) | **32/32** |
| Keyboard / reduced-motion | **10/10** |
| Functional (nav, menu, CTAs, contact, CSP, WebKit) | **14/14** |
| S1 corrections | **18/18** |
| S1 remaining | **16/16** |
| Perf weight | hero JS gzip **8804 B** (≤12 KB); home.css gzip ↓ after proto cleanup |
| CSP console (homepage) | **0** errors / no `unsafe-inline` regression |

## Safari / WebKit

- **Playwright WebKit:** map enhances, CTAs correct, heights match Chromium (local QA strips only `upgrade-insecure-requests` because that CSP token breaks `http://127.0.0.1` under WebKit; **production `_headers` unchanged**).
- **Unavailable here:** real iOS Safari device, mid-range Android GPU/thermal, production HTTPS Safari with full CSP including `upgrade-insecure-requests`.

## Remaining risks

1. **320 hero still >1 viewport** (~969 vs 844) — acceptable trade for stacked CTAs + interactive map.
2. **Compact map (240–260px)** — nodes remain usable in compact mode; real-device touch QA still recommended.
3. **`.hero.hero-home` dead weight** in `styles.css` — kept on purpose; future dedicated cleanup.
4. **Headless FPS** still software-canvas optimistic (~60); real GPU check pending.
5. **Local WebKit QA ≠ production HTTPS Safari** — device check still needed.

## Safety confirmation

- Prototype folder **not** modified  
- Retail Transformation Studio **not** integrated  
- S2 Automation/CRM **not** started  
- **No** commit / push / merge / deploy  

## Related deliverables

- `qa-m6b/M6B-SC20-polish-changed-file-inventory.md`
- `qa-m6b/M6B-SC20-polish-test-results.md`
- `qa-m6b/sc20-polish-hero-metrics-before.json`
- `qa-m6b/sc20-polish-hero-metrics-after.json`
- `qa-m6b/sc20-polish-functional-results.json`
