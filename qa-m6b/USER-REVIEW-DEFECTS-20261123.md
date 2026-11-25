# Remaining Defects & Blockers — V1 User Review Corrections

**Date:** 2026-11-23  
**Pass:** Owner screenshot corrections (Connected Systems + workflows + Solutions Explorer)

---

## Application defects this pass

| Severity | Item | Status |
|---|---|---|
| Fixed mid-pass | Solutions Explorer links stacked as single-character columns (`.site-nav ul { flex-direction:row }` overrode category lists) | **Fixed** — `.site-nav .nav-explorer-links { display:grid }` |
| Fixed mid-pass | axe color-contrast on inactive `.wf-step` text (opacity fade) | **Fixed** — color tokens instead of opacity |
| None open | Automated suites for this scope | **0 failing checks** |

---

## Known non-blockers / coverage gaps

- Playwright WebKit ≠ real iOS Safari visual/input parity.
- Mega-menu necessarily overlays hero content while open (expected); now centered + constrained width to reduce off-viewport / clutter issues.
- Local Netlify Forms POSTs may 200 without cloud storage (environment).
- Sitemap omitted when `SITE_ORIGIN` unset (expected for non-production-release builds).

---

## Process blockers (not UI failures)

1. Explicit authorization to **commit** staging candidate.  
2. Explicit authorization to **push / Netlify deploy**.  
3. Production-release build with approved `SITE_ORIGIN`.  
4. Stone Harbor / Transformation Studio stays **private** until separately approved.  
5. **No Factory** work; **no Auth / DB**.

**STOP for Owner and Atlas review.**
