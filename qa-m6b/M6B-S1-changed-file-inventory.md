# M6B S1 — Changed-file inventory

**HEAD:** `c2c2d8d069803a6856a292ecaa1d846b33b6515d` (unchanged — **no commit**)  
**Branch:** `feature/website-modernization`  
**Updated:** 2026-11-17 — remaining S1 corrections (LF / tab contrast / Work underline / Batch S1 wording) + SC 2.0 integration planning docs

## `git status --short` (production-facing)

```
 M .gitignore
 M 404.html
 M about.html
 M ai-automation.html
 M case-studies.html
 M contact.html
 M index.html
 M packages-pricing.css
 M packages.html
 M qa-process.html
 M resources.html
 M scripts/build-public.mjs
 M services.html
 M styles.css
 M work.html
?? showroom.css
?? showroom.html
?? showroom.js
?? showroom/
```

Note: `qa-m6a/` and `qa-m6b/` deliverables are present on disk but gitignored.

## Production-facing changes this round (remaining S1)

| Path | Why |
|------|-----|
| `showroom.html` | Removed public “Batch S1” eyebrow wording |
| `showroom.css` | Selected-tab AA text color + inset marker; rail Work/Pricing link underline; LF |
| `styles.css` | Active nav underline; concept-examples header link underline; LF |
| `packages-pricing.css` | Normalized CRLF → LF (S1-touched CSS) |
| `dist/*` | Rebuilt to match |

## Prior S1 production-facing (still uncommitted)

| Path | Why |
|------|-----|
| `work.html` | Restored Evergreen concept demos + modal/templates; links to showroom |
| `packages.html` | Preview thumbs + Work cross-link for verified demos |
| `packages-pricing.css` | `.pp-demo-preview` styles |
| `case-studies.html` | Link to Work concept demos |
| `showroom.html` / `showroom.css` / `showroom.js` | Interactive Showroom shell |
| `showroom/home-services.js` / `showroom/ecommerce.js` | Demos 1–2 |
| `scripts/build-public.mjs` | Allowlist + SEO path for showroom modules |

## Docs / QA (gitignored) — pointers

### S1 gates
- `qa-m6b/M6B-S1-claude-independent-qa.md`
- `qa-m6b/M6B-S1-corrections-fix-report.md`
- `qa-m6b/M6B-S1-claude-regate.md`
- `qa-m6b/M6B-S1-remaining-regate.md` ← **this round**
- `qa-m6b/verify-s1-corrections.mjs`
- `qa-m6b/verify-s1-remaining.mjs`

### Signal Crest 2.0 preparation (planning only)
- `qa-m6b/M6B-signal-crest-2.0-integration-plan.md`
- `qa-m6b/M6B-signal-crest-2.0-opportunities.md`
- `qa-m6b/M6B-signal-crest-2.0-integrated-test-plan.md`
- `qa-m6b/verify-sc20-integrated.mjs` (scaffold; exits 2 until assets exist)
- Prototype (isolated): `..\SignalCrest-2.0-Prototype\` + `README.md`

### Manifest
- `qa-m6a/M6A-manifest.md`

## Explicit non-actions

- No commit / push / merge / deploy  
- No Batch S2 Automation/CRM demos  
- No React/Next migration  
- No full Signal Crest 2.0 production drop-in of the prototype  
