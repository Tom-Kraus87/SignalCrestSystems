# AI Solutions Advisor — Existing Implementation Inventory

**Date:** 2026-11-23  
**Scope:** Recovery search before Phase A implementation  
**Git:** No commit / push / deploy performed

## Verdict

**No public production Advisor UI existed in the website tree before this round.** Specs, mockups, and a private Studio demo assistant were recovered. Phase A was implemented from approved M6A/M6C documentation (not a blind rebuild).

## Recovered artifacts

| Artifact | Location | Role |
|----------|----------|------|
| M6A proposal handoff (authoritative R3 + H1–H4) | `qa-m6a/M6A-proposal-handoff.md` | Phase A Guided Solutions Advisor requirements |
| M6C Phase B Adaptive Technical Support | `qa-m6a/M6C-phase-b-adaptive-technical-support.md` | Troubleshooting credits, safety, LLM gating |
| Privacy draft | `qa-m6a/M6A-privacy-policy-draft.md` | Consent / privacy gate language |
| Visual approval addendum | `qa-m6a/M6A-visual-approval-addendum.md` | H1–H4 CTA / advisor gating |
| V2 mockups | `qa-m6a/mockups/m6a-v2-advisor-*.jpg` | Desktop/mobile/consent concepts |
| Personal store handoff + mockups | `…\u358942524\files\M6A-proposal-handoff.md`, `m6a-mockups\` | Mirror of proposal assets |
| Current agent store mockups | `…\b4d1460f-…\files\m6a-mockups\` | Mirror |
| Private Studio simulated assistant | `transformation-studio/js/hs-assistant-engine.js` | Deterministic demo assistant — **not** public Advisor; Studio remains allowlist-excluded |
| Live `privacy.html` | site root | Already published privacy page (updated to mention Advisor drafts) |
| Project request form | `project-request.html` | Current primary lead path (supersedes contact-only CTA in live site) |

## Not found (pre-implementation)

- No `advisor.html` / `advisor.js` / public knowledge-base pack in git site root  
- No slide-over Advisor panel in production pages  
- No LLM proxy / Netlify Functions for Advisor  
- Architecture folder `SignalCrest-P0B-Architecture-Design` is Factory privilege architecture — **not** Advisor product UI

## Related live surfaces preserved

- Solutions Explorer mega-menu (all public pages)  
- Five Connected Systems + five Illustrative Workflows (`hero-systems.js`, `workflow-demos.js`)  
- 30-theme engine (`theme.js` / `themes.css`)  
- `project-request.html` Netlify form  
- Private Transformation Studio excluded from `dist/`
