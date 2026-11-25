# M6B Batch S1 — Interactive Showroom Test Report

**Date:** 2026-11-17  
**Scope:** Showroom foundation + Demo 1 Home Services + Demo 2 E-commerce  
**Out of scope:** Batch S2 Automation / CRM  
**Safety:** No commit / push / merge / deploy

---

## Functional demo instructions

### Open the showroom
1. Serve the repo root (or open `showroom.html` via local static server).  
2. Navigate to `showroom.html` (also linked from `work.html`).

### Demo 1 — Home Services
1. Select **Home Services** in the left rail (default).  
2. Enter a fictional customer name + phone/email; pick a service; optional notes.  
3. Click **Request sample estimate** → sample price range + job ID appear.  
4. Click **Advance job status** through Received → … → Complete.  
5. Edit follow-up text; click **Simulate send follow-up** (no email/SMS sent).  
6. **Build Something Like This** → `contact.html?service=custom-software`.

### Demo 2 — E-commerce
1. Select **E-commerce** tab (or `#demo-ecommerce`).  
2. Filter categories; open a product; **Add to cart**.  
3. **Start simulated checkout** → **Confirm sample order**.  
4. Confirm banner states no payment / no external order.  
5. **Build Something Like This** → `contact.html?service=custom-software`.

### Keyboard
- Arrow keys / Home / End move between demo tabs.  
- Tab through form controls; focus rings visible.

---

## Viewports tested (capture script)

| Viewport | Pages |
|----------|-------|
| 1440×900 | showroom (both demos), work, packages, case-studies, homepage |
| 1024 / 768 / 390 / 320 | showroom + work concept demos (see screenshots folder) |

Screenshots: `qa-m6b/screenshots/after-*`, `s1-*`

---

## Architecture checks

| Check | Result |
|-------|--------|
| Static HTML/CSS/JS only | Pass |
| No new third-party scripts | Pass |
| CSP unchanged (`script-src 'self'`) | Pass (no `_headers` edit required) |
| Allowlist updated (`showroom.html`, CSS/JS modules) | Pass |
| Themes use CSS variables | Pass |
| Netlify Forms / `contact.html` untouched for form fields | Pass |
| Batch S2 not started | Pass |

---

## Known limitations

1. Showroom not yet in global nav on every page (reachable from Work + showroom footer).  
2. `source=showroom-*` query is informational; contact form currently preselects `service` only.  
3. Demo state is in-memory per mount (reset on reload).  
4. E-commerce swatches are CSS placeholders, not product photography.  
5. No automated axe CI in this round — manual keyboard check only.  
6. Batch S2 Automation/CRM intentionally not built.

---

## STOP

Awaiting **Atlas and Claude review** before Batch S2 or commit.
