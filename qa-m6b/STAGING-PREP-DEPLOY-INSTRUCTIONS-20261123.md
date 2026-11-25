# Staging Prep — Exact Staging Deployment Instructions

**Date:** 2026-11-23  
**Authorization status:** Instructions only — **do not deploy** until Atlas/human explicitly authorizes.

---

## 1. Pre-deploy source state

| Item | Value |
|---|---|
| Branch | `feature/public-v1-studio-pilot` |
| Tip (at prep time) | `c2c2d8d` + **uncommitted** Stage 1/staging-prep work |
| Remote tracking | **None** — push requires separate authorization |
| Commit | Required before CI-based Netlify build from GitHub (unless manual deploy of local `dist/` is explicitly chosen) |

---

## 2. Build + publish settings (must match)

Active `netlify.toml` (repo root):

```toml
[build]
  command = "node scripts/build-public.mjs"
  publish = "dist"
```

| Setting | Required value |
|---|---|
| Build command | `node scripts/build-public.mjs` |
| Publish directory | `dist` |
| Node | Any modern LTS capable of running the script (Node built-ins only) |

**Do not** use legacy `deploy/sync-public.ps1` / `site/` for staging or production.

---

## 3. Environment variables

### Staging (recommended first)

| Variable | Staging recommendation |
|---|---|
| `SITE_ORIGIN` | Staging site HTTPS origin **only if** you want absolute SEO/sitemap on staging (e.g. `https://<staging-subdomain>.netlify.app`). Otherwise leave unset so sitemap/absolute SEO stay omitted. |
| `SCS_PRODUCTION_RELEASE` | **Leave unset / off** on staging so a missing origin does not fail the build |

### Production (later, separate auth)

| Variable | Production recommendation |
|---|---|
| `SITE_ORIGIN` | `https://signalcrestsystems.com` (no trailing slash; https host only) |
| `SCS_PRODUCTION_RELEASE` | `1` (fail closed without origin) |

Do **not** rely on `NODE_ENV=production` for this gate.

---

## 4. Access controls (staging)

Recommended before any public marketing traffic:

1. Create / use a **separate Netlify site** for staging (or branch deploy) — **not** the production site identity if avoidable.  
2. Enable Netlify **password protection** / visitor access control on the staging site.  
3. Keep Forms notifications pointed at the owner email; delete test submissions.  
4. Confirm Custom Domain list on the staging site is **empty** or only a non-production hostname.

---

## 5. How to avoid accidental production domain publish

| Guard | Action |
|---|---|
| Separate staging site | Deploy feature branch / draft to staging site ID only |
| Domain check | Before deploy: Netlify UI → Domain management — ensure `signalcrestsystems.com` / `www` are **not** attached to the staging site |
| Production lock | Require explicit human confirmation naming the production site + domain before prod deploy |
| DNS | Do **not** change apex/www DNS as part of staging |
| CLI | Prefer Netlify UI “staging site” deploy over `netlify deploy --prod` |
| Allowlist | Confirm build log inventory has **no** `transformation-studio/` |

If using CLI later (only when authorized):

```bash
# Staging / draft-style publish of local dist (example — confirm site context first)
netlify deploy --dir=dist
# NEVER run the following without explicit production authorization:
# netlify deploy --prod --dir=dist
```

Always verify `netlify status` / linked site name before any deploy command.

---

## 6. Post-deploy staging smoke (human)

1. Homepage loads; Start a Project → `/project-request.html`.  
2. `/privacy.html` linked from footer.  
3. `/transformation-studio/` returns **404**.  
4. Netlify Forms shows `project-request` (+ `contact`).  
5. One labeled test submit → appears → delete.  
6. CSP/`_headers` present (DevTools network).  
7. Mobile nav open/close.

---

## 7. Local reproduce (no deploy)

```bash
node scripts/build-public.mjs
python -m http.server 0 --bind 127.0.0.1 --directory dist
# open the printed http://127.0.0.1:<port>/
```

This session’s actual bind: **`http://127.0.0.1:59166`**.
