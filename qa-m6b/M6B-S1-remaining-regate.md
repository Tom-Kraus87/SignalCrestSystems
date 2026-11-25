# M6B S1 — Remaining Corrections Re-Gate

**Date:** 2026-11-17  
**Reviewer:** Cursor (independent retest of four remaining S1 items)  
**Branch:** `feature/website-modernization`  
**HEAD (unchanged):** `c2c2d8d069803a6856a292ecaa1d846b33b6515d`  
**Safety:** No CSP loosening. No commit / push / merge / deploy. No Batch S2. No Signal Crest 2.0 production drop-in.

## VERDICT: PASS

All four remaining S1 corrections are fixed and independently verified under the real `_headers` CSP served from `dist/`. Prior F-1/F-2/F-3 focus/CSP gate (`verify-s1-corrections.mjs`) remains **18/18 pass**.

---

## Source of findings

| # | Finding | Source / evidence |
|---|---------|-------------------|
| R1 | CSS line endings | Claude independent QA residual note (CRLF warnings); `packages-pricing.css` measured **532 CRLF / 0 LF** after S1 edits while M5B policy is LF-only |
| R2 | Selected-tab contrast | Live measure on `.showroom-demo-tab.is-active` kicker/desc: **emerald-night 4.28:1**, **arcade-1995 4.41:1** (AA fail for normal text) after compositing accent-soft over card |
| R3 | Work link underline | Global `a { text-decoration: none }`; showroom rail Work link and active nav Work used **color alone** (`deco: none`). Packages Work link already underlined via `.pp-main p a` |
| R4 | Public-facing Batch S1 wording | `showroom.html` eyebrow: `Interactive Showroom · Batch S1` (process jargon on a public page) |

Prior gate docs: `M6B-S1-claude-independent-qa.md`, `M6B-S1-corrections-fix-report.md`, `M6B-S1-claude-regate.md`.

---

## What changed

| File | Change |
|------|--------|
| `packages-pricing.css` | Normalized **CRLF → LF** (532 lines) |
| `showroom.css` | Active tab: full `--color-text` for kicker/desc; inset accent bar; `.showroom-rail-meta a` underline; LF preserved |
| `showroom.html` | Eyebrow → `Interactive Showroom` (removed Batch S1); LF preserved |
| `styles.css` | `.site-nav a.is-active` underline; `.concept-examples .section-header a` underline; LF preserved |
| `dist/*` | Rebuilt via `node scripts/build-public.mjs` |

**Not touched:** `_headers`, CSP, theme JS/CSS tokens, Netlify Forms / `contact.html` fields, Batch S2, prototype production merge.

Internal developer comments may still mention “Batch S1” in `showroom.css` / `showroom.js` — not public-facing HTML.

---

## Verification

### Scripts (CSP from `dist/_headers`)

```powershell
node scripts/build-public.mjs
node qa-m6b/verify-s1-remaining.mjs   # 16/16 pass
node qa-m6b/verify-s1-corrections.mjs # 18/18 pass (prior gate)
```

### Results by item

| Item | Result | Evidence |
|------|--------|----------|
| R1 CSS line endings | **PASS** | `showroom.css`, `packages-pricing.css`, `styles.css` and dist copies: **CRLF=0** |
| R2 Selected-tab contrast | **PASS** | 16 themes × label/kicker/desc: **0 fails** under AA 4.5:1 (composited backgrounds) |
| R3 Work link underline | **PASS** | Rail Work link `underline`; nav Work `.is-active` `underline` |
| R4 Batch S1 wording | **PASS** | No `Batch S1` in public HTML; DOM eyebrow = Interactive Showroom |
| CSP | **PASS** | Zero CSP console errors |
| Prior S1 gate | **PASS** | Focus restore, no inline styles, 5-step grid |

### Screenshots

- `qa-m6b/screenshots/s1-remaining-showroom-tabs-1440.png`
- `qa-m6b/screenshots/s1-remaining-showroom-tabs-390.png`

---

## Residual notes (non-blocking)

1. `core.autocrlf=true` on Windows still warns that Git may rewrite LF→CRLF on checkout; consider adding `.gitattributes` (`* text=auto eol=lf`) in a later housekeeping commit (not done this round).
2. `ai-automation.css` still has CRLF on disk but was outside this S1 remaining set.
3. H1 secondary CTA authority (`Explore Our Work` → `work.html`) vs prototype proposal (`Explore Live Demos` → `showroom.html`) remains an Atlas decision for Signal Crest 2.0 integration — not changed on the live homepage this round.

---

## Git hygiene

- HEAD still `c2c2d8d`
- No new commit / push / merge / deploy
- `qa-m6a/` / `qa-m6b/` remain gitignored
