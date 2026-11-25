# Signal Crest 2.0 — Integrated-Environment Test Reproduction Plan

**Purpose:** Reproduce the isolated prototype’s accessibility, responsive, and performance checks **after** hero/home assets are wired into the real static site (`dist/` + real `_headers` CSP) — not only against `SignalCrest-2.0-Prototype/`.

**Do not run the full visual rebuild yet.** Scripts below may be added/extended under `qa-m6b/` now; full suite execution waits for integration.

---

## 1. Preconditions

```powershell
cd "C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC"
node scripts/build-public.mjs
# Confirm allowlist includes: hero-systems.css/js, home.css/js
# Serve dist with CSP (same pattern as verify-s1-*.mjs)
```

Always test **`dist/`** with CSP from `dist/_headers`. Never loosen CSP for tests.

---

## 2. Test matrix

| # | Area | What | Pass criteria |
|---|------|------|---------------|
| T1 | Build / allowlist | `build-public.mjs` | Exit 0; new files in inventory; repeat build identical |
| T2 | CSP | Console on homepage + showroom | Zero CSP / inline-style violations |
| T3 | Header preserve | Homepage DOM | `.site-header` present; no `.proto-header` |
| T4 | Themes | 16 `data-theme` values | Hero canvas + CTAs render; no missing tokens |
| T5 | axe-core | Homepage @ 1440 + 390 × 16 themes | 0 violations (prototype claimed 32 clean runs) |
| T6 | Keyboard hero | Tab → map group; arrows; Enter; Esc | Focus visible; live region announces; single tab stop in map |
| T7 | Reduced motion | `prefers-reduced-motion: reduce` | Static canvas; no scroll reveal motion; scenarios instant |
| T8 | Pause control | Pause / Play motion | WCAG 2.2.2; `aria-pressed` toggles |
| T9 | Responsive | 320 / 390 / 768 / 1024 / 1440 | No horizontal overflow; compact map ≤620px width |
| T10 | Mobile hero length | 390 first viewport | Brand + H1 + lead + CTAs readable without excessive scroll before CTA action |
| T11 | Perf ambient | Desktop + 390, mid CPU | Median ≥ ~50 fps ambient; loop stops off-screen |
| T12 | Perf scenario | Scenario + pointer | p95 frame time roughly ≤20–33 ms on mid device; document if software-renderer skews |
| T13 | Weight | Network | Hero JS gzip ≤12 KB target; no new third-party scripts |
| T14 | Forms | `contact.html` | Netlify attrs intact; `?service=` preselect works from map CTAs |
| T15 | Portfolio regression | Work + Pricing | All 3 concept demos open; Escape closes |
| T16 | Showroom | Both demos | Prior S1 gates still pass (`verify-s1-corrections.mjs`, `verify-s1-remaining.mjs`) |
| T17 | Links | Homepage CTAs | Primary → contact; secondary → showroom **or** work per Atlas decision |
| T18 | Honest claims | Hero + mini demos | “Illustrative / Simulated / Fictional” copy present |

---

## 3. Commands / scripts

### Existing (run anytime)

```powershell
node scripts/build-public.mjs
node qa-m6b/verify-s1-corrections.mjs
node qa-m6b/verify-s1-remaining.mjs
node qa-m6b/validate-links.mjs
```

### To add at integration time (stubs authorized now)

| Script | Role |
|--------|------|
| `qa-m6b/verify-sc20-integrated.mjs` | CSP server on `dist/`; T2–T4, T9 overflow, T14–T18 smoke |
| `qa-m6b/verify-sc20-axe.mjs` | axe-core 16 themes × 2 viewports (T5) |
| `qa-m6b/verify-sc20-keyboard-hero.mjs` | Playwright keyboard path for map (T6–T8) |
| `qa-m6b/measure-sc20-hero-perf.mjs` | FPS / frame time / off-screen idle (T11–T13) |

Prototype measurements used headless Chromium (software canvas — pessimistic). Re-measure on a real GPU browser before calling perf done.

### Manual / device

- iOS Safari + mid-range Android: hero motion, pause, theme switch, contact deep link.
- Screen reader spot-check (NVDA or VoiceOver): map selection + scenario steps via live region.

---

## 4. Evidence to collect post-integration

- `qa-m6b/screenshots/sc20-home-{1440,1024,768,390,320}.png`
- `qa-m6b/screenshots/sc20-home-theme-{id}-1440.png` (sample of 4 themes minimum)
- `qa-m6b/screenshots/sc20-reduced-motion-390.png`
- JSON summaries from axe + perf scripts
- Short markdown gate report: `qa-m6b/M6B-SC20-integration-gate.md` (create when integration runs)

---

## 5. Gate rule

**PASS** only if T1–T18 pass (or Atlas explicitly waives a cell).  
Any CSP failure or Netlify Forms regression = **BLOCKED**.
