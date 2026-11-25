# Signal Crest 2.0 — File-Level Integration Plan

**Status:** Planning only — **do not** drop the prototype into production yet.  
**Visual direction:** Atlas-approved (isolated prototype).  
**Prototype package:** `C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\SignalCrest-2.0-Prototype\`  
**Authoritative README:** `SignalCrest-2.0-Prototype\README.md`  
**Baseline site:** `feature/website-modernization` @ `c2c2d8d` (+ uncommitted S1 showroom work)

---

## 1. Preserve (non-negotiable)

| Asset | Rule |
|-------|------|
| Real site header | Keep `.site-header` / nav / theme picker / mobile menu from current `index.html`. **Do not** ship `.proto-header` / `.proto-nav`. |
| Examples / portfolio demos | Keep Work + Pricing Evergreen concept demos (`#concept-demos`, `#demoModal`, `script.js` modal logic). |
| Showroom demos | Keep `showroom.html` + `showroom/*` as the full interactive destination. |
| Netlify Forms | Do not alter `contact.html` form `name`, `data-netlify`, honeypot, or field names. |
| CSP (`_headers`) | Keep `script-src 'self'`, `style-src 'self' https://fonts.googleapis.com` — **no** `'unsafe-inline'`. Prototype already complies (CSSOM for `--x/--y`, no inline style attrs). |
| Themes | Keep `themes.css` / `theme.js` / `theme-boot.js` (16 themes). Hero reads `--color-*` variables. |
| Contact routing | Keep `contact.html?service=…` deep links from map CTAs and showroom. |

---

## 2. File map — merge vs isolate

| Prototype file | Action | Target in site repo |
|----------------|--------|---------------------|
| `hero-systems.css` | **Merge (new file)** | Copy to repo root `hero-systems.css` |
| `hero-systems.js` | **Merge (new file)** | Copy to repo root `hero-systems.js` |
| `home.css` | **Merge (new file)** | Copy to repo root `home.css` (homepage-only section styles) |
| `home.js` | **Merge (new file)** | Copy to repo root `home.js` (reveal + mini demos) |
| `index.html` hero `<section class="hs-hero">` | **Merge selectively** | Replace current `.hero.hero-home` block inside existing `<main id="main">` |
| `index.html` `.hm-*` sections | **Merge selectively** | Replace or restyle below-fold homepage sections (capabilities, showroom preview, process, CTA) — keep Product Lab / honest status if still required by H3 |
| `index.html` `.proto-*` header/footer | **Leave isolated** | Do not copy |
| `assets/logo-shield.png` | **Reuse site asset** | Already at `assets/logo-shield.png` — do not duplicate |
| Prototype `screenshots/` | **Leave isolated** | Reference only |

### Existing site files during integration

| File | Role |
|------|------|
| `index.html` | Keep head (fonts, SEO, theme-boot), header, footer; swap hero + selected sections |
| `styles.css` | Keep global tokens, header, nav, shared components; **scope conflicts** — prefer `hs-*` / `hm-*` for new homepage chrome rather than rewriting global `.hero` until regression-tested |
| `script.js` | Keep for demos/modals/contact preselect; do **not** fold hero engine into it |
| `themes.css` / `theme.js` / `theme-boot.js` | Unchanged |
| `showroom.*` | Unchanged destination for secondary CTA + mini-demo “Open the full demo” links |
| `scripts/build-public.mjs` | Add new files to `ALLOWED_FILES` |
| `_headers` | Unchanged |

---

## 3. Recommended load order (`index.html`)

**Head (after fonts / before or after themes):**

1. `theme-boot.js` (already first — keep)  
2. Google Fonts (existing)  
3. `styles.css`  
4. `themes.css`  
5. `hero-systems.css`  
6. `home.css`  

**Body end:**

1. `theme.js` (existing)  
2. `script.js` (existing — modal / contact / nav)  
3. `hero-systems.js` **defer**  
4. `home.js` **defer**  

Hero JS is self-contained (`#hs-map` early-return if missing). Home JS only needs `[data-reveal]` / mini-demo hooks.

---

## 4. Theme variables

Prototype consumes site tokens with midnight-tech fallbacks:

- `--color-bg`, `--color-bg-card`, `--color-text`, `--color-text-muted`, `--color-border`
- `--color-accent`, `--color-accent-soft`, `--color-on-accent`, `--color-accent-hover`
- `--hero-glow`, `--service-icon`, `--font-*`, `--radius-*`

**Integration check:** force all 16 `data-theme` values; canvas must recolor (MutationObserver / theme attribute already in prototype). Re-run axe after load.

Node positions use CSS custom properties set via CSSOM (`element.style.setProperty('--x', …)`), which CSP allows (not `style=` attributes).

---

## 5. Secondary homepage CTA (proposed)

| Role | Label | Destination |
|------|-------|-------------|
| Primary | Start a Project | `contact.html` |
| **Secondary (proposed)** | **Explore Live Demos** | **`showroom.html`** |

**Atlas decision required:** M6A H1 locked secondary as **Explore Our Work → `work.html`**. Prototype + this brief propose showroom. Options:

1. Adopt showroom secondary (this plan’s default for SC 2.0).  
2. Keep H1 (`work.html`) and add a tertiary text link “Enter the Showroom”.  
3. Dual secondary group (Work + Showroom) — avoid in hero budget if possible.

Do not invent a new destination URL.

---

## 6. `build-public.mjs` allowlist additions

Add exactly:

```
hero-systems.css
hero-systems.js
home.css
home.js
```

Then rebuild and confirm inventory equality / identical repeat builds. Do **not** allowlist the sibling prototype folder or its screenshots.

---

## 7. Conflict risks

| Risk | Mitigation |
|------|------------|
| `.hero` / `.hero-home` rules in `styles.css` fight `.hs-hero` | Remove or neutralize old homepage hero block; keep shared `.hero` only if other pages need it |
| Duplicate brand / CTA chrome | Use site header; strip `.proto-*` |
| Mobile hero length | Prototype map is tall; budget first viewport carefully; collapse scenarios/panel on small screens (prototype already has compact layout ≤620px map) |
| Canvas CPU on low-end phones | Keep pause/off-screen stop; verify mid-range Android + iOS Safari |
| H1 CTA conflict | Explicit Atlas pick before merge |
| Product Lab honesty (H3) | If Product Lab remains on homepage, keep conceptual labeling; mini showroom cards already say fictional sample data |
| Double motion systems | Prefer prototype reveal (`home.js`) on homepage; avoid stacking old particle hero animations |
| Allowlist miss | Build fails closed — add all four files before any deploy attempt |
| Inline style regression | Never set `element.style.cssText` / `style=` in hero; stick to `setProperty` for custom props |

---

## 8. Suggested integration sequence (future Batch — not this round)

1. Copy four asset files into repo root.  
2. Wire CSS/JS into `index.html` with load order above; keep header/footer.  
3. Replace hero markup with `.hs-hero`; set secondary CTA per Atlas decision.  
4. Port desired `.hm-*` sections; drop `.proto-*`.  
5. Allowlist + `build-public.mjs`.  
6. Run integrated test matrix (`qa-m6b/M6B-signal-crest-2.0-integrated-test-plan.md`).  
7. Atlas/Claude visual + a11y gate before commit.

**This round stops after S1 remaining fixes + planning docs.**
