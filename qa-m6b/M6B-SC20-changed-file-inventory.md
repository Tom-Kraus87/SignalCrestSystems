# Signal Crest 2.0 — Changed File Inventory

**Branch:** `feature/website-modernization`  
**Status:** Local integration only — **not** committed, pushed, or deployed.

## Added (repo root)

| File | Role |
|------|------|
| `hero-systems.css` | Interactive hero / system-map styles (from prototype; `body` override removed) |
| `hero-systems.js` | Hero engine (unchanged logic; CSSOM `--x/--y` only) |
| `home.css` | Below-fold homepage section styles (`.hm-*`) |
| `home.js` | Scroll reveal + showroom mini-demos |

## Modified

| File | Change |
|------|--------|
| `index.html` | Wired SC 2.0 hero + `.hm-*` sections; kept real header/footer + Product Lab; secondary CTA → `showroom.html` |
| `scripts/build-public.mjs` | Allowlisted `hero-systems.css/js`, `home.css/js` |
| `styles.css` | Comment noting `.hero.hero-home` is inert vs `.hs-hero` |
| `qa-m6b/verify-sc20-integrated.mjs` | Expanded smoke matrix |
| `qa-m6b/verify-sc20-axe.mjs` | New axe suite (cold theme loads) |
| `qa-m6b/verify-sc20-keyboard-hero.mjs` | New keyboard / reduced-motion suite |
| `qa-m6b/measure-sc20-hero-perf.mjs` | New weight / FPS observations |
| `qa-m6b/capture-sc20-screenshots.mjs` | Screenshot capture helper |

## Unchanged (intentionally)

- Prototype folder `SignalCrest-2.0-Prototype/` (read-only)
- `showroom.html` / `showroom.css` / `showroom.js` / `showroom/*` behavior
- Work concept demos / modal logic in `script.js`
- `contact.html` Netlify Forms + service options
- `_headers` CSP (no `unsafe-inline`; no new third-party scripts)

## Not integrated

- Retail Transformation Studio
- S2 Automation/CRM
- Prototype `.proto-*` header/footer
