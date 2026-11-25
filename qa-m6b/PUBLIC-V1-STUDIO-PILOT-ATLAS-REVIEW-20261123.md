# Atlas Review Packet — Public Website V1 + Transformation Studio Pilot

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot`  
**Goal:** Usable customer-facing site by Nov 30, 2026 + owner-admin plan + Stone Harbor studio pilot  
**STOP:** No external service provisioning, DB changes, or production deploy performed

---

## Executive summary

Stage 1 is ready for Atlas review on branch **`feature/public-v1-studio-pilot`** (local only, uncommitted beyond branch creation). Public pages include responsive nav, coming-soon posters, `project-request.html`, `privacy.html`, and a sandboxed **Stone Harbor Tradeworks** Transformation Studio reused from Home Services Studio. Local build + link/axe/integrated/polish checks **passed**. Admin/auth/DB remain **design-only**.

---

## Deliverables index

| # | Document |
|---|---|
| 1 | [PUBLIC-V1-STUDIO-PILOT-IMPLEMENTATION-INVENTORY-20261123.md](PUBLIC-V1-STUDIO-PILOT-IMPLEMENTATION-INVENTORY-20261123.md) |
| 2 | [PUBLIC-V1-STUDIO-PILOT-CHANGED-FILES-TESTS-20261123.md](PUBLIC-V1-STUDIO-PILOT-CHANGED-FILES-TESTS-20261123.md) |
| 3 | Preview how-to — same file §3 |
| 4 | [PUBLIC-V1-ADMIN-BACKEND-PLAN-DESIGN-ONLY-20261123.md](PUBLIC-V1-ADMIN-BACKEND-PLAN-DESIGN-ONLY-20261123.md) |
| 5–6 | [PUBLIC-V1-STUDIO-PILOT-LAUNCH-BLOCKERS-APPROVALS-20261123.md](PUBLIC-V1-STUDIO-PILOT-LAUNCH-BLOCKERS-APPROVALS-20261123.md) |
| Studio gate | [../transformation-studio/OWNER-REVIEW.md](../transformation-studio/OWNER-REVIEW.md) |

### Screenshots

- `qa-m6b/screenshots/v1-home-desktop-20261123.png`
- `qa-m6b/screenshots/v1-project-request-20261123.png`
- `qa-m6b/screenshots/v1-stone-harbor-studio-20261123.png`

---

## What was built

### Public

- Refined homepage + responsive navigation  
- Coming-soon section (posters; CSP-safe)  
- Project request form UI (Netlify Forms attrs, honeypot, consent)  
- Privacy page + footer links  
- CTAs point to `project-request.html`

### Stone Harbor Transformation Studio

- Isolated under `transformation-studio/`  
- Concept disclaimers + owner-review gate  
- Sample-data home-services upgrade path (website → estimates → scheduling → assistant → automation → ops)

---

## Test summary

`build-public` OK · link validation OK · SC20 integrated OK · axe 32/32 OK · polish functional OK (incl. WebKit)

---

## Preview how-to

```bash
node scripts/build-public.mjs
npx --yes serve -l 5173 dist
# open /, /project-request.html, /transformation-studio/
```

---

## Next-stage approval asks (short)

Commit/push? Deploy? Supabase vs Clerk? Admin host? Owner email? Forms→DB path? Privacy publish? Stone Harbor share policy? Authorize Stage 2 cloud provisioning (not Factory)?

---

## Hard boundaries confirmation

Factory, snapshots, P0-B foundations, brokers, Windows ACLs/credentials: **untouched**. Admin plan stays off the Factory host.
