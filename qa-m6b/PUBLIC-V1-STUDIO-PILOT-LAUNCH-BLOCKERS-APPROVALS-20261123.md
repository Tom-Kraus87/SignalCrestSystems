# Launch Blockers + Next-Stage Approval Requests

**Date:** 2026-11-23  
**Target:** Usable public site by **November 30, 2026**  
**Branch:** `feature/public-v1-studio-pilot` (local)

---

## 1. Remaining launch blockers (public site)

| # | Blocker | Severity | Notes |
|---|---|---|---|
| 1 | Production deploy not authorized | P0 | No GitHub push / Netlify publish in Stage 1 |
| 2 | Privacy policy legal sign-off | P0 | Draft page exists; Atlas should approve before collecting admin-stored PII |
| 3 | Netlify Forms registration for `project-request` | P1 | New form name needs a deploy (or Forms UI) to accept posts in production |
| 4 | Coming-soon videos are posters only | P2 | Self-hosted `<video>` when assets ready; CSP forbids third-party embeds |
| 5 | Owner review of Stone Harbor studio | P1 for marketing | Sandbox usable locally; **do not share externally** until OWNER-REVIEW checklist signed |
| 6 | Admin inbox not live | P0 for “full V1” | Public can submit via Forms; owner CRM requires Stage 2 |
| 7 | Uncommitted work on feature branch | Process | Commit when Atlas requests; keep Factory trees untouched |

---

## 2. Specific approval requests for next stage

Please approve or override each item:

1. **Commit** current `feature/public-v1-studio-pilot` work (local commit only vs push to GitHub).  
2. **Netlify production deploy** of public `dist/` (or staging site first).  
3. **Option B stack:** Supabase (or Clerk+Neon) for Auth+DB — vendor + billing region.  
4. **Admin host:** `admin.signalcrestsystems.com` vs `/admin` on apex.  
5. **Owner identity email** for the sole admin account + TOTP enrollment.  
6. **Project-request path:** dual-write Forms+DB vs Function-only.  
7. **Publish privacy.html** as the binding privacy notice.  
8. **Stone Harbor studio:** keep sandbox-only / allowlist for public dist / separate subdomain — and whether client-facing shares are allowed after owner walkthrough.  
9. **Authorize Stage 2** installs/secrets for managed Auth/DB + Netlify Functions (still **no** Factory / P0-B changes).

---

## 3. Hard boundaries (confirmation)

**Not modified / not to be modified in website Stage 2 without separate authorization:**

- SignalCrest-Software-Factory  
- SignalCrest-Software-Factory__snapshot-*  
- P0-B normative security foundations  
- B3–B7, P0-C, protected brokers, Windows accounts/ACLs/credentials  

Public site and admin stay on managed cloud services, isolated from the Factory control plane.
