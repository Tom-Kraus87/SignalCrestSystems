# Staging Prep — Changed-File Inventory + Secrets Review

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot` @ `c2c2d8d`  
**Upstream:** none (local only)

---

## 1. Diff layers reviewed

| Layer | Scope |
|---|---|
| Branch tip vs `main` | Modernization already at tip (`c2c2d8d`); Stage 1+pilot mostly **uncommitted** on top |
| Staged + unstaged vs `HEAD` | SC 2.0 homepage/showroom/hero + staging-prep edits |
| Untracked | `privacy.html`, `project-request.html`, `transformation-studio/**` |

`git diff --stat HEAD` (tracked changes only): **25 files**, ~+3976 / −694.

---

## 2. Staging-prep edits this pass (on top of Stage 1)

| Path | Change |
|---|---|
| `scripts/build-public.mjs` | Drop studio allowlist; forbid `transformation-studio` prefix |
| `index.html` | Remove public sandbox deep-link from Coming Soon |
| `transformation-studio/index.html` | In-page disclaimer; no `OWNER-REVIEW.md` href |
| `transformation-studio/OWNER-REVIEW.md` | Document exclude-from-dist policy |
| `qa-m6b/STAGING-PREP-*-20261123.md` | This deliverable set |

---

## 3. Full working-tree inventory (relevant)

### Modified / added (tracked path changes vs HEAD)

- `.gitignore`
- `404.html`, `about.html`, `ai-automation.html`, `case-studies.html`, `contact.html`
- `index.html`, `packages.html`, `qa-process.html`, `resources.html`, `services.html`, `work.html`
- `hero-systems.css`, `hero-systems.js`, `home.css`, `home.js`
- `packages-pricing.css`, `styles.css`, `script.js`
- `scripts/build-public.mjs`
- `showroom.css`, `showroom.html`, `showroom.js`, `showroom/ecommerce.js`, `showroom/home-services.js`

### Untracked (must decide at commit time)

- `privacy.html`
- `project-request.html`
- `transformation-studio/` (keep in git; **do not** publish via allowlist)

### Generated / ignored (not for commit)

- `dist/` (build output)
- `.netlify/`
- Local preview PID/URL helper files under `qa-m6b/` if present

---

## 4. Secrets / sensitive path scan

| Check | Result |
|---|---|
| Filenames matching `.env`, credentials, PEM/key patterns (excl. node_modules/dist) | **None** |
| Secret-like strings in public `*.html/js/css/mjs/toml` (API keys, sk_live, service_role, private keys) | **None** |
| Factory / P0-B / broker / snapshot paths in website diff names | **None** |
| `Fiverr Account info/`, Growth Engine, pdf downloads | gitignored; builder forbidden prefixes |
| `netlify-init-output.txt` | gitignored; do not commit |

**Conclusion:** No production secrets found in Stage 1 / staging-prep source delta. No unrelated Factory infrastructure changes.

---

## 5. Commit guidance (when separately authorized)

1. Include public pages + `privacy.html` + `project-request.html` + `transformation-studio/**` source.  
2. Confirm allowlist still excludes studio from `dist/`.  
3. Optionally include `qa-m6b/STAGING-PREP-*-20261123.md` and Stage 2 docs.  
4. Never commit `.env`, `.netlify/`, `dist/`, `netlify-init-output.txt`, Fiverr/Growth Engine trees.
