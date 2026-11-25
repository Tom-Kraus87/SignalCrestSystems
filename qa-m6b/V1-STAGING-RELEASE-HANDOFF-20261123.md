# V1 Staging Release Handoff — Final Git & Deployment Review

**Date:** 2026-11-23  
**Review mode:** Read-only (status / diff / log / local config inspection only)  
**Workspace:** `Signal Crest Systems LLC`  
**STOP:** No git commit, no push, no Netlify deploy, no DNS / production changes performed

---

## Executive verdict

Local staging **prep** matches prior QA scores (36/36, axe 32/32, polish 14/14) and **Stone Harbor / Transformation Studio is absent from `dist/`**.  
The repo is **not yet push/deploy-ready** without owner authorization because:

1. Working tree is dirty; **staged index is incomplete** vs the intended staging-prep worktree.  
2. Feature branch has **no GitHub upstream**.  
3. Local Netlify CLI is linked to the **production** site (`signalcrest-systems` → `https://signalcrestsystems.com`).  
4. **No isolated Signal Crest staging Netlify site** exists in the account (only production).  
5. `privacy.html` still needs **owner / legal approval** before real PII intake.

---

## 1. Repository & branch confirmation

| Item | Value |
|---|---|
| Repo root | `C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC` |
| Current branch | `feature/public-v1-studio-pilot` *(checked out)* |
| HEAD | `c2c2d8d` — `feat: implement redesigned homepage and concept demos` |
| Upstream tracking | **None** |
| Remote `origin` | `https://github.com/Tom-Kraus87/SignalCrestSystems.git` |
| Remote branches visible | `origin/main` only (feature branch **not** on GitHub yet) |
| Related local branches | `feature/website-modernization` @ same tip; `feature/ai-services-content` (worktree); `main` @ `5ae9ac6` tracking `origin/main` |

**Intended push target (when authorized):**

```text
Remote URL:  https://github.com/Tom-Kraus87/SignalCrestSystems.git
Branch:      feature/public-v1-studio-pilot
Command:     git push -u origin feature/public-v1-studio-pilot
```

Do **not** push to `main` for this staging release.

---

## 2. Git status summary (read-only)

| Layer | Count | Notes |
|---|---|---|
| Staged | **24** paths | Incomplete vs worktree (missing later staging-prep edits) |
| Unstaged tracked edits | **16** paths | Includes critical `scripts/build-public.mjs`, `index.html`, `script.js` |
| Untracked public pages | **2** | `privacy.html`, `project-request.html` |
| Untracked studio sandbox | **15** files under `transformation-studio/` | Source-only pilot; excluded from `dist/` |
| Ignored (must not commit) | `dist/`, `qa-m6b/`, `.netlify/`, business folders | `.gitignore` already covers |

Porcelain highlights: many paths are `MM` (staged + further unstaged). **`script.js` is unstaged only** (` M`). Untracked privacy / project-request pages are required for the current allowlist build.

---

## 3. Credentials / private artifacts / Factory / unrelated changes

| Check | Result |
|---|---|
| Secret-like strings in intended public source | **None** (benign “token” / `.env` deny-list mentions only) |
| `.env` / PEM / API key files in commit candidates | **None** |
| Factory / P0-B / broker trees in website diff | **None** |
| `Fiverr Account info/`, Growth Engine, pdf downloads | Present on disk; **gitignored** + builder `FORBIDDEN_PREFIXES` |
| `qa-m6b/` QA packets | **gitignored** (handoff stays local unless policy changed) |
| `dist/` | **gitignored** generated publish dir |
| `.netlify/` | Local link state; **do not commit** |
| Unrelated client demo Netlify sites | Exist in account; **not** part of this website commit |

**Conclusion:** No credentials or Factory infrastructure changes are in the intended website delta. Studio sandbox is concept/sample data only.

---

## 4. Intended commit file list

See annex: [V1-STAGING-RELEASE-COMMIT-MANIFEST-20261123.md](V1-STAGING-RELEASE-COMMIT-MANIFEST-20261123.md).

