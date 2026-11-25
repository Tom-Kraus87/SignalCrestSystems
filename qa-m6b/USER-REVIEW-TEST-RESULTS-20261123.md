# Test Results — V1 User Review Corrections

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot` @ `c2c2d8d`

---

## Scores

| Suite | Score | Notes |
|---|---|---|
| `build-public.mjs` | **PASS** | 60 files in `dist/`; studio omitted |
| `validate-links.mjs` | **PASS** | No broken allowlisted links |
| `verify-sc20-integrated.mjs` | **36/36** | Smoke + CSP path |
| `verify-sc20-axe.mjs` | **32/32** | After wf-step contrast fix |
| `verify-polish-functional.mjs` | **14/14** | Includes WebKit hero check |
| `verify-user-review-20261123.mjs` | **35/35** | New regression for this pass |

---

## User-review regression coverage (35/35)

- Connected Systems in hero (animated map preserved)
- Five scenario chips: quote, invoice, update, booking, reporting
- Path highlighting + step explanations + Escape clear
- Illustrative workflows section separated (`#illustrative-workflows`); not in hero
- Five illustrative tabs retained
- Solutions: open/Escape/outside-click; `aria-expanded`; four cards
- Desktop + mobile viewport containment (no H-overflow)
- No text-overlap heuristic on explorer links/titles
- Studio exclusion (dir + HTML string)
- CSP console clean under `_headers` CSP

---

## Screenshots

Directory: `qa-m6b/screenshots-user-review-20261123/`

- `desktop-connected-systems-booking.png`
- `desktop-connected-systems-reporting.png`
- `desktop-illustrative-workflows.png`
- `desktop-solutions-explorer.png`
- `mobile-connected-systems.png`
- `mobile-illustrative-workflows.png`
- `mobile-solutions-explorer.png`
