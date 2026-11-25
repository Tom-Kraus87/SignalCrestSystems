# Stage 2 — Approval Matrix (Atlas / Human)

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot` (local, unpushed)  
**Readiness verdict:** **CONDITIONAL** — see `STAGE2-RELEASE-READINESS-REPORT-20261123.md`  
**STOP:** No commit / push / deploy / provisioning until rows below are decided.

Legend: **ASK** = needs decision · **REC** = recommendation · **BLOCK** = must not proceed without yes

---

## 1. Top approval asks (priority)

| # | Ask | REC | Severity |
|---|---|---|---|
| 1 | Authorize **local commit** of Stage 1+pilot work (include/exclude studio?) | Commit public+privacy+project-request; decide studio separately | **BLOCK** for version control hygiene |
| 2 | Authorize **GitHub push** of feature branch | Push only after commit review | **BLOCK** for remote backup / Netlify CI |
| 3 | Authorize **Netlify deploy** target | **Staging first**, then production | **BLOCK** for live Forms |
| 4 | Confirm **privacy.html** as binding notice | Approve after legal skim | **BLOCK** before collecting PII at scale |
| 5 | Register **`project-request` Netlify Form** + owner notification email | Yes on first deploy | **BLOCK** for persistence |
| 6 | Stone Harbor: **exclude from production allowlist** vs accept public sandbox URL | Prefer **exclude or gated preview** until OWNER-REVIEW signed | **BLOCK** for marketing share |
| 7 | Backend vendor: **Supabase** vs Clerk+Neon | **Supabase Auth + Postgres** | **BLOCK** for admin Stage 2 |
| 8 | Admin host: `admin.` subdomain vs `/admin` | **`admin.signalcrestsystems.com`** | High |
| 9 | Owner admin email + MFA enrollment identity | Atlas names email | **BLOCK** for Auth |
| 10 | Intake path: dual-write Forms+DB vs Function-only | **Dual-write initially** | High |
| 11 | Authorize Stage 2 **cloud provisioning** (still no Factory) | Only after 7–10 | **BLOCK** for backend build |
| 12 | Set Netlify `SITE_ORIGIN` (+ optional `SCS_PRODUCTION_RELEASE=1`) | `https://signalcrestsystems.com` when going prod | High for SEO |

---

## 2. Full decision grid

### A. Source control

| ID | Decision | Options | REC | Atlas |
|---|---|---|---|---|
| A1 | Commit working tree | No / Local commit only / Commit+push | Local commit when ready | ☐ |
| A2 | Branch strategy | Keep feature branch / Merge to main after staging | Feature → staging deploy → PR to main | ☐ |
| A3 | Commit `qa-m6b/` reports | Include / Exclude | Include Stage1/2 markdown; screenshots optional | ☐ |
| A4 | Include `transformation-studio/` in git | Include / Defer | Include in repo; control **publish** separately | ☐ |

### B. Public release

| ID | Decision | Options | REC | Atlas |
|---|---|---|---|---|
| B1 | Deploy environment | None / Staging / Production | Staging first | ☐ |
| B2 | Production-release build flags | Off / `SITE_ORIGIN` only / + `SCS_PRODUCTION_RELEASE=1` | Both for prod | ☐ |
| B3 | Forms notifications | Off / Owner email | Owner email on | ☐ |
| B4 | Privacy publish | Draft only / Live binding | Live after sign-off | ☐ |
| B5 | Coming-soon videos | Posters only / Self-host video later | Posters OK for V1 | ☐ |
| B6 | Showroom CTA consistency | Leave contact links / Point all to project-request | Align to project-request | ☐ |

### C. Stone Harbor

| ID | Decision | Options | REC | Atlas |
|---|---|---|---|---|
| C1 | Production allowlist | Keep in dist / Remove from `build-public` allowlist | Remove until OWNER-REVIEW signed | ☐ |
| C2 | External share | Forbidden / Allowlisted recipients / Public | Forbidden until review | ☐ |
| C3 | Fix OWNER-REVIEW.md in dist | N/A if excluded / Add to allowlist / Remove broken link | If kept public: fix link or drop href | ☐ |

### D. Backend / admin (design → build gate)

| ID | Decision | Options | REC | Atlas |
|---|---|---|---|---|
| D1 | Proceed with admin V1 now | Defer / Authorize Stage 2 build | Authorize design→build after public staging | ☐ |
| D2 | Auth+DB vendor | Supabase / Clerk+Neon / Other | Supabase | ☐ |
| D3 | Region / billing | Atlas picks | Closest compliant region | ☐ |
| D4 | Admin host | `admin.` / path `/admin` | `admin.` | ☐ |
| D5 | Owner email | _______________________ | Single allowlisted user | ☐ |
| D6 | Intake architecture | Forms-only / Dual-write / Function-only | Dual-write | ☐ |
| D7 | Notify provider | Forms email only / + Resend|Postmark | Forms first; add provider if needed | ☐ |
| D8 | Secrets location | Netlify+Supabase env only | Never git / never Factory | ☐ |

### E. Hard boundaries (confirm unchanged)

| ID | Boundary | Confirm untouched / out of scope |
|---|---|---|
| E1 | SignalCrest-Software-Factory | ☐ |
| E2 | Factory snapshots | ☐ |
| E3 | P0-B normative security foundations | ☐ |
| E4 | Brokers / Windows ACLs / credentials | ☐ |
| E5 | No production secrets in chat/repo | ☐ |

---

## 3. What each “yes” unlocks

| If Atlas approves… | Agent/human may then… |
|---|---|
| A1 only | Create local git commit (still no push/deploy) |
| A1+A2 push | Push branch; still no prod deploy unless B1 |
| B1 staging | Netlify staging publish; register Forms; test with fake leads |
| B1 production | Live marketing site + Forms persistence |
| C1 exclude studio | Strip studio from allowlist before prod build |
| D1–D8 | Provision Supabase, migrations, Functions, admin app (**new** Stage 2 implementation authorization) |

---

## 4. Recommended sequencing

1. **Sign** E1–E5 boundaries + privacy (B4).  
2. **Decide** C1 Stone Harbor publish policy.  
3. **Commit** (A1) cleanly; optional push (A2).  
4. **Staging deploy** (B1) → Forms registration (B3) → fake submit test → delete.  
5. **Production deploy** only after staging smoke.  
6. **Separately** authorize D* for Supabase admin (does not block a Forms-only public launch).

---

## 5. Agent confirmation (this Stage 2 review pass)

| Prohibited action | Done? |
|---|---|
| Git commit / push | **No** |
| Netlify deploy | **No** |
| External provisioning | **No** |
| DB migrations / Auth impl | **No** |
| Factory changes | **No** |
| Stone Harbor public deploy | **No** |

Deliverables written only:

- `qa-m6b/STAGE2-RELEASE-READINESS-REPORT-20261123.md`  
- `qa-m6b/STAGE2-BACKEND-IMPLEMENTATION-PLAN-20261123.md`  
- `qa-m6b/STAGE2-APPROVAL-MATRIX-20261123.md`  

**Awaiting Atlas review and human authorization.**
