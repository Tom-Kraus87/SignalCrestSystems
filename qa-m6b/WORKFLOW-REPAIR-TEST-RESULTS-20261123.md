# Test Results — V1 Workflow Functional Repair

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot` @ `c2c2d8d`  
**Build:** `node scripts/build-public.mjs` → **PASS** (60 dist files; studio excluded)

---

## Scores

| Suite | Score | Notes |
|---|---|---|
| `build-public.mjs` | **PASS** | 60 files; `transformation-studio` omitted |
| `validate-links.mjs` | **PASS** | No broken allowlisted links |
| `verify-sc20-integrated.mjs` | **36/36** | Smoke + CSP path |
| `verify-sc20-axe.mjs` | **32/32** | WCAG 2 A/AA sample |
| `verify-polish-functional.mjs` | **14/14** | Includes WebKit hero check |
| `verify-user-review-20261123.mjs` | **35/35** | CS + illustrative + Solutions |
| `verify-workflows-nav-20261123.mjs` | **21/21** | Updated for 5 chips + map coexistence |
| `verify-themes-30-20261123.mjs` | **PASS** | 30 themes; Arcade fit; studio excluded |
| `verify-workflow-repair-20261123.mjs` | **39/39** | **New** repair / disappearance regression |

---

## Repair regression coverage (39/39)

- Source + HTML sync for `booking` / `reporting`; startScenario guard present  
- Hero animated canvas map preserved (not static cards)  
- All 5 Connected Systems scenarios: press, title, steps, node highlight, Escape clear, repeat  
- Theme switch (Arcade 1995 → Clean Corporate) with scenarios still functional  
- Illustrative section exists; not nested in hero; map stays visible across all 5 tabs  
- Advance Step progresses status for all five illustrative workflows  
- Reduced-motion booking still activates steps  
- Mobile chips + walkthroughs; Arcade 1995 mobile fit  
- Solutions Explorer open + 4 categories  
- Studio exclusion  

---

## a11y / responsive / Solutions / studio

| Check | Result |
|---|---|
| axe | 32/32 |
| Responsive (integrated + repair mobile) | PASS |
| Solutions nav | PASS (user-review + workflows-nav + repair) |
| Studio exclusion | PASS |
