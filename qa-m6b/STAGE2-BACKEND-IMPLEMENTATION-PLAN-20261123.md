# Stage 2 — Backend Implementation Plan (DESIGN ONLY)

**Date:** 2026-11-23  
**Status:** Not executed. Requires Atlas / human authorization before any provisioning.  
**Parents:**  
- `qa-m6b/PUBLIC-V1-ADMIN-BACKEND-PLAN-DESIGN-ONLY-20261123.md`  
- `SignalCrest-P0B-Architecture-Design/PUBLIC-ADMIN-V1-*-20261118.md`  
**STOP:** No Supabase project creation, migrations, Functions deploy, secrets, or Factory changes in this pass.

---

## 1. Goal

Enable **owner-only** lead management for Signal Crest public site submissions:

1. Public project-request / contact intake validates server-side and persists to managed Postgres.  
2. Owner signs in with **email + password + mandatory TOTP MFA (AAL2)** before any CRM data.  
3. Everything stays on **managed cloud** (Netlify + Supabase or approved alt) — **never** the Software Factory / P0-B plane.

---

## 2. Stack evaluation — Supabase Auth + PostgreSQL

### Recommendation: **Approve Option B (Supabase)** for V1 admin

| Criterion | Supabase Auth + Postgres | Notes |
|---|---|---|
| Owner email/password | Supported | Disable public signup in dashboard |
| Mandatory TOTP MFA | Supported (AAL2) | Do **not** roll custom TOTP |
| Owner-only allowlist | App + RLS on `auth.uid()` | Reject non-owner at login + DB |
| Lead tables + RLS | Native Postgres RLS | Public has **no SELECT** on PII |
| Netlify Functions insert | Service role server-side only | Never ship service key to browser |
| Isolation from Factory | Strong | New cloud project; separate secrets |
| Speed vs Clerk+Neon | Fastest coherent Auth+DB | Clerk+Neon acceptable if Atlas prefers Clerk UX |
| Netlify Identity | **Avoid** | MFA confidence weaker for this brief |

### Fit to requirements

| Requirement | Fit |
|---|---|
| Owner-only email/password/MFA | **Yes** with enroll+challenge gates |
| Lead management (list/status/notes) | **Yes** with schema below |
| No Factory coupling | **Yes** if secrets stay in Netlify/Supabase env |
| Nov 30 public usable site | Public can ship on Forms-only; admin is parallel track |

### Honest risks

- MFA enrollment UX must be forced before inbox (easy to under-build).  
- Service-role misuse would bypass RLS — Functions must be the only public write path.  
- Dual-write Forms+DB needs clear “source of truth” (recommend **DB** for admin).  
- Email notify (Resend/Postmark/etc.) is a separate vendor approval.

---

## 3. Target architecture

```
[Browser — public Netlify static]
   └─ project-request / contact
         └─ POST /.netlify/functions/submit-project-request
               ├─ validate + rate limit + honeypot + privacy_version
               ├─ service-role → Postgres (upsert contact + insert request)
               ├─ optional: dual-write Netlify Forms (migration safety)
               └─ optional: notify owner email

[Browser — admin.host]
   └─ Supabase Auth (password → AAL1 → TOTP → AAL2)
         └─ owner JWT → RLS-scoped SELECT/UPDATE on CRM tables
```

**Hard isolation:** No Factory brokers, Windows services, snapshot trees, or P0-B stores.

---

## 4. Database schema (design)

Aligns with `PUBLIC-ADMIN-V1-DATA-AUTHZ-20261118.md`; refined for Stage 2.

### 4.1 Enums / constraints

```text
request_status:
  new | triaged | in_conversation | qualified | declined | won | spam
```

### 4.2 Tables

#### `contacts`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK default `gen_random_uuid()` | |
| `email` | citext UNIQUE NOT NULL | Normalize lower |
| `name` | text NOT NULL | |
| `company` | text NULL | |
| `phone` | text NULL | |
| `source` | text NOT NULL | `project-request` \| `contact` |
| `created_at` / `updated_at` | timestamptz | |

#### `project_requests`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `contact_id` | uuid FK → contacts ON DELETE RESTRICT | |
| `status` | text NOT NULL DEFAULT `new` | CHECK against enum |
| `service_interest` | text NULL | Match form `<select>` values |
| `timeline` | text NULL | |
| `budget_band` | text NULL | |
| `message` | text NOT NULL | Length-capped |
| `page_path` | text NULL | |
| `form_name` | text NOT NULL | `project-request` \| `contact` |
| `privacy_version` | text NOT NULL | e.g. `2026-11-23` |
| `consent_at` | timestamptz NOT NULL | |
| `user_agent` | text NULL | Abuse forensics |
| `ip_hash` | text NULL | Hash only unless legal says otherwise |
| `honeypot_hit` | boolean DEFAULT false | |
| `is_test` | boolean DEFAULT false | QA flag |
| `created_at` / `updated_at` | timestamptz | |

#### `request_notes`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `request_id` | uuid FK CASCADE | |
| `body` | text NOT NULL | Owner-only |
| `created_by` | uuid NOT NULL | `auth.uid()` |
| `created_at` | timestamptz | |

#### Optional P2

- `coming_soon_items` (CMS) — cut first if schedule slips  
- `audit_events` — login/MFA/status_change (no secrets in `meta`)  
- `owner_allowlist` — single `user_id` / email row if not using app config alone  

### 4.3 Indexes

- `project_requests (status, created_at DESC)`  
- `project_requests (contact_id)`  
- `contacts (email)` already unique  

---

## 5. RLS policies (design sketch)

**Roles**

| Role | Powers |
|---|---|
| `anon` | **No** direct table INSERT/SELECT on CRM |
| `authenticated` | Still restricted — only owner uid |
| `service_role` | Used only in Netlify Function for validated inserts |

