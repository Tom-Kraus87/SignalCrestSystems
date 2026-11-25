# Staging Preparation Summary — Public Website V1

**Date:** 2026-11-23  
**Target staging window:** by November 30, 2026  
**Branch:** `feature/public-v1-studio-pilot` @ `c2c2d8d` (local; **no upstream**)  
**Mode:** Local staging-release preparation only  
**STOP:** Awaiting Atlas + human authorization — **no commit, no push, no Netlify deploy**

---

## Verdict

**READY FOR STAGING AUTHORIZATION** (controlled Netlify staging site), with remaining approval asks below. Stone Harbor Transformation Studio is **excluded from `dist/`**. Netlify Forms markup for `project-request` is build-time discoverable; **live storage is not claimed** until a staging deploy + Forms registration test.

---

## What this pass changed (local, uncommitted)

1. **`scripts/build-public.mjs`** — removed all `transformation-studio/**` allowlist entries; added `transformation-studio` to `FORBIDDEN_PREFIXES` so it cannot leak into `dist/`.
2. **`index.html`** — neutralized Coming Soon Transformation Studio deep-link (`href="transformation-studio/"` removed); poster now reads “Coming soon / Private pilot · not published on staging”.
3. **`transformation-studio/index.html`** — replaced broken public `OWNER-REVIEW.md` hyperlink with in-page disclaimer (repo path named as code text only).
4. **`transformation-studio/OWNER-REVIEW.md`** — documented allowlist exclusion + source-only preview.

Private pilot source under `transformation-studio/` **remains intact** in the working tree.

---

## Objective checklist

| # | Objective | Result |
|---|---|---|
| 1 | Stage 1 source diff: no secrets / no Factory mods | **PASS** — see annex Changed Files |
| 2 | Exclude studio from public/staging deployable build | **PASS** — see annex Exclusions |
| 3 | Netlify Forms validation (`project-request`) | **PASS (markup/JS)** — not live-tested; see annex Forms |
| 4 | Privacy vs form fields + owner-approval flags | **FLAGGED** — see annex Forms / Blockers |
| 5 | Reproducible preview/build; actual bind address | **PASS** — preview `http://127.0.0.1:59166` |
| 6 | Build / link / a11y / smoke / artifact checks | **PASS** — see annex Test Results |
| 7 | Staging deployment checklist | **DOCUMENTED** — see annex Deploy Instructions |

---

## Test scores (this pass)

| Check | Score |
|---|---|
| `node scripts/build-public.mjs` | **OK** — 59 files in `dist/` |
| Link validation | **PASS** — 0 failures |
| Integrated smoke | **36/36** |
| axe-core | **32/32** |
| Polish functional (+ WebKit) | **14/14** |
| Dist studio exclusion | **PASS** — `/transformation-studio/` → **404** on preview |
| Project-request CTA smoke | **PASS** (intentional; expectations already encode `project-request.html`) |

---

## Local preview (actual)

| Item | Value |
|---|---|
| Build | `node scripts/build-public.mjs` |
| Preview command used | `python -m http.server <ephemeral> --bind 127.0.0.1 --directory dist` |
| **Actual URL** | **`http://127.0.0.1:59166`** |
| Port | **59166** (ephemeral; do not hardcode) |
| Process PID | `24512` (local session; may exit) |
| Note | Earlier `npx serve` Start-Process failed on this Windows host (`npx` not a Win32 app via Start-Process). That is a **shell lifecycle** issue, not an application defect. Prefer `python -m http.server` or `npx.cmd` / `cmd /c npx`. |

### Recommended reproducible commands

```bash
node scripts/build-public.mjs
# Pick any free port (example uses OS-assigned or an explicit free port):
python -m http.server 0 --bind 127.0.0.1 --directory dist
# OR:
npx --yes serve -l 0 dist
# Use the address/port the tool prints — do not assume 5173.
```

Private studio sandbox (source tree only, **not** dist):

```bash
npx --yes serve -l 0 .
# then open /transformation-studio/ on the printed origin
```

---

## Annex index

| Annex | File |
|---|---|
| Changed-file inventory | [STAGING-PREP-CHANGED-FILES-20261123.md](STAGING-PREP-CHANGED-FILES-20261123.md) |
| Test results | [STAGING-PREP-TEST-RESULTS-20261123.md](STAGING-PREP-TEST-RESULTS-20261123.md) |
| Private-artifact exclusions | [STAGING-PREP-PRIVATE-EXCLUSIONS-20261123.md](STAGING-PREP-PRIVATE-EXCLUSIONS-20261123.md) |
| Netlify Forms validation | [STAGING-PREP-NETLIFY-FORMS-20261123.md](STAGING-PREP-NETLIFY-FORMS-20261123.md) |
| Staging deploy instructions | [STAGING-PREP-DEPLOY-INSTRUCTIONS-20261123.md](STAGING-PREP-DEPLOY-INSTRUCTIONS-20261123.md) |
| Blockers + approval requests | [STAGING-PREP-BLOCKERS-APPROVALS-20261123.md](STAGING-PREP-BLOCKERS-APPROVALS-20261123.md) |

Related prior packets: `STAGE2-*-20261123.md`, `PUBLIC-V1-STUDIO-PILOT-ATLAS-REVIEW-20261123.md`.

---

## Prohibited actions confirmation

| Action | Performed? |
|---|---|
| Git commit | **No** |
| GitHub push | **No** |
| Netlify deploy | **No** |
| Production DNS | **No** |
| Auth provisioning | **No** |
| DB migrations | **No** |
| Public Transformation Studio publishing | **No** (excluded from dist) |
| Factory infrastructure mods | **No** |

**STOP FOR ATLAS AND HUMAN REVIEW.**
