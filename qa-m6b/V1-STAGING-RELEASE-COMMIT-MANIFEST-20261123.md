# V1 Staging Release — Final Commit Manifest

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot` @ `c2c2d8d` + dirty worktree  
**Mode:** Inventory only — **no commit performed**

---

## Important: do not commit the current staged snapshot alone

| Index state | Count | Problem |
|---|---|---|
| Currently staged | 24 paths | Missing later staging-prep edits |
| Unstaged tracked | 16 paths | Includes builder + forms + Coming Soon copy |
| Required untracked pages | 2 | `privacy.html`, `project-request.html` |

Staged `scripts/build-public.mjs` **omits** `privacy.html` / `project-request.html` allowlist entries and **omits** `transformation-studio` from `FORBIDDEN_PREFIXES`. Those fixes exist only in the **worktree**.  
`script.js` project-request handler changes are **unstaged only**.

**When authorized:** refresh staging from the worktree before commit (`git add` of the intended paths below — not executed in this pass).

---

## Set A — Recommended public commit (27 paths)

Counts as **27 files** to include for a Forms/privacy-capable staging build.

```
.gitignore
404.html
about.html
ai-automation.html
case-studies.html
contact.html
hero-systems.css
hero-systems.js
home.css
home.js
index.html
packages-pricing.css
packages.html
privacy.html
project-request.html
qa-process.html
resources.html
script.js
scripts/build-public.mjs
services.html
showroom.css
showroom.html
showroom.js
showroom/ecommerce.js
showroom/home-services.js
styles.css
work.html
```

### Why each group belongs

| Group | Purpose |
|---|---|
| Homepage / hero / showroom assets | Public V1 marketing surface |
| Shared HTML footers + nav | Privacy + Start a Project links |
| `script.js` | Shared Netlify Forms client for `contact` + `project-request` |
| `scripts/build-public.mjs` | Allowlist publish + forbid studio leak |
| `privacy.html`, `project-request.html` | Required by current allowlist / Forms / legal notice |
| `.gitignore` | Ignore `qa-m6a/`, `qa-m6b/` |

---

## Set B — Optional studio source (15 files)

Include **only if** owner wants the private pilot sandboxed in Git (still excluded from `dist/`).

```
transformation-studio/OWNER-REVIEW.md
transformation-studio/index.html
transformation-studio/studio.css
transformation-studio/assets/logo-shield.png
transformation-studio/js/hs-app.js
transformation-studio/js/hs-assistant-engine.js
transformation-studio/js/hs-assistant.js
transformation-studio/js/hs-brief.js
transformation-studio/js/hs-config.js
transformation-studio/js/hs-core.js
transformation-studio/js/hs-icons.js
transformation-studio/js/hs-ops.js
transformation-studio/js/hs-site.js
transformation-studio/js/hs-workflow-rules.js
transformation-studio/js/hs-workflow.js
```

**Total if A+B:** **42 files**.

---

## Must NOT include

| Path / pattern | Reason |
|---|---|
| `dist/` | Generated; gitignored |
| `.netlify/` | Local prod link state; secrets-adjacent |
| `qa-m6b/`, `qa-m6a/` | QA packets; gitignored |
| `Fiverr Account info/` | Private business |
| `SignalCrest Systems Growth Engine/` | Private business |
| `SignalCrest Systems pdf downloads/` | Private business |
| `netlify-init-output.txt`, `netlify-api-data.json`, `github-webhook.json` | Local Netlify artifacts |
| `site-origin.txt` | Local origin; gitignored |
| `pricing-preview.*` | Preview-only |
| Factory / P0-B trees | Out of scope |

---

## Secrets review (manifest scope)

| Check | Result |
|---|---|
| Credential filenames | None in Sets A/B |
| API key / sk_live / PEM patterns in public pages | None found |
| Factory path modifications | None |
| Unrelated changes outside website V1 | None identified |

---

## Suggested commit message (when authorized)

```
feat: stage public V1 marketing site with Forms and privacy pages

Ship homepage/showroom modernization, project-request + privacy pages,
and harden the public allowlist so Transformation Studio stays out of dist.
```

---

## Count summary for handoff

| Bundle | File count |
|---|---|
| Currently staged (incomplete) | 24 |
| Recommended Set A | **27** |
| Optional Set B (studio) | +15 |
| A+B | **42** |
