# Screenshots & Test Results — Advisor Phase A

**Date:** 2026-11-23  
**No commit / push / deploy**

## Screenshots

Directory: `qa-m6b/screenshots-advisor-phase-a-20261123/`

| File | What it shows |
|------|----------------|
| `advisor-welcome-desktop.png` | Two-mode welcome + disclosure |
| `advisor-recommend-desktop.png` | Commercial recommendation (custom software path) |
| `advisor-brief-consent-desktop.png` | Editable brief; Send disabled pre-consent |
| `advisor-tech-step-desktop.png` | Troubleshooting step + credit counter |
| `advisor-welcome-mobile.png` | Mobile 390×844 welcome |

## Test scores

| Suite | Result |
|-------|--------|
| `verify-advisor-phase-a-20261123.mjs` | **PASS** — 43/43 checks (R3.1 matrix sample + credits + files + allowlist) |
| `capture-advisor-phase-a-20261123.mjs` | **PASS** — smoke UX + **axe 0 violations** on advisor |
| `scripts/build-public.mjs` | **PASS** — 64 files; advisor assets included |
| `validate-links.mjs` | **PASS** — 0 failures (includes `advisor.html`) |
| `verify-workflow-repair-20261123.mjs` | **PASS** — 39/39 (Connected Systems + Illustrative Workflows) |
| `verify-themes-30-20261123.mjs` | **PASS** — 30 themes; Arcade not clipped; axeViolationThemes=0; studioExcluded=true |
| Studio exclusion | **PASS** — `dist/transformation-studio` absent |

Machine JSON: `qa-m6b/advisor-phase-a-test-results-20261123.json`, `qa-m6b/advisor-phase-a-capture-results-20261123.json`

## Preservation confirmation

- Five Connected Systems scenarios: preserved (workflow repair PASS)  
- Five Illustrative Workflows: preserved (workflow repair PASS)  
- All 30 themes + Arcade 1995 fix + theme selector: preserved (themes-30 PASS)  
- Solutions Explorer: still present in nav markup + capture check  
- Existing project-request form: extended, not replaced  
- Private Studio: excluded from dist