**Recommended set when owner authorizes commit:**

- **27 public/site paths** (tracked dirty + `privacy.html` + `project-request.html`), after **refreshing the index from the worktree** (do not commit the incomplete staged snapshot alone).  
- **Optional +15** `transformation-studio/**` source files (keep allowlist exclusion).  
- **Exclude:** `dist/`, `.netlify/`, `qa-m6b/` (unless owner wants QA docs tracked — currently ignored), business folders, `netlify-init-output.txt`.

**Critical staging-index gap:** Staged `scripts/build-public.mjs` does **not** yet include `privacy.html` / `project-request.html` allowlist entries or `transformation-studio` in `FORBIDDEN_PREFIXES`. Those exist only in the **unstaged** worktree. Committing staged-only would ship an incomplete builder.

---

## 5. Studio absent from publish directory (`dist/`)

| Check | Result |
|---|---|
| `dist/transformation-studio/` | **Absent** |
| Dist filename matches `*studio*` / `*stone*` / `*harbor*` | **None** |
| `transformation-studio` string in `dist/*.html` | **None** |
| Dist file count | **59** (matches staging-prep allowlist + `robots.txt`) |
| Source `transformation-studio/` still on disk | **Yes** (private pilot) |
| Builder defense | Worktree adds `transformation-studio` to `FORBIDDEN_PREFIXES` |

**Studio-in-dist status: ABSENT (PASS)** for current local `dist/`.

---

## 6. GitHub push target (exact)

| Field | Value |
|---|---|
| Remote name | `origin` |
| Remote URL (HTTPS) | `https://github.com/Tom-Kraus87/SignalCrestSystems.git` |
| Branch to push | `feature/public-v1-studio-pilot` |
| Exists on remote today? | **No** (`git ls-remote --heads` empty for this branch) |
| Production branch | `main` @ `origin/main` — **do not** merge/push staging work here without separate prod approval |

---

## 7. Netlify staging configuration (discovered; not deployed)

### Repo `netlify.toml` (authoritative for Git builds)

```toml
[build]
  command = "node scripts/build-public.mjs"
  publish = "dist"
```

### Local CLI link (DANGER — production)

| Field | Value |
|---|---|
| Linked project | **`signalcrest-systems`** |
| Project ID | `d6ee9a3a-2679-4df7-957e-99ab734ec39c` |
| Project URL | **`https://signalcrestsystems.com`** (production custom domain) |
| Admin URL | `https://app.netlify.com/projects/signalcrest-systems` |
| Git repo on site | `git@github.com:Tom-Kraus87/SignalCrestSystems.git` |
| Isolated SCS staging site | **Not found** among 29 account sites |

### Account note

Only Signal Crest marketing site found: production `signalcrest-systems`. Other “signalcrest” hits are **client demos** (e.g. `g-squared-electric-signalcrest-demo`), not SCS staging.

### Local `.netlify/netlify.toml` quirk

Cached local publish path still points at **repo root** (legacy). Root `netlify.toml` correctly uses `publish = "dist"`. Prefer Git-connected builds from root toml; do not rely on stale local CLI cache without re-linking a **new staging site**.

Full plan: [V1-STAGING-RELEASE-DEPLOY-PLAN-20261123.md](V1-STAGING-RELEASE-DEPLOY-PLAN-20261123.md).

---

## 8. How staging will not overwrite production / DNS

| Guard | Required action |
|---|---|
| Separate site | **Create** a new Netlify site (e.g. `signalcrest-systems-staging`) — does not exist today |
| Do not use linked prod | Never `netlify deploy --prod` while linked to `signalcrest-systems` |
| Domain check | Staging site Domain management must **not** list `signalcrestsystems.com` / `www` |
| DNS | Leave apex/www DNS untouched; staging uses `*.netlify.app` (or non-prod hostname only) |
| Branch deploys (alt) | If using production site branch deploys, use **Draft / branch deploy** only — still riskier than a separate site; owner must explicitly accept |
| Env | Staging: leave `SCS_PRODUCTION_RELEASE` unset; optional staging-only `SITE_ORIGIN` |
| Build inventory | Confirm deploy log has **no** `transformation-studio/` |

