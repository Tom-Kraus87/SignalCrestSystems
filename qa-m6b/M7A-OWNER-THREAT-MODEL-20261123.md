# M7A — Threat Model (Lead Intake Foundation)

**Date:** 2026-11-23  
**Scope:** Public static site → `POST /api/leads` → (future) Supabase Postgres  
**Assets:** Lead PII, consent evidence, owner credentials (future), service_role key  
**Out of scope:** Factory plane, live AI, Studio

---

## Trust boundaries

```
[Browser / attacker]
        |  same-origin HTTPS POST
        v
[Netlify Edge + Function]  <-- service_role + salts (server-only)
        |  SQL over TLS
        v
[Supabase PostgreSQL + RLS]
        ^
        |  future AAL2 owner session
[Owner browser / admin]
```

| Boundary | Rule |
|----------|------|
| Browser → DB | **Forbidden** — no anon INSERT/SELECT on leads |
| Browser → Function | Allowed POST only; strict schema |
| Function → DB | service_role only; never ship key to client |
| Owner → DB | authenticated + allowlist + **AAL2** |
| Factory | **Isolated** — zero shared storage |

---

## STRIDE-style risks and mitigations

| Threat | Risk | Mitigation (M7A) | Residual |
|--------|------|------------------|----------|
| **Spoofing** — forged submissions | Medium | Schema allowlist; honeypot; rate limit by IP-hash + email; optional future CAPTCHA | Dedicated adversaries may still submit junk |
| **Tampering** — client-set timestamps / privacy stamp | Medium | Server `receivedAt`; privacy version allowlist; unknown fields rejected | — |
| **Repudiation** — disputed consent | Medium | Append-only `consent_records` with version stamps | Legal review of retention still OPEN |
| **Information disclosure** — PII in logs / responses | High | Safe logging (no body/email/message); public response = receipt only; IP stored hashed | Misconfigured Netlify log drain |
| **Information disclosure** — service_role leak | Critical | Server-only env; never `SUPABASE_SERVICE_ROLE_KEY` in frontend | Compromised Function env = full DB write/read |
| **Denial of service** — flood intake | Medium | Postgres/atomic rate windows; body size 24 KiB; kill switch `LEADS_INTAKE_ENABLED` | Edge volumetric DDoS → Netlify platform |
| **Elevation** — anon reads leads | High | RLS enabled; revoke anon; no INSERT policies for authenticated | Mis-applied migration grants |
| **Injection** — XSS/SQLi via message | Medium | Parameterized RPC; stored as text; JSON responses; CSP on static pages | Owner admin XSS if future UI renders unsafely |
| **Sensitive paste** — secrets in message | Medium | Heuristic server filter + user warning | **Not complete credential detection** |
| **Legacy Forms bypass** | High (historical) | `data-netlify` removed; client posts `/api/leads` only | Hosted Netlify Forms settings must be confirmed at staging |
| **Idempotency abuse** | Low | Unique idempotency key; replay returns same receipt | — |
| **Supply chain / extra services** | Medium | Avoid Redis/CRM/vector DB until required — smaller attack surface | — |

---

## Abuse cases (acceptance)

1. Submit without consent → `400 consent_required`, no persist.  
2. Submit secrets/PAN-like → `400 sensitive_content`, no secret logged.  
3. Fill honeypot → `200 ok`, no persist.  
4. Replay Idempotency-Key → single lead.  
5. Burst same email → `429`.  
6. Direct urlencoded without consent → rejected (same validator).  
7. Kill switch → `503`.

---

## Security boundaries preserved

- Public site remains static + one intake Function.  
- Studio excluded from publish.  
- Advisor Phase A stays client-deterministic (no live LLM).  
- No Factory credentials or hosts.

---

## Open security follow-ups (hosted)

1. Confirm Netlify Forms ingestion disabled for legacy form names.  
2. Confirm Function env has no client-exposed service role.  
3. Owner MFA before any dashboard SELECT.  
4. Final privacy/retention approval before scheduling purge jobs.
