# M7A — Provisioning Instructions (DO NOT EXECUTE in this pass)

**Status:** Instructions only. Owner/Atlas must authorize before any live action.  
**Architecture:** Supabase PostgreSQL · Netlify Functions · Future Supabase Auth · static frontend  
**Cost rule:** Postgres for counters/idempotency — **no Redis** unless upgrade trigger met.

---

## 0. Preconditions

- [ ] Owner approves staging project creation  
- [ ] Separate staging vs production credentials planned  
- [ ] Privacy retention **PENDING_FINAL_PRIVACY_APPROVAL** resolved or explicitly deferred for staging-only with `is_test`  
- [ ] `.env.example` reviewed; real secrets only in Netlify UI / local untracked `.env`

---

## 1. Create Supabase projects (staging first)

1. Create **staging** Supabase project (new cloud project — never Factory).  
2. Enable extensions: `pgcrypto`, `citext`.  
3. Apply drafts **in order** (after approval):  
   - `db/migrations/001_m7a_leads_foundation.sql`  
   - `db/migrations/002_m7a_rls_least_privilege.sql`  
   - `db/migrations/003_m7a_retention_procedures.sql`  
   - `db/migrations/004_m7a_counters_idempotency.sql`  
4. Install RPC: `db/procedures/m7a_insert_lead_transaction.sql`  
5. Grant `EXECUTE` on `insert_lead_bundle` + counter functions to **service_role** only.  
6. Disable public Auth signup; plan owner allowlist + MFA before dashboard.  
7. Repeat for **production** with a **separate** project and keys.

---

## 2. Netlify (staging site / context)

1. Ensure `functions = "netlify/functions"` and `/api/leads` redirect (already in `netlify.toml`).  
2. Set server-only env (from `.env.example` placeholders):  
   - `LEADS_INTAKE_ENABLED=true`  
   - `LEAD_IP_HASH_SALT` (unique per environment)  
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (staging values)  
   - `SCS_ENV=staging`  
3. Confirm **no** `SUPABASE_SERVICE_ROLE_KEY` in any client bundle.  
4. Disable / ignore legacy Netlify Forms for `contact` and `project-request`.  
5. Deploy **only** after explicit Owner deploy authorization (not this pass).

---

## 3. Wire production adapters (code already stubbed)

When authorized, replace Function defaults with:

- `PostgresLeadRepository`  
- `PostgresRateLimiter` + `PostgresAtomicCounterStore`  
- Optional email notifier implementing `EmailNotifier`  
- Keep `HoneypotSpamProtector` unless CAPTCHA authorized  

Files: `netlify/functions/_lib/postgres-adapters.js`, `notify.js`, `spam-protection.js`.

---

## 4. Optional email notify

1. Choose Resend **or** Postmark (see cost matrix).  
2. Verify sending domain.  
3. Set `EMAIL_*` env; implement provider adapter behind `EmailNotifier`.  
4. Payload must **not** include message body / full PII — receipt + form metadata only.

---

## 5. Retention jobs (after FINAL privacy approval)

| Job | Function | Default draft |
|-----|----------|---------------|
| Soft-delete scrub | `soft_delete_lead` | On owner action |
| Hard purge soft-deleted | `purge_deleted_leads(365)` | After soft-delete window |
| Test rows | `purge_test_leads(30)` | Staging hygiene |
| Unconverted | `purge_unconverted_leads(365)` | **PENDING_FINAL_PRIVACY_APPROVAL** (12 months) |

Do **not** schedule unconverted purge until Owner/legal marks final approval.

---

## 6. Explicitly skip

| Service | Action |
|---------|--------|
| Redis / Upstash | **Do not create** |
| Separate CRM | **Do not create** |
| Vector DB | **Do not create** |
| Live AI keys | **Do not create** |
| Production DNS cutover | Hold |
| Factory integration | Forbidden |

---

## 7. Verification after first staging deploy

Follow `M7A-HOSTED-STAGING-VERIFICATION-PLAN-20261123.md` + confirm Forms bypass still gone and Function persists via Postgres (not mocks).
