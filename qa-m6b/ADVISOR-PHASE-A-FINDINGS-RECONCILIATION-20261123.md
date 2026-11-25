# Phase A Findings Reconciliation — AI Solutions Advisor

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot` (confirmed)  
**Snapshot:** Claude independent architecture review of the **23:54 UTC** implementation artifact  
**Artifact time map:** `qa-m6b/advisor-phase-a-test-results-20261123.json` written **18:54 EST / 23:54 UTC** — **43/43 PASS**  
**Atlas:** Provisional acceptance with extra security / concurrency requirements  
**Authority:** Local hardening only — no commit / push / deploy / live AI

## Snapshot identity

| Item | Value |
|------|-------|
| Review target | Local Phase A Advisor after initial recovery (43/43 harness) |
| UTC stamp | **23:54** (matches test-results write time) |
| Core files | `advisor.html`, `advisor.js`, `advisor.css`, `advisor-kb.json`, `project-request.html`, `script.js` |
| Spec baseline | `qa-m6a/M6A-proposal-handoff.md`, `qa-m6a/M6C-phase-b-adaptive-technical-support.md` |

> Note: A separate Claude-authored markdown review file was **not** present under `qa-m6a/` / `qa-m6b/` at harden time. Reconciliation uses the 23:54 UTC 43/43 artifact + Atlas provisional acceptance notes + `ADVISOR-MISSING-FUNCTIONALITY-20261123.md` + independent code audit against approved requirements.

## Findings matrix

| ID | Finding (Claude / Atlas class) | Severity | Status at 23:54 | Status after harden | Evidence |
|----|--------------------------------|----------|-----------------|---------------------|----------|
| F1 | Phase A must be clearly **not** live conversational AI | P0 | **Resolved** | **Resolved** | Banner + meta + `usesLanguageModel:false` |
| F2 | R3.1 **12 service** PRIMARY mappings | P0 | **Resolved** (17 matrix rows) | **Resolved** | Harden suite service + matrix checks |
| F3 | Pricing only from published catalog | P0 | **Resolved** | **Resolved** | KB ↔ `packages.html` price needles |
| F4 | 3 free issues; follow-ups free | P0 | **Resolved** | **Resolved** | Credit engine + mid-issue continuation |
| F5 | Soft-cap must not hard-cut active issue | P0 | Mostly resolved | **Resolved** | Soft-cap redirects to active walkthrough |
| F6 | Editable brief + consent gate | P0 | **Resolved** | **Resolved** | Brief screen; Send disabled until consent |
| F7 | Handoff `source=advisor` + brief + privacy-version | P0 | **Resolved** | **Resolved** | `writeHandoff` + project-request fields |
| F8 | Human escalation always available | P0 | **Resolved** | **Resolved** | `chromeActions` / welcome human chip |
| F9 | **Sensitive-data checks on project-request message** (and brief) | P1 | **Gap** (brief-only) | **Resolved** | `script.js` `SENSITIVE_RE` + hint copy |
| F10 | Expanded secret patterns (card / API key) | P1 | Partial | **Resolved** | Shared classifier in advisor + form |
| F11 | Client credit counters are not a trust boundary | P1 (Phase B) | Accepted for Phase A | **Design** | Phase B server enforcement required |
| F12 | Phase B concurrency / atomic spend & rate | P0 (Phase B) | Open | **Design** | Blobs ≠ atomic RMW — see feasibility |
| F13 | Contact.html consent parity | P2 | Deferred | Deferred | Advisor + project-request cover Advisor path |
| F14 | Privacy retention operational Owner verify | P2 | Open | Open | Owner gate unchanged |
| F15 | Slide-over panel every page | P3 | Deferred | Deferred | Dedicated `advisor.html` (approved direction) |
| F16 | Studio must stay private / excluded | P0 | **Resolved** | **Resolved** | themes-30 `studioExcluded=true` |
| F17 | Preserve 30 themes + both workflow experiences + Solutions Explorer | P0 | **Resolved** | **Resolved** | themes 30 PASS; workflows 39/39 |

## Explicit harden deltas since 23:54 UTC snapshot

1. Project-request **message** + **advisor-brief** sensitive-info gate in `script.js`.  
2. Hint under project-request message field.  
3. Expanded secret classifier (card numbers, CVV, API keys) in `advisor.js` + mirror in `script.js`.  
4. Soft-cap screen refuses to strand an **active** issue (redirect to `tech_step`).  
5. Harden verification suite **78/78** + acceptance catalog **67** (≥15 prompt-injection).

## Verdict

**Phase A local finalization: COMPLETE for Atlas / Owner review.**  
Remaining opens are Owner privacy retention verify, optional contact.html consent parity, and **all Phase B implementation** (gated).
