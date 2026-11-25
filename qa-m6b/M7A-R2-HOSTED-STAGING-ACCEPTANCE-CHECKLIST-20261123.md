# M7A-R2 — Hosted Staging Acceptance Checklist

**Status:** BLOCKED until Owner authorizes isolated staging provision  
**Production:** HOLD  
**Do not execute against production.**

## Preconditions

- [ ] Separate Supabase **staging** project created (not Factory plane)
- [ ] Roles created: `scs_intake_runtime`, `scs_notify_worker`, `scs_migration`, `scs_owner_admin`
- [ ] Passwords set; Netlify staging context secrets updated (no shared prod secrets)
- [ ] TLS: `sslmode=verify-full` + trusted CA if required
- [ ] `DATABASE_INTAKE_URL` uses `scs_intake_runtime` (not `postgres`)
- [ ] Migrations 001–006 applied via migration identity only
- [ ] Turnstile / Resend left disabled unless separately authorized

## Functional acceptance

- [ ] POST `/api/leads` happy path → 200 with `receipt` + durable `receivedAt`
- [ ] Identical idempotent replay (cache cold) returns **same** `receivedAt`
- [ ] Different payload same key → 409 `idempotency_conflict`
- [ ] Concurrent same-key → single lead / consent / submission / outbox
- [ ] Spoofed `X-Forwarded-For` does not override Netlify connection IP hashing
- [ ] Client `isTest=true` ignored on staging
- [ ] Anon cannot `SELECT` leads or `EXECUTE` `insert_lead_bundle`
- [ ] Intake role can execute insert + counters; cannot DDL
- [ ] Soft-delete writes deletion marker; replay of key → 409 `idempotency_key_deleted`
- [ ] Purge of soft-deleted test rows deletes outbox without FK failure
- [ ] Notify worker `EMAIL_NOTIFY_MODE=simulated` claims/completes without external mail
- [ ] Owner failure status shows pending/failed/dead counts (non-PII)
- [ ] Run `node qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs` with staging URL → PASS

## Explicit non-goals for this checklist

- Live Turnstile/Resend activation (unless separately authorized)
- Encrypted recovery journal
- Production cutover
- Automatic unconverted purge (PENDING_FINAL_PRIVACY_APPROVAL)
