# M7A — Exact Provisioning Requirements

**Status:** Not provisioned in this pass. Requires Atlas/Owner authorization.  
**Cost override:** Prefer **Postgres** for atomic counters — **do not provision Redis** unless upgrade trigger in cost matrix is met.

## 1. Supabase (new project)

| Item | Requirement |
|------|-------------|
| Project | New cloud project — **not** Factory host |
| Staging vs prod | **Separate** projects and credentials |
| Region | Owner choice (document) |
| Auth | Disable public signup; future owner allowlist + MFA (AAL2) |
| Extensions | `pgcrypto`, `citext` |
| Migrations | Apply `001` → `002` → `003` → `004` in order (after approval) |
| RPC | Install `insert_lead_bundle` + counter helpers; grant to `service_role` only |
| Secrets to Netlify | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (**server only**) |

## 2. Netlify

| Item | Requirement |
|------|-------------|
| Functions | Deploy `netlify/functions` from this branch |
| Redirect | `/api/leads` already in `netlify.toml` |
| Env | `LEAD_IP_HASH_SALT`, `LEADS_INTAKE_ENABLED=true`, `SCS_ENV` |
| Forms | Disable / ignore legacy `contact` & `project-request` Forms |
| Logs | Confirm redaction / no body logging config drift |

## 3. Atomic counter store (Phase B + multi-instance rate limits)

| Item | Requirement |
|------|-------------|
| Store | **PostgreSQL** `usage_counters` + `atomic_counter_incr` (migration `004`) |
| Env | Same Supabase service role — **no Redis URL** |
| Use | Lead rate limits (multi-instance), future advisor credits/spend |
| Blobs | Optional for idempotency `onlyIfNew` only — **not** counters |
| Redis | **Not required** — deferred until demonstrated need |

## 4. Optional notify

| Item | Requirement |
|------|-------------|
| Email | Resend/Postmark (separate vendor approval) — interface `notify.js` |
| Content | No secrets / no message body; receipt + form metadata |
| Default | `NoopEmailNotifier` until approved |

## 5. Spam protection

| Item | Requirement |
|------|-------------|
| Default | Honeypot + Postgres rate limits (`spam-protection.js`) |
| CAPTCHA | Optional Turnstile — only if abuse warrants |

## 6. Admin host (future)

| Item | Requirement |
|------|-------------|
| Host | Prefer `admin.signalcrestsystems.com` |
| Gate | Password + TOTP before any lead SELECT |

## 7. Explicitly not in this list

- Redis / Upstash  
- Separate CRM / vector DB / dedicated app host  
- Live AI vendor keys (Phase B gated)  
- Factory credentials / Windows services  
- Production DNS cutover  
- Customer data import
