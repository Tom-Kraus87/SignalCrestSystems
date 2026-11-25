# V1 Staging Release — Remaining Blockers & Approval Asks

**Date:** 2026-11-23  
**STOP:** No Git writes, push, Netlify deploy, DNS, Auth, DB, or Factory changes without explicit owner approval

---

## Top blockers

| # | Blocker | Severity | Evidence |
|---|---|---|---|
| 1 | **Commit not authorized** + staged index incomplete | P0 | 24 staged vs 27 recommended; unstaged builder/Forms/Coming Soon fixes |
| 2 | **Push not authorized**; branch has no upstream | P0 | `feature/public-v1-studio-pilot` missing on `origin` |
| 3 | **No isolated staging Netlify site**; CLI linked to production | P0 | Linked `signalcrest-systems` → `https://signalcrestsystems.com` |
| 4 | **Staging deploy not authorized** | P0 | Live Forms cannot be proven until hosted staging exists |
| 5 | **Privacy notice owner/legal sign-off** | P0 before real PII | `privacy.html` draft + checklist flags |
| 6 | Forms notification email + live registration unproven | P1 | Markup ready; acceptance procedure not executed |
| 7 | Studio Git policy (commit Set B vs leave untracked) | P1 process | 15 untracked files; excluded from `dist/` either way |
| 8 | Contact form lacks consent checkbox | P2 | Owner call; project-request has consent |
| 9 | Theme `localStorage` not in privacy copy | P2 | Owner call |
| 10 | Admin Auth/DB (Stage 2) | Out of scope | Not required for Forms-only staging |

Stone Harbor **public** publish is **not** a blocker: studio **ABSENT** from current `dist/`.

---

## Approval asks (owner)

Please approve or override each item:

1. **Refresh index + commit** Set A (27 files) on `feature/public-v1-studio-pilot`.  
2. Optionally **include Set B** (`transformation-studio/**`, +15 files) while keeping allowlist exclusion.  
3. **Push** to `https://github.com/Tom-Kraus87/SignalCrestSystems.git` branch `feature/public-v1-studio-pilot`.  
4. **Create** isolated Netlify staging site (not `signalcrest-systems`) and link CLI / Git builds to it.  
5. **Authorize staging deploy** (draft/`*.netlify.app` only; password-protect recommended).  
6. Approve **`privacy.html`** as binding for staging (with or without B1/B3 edits).  
7. Authorize **Forms acceptance procedure** on staging only; configure owner notification email.  
8. Confirm studio policy: **keep excluded from allowlist** until OWNER-REVIEW signed.  
9. Production deploy + DNS + merge to `main` — **explicitly separate**, after staging smoke.  
10. Stage 2 backend provisioning — **not** requested by this handoff.

---

## Safe-to-proceed signals (already true locally)

| Signal | Status |
|---|---|
| Local tests (prep packet) | 36/36 integrated; axe 32/32; polish 14/14 |
| Studio in `dist/` | **ABSENT** |
| Secrets in intended website delta | None found |
| Factory / business folders in commit set | Excluded / gitignored |
| Root `netlify.toml` | `publish = dist` correct |

---

## Agent confirmation (this handoff)

| Prohibited action | Done? |
|---|---|
| Git commit / `git add` for commit | **No** |
| GitHub push | **No** |
| Netlify deploy | **No** |
| Production DNS | **No** |
| Auth / DB / Factory mods | **No** |

**Awaiting owner authorization.**
