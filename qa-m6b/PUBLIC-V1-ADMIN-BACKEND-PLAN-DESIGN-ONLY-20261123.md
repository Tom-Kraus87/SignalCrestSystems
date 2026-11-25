# Admin / Backend Implementation Plan — DESIGN ONLY

**Date:** 2026-11-23  
**Status:** Not executed. Requires Atlas approval before any provisioning.  
**Parent plans:** `PUBLIC-ADMIN-V1-MASTER-PLAN-20261118.md` + Auth/Data annexes in SignalCrest-P0B-Architecture-Design

---

## 1. Architecture (recommended Option B)

```
[Public static site on Netlify]
   └── project-request / contact forms
         └── Netlify Function (validate + rate limit + honeypot)
               └── Managed Postgres insert (RLS: no public SELECT)
                     └── optional notify email to owner

[Admin app — separate host preferred: admin.signalcrestsystems.com]
   └── Managed Auth: email/password + mandatory TOTP MFA (AAL2)
   └── Owner-only allowlist (no public registration)
   └── Inbox / status / notes / basic CMS / security settings
```

**Hard isolation:** No Factory brokers, Windows services, P0-B control plane, or snapshot trees.

---

## 2. Authentication & MFA (must)

| Requirement | Plan |
|---|---|
| Single owner | One allowlisted Auth user; signup disabled in provider |
| Email/password | Provider-managed |
| Mandatory MFA | TOTP before any admin data (AAL2 gate) |
| Sessions | Secure/HttpOnly cookies; short-lived access; logout revokes |
| Recovery | Offline recovery codes in owner password manager |

**Do not** roll custom TOTP. Prefer Supabase Auth MFA (or Clerk+Neon if Atlas prefers).

---

## 3. Data model (summary)

- `contacts` — email, name, company, phone, source  
- `project_requests` — status, service, message, budget, timeline, privacy stamp, abuse fields  
- `request_notes` — owner-only private notes  
- Optional P2: `coming_soon_items` CMS  

RLS: owner AAL2 only for reads/writes on CRM tables; public path is insert-only via trusted Function service role with validation.

Statuses (V1): `new` → `triaged` → `in_conversation` → `qualified` → `declined` | `won` | `spam`

---

## 4. Admin UI routes (P0)

- `/login`, `/mfa`, `/logout`  
- `/` dashboard counts  
- `/requests`, `/requests/:id` (status + notes)  
- P1: `/contacts`, `/settings/security`  
- P2 (cut first): `/content/coming-soon`

**Do not** link Admin from public nav.

---

## 5. Project request path options (decision needed)

1. **Dual-write:** keep Netlify Forms + Function→DB (safest migration)  
2. **Replace:** Function-only insert (Forms as backup disabled)  
3. **Forms→webhook** into DB  

Current Stage 1 UI is Forms-ready (`name="project-request"`). Server insert waits on Stage 2 approval.

---

## 6. Implementation order (after approval)

1. Approve vendor + admin host + owner email  
2. Provision Auth/DB project (new cloud project — not Factory host)  
3. Migrations + RLS + disable signup  
4. Enroll owner MFA  
5. Netlify Function for project-request  
6. Minimal admin UI  
7. Privacy policy final legal review  
8. Staging deploy → acceptance checklist → production  

**STOP condition for agents:** no secrets creation, installs into Factory, or production deploy without explicit Atlas go-ahead.
