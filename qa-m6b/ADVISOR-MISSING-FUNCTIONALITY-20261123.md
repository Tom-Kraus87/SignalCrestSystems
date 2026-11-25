# Missing Functionality (post Phase A local)

**Date:** 2026-11-23

## Intentionally deferred to Phase B (plan only)

- Live conversational AI / Adaptive Support LLM turns  
- Server-enforced credit ceilings, IP rate limits, spend caps  
- Prompt-injection defenses on model I/O  
- Server-side session retention / kill-switch flag service  
- CSP changes beyond same-origin (only if proxy path requires documentation)  
- Streaming responses / paraphrase NLU  

## Phase A gaps / follow-ups for Atlas

1. **Owner privacy retention verification** still pending operational confirmation (existing privacy page uses general retention language; draft gate remains).  
2. **Contact form** still lacks an on-form consent checkbox (project-request has consent; Advisor consent + project-request consent cover Advisor path). Direct `contact.html` consent UX not fully brought to B5 parity.  
3. **Slide-over panel on every page** not shipped — dedicated `advisor.html` page used instead (safer for Solutions Explorer; matches nav “Guided Advisor”).  
4. **Full §6.3 automated matrix** covered in unit harness for primary rows; browser E2E covers one commercial + one tech path (not every chip combination).  
5. **Synonym free-text slot fill** from early M6A sketch is minimal — Phase A is chip-first (approved).  
6. **Analytics** intentionally absent (Phase A rule).  
7. **`website-transformation` service** exists on project-request but is not an Advisor PRIMARY (by design).

## Not missing (confirmed present)

- Question counter / credit display in tech mode  
- Editable brief + consent  
- Human escalation  
- Pricing citation discipline in KB/UI copy  
- Studio exclusion from dist
