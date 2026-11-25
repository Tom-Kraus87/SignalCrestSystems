# Coexistence Confirmation — Connected Systems + Illustrative Workflows

**Date:** 2026-11-23  
**Verdict:** **BOTH EXPERIENCES COEXIST** with clear separation.

---

## Connected Systems (hero)

- Location: `.hs-hero .hs-stage` / `#hs-map`  
- Experience: animated network diagram (canvas + node buttons)  
- Exactly **five** working scenarios: Quote request, Invoice email, Customer update, Appointment booking, Business reporting  
- Selector chips, source/processing/destination highlight, animated paths, explanatory steps, repeatable, theme-safe, keyboard/mouse/touch, reduced-motion aware  
- **Not** replaced by static cards  

## Illustrative Workflows (secondary section)

- Location: `#illustrative-workflows` (below capabilities / above Product Lab cards)  
- Distinct from hero network; labeled educational / illustrative  
- Five walkthroughs: Connected Systems (text walkthrough linking to map), Website Transformation, Customer Lead Automation, Custom Software Development, Digital Care & IT Operations  
- Each: title, description, selectable stages, step content, Advance Step, solution nav links  

## Separation checks (automated)

| Check | Result |
|---|---|
| Map in hero | PASS |
| `data-wf-root` not inside `.hs-hero` | PASS |
| Map remains visible while illustrative tabs switch | PASS |
| Five CS chips + five illustrative tabs | PASS |
