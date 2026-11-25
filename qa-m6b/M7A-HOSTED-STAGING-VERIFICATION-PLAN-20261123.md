# M7A — Hosted Staging Verification Plan

**Do not run until Atlas/Owner authorize staging deploy.**  
Local foundation is ready; hosted proof is still required for CONDITIONAL → staging go.

## Preconditions

1. Atlas/Owner approval to deploy this branch to **staging only**.  
2. Provisioning items from `M7A-PROVISIONING-REQUIREMENTS-20261123.md` completed (or mock mode explicitly accepted for Function-only smoke — not for CRM go-live).  
3. No production DNS cutover.

## Verification checklist

### A. Endpoint smoke
- [ ] `POST https://<staging>/api/leads` with valid JSON + consent → 200 + `receivedAt`
- [ ] Missing consent → 400 `consent_required`
- [ ] Bad privacy version → 400 `privacy_version_invalid`
- [ ] Sensitive phrase → 400 `sensitive_content`
- [ ] Oversized body → 413
- [ ] Replay same `Idempotency-Key` → single DB row
- [ ] Function logs contain **no** message/email bodies

### B. Bypass absence
- [ ] HTML source on staging has **no** `data-netlify` on contact/project-request
- [ ] Netlify Forms dashboard shows no new trusted submissions from these forms (or forms disabled)
- [ ] Classic `POST /` Forms body does not create CRM lead

### C. Persistence (when Postgres live)
- [ ] Row in `leads` + `consent_records` + `submission_requests`
- [ ] Anon Supabase key cannot SELECT leads
- [ ] Soft-delete RPC scrubs free text
- [ ] `is_test=true` rows purge procedure dry-run

### D. Frontend paths
- [ ] Project request happy path
- [ ] Contact with consent
- [ ] Advisor handoff → project-request (brief only; enter contact; submit)
- [ ] Themes / Solutions Explorer / workflows smoke (regression)

### E. Cleanup
- [ ] Delete or mark `is_test` all staging leads  
- [ ] Confirm no real customer data used

## Exit criteria

All A–E checked → eligible for Atlas staging acceptance note.  
Production remains **HOLD** until Owner privacy retention sign-off + production provisioning.
