# Updated Phase A Test Results — AI Solutions Advisor

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot`  
**No commit / push / deploy / live AI**

## Scores

| Suite | Result |
|-------|--------|
| Baseline `verify-advisor-phase-a-20261123.mjs` | **PASS 43/43** |
| Harden `verify-advisor-phase-a-harden-20261123.mjs` | **PASS 78/78** |
| Acceptance runner `run-advisor-acceptance-phase-a-20261123.mjs` | **PASS** — 41 Phase A executed; 27 Phase B SPEC; catalog **67**; prompt-injection cases **15** |
| Themes `verify-themes-30-20261123.mjs` | **PASS** — 30 themes; Arcade not clipped; axeViolationThemes=0; studioExcluded=true |
| Workflows `verify-workflow-repair-20261123.mjs` | **PASS 39/39** (Connected Systems + Illustrative Workflows) |
| `scripts/build-public.mjs` | **PASS** — advisor assets included; Studio omitted |

## Machine artifacts

- `qa-m6b/advisor-phase-a-test-results-20261123.json` (baseline 43/43)  
- `qa-m6b/advisor-phase-a-harden-results-20261123.json` (78/78)  
- `qa-m6b/advisor-acceptance-cases-20261123.json` (67 cases)  
- `qa-m6b/advisor-acceptance-results-20261123.json`

## Verified behaviors

- All **12** approved Advisor service mappings present; `website-transformation` not an Advisor PRIMARY.  
- Published prices reconcile to `packages.html` ($950 / $1,500 / $2,750 / from $5,000; IT $110/hr; QA $90/hr; Care $79/$149/$349; SEO $475/mo).  
- Three-issue allowance; same-issue follow-ups do not consume; fourth new issue soft-capped.  
- Active issue continues after credits reach zero.  
- Sensitive-data filtering on Advisor brief path **and** project-request message / advisor-brief.  
- Editable brief; consent required; handoff preserves `source=advisor`, brief, privacy-version.  
- Human escalation available from relevant chrome.  
- Phase A labeled as guided / rules-based / **not** live conversational AI.

## Preservation

- 30 themes preserved  
- Both workflow experiences preserved (39/39)  
- Solutions Explorer preserved on Advisor page / nav  
- Project-request integration preserved (extended, not replaced)  
- Private Studio excluded from `dist/`