**Current risk:** Any accidental CLI deploy against the linked site targets **production**. Treat as a **P0 process blocker** until a staging site is created and linked (or CLI context is explicitly switched).

---

## 9. Netlify Forms acceptance procedure

Documented (do not execute against production):  
[V1-STAGING-RELEASE-NETLIFY-FORMS-ACCEPTANCE-20261123.md](V1-STAGING-RELEASE-NETLIFY-FORMS-ACCEPTANCE-20261123.md).

Forms present in markup: `contact`, `project-request` (honeypot + hidden `form-name`). Live persistence requires a hosted Netlify deploy of `dist/`.

---

## 10. Privacy language requiring owner approval

Checklist: [V1-STAGING-RELEASE-PRIVACY-REVIEW-CHECKLIST-20261123.md](V1-STAGING-RELEASE-PRIVACY-REVIEW-CHECKLIST-20261123.md).

High-signal approval asks on `privacy.html` (Last updated November 23, 2026):

- Collection examples spanning contact + project-request fields  
- Netlify Forms (and “future managed database”) as storage  
- Explicit “not stored in AI Software Factory” claim  
- Retention / deletion via email process  
- Contact form **lacks** consent checkbox (project-request has consent)  
- Theme `localStorage` not disclosed  
- Subprocessors not named beyond implied hosting  

---

## Remaining release blockers

Annex: [V1-STAGING-RELEASE-BLOCKERS-20261123.md](V1-STAGING-RELEASE-BLOCKERS-20261123.md).

| # | Blocker | Severity |
|---|---|---|
| 1 | Commit not authorized; staged index incomplete vs worktree | P0 |
| 2 | Push not authorized; no upstream | P0 |
| 3 | No isolated staging Netlify site; CLI linked to production | P0 |
| 4 | Staging deploy not authorized | P0 |
| 5 | Privacy owner/legal sign-off | P0 before real PII |
| 6 | Live Forms registration + notification email unproven | P1 |
| 7 | Studio commit vs local-only policy decision | P1 process |
| 8 | Contact consent / localStorage privacy gaps | P2 owner call |

---

## Annex index

| Deliverable | File |
|---|---|
| Final commit manifest | [V1-STAGING-RELEASE-COMMIT-MANIFEST-20261123.md](V1-STAGING-RELEASE-COMMIT-MANIFEST-20261123.md) |
| Exact staging deployment plan | [V1-STAGING-RELEASE-DEPLOY-PLAN-20261123.md](V1-STAGING-RELEASE-DEPLOY-PLAN-20261123.md) |
| Netlify Forms acceptance procedure | [V1-STAGING-RELEASE-NETLIFY-FORMS-ACCEPTANCE-20261123.md](V1-STAGING-RELEASE-NETLIFY-FORMS-ACCEPTANCE-20261123.md) |
| Privacy review checklist | [V1-STAGING-RELEASE-PRIVACY-REVIEW-CHECKLIST-20261123.md](V1-STAGING-RELEASE-PRIVACY-REVIEW-CHECKLIST-20261123.md) |
| Remaining blockers | [V1-STAGING-RELEASE-BLOCKERS-20261123.md](V1-STAGING-RELEASE-BLOCKERS-20261123.md) |

Prior prep packet (unchanged by this review): `STAGING-PREP-SUMMARY-20261123.md` and siblings.

---

## Prohibited-actions confirmation (this handoff pass)

| Action | Performed? |
|---|---|
| `git add` / `git commit` | **No** |
| `git push` | **No** |
| Netlify deploy / `--prod` | **No** |
| Production DNS changes | **No** |
| Auth / DB / Factory changes | **No** |

**Awaiting explicit owner approval before any Git write, push, or Netlify staging deploy.**
