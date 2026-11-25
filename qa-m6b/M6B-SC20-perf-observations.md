# Signal Crest 2.0 — Performance Observations

Measured with headless Chromium against `dist/` + CSP. Software-rendered canvas is **pessimistic** vs real GPU browsers.

## Weight

| Asset | Gzip |
|-------|------|
| `hero-systems.js` | **8804 B** (~8.8 KB) — under 12 KB budget |
| `home.js` | ~1150 B |
| `hero-systems.css` | ~3325 B |
| `home.css` | ~3061 B |

No new third-party scripts.

## Runtime (headless)

| Metric | Value |
|--------|-------|
| Ambient rAF median FPS estimate | ~60.6 |
| Avg frame interval sample | ~16.4 ms |
| Off-screen scroll past hero | map still in DOM; loop designed to stop when off-screen (prototype behavior retained) |

## Recommendations before calling perf “done”

1. Mid-range Android + iOS Safari: scenario + pointer while watching thermal/jank.
2. Confirm hero animation fully stops when scrolled out of view on device.
3. Optional: Lighthouse LCP on production-like Netlify preview (not run here).

Raw JSON: `qa-m6b/sc20-perf-results.json`
