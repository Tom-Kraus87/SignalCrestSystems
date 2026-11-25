# Root Cause — Connected Systems + Illustrative Workflow Regressions

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot` @ `c2c2d8d`  
**Parallel agents:** theme-engine `4cb3cf5d` · workflow-nav `1ac57741` · user-review `eb893682`  
**Release status:** **HOLD**

---

## Regression 1 — Appointment booking & Business reporting (Connected Systems 4 & 5)

**Root cause:** Missing scenario data + HTML/JS wiring drift after the workflow-nav expansion, not a canvas rewrite.

Workflow-nav (`1ac57741`) expanded “five workflows” as **illustrative tab demos** nested in the hero and left Connected Systems with only the original three chips / `SCENARIOS` entries (`quote`, `invoice`, `update`). Appointment booking and Business reporting were never added to `hero-systems.js` in that pass. When chips for 4/5 later appeared in HTML without matching `SCENARIOS` keys (or the reverse during parallel edits), `startScenario(key)` did `SCENARIOS[key].title` on `undefined` and threw — killing further map interaction. Theme-engine (`4cb3cf5d`) concurrently edited shared page headers/theme pickers; that increased overwrite risk on `index.html` but did not remove the animated network.

**Fix retained/hardened:** `booking` + `reporting` entries in `SCENARIOS`, matching hero chips, path hops on existing edges, and a guard so missing keys announce instead of throwing.

---

## Regression 2 — Illustrative Workflows disappearing / competing with the map

**Root cause:** Structural nesting from workflow-nav, then separation incomplete until user-review reconciled coexistence.

Workflow-nav placed the five illustrative demos **inside** the hero stage as tabs that swapped away the Connected Systems map. Owner review required both experiences: hero network scenarios **and** a separate Illustrative Workflows section. User-review (`eb893682`) moved walkthroughs to `#illustrative-workflows` with Advance Step / stages. Theme-engine was instructed not to touch `hero-systems.*` / `workflow-demos.*`, but shared `index.html` header edits still required careful reconciliation so theme picker markup did not clobber workflow body structure.

**Fix retained:** Hero keeps the animated `#hs-map` + five scenario chips; `#illustrative-workflows` holds five educational walkthroughs (including Connected Systems as a text walkthrough distinct from the hero map).

---

## Not the cause

- Network was **not** replaced with static cards.
- Theme registry / Arcade 1995 typography / Solutions Explorer corrections are preserved.
- No JS error remains on the five working scenarios after repair.
