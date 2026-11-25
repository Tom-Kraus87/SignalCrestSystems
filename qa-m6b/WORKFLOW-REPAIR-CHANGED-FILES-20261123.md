# Changed-File List — V1 Workflow Functional Repair

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot` @ `c2c2d8d`  
**Authorization:** Local frontend + regression testing only — **no commit / push / deploy**

---

## This repair pass (delta)

| Path | Change |
|---|---|
| `hero-systems.js` | Confirmed `booking` + `reporting` SCENARIOS; added `startScenario` guard against missing keys (parallel HTML/JS drift) |
| `qa-m6b/verify-workflow-repair-20261123.mjs` | **New** — coexistence + 5 CS scenarios + 5 illustrative + theme switch + arcade responsive + disappearance detection |
| `qa-m6b/verify-workflows-nav-20261123.mjs` | Updated chip expectation 3→5; map must stay visible when illustrative tabs switch |

## Preserved from prior parallel workstreams (working tree; not rewritten)

| Path | Origin |
|---|---|
| `index.html` | 5 CS chips in hero; `#illustrative-workflows` with 5 tabs; 30-theme picker; Solutions Explorer |
| `workflow-demos.js` | Illustrative Advance Step / tab logic (secondary section) |
| `hero-systems.css` | Map + illustrative section styles |
| `theme.js`, `theme-boot.js`, `themes.css` | 30 themes / 5 categories; Arcade 1995 `.hs-hero h1` fix |
| `styles.css` | Solutions Explorer containment + Arcade type sync |
| `script.js` | Solutions `aria-expanded` / outside-click |
| Shared HTML headers on public pages | Theme picker + Solutions `aria-controls` |
| `scripts/build-public.mjs` | Allowlist includes `workflow-demos.js`; studio excluded |

## QA artifacts (gitignored `qa-m6b/`)

| Path | Role |
|---|---|
| `WORKFLOW-REPAIR-*-20261123.md` | This deliverable set |
| `verify-workflow-repair-20261123.mjs` | Repair regression harness |
| `workflow-repair-results-20261123.json` | Machine results |
| `screenshots-workflow-repair-20261123/` | Required screenshots |

## Explicitly untouched / prohibited

- No git commit, push, Netlify deploy  
- No Auth / DB  
- No Stone Harbor / `transformation-studio` publish  
- No Factory mods  
