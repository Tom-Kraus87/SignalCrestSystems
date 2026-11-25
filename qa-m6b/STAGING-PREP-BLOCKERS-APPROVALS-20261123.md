# Staging Prep — Remaining Blockers + Approval Requests

**Date:** 2026-11-23  
**STOP:** No commit / push / deploy / Auth / DB / Factory changes without explicit human authorization.

---

## Remaining blockers (for a live staging site)

| # | Blocker | Severity | Notes |
|---|---|---|---|
| 1 | Commit not authorized | P0 process | Working tree dirty; staging from Git needs a commit |
| 2 | Push not authorized | P0 process | Branch has no upstream |
| 3 | Staging Netlify deploy not authorized | P0 | Forms persistence requires hosted deploy |
| 4 | Privacy notice owner/legal sign-off | P0 before real PII | Draft exists; flags in Forms annex |
| 5 | Forms notification email configuration | P1 | Netlify UI after first staging deploy |
| 6 | Contact form lacks consent checkbox | P2 / owner call | Documented; not changed unilaterally |
| 7 | Theme localStorage not mentioned in privacy | P2 / owner call | Flagged only |
| 8 | Admin / Auth / DB | Out of scope | Design-only; not required for Forms-only staging |

Stone Harbor public publish is **no longer a staging blocker** — excluded from `dist/`.

---

## Approval asks (Atlas / human)

Please approve or override each item:

1. **Local commit** of Stage 1 + staging-prep work on `feature/public-v1-studio-pilot` (include `transformation-studio/` source; keep allowlist exclusion).  
2. **GitHub push** of the feature branch (backup / Netlify Git builds).  
3. **Netlify staging deploy** to a **non-production** site (password-protect recommended).  
4. Confirm **`privacy.html`** as the binding notice for staging (with or without contact-consent / localStorage wording updates).  
5. Register / verify **`project-request`** Netlify Form + owner notification email.  
6. Confirm studio policy: **keep excluded from allowlist** until OWNER-REVIEW signed (current default).  
7. Whether to align showroom in-card CTAs from `contact.html?service=...` to `project-request.html` (non-blocking).  
8. Production deploy + DNS — **explicitly separate**, after staging smoke.  
9. Stage 2 backend provisioning (Supabase/etc.) — **not** requested by this staging-prep pass.

---

## Agent confirmation (this staging-prep pass)

| Prohibited action | Done? |
|---|---|
| Git commit / push | **No** |
| Netlify deploy | **No** |
| Production DNS | **No** |
| Auth provisioning | **No** |
| DB migrations | **No** |
| Public studio publishing | **No** |
| Factory infrastructure mods | **No** |

**Awaiting Atlas and human review.**
