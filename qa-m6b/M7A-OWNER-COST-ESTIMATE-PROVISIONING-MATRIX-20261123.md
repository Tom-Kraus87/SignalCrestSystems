# M7A — Cost Estimate + Provisioning Decision Matrix

**Date:** 2026-11-23  
**Design goal:** Inexpensive entry-level hosting/DB; prefer Postgres over extra services.  
**Status:** Not provisioned — estimates only. Currency USD/month unless noted.

> **SUPERSEDED (Netlify line-item / monthly envelope):** Owner billing screenshots verify **Netlify Pro at $20/month** — Atlas **RETAIN Pro**. Use `M7A-OWNER-COST-ESTIMATE-REVISED-NETLIFY-PRO-20261123.md` and evidence `M7A-NETLIFY-PRO-VERIFIED-ACCOUNT-20261123.md`. Production remains **HOLD**.

---

## Provisioning decision matrix (Owner authorization item 9)

| Required service | Purpose | Recommended provider | Free-tier limitations | Expected production cost | Upgrade trigger | Required configuration |
|------------------|---------|----------------------|----------------------|--------------------------|-----------------|------------------------|
| Static site + Functions | Public HTML/CSS/JS + `POST /api/leads` | **Netlify** (existing) | Bandwidth / Function invocations / compute-time caps | **$0–19**/mo (Starter/Pro as traffic grows) | Sustained Function timeouts, bandwidth overages, need for preview locks | `netlify.toml` redirect; server-only env; Forms disabled for intake |
| Managed PostgreSQL | Leads, consent, idempotency, **atomic counters**, retention RPCs | **Supabase** (new project; not Factory) | Free: paused after inactivity; row/storage/egress caps; 2 projects typical free | **$0** (Free) → **~$25**/mo (Pro) when always-on / backups needed | DB pause unacceptable; >free storage; need PITR; multi-env beyond free project count | Separate **staging** vs **production** projects; `pgcrypto`/`citext`; migrations 001–004; service_role server-only |
| Owner Auth (future) | Dashboard MFA / AAL2 | **Supabase Auth** (same project) | Free MAU limits; email rate limits | Included in Supabase plan | Custom SSO / many users | Disable public signup; owner allowlist; TOTP/AAL2 before SELECT |
| Email notify (optional) | Owner alert on new lead | **Resend** or **Postmark** (choose one later) | Free: low daily send caps; domain verification required | **$0–20**/mo at low volume | >free sends/day or deliverability needs | Interface ready (`notify.js`); leave **unprovisioned** until approved |
| Spam protection | Bot resistance | **Built-in** honeypot + Postgres rate limits | N/A (first-party) | **$0** | Persistent bot abuse after rate limits | Honeypot field; `usage_counters`; optional Turnstile later |
| CAPTCHA (optional later) | Extra bot friction | Cloudflare Turnstile | Free for most sites | **$0** typically | Honeypot/rate-limit bypass at scale | Site/secret keys server-side; **do not add unless needed** |
| Redis / Upstash | ~~Atomic counters~~ | **NOT RECOMMENDED** | Would add another billable service | Avoid **~$0–10+**/mo | Only if Postgres counter latency/contention proven insufficient at multi-region scale | **Do not provision** under current authorization |
| Separate CRM | Lead pipeline UI | **NOT REQUIRED** for V1 | — | Avoid | Owner needs full CRM workflows beyond SQL/dashboard | Use Postgres + future owner admin |
| Vector DB | Embeddings / RAG | **NOT REQUIRED** | — | Avoid | Phase B retrieval architecture approval | Out of M7A scope |
| Dedicated app host | Separate Node host | **NOT REQUIRED** | — | Avoid | Functions insufficient for long-running AI | Stay on Netlify Functions |
| Live AI vendor | Advisor Phase B | **Deferred** | Per-token billing | Hold | Phase B Owner approval | `ADVISOR_LLM_ENABLED=false` |

---

## Entry-level monthly cost envelope (estimate)

| Scenario | Netlify | Supabase | Email | Redis | **Total** |
|----------|---------|----------|-------|-------|-----------|
| Staging / pilot (low traffic) | $0 | $0 (Free) | $0 (Noop) | **$0 (none)** | **~$0** |
| Early production | $0–19 | $0–25 | $0–10 | **$0 (none)** | **~$0–54** |
| Growth (always-on DB + Pro) | ~$19 | ~$25 | ~$10–20 | still avoid | **~$54–64** |

**Savings vs prior Redis path:** Removing Upstash/Redis typically saves **$0–10+/mo** and one operational secret surface while keeping atomic counters inside the already-required Postgres plan.

---

## Staging vs production resource separation

| Resource | Staging | Production |
|----------|---------|------------|
| Supabase project | Separate project URL + keys | Separate project — **never reuse staging keys** |
| `LEAD_IP_HASH_SALT` | Unique staging salt | Unique production salt |
| Netlify site / context | Deploy preview or staging site | Production site |
| `SCS_ENV` | `staging` | `production` |
| Email notify | Off / sink address | Owner inbox after approval |
| `is_test` leads | Allowed; 30-day purge draft | Disallow or rare |

Template: repository root `.env.example` (placeholders only).

---

## What must NOT be provisioned in this pass

External Supabase projects, Redis, email vendor accounts, CAPTCHA, live AI keys, DNS changes, Netlify production deploy, Factory resources.
