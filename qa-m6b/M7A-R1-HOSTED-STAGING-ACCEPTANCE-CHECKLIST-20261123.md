# M7A-R1 — Hosted Staging Acceptance Checklist

**Date:** 2026-11-23  
**Purpose:** Isolated staging verification gate after local remediation  
**Authorization required before starting:** Atlas/Owner explicit staging provision + migrate approve  
**Production:** remains **HOLD** regardless of staging results until separate prod authorization

---

## Pre-flight (provision — not done in M7A-R1)

- [ ] Create **new** Supabase project (never Factory plane; never production)
- [ ] Create **separate** Netlify site/context for staging
- [ ] Site-scoped secrets only (no team shared production credentials)
- [ ] Set `SCS_ENV=staging`, `SCS_DEPENDENCY_MODE=postgres`, real `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LEAD_IP_HASH_SALT`
- [ ] Confirm `SCS_ALLOW_MOCK_LEADS` is **not** honored in staging (fail closed if DB missing)
- [ ] Install Function dependency `pg` in deploy bundle (`netlify/functions/package.json`)
- [ ] Apply migrations **001 → 005** in order on staging DB only
- [ ] Confirm GRANT EXECUTE on RPCs to `service_role` only; anon/authenticated cannot execute `insert_lead_bundle`
- [ ] Confirm table privileges: anon cannot SELECT/INSERT leads/consent/submission/outbox
- [ ] Optional: Turnstile / Resend / Sentry keys only if separately authorized

---

## Functional acceptance

- [ ] `POST /api/leads` happy path → 200 + receipt; rows in leads, consent, submission, outbox
- [ ] Missing consent → 400; no rows
- [ ] Invalid privacy version → 400
- [ ] Oversized field → 400 `field_too_long` (stored value not truncated)
- [ ] Sensitive heuristic → 400 (best-effort; not completeness claim)
- [ ] Identical Idempotency-Key replay → same receipt; **one** lead
- [ ] Concurrent identical same-key (parallel clients) → one lead / one receipt
- [ ] Same key + different payload → **409** conflict; still one lead
- [ ] Forced DB outage / bad `DATABASE_URL` → **503** (not mock success)
- [ ] Kill switch / rate limit behave as designed
- [ ] Application logs contain **no** body, email, message, brief, or credentials

---

## Security acceptance

- [ ] Browser cannot call Supabase with anon key to insert leads
- [ ] Service role key absent from client bundles / HTML / public env
- [ ] Function logs retention window recorded for forensics
- [ ] Staging secrets not visible to production context (and vice versa)
- [ ] Netlify Forms dashboard shows **no** new trusted submissions from these forms

---

## Outbox / recovery (honesty gate)

- [ ] Outbox row created atomically with accepted submission
- [ ] Document replay procedure; do **not** claim near-zero recovery until:
  - [ ] Failure injection tested
  - [ ] Replay integrity tested
  - [ ] Deletion reconciliation tested
- [ ] Encrypted recovery journal requirement tracked separately until implemented

---

## Sign-off

| Role | Decision | Date |
|------|----------|------|
| Implementer (local) | Local remediation ready for staging auth | 2026-11-23 |
| Atlas | | |
| Independent Codex | | |
| Owner | | |

**No production cutover from this checklist alone.**
