# M7A-R1 — Cost and Provisioning Documentation Update

**Date:** 2026-11-23  
**Supersedes (for Netlify account facts):** prior OPEN auto-recharge row in verified-account note  
**Production:** **HOLD**  
**Provisioning in this pass:** **NONE executed**

---

## Netlify Pro (verified update)

| Item | Value |
|------|-------|
| Plan | Netlify Pro — **$20 / month** |
| Monthly allowance | **3,000 credits** |
| Recorded consumption | **3.3 credits** |
| Automatic credit recharge | **DISABLED AND SAVED** (owner-confirmed) |
| Paid add-ons | **None** |
| Credit pool | **Shared across team projects** |
| Still pending hosted verification | Function log retention; staging site isolation; secret isolation per context |

**Billing action:** none. Retain Pro. Do not enable auto-recharge without Owner decision.

---

## Architecture cost posture (unchanged)

| Component | Vendor posture | M7A-R1 status |
|-----------|----------------|---------------|
| Managed PostgreSQL | Supabase (new project; not Factory) | Contract ready; **not provisioned** |
| Functions hosting | Netlify Pro (existing) | Contract ready; **not deployed** |
| Atomic counters / idempotency | Postgres (no Redis) | Code + migration drafts |
| Email notify | Resend optional | Contract only / Noop default |
| CAPTCHA | Cloudflare Turnstile optional | Contract stub / honeypot default |
| Monitoring | Sentry optional | Placeholder only |
| Redis / Upstash | **NOT RECOMMENDED** | Still avoided |

---

## Infrastructure configuration contracts (local)

Documented in `.env.example`:

- `SCS_ENV` / `SCS_DEPENDENCY_MODE` / `SCS_ALLOW_MOCK_LEADS` (mock never honored in prod-like)
- `DATABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `LEAD_IP_HASH_SALT`, `SCS_PRIVACY_VERSION`
- `TURNSTILE_*`, `RESEND_API_KEY`, `SENTRY_DSN` (optional; unset = inactive)
- Explicit Redis left commented / unused

Netlify Function dependency declaration: `netlify/functions/package.json` → `pg`.

---

## Durable notification outbox + encrypted recovery journal

| Requirement | Status |
|-------------|--------|
| `notification_outbox` table + atomic insert with lead bundle | Migration **005** draft |
| Outbox replay worker | **NOT built** |
| Encrypted recovery journal for Function crash / partial failure | **Requirement only** — not implemented |
| Near-zero recovery guarantee | **NOT CLAIMED** until failure handling, replay integrity, and deletion reconciliation are proven on staging |

---

## Estimated monthly envelope (planning — no new spend this pass)

| Line | Estimate |
|------|----------|
| Netlify Pro (existing) | $20 |
| Supabase free staging target | $0 initially (upgrade path later) |
| Resend / Turnstile / Sentry | $0 until authorized |
| Redis | $0 — not planned |
| **New spend authorized this pass** | **$0** |

---

## Provisioning still forbidden until Atlas/Owner authorize

- Creating Supabase / Netlify staging resources  
- Executing remote migrations  
- Enabling paid add-ons or auto-recharge  
- Production DNS / deploy / live AI keys  

See checklist: `M7A-R1-HOSTED-STAGING-ACCEPTANCE-CHECKLIST-20261123.md`.
