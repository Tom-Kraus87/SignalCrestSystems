# Changed File List — V1 User Review Corrections

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot` @ `c2c2d8d`  
**Scope:** Local frontend refinements only — **no commit / push / deploy**

---

## Modified (this pass)

| Path | Change |
|---|---|
| `hero-systems.js` | Added Appointment booking + Business reporting scenarios (5 total) |
| `hero-systems.css` | Scenario chip wrap; illustrative section styles; wf-step contrast (no opacity fade) |
| `index.html` | Hero = Connected Systems map + 5 chips; moved 5 illustrative workflows to `#illustrative-workflows`; Solutions `aria-controls` |
| `workflow-demos.js` | Secondary educational section only (no hero nesting); systems panel is step walkthrough |
| `styles.css` | Solutions Explorer: viewport-centered constrained mega-menu; fix `.site-nav ul` flex override on category links; card spacing/wrapping |
| `script.js` | Solutions `aria-expanded` sync; outside-click close |
| `404.html`, `about.html`, `ai-automation.html`, `case-studies.html`, `contact.html`, `packages.html`, `privacy.html`, `project-request.html`, `qa-process.html`, `resources.html`, `services.html`, `showroom.html`, `work.html` | Solutions Explorer `id` + `aria-controls` |

## QA artifacts (gitignored `qa-m6b/`)

| Path | Role |
|---|---|
| `qa-m6b/verify-user-review-20261123.mjs` | Regression harness |
| `qa-m6b/user-review-results-20261123.json` | Machine results |
| `qa-m6b/user-review-run-20261123.log` | Run log |
| `qa-m6b/screenshots-user-review-20261123/` | Desktop + mobile screenshots |
| `qa-m6b/USER-REVIEW-*-20261123.md` | Reports (this set) |

## Explicitly untouched

- No commit / push / Netlify deploy  
- No Auth / DB  
- No Stone Harbor publish  
- No Factory mods  
- `transformation-studio/` remains working-tree only (not in allowlist / dist)
