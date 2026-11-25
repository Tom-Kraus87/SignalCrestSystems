# Signal Crest 2.0 — CSP & Accessibility Report

## CSP

| Check | Result |
|-------|--------|
| `_headers` Content-Security-Policy unchanged | Yes |
| `script-src 'self'` (no unsafe-inline) | Pass |
| `style-src 'self' https://fonts.googleapis.com` | Pass |
| Hero uses CSSOM `setProperty` for `--x/--y` | Pass |
| No new third-party scripts | Pass |
| Playwright console CSP / inline-style errors on homepage | **0** |

Production CSP was applied during all Playwright runs via `dist/_headers`. Axe was injected only for QA through a same-origin `/__qa__/axe.min.js` route on the test server (not published).

## Accessibility

### axe-core (T5)

- Scope: `main#main`
- Matrix: 16 themes × viewports 1440 + 390 = **32 runs**
- Result: **32/32 pass** (0 violations)
- Method: cold load per theme via `localStorage` + `SCSTheme.setPreference`; reveal transitions disabled before audit

### Keyboard / motion (T6–T8)

| Check | Pass |
|-------|------|
| Map single tab stop | Yes |
| Arrow key focus move | Yes |
| Enter selects node (`aria-pressed`) | Yes |
| Live region announces | Yes |
| Esc clears selection | Yes |
| Pause / Play motion toggle | Yes |
| `prefers-reduced-motion: reduce` disables reveal class | Yes |
| Reduced-motion scenarios show steps immediately | Yes |

### Honest claims present

- “Illustrative system map, not a live system.”
- “Simulated data” badge
- “Fictional sample data” on showroom preview cards
- Product Lab retained with “not commercial” labeling

## Notes

- Global site chrome (footer muted links on some themes) was **out of scope** for the main-scoped axe gate; S1 already tracks selected nav contrast.
- Rapid theme switching uses CSS transitions; audits must wait for settled colors (cold loads used here).
