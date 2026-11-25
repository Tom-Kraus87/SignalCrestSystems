# V1 Staging Release — Exact Staging Deployment Plan

**Date:** 2026-11-23  
**Authorization:** Plan only — **do not deploy** until owner explicitly approves  
**STOP:** No Netlify CLI deploy executed in this review

---

## 0. Current Netlify reality (discovered)

| Item | Value |
|---|---|
| Repo `netlify.toml` | `command = "node scripts/build-public.mjs"`, `publish = "dist"` |
| Local CLI linked site | **`signalcrest-systems`** (PRODUCTION) |
| Production URL | `https://signalcrestsystems.com` |
| Production site ID | `d6ee9a3a-2679-4df7-957e-99ab734ec39c` |
| Admin | `https://app.netlify.com/projects/signalcrest-systems` |
| Isolated SCS staging site | **Does not exist** |
| GitHub feature branch on remote | **Does not exist yet** |

**Do not deploy using the current CLI link** — it targets production.

---

## 1. Preconditions (owner-authorized sequence)

1. Approve **commit** of Set A (and optionally Set B) on `feature/public-v1-studio-pilot` after refreshing the index from the worktree.  
2. Approve **push**: `git push -u origin feature/public-v1-studio-pilot` to `https://github.com/Tom-Kraus87/SignalCrestSystems.git`.  
3. Create a **new** Netlify site for staging (recommended name: `signalcrest-systems-staging`).  
4. Connect that staging site to the GitHub repo **or** prepare a one-off draft deploy of local `dist/` **only** after `netlify link` points at the staging site ID.  
5. Confirm staging Domain management has **no** `signalcrestsystems.com` / `www`.  
6. Prefer password protection / visitor access control on staging.  
7. Leave production site, DNS, and production env vars untouched.

---

## 2. Staging site configuration (exact)

| Setting | Staging value |
|---|---|
| Build command | `node scripts/build-public.mjs` |
| Publish directory | `dist` |
| Production branch (if Git-connected) | Prefer building from `feature/public-v1-studio-pilot` **or** use branch deploys only on the **staging** site |
| `SCS_PRODUCTION_RELEASE` | **Unset / off** |
| `SITE_ORIGIN` | Optional: staging HTTPS origin only if absolute SEO desired; otherwise leave unset |
| Custom domains | **Empty** (use `*.netlify.app` only) |
| DNS changes | **None** |

---

## 3. How to ensure production / DNS are not overwritten

| Guard | Verification |
|---|---|
| Separate site ID | Staging site ID ≠ `d6ee9a3a-2679-4df7-957e-99ab734ec39c` |
| CLI context | `netlify status` must show staging project name/URL, **not** `https://signalcrestsystems.com` |
| No `--prod` on prod link | Never run `netlify deploy --prod` against production for this release |
| Domain panel | Staging site has zero production hostnames |
| DNS provider | No apex/www record edits as part of staging |
| Production lock | Require a **separate** written approval naming production site + domain before any prod publish |

### Forbidden for this staging release

```bash
# Forbidden while linked to signalcrest-systems / production:
netlify deploy --prod
netlify deploy --prod --dir=dist
```

### Safe pattern (only after staging site exists + linked)

```bash
node scripts/build-public.mjs
netlify status   # must show staging site, not signalcrestsystems.com
netlify deploy --dir=dist
# Use draft URL; avoid --prod unless staging site's "production" slot is the intended staging hostname
```

Prefer Netlify UI “Deploys → Trigger deploy” on the **staging** site after Git push.

---

## 4. Post-deploy staging smoke (human)

1. Homepage loads; Start a Project → `/project-request.html`.  
2. Footer Privacy → `/privacy.html`.  
3. `/transformation-studio/` and `/transformation-studio/index.html` → **404**.  
4. Deploy file inventory / build log: no `transformation-studio/`.  
5. Netlify Forms lists `contact` and `project-request`.  
6. Run Forms acceptance procedure (separate annex) on **staging only**.  
7. Confirm `_headers` / CSP present.  
8. Mobile nav open/close.

---

## 5. Local reproduce (no deploy)

```bash
node scripts/build-public.mjs
python -m http.server 0 --bind 127.0.0.1 --directory dist
# open printed http://127.0.0.1:<port>/
```

Studio sandbox (source tree only, not dist):

```bash
npx --yes serve -l 0 .
# then /transformation-studio/ on that origin
```

---

## 6. Production (explicitly out of scope)

| Item | Status |
|---|---|
| Deploy to `signalcrest-systems` | **Not authorized** by this handoff |
| Attach/change DNS | **Not authorized** |
| `SCS_PRODUCTION_RELEASE=1` + `SITE_ORIGIN=https://signalcrestsystems.com` | Production-only, later |
| Merge to `main` | Separate approval |
