# M7A — Owner Cost Estimate (Revised — Netlify Pro Verified)

**Date:** 2026-11-23  
**Status:** Documentation revision only. **Supersedes** Netlify cost assumptions in `M7A-OWNER-COST-ESTIMATE-PROVISIONING-MATRIX-20261123.md`.  
**Evidence:** `M7A-NETLIFY-PRO-VERIFIED-ACCOUNT-20261123.md`  
**Atlas decision:** **RETAIN** existing Netlify Pro — no upgrade/downgrade.  
**Production:** **HOLD**

---

## Supersession pointer

| Prior document | Relationship |
|----------------|--------------|
| `M7A-OWNER-COST-ESTIMATE-PROVISIONING-MATRIX-20261123.md` | **SUPERSEDED** for Netlify plan pricing and monthly envelope. Provider matrix rows for Supabase / email / Redis avoidance remain directionally valid unless contradicted below. |

Use **this file** for Owner budget conversations after 2026-11-23 Netlify Pro verification.

---

## Verified Netlify baseline (already billed)

| Item | Value |
|------|-------|
| Plan | Netlify Pro |
| Monthly cost | **$20 / month** (existing) |
| Monthly credits | 3,000 allowance; **3.3 consumed** at verification; credits **shared across team projects** |
| Automatic credit recharge | **DISABLED AND SAVED** (owner-confirmed) |
| Concurrent builds | 3 |
| Team members | 1 |
| Team add-ons | None enabled |

“Additional” below means cost **beyond** this existing Pro baseline.

---

## REVISED BUDGET (exact)

| Scenario | Total / month | Additional / month (beyond existing Netlify Pro) | Notes |
|----------|---------------|--------------------------------------------------|-------|
| Local development | **$0** | **$0 additional** | Local foundation; no new host spend |
| Staging | Target **$0** | Target **$0 additional** | Prefer Free-tier Supabase + existing Pro; password-protect staging site when configured |
| Production without AI | **$45 / month total** | **$25 / month additional** | Existing Pro **$20** + expected always-on DB (~**$25**) |
| Production with AI | **$60–70 / month total** | **$40–50 / month additional** | Pro **$20** + DB + deferred AI / optional email envelope; Phase B still gated |

### Envelope cross-check

| Component | Staging target | Prod (no AI) | Prod (with AI) |
|-----------|----------------|--------------|----------------|
| Netlify Pro (retained) | $20 (existing) | $20 (existing) | $20 (existing) |
| Managed Postgres (Supabase) | $0 Free target | ~$25 | ~$25 |
| Email notify (optional) | $0 | $0–10 | $0–10 |
| Live AI vendor | Off | Off | ~$15–25 (estimate; deferred until approved) |
| Redis | **$0 — not planned** | **$0 — not planned** | **$0 — not planned** |
| **Owner-facing total** | **~$20 existing / $0 additional** | **~$45 total / $25 additional** | **~$60–70 total / $40–50 additional** |

---

## Provisioning decision matrix (updated Netlify row)

| Required service | Purpose | Recommended provider | Verified / expected cost | Upgrade trigger | Required configuration |
|------------------|---------|----------------------|--------------------------|-----------------|------------------------|
| Static site + Functions | Public site + `POST /api/leads` | **Netlify Pro (RETAIN)** | **$20/mo existing** | Credit overages; need more concurrent builds; team add-ons | Isolated staging site; context-scoped secrets; Forms disabled for intake |
| Managed PostgreSQL | Leads, consent, idempotency, atomic counters | **Supabase** (new; not Factory) | Free staging target → **~$25**/mo prod | Pause unacceptable; PITR; multi-env beyond free | Separate staging vs production projects |
| Owner Auth (future) | Dashboard MFA / AAL2 | Supabase Auth | Included in Supabase plan | Custom SSO | Disable public signup; allowlist; TOTP/AAL2 |
| Email notify (optional) | Owner alert | Resend or Postmark later | **$0–20**/mo | Free-cap exceeded | Leave unprovisioned until approved |
| Spam protection | Bot resistance | Honeypot + Postgres limits | **$0** | Sustained abuse | Optional Turnstile later |
| Redis / Upstash | ~~Atomic counters~~ | **NOT RECOMMENDED** | Avoid | Only if Postgres counters fail at scale | **Do not provision** |
| Live AI vendor | Advisor Phase B | **Deferred** | Hold until approval | Phase B Owner approval | `ADVISOR_LLM_ENABLED=false` |

---

## Staging vs production (unchanged intent; Netlify Pro enables)

| Resource | Staging | Production |
|----------|---------|------------|
| Netlify | **Isolated staging project/site** (OPEN to configure) | Production site — **HOLD** |
| Password protection | Prefer on (Pro-supported) | N/A for public marketing site |
| Env secrets | Staging-only values | Production-only values — **never share via org-wide vars** |
| Supabase | Separate project | Separate project |
| `SCS_ENV` | `staging` | `production` |

---

## WARN — shared environment variables

Shared environment variables (Pro-supported) **must not** expose production credentials to staging or unrelated customer projects. Use site- and context-scoped secrets only.

---

## OPEN cost/ops verification

1. Automatic credit recharge configuration  
2. Pro function log retention  
3. Isolated staging project configuration  
4. Environment-specific secret isolation  
5. Aggregate credit consumption across hosted projects  

---

## What this pass does NOT authorize

External Supabase provisioning, Redis, email vendor accounts, CAPTCHA, live AI keys, DNS changes, Netlify plan changes, production deploy, Factory resources, git commit/push.
