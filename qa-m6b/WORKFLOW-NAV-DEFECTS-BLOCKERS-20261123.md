# Remaining Defects & Launch Blockers

**Date:** 2026-11-23  
**Pass:** Workflow expansion + Solutions Explorer

---

## Application defects found this pass

| Severity | Item | Status |
|---|---|---|
| Fixed mid-pass | Corrupted Solutions nav leftover from non-greedy HTML replace (orphaned old dropdown links) | **Fixed** — all 14 HTML pages repaired |
| Fixed mid-pass | WebKit polish selector matched workflow CTAs under `.hs-hero` | **Fixed** — scoped to `.hs-actions` |
| None open | Automated suites | **0 failing checks** |

---

## Known non-blockers / coverage gaps

- Playwright WebKit ≠ real iOS Safari visual/input parity.
- Local Netlify Forms POSTs may 200 without cloud storage (environment).
- Sitemap omitted when `SITE_ORIGIN` unset (expected for non-production-release builds).

---

## Launch / staging blockers (process — not this UI delta)

These remain **owner/Atlas process gates**, not failures of this frontend pass:

1. Explicit authorization to **commit** staging candidate.  
2. Explicit authorization to **push / Netlify deploy**.  
3. Production-release build with approved `SITE_ORIGIN`.  
4. Privacy / forms acceptance if not already signed off.  
5. Stone Harbor / Transformation Studio stays **private** (local only) until separately approved.

**No Factory B3–B7 work** in this pass. **No DNS / Auth / DB** changes.
