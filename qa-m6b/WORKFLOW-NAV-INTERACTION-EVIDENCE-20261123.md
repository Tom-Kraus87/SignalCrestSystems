# Five-Workflow Interaction Evidence

**Date:** 2026-11-23  
**Harness:** `qa-m6b/verify-workflows-nav-20261123.mjs`  
**Results JSON:** `qa-m6b/workflows-nav-results-20261123.json` → **21/21 PASS**

---

## Workflows verified

| # | Tab | Evidence |
|---|---|---|
| 1 | Connected Systems (original) | Default panel; `#hs-map.is-enhanced`; 3 scenario chips; Quote scenario `aria-pressed=true` |
| 2 | Website Transformation | Tab select → panel visible; systems hidden |
| 3 | Customer Lead Automation | Switch + mobile screenshot |
| 4 | Custom Software Development | Switch pass |
| 5 | Digital Care & IT Operations | Switch pass |

Return to original after switching: **PASS**.

---

## Honesty / motion

- Badge + copy: “Illustrative examples — not live product runs or backend execution.”
- Original map note: “Illustrative system map, not a live system.”
- Auto-advance disabled under `prefers-reduced-motion` (JS reads `matchMedia`).

---

## Solutions Explorer

| Check | Result |
|---|---|
| Desktop open / visible | PASS |
| Four categories | PASS |
| Escape-to-close | PASS |
| Mobile open + Close button | PASS |
| 21 destination links resolve in `dist/` | PASS |
| No CSP console errors | PASS |