**Policies (conceptual)**

```sql
-- Helper: owner check (example)
-- auth.uid() = '<OWNER_UUID>' OR email IN allowlist table

-- contacts / project_requests / request_notes / audit_events:
--   SELECT, UPDATE, DELETE: owner AND (optional) auth.jwt()->>'aal' = 'aal2'
--   INSERT from browser: DENY
-- Public writes: ONLY via security-definer RPC or service_role from Function
```

**Rules**

1. Public browser never receives service role key.  
2. Admin SPA uses user JWT only; enforce AAL2 in app middleware **and** prefer JWT `aal` claim in RLS if available.  
3. Showroom / Transformation Studio **never** write CRM tables.  
4. Disable Supabase public signup; no `/register` route.

---

## 6. Submission API (design)

### Endpoint

`POST /.netlify/functions/submit-project-request`  
(Optional sibling for contact, or one function keyed by `form_name`.)

### Request body (JSON or form-urlencoded)

| Field | Required | Validation |
|---|---|---|
| `form_name` | yes | `project-request` \| `contact` |
| `name` | yes | 1–120 chars |
| `email` | yes | RFC-light email; max 254 |
| `message` | yes | 1–5000 chars |
| `company` | no | max 200 |
| `phone` | no | max 40; strip control chars |
| `service` | no | allowlist of known values |
| `timeline` / `budget` | no | allowlist |
| `consent` | yes | must be true/`yes` |
| `bot-field` | honeypot | if non-empty → 204 no-op (or mark spam silently) |
| `privacy_version` | yes | must match published stamp |
| `page_path` | no | same-origin relative path only |

### Response

- `204` / `200 { ok:true }` on success — **no** internal IDs leaked if avoidable  
- `400` validation errors (generic field messages)  
- `429` rate limit  
- `500` generic failure  

### Anti-spam / abuse

| Control | V1 |
|---|---|
| Honeypot | Keep existing `bot-field` |
| Rate limit | Per IP hash + per email (e.g. 5/hour) via KV/Upstash or Function memory+edge |
| Field allowlists | Reject unknown `service` values |
| Size caps | Reject oversized bodies |
| `is_test` | Query flag or header for staging only |
| CSP `form-action 'self'` | Keep; Function same-origin |
| Optional | Turnstile/hCaptcha later (requires CSP exception approval) |

### Dual-write options (Atlas chooses)

| Option | Description |
|---|---|
| **A. Dual-write** | Function → DB **and** Netlify Forms (safest migration) |
| **B. Function-only** | DB is sole store; Forms attrs removed after cutover |
| **C. Forms webhook → Function** | Forms primary; webhook inserts DB |

**Recommendation:** **A** during Stage 2 rollout, then retire Forms when admin inbox trusted.

### Client change (when authorized)

Replace or augment `script.js` `fetch("/")` Forms POST with Function URL **or** keep Forms POST and add Function dual path. Do not silently fake success.

---

## 7. Admin authorization (design)

### Identity

- Single owner email (Atlas-specified)  
- Password via Supabase Auth  
- **Mandatory TOTP** before dashboard/CRM  
- Recovery codes stored offline in owner password manager  

### Host

| Option | Pros | Cons |
|---|---|---|
| `admin.signalcrestsystems.com` | Cookie isolation from marketing | DNS + separate app deploy |
| `/admin` on apex | Simpler host | Higher XSS blast radius from public site |

**Recommendation:** separate admin subdomain.

### Routes (P0)

| Route | Purpose |
|---|---|
| `/login` | Email/password |
| `/mfa` | TOTP enroll/verify |
| `/logout` | Revoke session |
| `/` | Counts: new / triaged / … |
| `/requests` | Inbox list |
| `/requests/:id` | Detail, status, notes |

P1: `/contacts`, `/settings/security`  
P2 cut: CMS coming-soon

**Do not** link Admin from public nav.

### Session

- Secure / HttpOnly / SameSite cookies (or provider session pattern)  
- Short access + rotating refresh  
- Logout clears session  
- Non-owner credentials → generic failure  

---

## 8. Notifications (design)

| Channel | V1 |
|---|---|
| Netlify Forms email | Keep during dual-write if Option A |
| Transactional email (Resend/Postmark) | Optional Function send on insert |
| SMS | Out of scope |

No notify code exists today — UI/Forms only.

---

## 9. Implementation order (after approval only)

1. Atlas signs approval matrix (vendor, host, owner email, dual-write, privacy).  
2. Create **new** Supabase project (region chosen); disable signup.  
3. Migrations + RLS + owner allowlist.  
4. Create owner user; enroll MFA; verify AAL2 gate.  
5. Netlify Function + secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE` — server only).  
6. Wire public form client to Function (and dual-write if chosen).  
7. Minimal admin UI on separate host.  
8. Staging acceptance → production.  
9. Legal re-check of privacy policy against live processors.

**Agent stop conditions:** no secret creation, no Factory installs, no production deploy without explicit go-ahead.

---

## 10. Acceptance criteria (backend Stage 2)

- [ ] Public submit creates DB row with `status=new`  
- [ ] Anon cannot SELECT leads via Supabase API  
- [ ] Owner password alone cannot open inbox  
- [ ] Owner + MFA can list/update status + add notes  
- [ ] Honeypot / rate limit verified with synthetic tests  
- [ ] No Factory paths or shared DB with coordination plane  
- [ ] Privacy policy lists actual processors  
- [ ] Staging test rows deleted or `is_test=true`  

---

## 11. Explicit non-goals (V1)

- Multi-user team RBAC  
- Public registration  
- Custom MFA implementation  
- Factory / Windows credential integration  
- Paid checkout / blueprint commerce  
- Live Stone Harbor production backend  
