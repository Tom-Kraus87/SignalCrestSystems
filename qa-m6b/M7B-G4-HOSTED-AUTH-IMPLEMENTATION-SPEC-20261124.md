# M7B-G4 — Hosted Auth / AAL2 Implementation Specification

**Date:** 2026-11-24  
**Nature:** Planning / file-by-file implementation spec — **do not implement or execute in this pass**  
**Base design (preserved):** Claude *M7B-G4 Hosted Auth/AAL2 Verification Design* (2026-11-24)  
**Precedence:** *M7B-G4 Authentication Design Reconciliation Addendum* (2026-11-24) supersedes the base wherever they conflict  
**Production:** **HOLD**  
**Frozen M7B candidate:** do not modify in this planning pass; G4 is a **new targeted milestone** after G1–G3

---

## 0. Accepted staging architecture (unchanged by this spec)

```
[Trusted runner] supabase-js password → AAL1 → hand-entered TOTP → AAL2 JWT
       │
       ▼
GET /api/owner/leads  (Netlify Function)
  1) Cryptographic JWT verify (JWKS, pinned iss/alg/aud/claims)
  2) Map failures → generic 401/403/503 (never JWT-only allow)
  3) Call single atomic RPC as scs_owner_reader with verified (sub, session_id) only
       │
       ▼
owner_read_leads(...) SECURITY DEFINER (dedicated NOLOGIN owner)
  session row bind + AAL2 + allowlist + page bounds + audit + fixed fields
```

Data API stays closed to `anon` / `authenticated` for lead tables. Case 8 simulated `set_config` remains **simulation only**.

---

## 1. Atlas findings — normative responses

| # | Finding | Spec response |
|---|---------|----------------|
| F1 | Session UUID secrecy is **not** an authentication guarantee | D1 restated: guessing/leaking `session_id` is not auth. Auth = JWT crypto at the endpoint **plus** RPC state checks. Document in threat notes; A24 is residual-risk characterization only |
| F2 | Reader credential bypass is staging residual risk only | A24 records expected behavior when `scs_owner_reader` calls RPC with a live owner pair; **not** a user-auth pass. Production alternatives in §11 — staging architecture unchanged |
| F3 | `NOLOGIN` may not invalidate existing pooled connections | A22 must: (a) `ALTER ROLE scs_owner_reader NOLOGIN`; (b) **dispose all Function/pool clients** or wait until every pooled backend exits; (c) prove new connects fail and in-flight requests return **503**, never 200; (d) restore `LOGIN` + reconnect. Document that `NOLOGIN` alone does not revoke open sessions |
| F4 | Explicitly require `exp` and validate claim **types** | Required claims with type checks: `exp` number (unix seconds), `nbf` if present number, `sub`/`session_id` UUID strings, `aal` string `aal2`, `amr` array containing string `totp`, `aud` string or array including `authenticated`, `role` string `authenticated`, `iss` exact string, `kid` non-empty string. Missing/wrong-type → **401** |
| F5 | Validate exact JWKS host and path — not substring | Cold-start and verify: parse `SCS_AUTH_JWKS_URL`; require `hostname === "<ref>.supabase.co"` **and** `pathname === "/auth/v1/.well-known/jwks.json"`; issuer URL exact equality to `SCS_AUTH_ISSUER`. Reject substring/contains checks |
| F6 | Rate-limit tests must not contaminate later acceptance | Isolate limiter keys by fixture run prefix; use dedicated IP/sub fixtures for A16/A26; reset or wait windows; run rate-limit burst **before** final A7 repeat; never share counter keys with A7/A13/A14 |
| F7 | Consistent 401 vs 403 | See §6.4 — token/session crypto failures → **401**; authenticated-but-insufficient (AAL1, allowlist) → **403** |
| F8 | Supabase-managed schema needs real staging verification | §10 pending-verification register — block G4 acceptance until observed |

---

## 2. File-by-file implementation map

Proposed paths are normative for the G4 milestone (names may be adjusted only with Codex re-ack).

### 2.1 New Netlify Function — restricted owner endpoint

| File | Action |
|------|--------|
| `netlify/functions/owner-leads.js` | **CREATE** — `GET` handler only; wire auth → rate limit → RPC → sanitize response |
| `netlify.toml` | **ADD** redirect: `/api/owner/leads` → `/.netlify/functions/owner-leads` (do not alter frozen build command in an unauthorized edit; include in G4 candidate) |

**Behavior:**

- Method ≠ `GET` → **405** `{ "error": "method_not_allowed" }`  
- Query: only `page` (int 1–100, default 1), `page_size` (int 1–25, default 25); else **400**  
- `Authorization` ≤ 4 KiB; scheme `Bearer` only  
- No CORS `Access-Control-Allow-Origin`  
- Every response: `Cache-Control: no-store`, `Pragma: no-cache`, `X-Content-Type-Options: nosniff`, `Vary: Authorization`, `Content-Type: application/json`  
- Connect timeouts: DB connect **3s**, statement **3s**; JWKS fetch **2s**  
- Pass to RPC **only** verified `sub` + `session_id` (never client-supplied IDs)

### 2.2 JWT verification module

| File | Action |
|------|--------|
| `netlify/functions/_lib/owner-jwt.js` | **CREATE** — `jose` remote JWKS verify + claim/type validation + pinning |

**Pinned env (independently set — never derived from token):**

| Variable | Value |
|----------|--------|
| `SCS_SUPABASE_PROJECT_REF` | Staging ref from Owner staging record |
| `SCS_AUTH_ISSUER` | `https://<ref>.supabase.co/auth/v1` |
| `SCS_AUTH_JWKS_URL` | `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` |
| `SCS_AUTH_JWT_ALG` | Single observed alg: `ES256` or `RS256` |
| `SCS_ENV` | `staging` |

**Cold start:** if issuer host/path, JWKS host/path, ref, env, or alg mismatch → every request **503** `unavailable`.

**Verify rules:**

1. Algorithm allowlist = exactly `[SCS_AUTH_JWT_ALG]`; reject `none`, `HS256`, others  
2. Signature via `createRemoteJWKSet(SCS_AUTH_JWKS_URL)` with fetch timeout 2s; in-memory cache ≤ 10 min; unknown `kid` → one refetch with 30s cooldown → still unknown **401**; refetch/network fail **503**  
3. `iss` **===** `SCS_AUTH_ISSUER`  
4. `aud` includes `authenticated`; `role === "authenticated"`  
5. `exp` required number; clock tolerance **30s** max; `nbf` if present  
6. `aal === "aal2"`; `amr` array includes `"totp"` (else **403** after signature OK — see §6.4)  
7. `sub`, `session_id` UUID-typed strings  
8. Token size ≤ 4 KiB before parse  

**Dependency:** pin `jose` in `netlify/functions/package.json` + lockfile (G4 candidate).

### 2.3 Database connection isolation

| File | Action |
|------|--------|
| `netlify/functions/_lib/pg-client.js` | **REUSE** existing TLS/identity factory — do not weaken |
| Owner-leads wiring | Use **`DATABASE_OWNER_READ_URL`** only; expected role `scs_owner_reader` |
| Runtime reject list | Extend admin-reject set so `scs_owner_reader` is allowed **only** for this function path; never use intake/notify/owner_admin/postgres URLs here |

**Project isolation:** parse URL host / pooler username; require embedded or host `PROJECT_REF` === `SCS_SUPABASE_PROJECT_REF`. Mismatch → **503**.

**Not in Netlify:** `sb_secret_*`, legacy `service_role`, `DATABASE_OWNER_URL` (admin purge), JWT HS256 secret, TOTP seeds.

### 2.4 Database migration — reader, NOLOGIN definer, atomic RPC, allowlist

| File | Action |
|------|--------|
| `db/migrations/008_m7b_g4_owner_reader.sql` | **CREATE** (new; not part of frozen M7B 001–007) |

**Objects:**

1. **Extend** existing `public.owner_allowlist` (from migration 002) additively:  
   - `active boolean NOT NULL DEFAULT true`  
   - keep `user_id` PK; retain `email` for ops notes if already present  
   - Writes: project admin only; **no** grants to `anon`/`authenticated`/`PUBLIC`/`scs_owner_reader`  
2. **Role** `scs_owner_reader`: `LOGIN NOINHERIT`; no SUPERUSER/CREATEDB/CREATEROLE/BYPASSRLS/REPLICATION; `CONNECTION LIMIT 3`; role `statement_timeout` (e.g. 3s); **zero** table/view privileges  
3. **Role** `scs_owner_reader_definer` (name finalizable): **`NOLOGIN`**; owns SECURITY DEFINER functions; `SELECT` on needed `leads` columns, `owner_allowlist`, required `auth.sessions` columns (pending §10), `INSERT` on audit table  
4. **Function** `public.owner_read_leads(p_user_id uuid, p_session_id uuid, p_page int, p_page_size int)`  
   - `SECURITY DEFINER`, `SET search_path = pg_catalog, public`  
   - Owner: `scs_owner_reader_definer`  
   - Single transaction: bind session (`id`/`user_id` match), `not_after` null or `> now()`, session `aal = 'aal2'` (column pending verify), allowlist `active`, clamp page inputs, return fixed field list, write audit (allow or deny)  
   - Denial: empty payload + status flag; **no reason string**  
5. **Grants:**  
   - `REVOKE ALL ON FUNCTION … FROM PUBLIC, anon, authenticated`  
   - `GRANT EXECUTE ON FUNCTION owner_read_leads(…) TO scs_owner_reader` **only**  
6. **Audit table** (e.g. `owner_read_audit`): truncated `sub`, time, row count, allowed bool — no tokens  

**PUBLIC grants:** every new function/table starts with `REVOKE ALL … FROM PUBLIC`.

### 2.5 Rate limiting without expanding reader table rights

| File | Action |
|------|--------|
| `db/migrations/008_…` (or `008b`) | `owner_endpoint_rate_check(p_ip_hash text, p_sub uuid, …)` SECURITY DEFINER, same NOLOGIN owner; uses existing `usage_counters` / atomic helpers internally |
| `netlify/functions/_lib/owner-rate-limit.js` | **CREATE** — call rate-check RPC **before** `owner_read_leads`; map trip → **429** |

**Rules:**

- `scs_owner_reader` gains **EXECUTE** on rate-check RPC only — **still no** table `SELECT`/`INSERT`  
- Keys: `hash(x-nf-client-connection-ip)` and verified `sub`  
- Limits (addendum D6): 30/min/IP; 120/hour/sub; 10 failed auth / 10 min / IP → 429  
- Test isolation: prefix all counter keys with `g4-<run-id>-`; A16/A26 use unique synthetic IPs/subs; clear or age out before final A7  

### 2.6 Hosted Auth test runner

| File | Action |
|------|--------|
| `qa-m6b/verify-m7b-g4-hosted-auth-20261124.mjs` | **CREATE** — consumes `SCS_AUTHORIZE_HOSTED_AUTH_TESTS=true`; A1–A26 order per §8 |
| `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs` | **DO NOT MODIFY** in freeze; case 14 stays NOT RUN pointer — G4 runner is separate evidence class |

Runner deps (dev/test only): pinned `@supabase/supabase-js`. TOTP codes **hand-entered**; no stored seeds. In-process sanitizer before any disk/stdout persistence (D7).

### 2.7 Evidence + env docs

| File | Action |
|------|--------|
| `.env.example` | **Document** new vars as comments/placeholders only (`DATABASE_OWNER_READ_URL`, `SCS_AUTH_*`, `SCS_SUPABASE_PROJECT_REF`) — no secrets |
| `qa-m6b/M7B-G4-HOSTED-AUTH-EVIDENCE-*.json/md` | **CREATE** after authorized runs (sanitized) |

### 2.8 Package manifests

| File | Action |
|------|--------|
| `netlify/functions/package.json` + lockfile | Add pinned `jose` |
| Future G4 audit manifest | Include all new security-relevant files for Codex |

---

## 3. JWT claim verification (normative checklist)

| Claim | Required | Type | Rule | Fail |
|-------|----------|------|------|------|
| `alg` header | Y | string | === `SCS_AUTH_JWT_ALG` | 401 |
| `kid` header | Y | non-empty string | Must resolve via JWKS | 401 / 503 |
| `iss` | Y | string | Exact `SCS_AUTH_ISSUER` | 401 |
| `aud` | Y | string or array | Includes `authenticated` | 401 |
| `role` | Y | string | `authenticated` | 401 |
| `exp` | Y | number | `now ≤ exp + 30s` | 401 |
| `nbf` | if present | number | `now ≥ nbf - 30s` | 401 |
| `sub` | Y | UUID string | Owner identity | 401 if bad type |
| `session_id` | Y | UUID string | Session bind | 401 if bad type |
| `aal` | Y | string | Must be `aal2` for allow | **403** if `aal1`/missing after OK sig |
| `amr` | Y | array of strings | Includes `totp` | **403** |

---

## 4. Database identity and privilege matrix (G4)

| Principal | Login | Powers |
|-----------|-------|--------|
| `scs_owner_reader` | YES | `EXECUTE` `owner_read_leads`, `EXECUTE` rate-check only |
| `scs_owner_reader_definer` | **NO** | Owns DEFINER fns; SELECT leads/allowlist/sessions cols; INSERT audit |
| `scs_owner_admin` | YES | Unchanged — purge/status; **not** in Netlify for G4 |
| `scs_test_admin` | YES | Unrelated to G4 endpoint |
| `anon` / `authenticated` | managed | **No** EXECUTE on G4 RPCs; Data API denial (A15) |
| `PUBLIC` | — | **Revoked** on all G4 objects |

---

## 5. Atomic session-bound reader RPC (D2/D8)

Single call `owner_read_leads(p_user_id, p_session_id, p_page, p_page_size)`:

1. Clamp `page`/`page_size` server-side (1–100 / 1–25)  
2. Lookup `auth.sessions` where `id = p_session_id` **and** `user_id = p_user_id`  
3. Reject if missing, user mismatch, or `not_after` expired  
4. Reject if session assurance ≠ `aal2` (exact column pending §10)  
5. Reject if `owner_allowlist` has no **active** row for `p_user_id`  
6. SELECT fixed lead fields only (no raw IP hash; synthetic rows filterable by fixture prefix in tests)  
7. INSERT audit row  
8. Return rows + ok/deny status — endpoint maps deny → 401/403 without leaking reason  

**Endpoint never** substitutes request-body user/session IDs.

---

## 6. Endpoint HTTP semantics

### 6.1 Success

`200` — `{ "ok": true, "leads": [ …fixed fields… ], "page": n, "page_size": m }`

### 6.2 Errors (generic bodies only)

| Status | Body `error` | When |
|--------|--------------|------|
| 400 | `bad_request` | Bad query/body/header shape |
| 401 | `unauthorized` | Missing/forged/expired/modified token; session missing/expired/mismatch; signed-out |
| 403 | `forbidden` | Valid signature but `aal`≠aal2 / missing totp amr; allowlist miss/inactive |
| 405 | `method_not_allowed` | Non-GET |
| 429 | `rate_limited` | D6 limits |
| 503 | `unavailable` | DB/JWKS/timeouts; pin mismatch; reader NOLOGIN fault (A22) |

### 6.3 401 vs 403 (F7)

- **401:** caller failed to present a currently acceptable credential/session (crypto, expiry, logout, session bind).  
- **403:** credential cryptographically OK for an identity that is **not authorized** for this resource (AAL1, non-owner, deactivated allowlist).  
- AAL1 token with valid signature → **403** (A6).  
- Non-owner AAL2 → **403** (A8).  
- Allowlist deactivated mid-session → **403** (A21).  
- After global sign-out, unexpired access token → **401** (A13).

### 6.4 Timeouts

| Bound | Value |
|-------|-------|
| JWKS HTTP fetch | 2s |
| DB connect | 3s |
| DB statement | 3s |
| Fail mode | 503; never JWT-only allow; never partial lead rows |

---

## 7. Sanitized evidence generation (D7 + A19)

**Allowlisted fields only:** HTTP status; response field names; counts; header presence; `alg`; `kid` first 8; `iss` ref; `aud`; `aal`; `amr` methods; `exp−iat`; `sub`/`session_id` first 8.

**Never persist:** access/refresh tokens; `Authorization`; passwords; TOTP codes/seeds/`otpauth://`; `sb_` keys; full emails; raw HTTP archives.

Runner sanitizes **before** stdout/disk. A19 scans saved artifacts for forbidden patterns (second line of defense).

---

## 8. Revised 26-row acceptance matrix

Order is mandatory. Layer: AUTH / REST / HOST / DB / LOCAL.

| # | ID | Test | Layer | Pass |
|---|----|------|-------|------|
| 1 | A18 | Pinning: ref, issuer, JWKS URL+path, algorithm | HOST config | Match; deliberate mismatch → 503 |
| 2 | A1 | `signUp` with sign-ups disabled | AUTH | Refused; user count unchanged |
| 3 | A2 | Admin creates owner + non-owner (email confirmed) | AUTH | Both exist; no secret key |
| 4 | A3/A4 | Owner correct then wrong password | AUTH | AAL1+password; wrong refused |
| 5 | A5 | Owner primary+backup TOTP; non-owner TOTP | AUTH | Owner aal2+totp; no seed persisted |
| 6 | S1 | Admin inserts active allowlist row | DB admin | One active row |
| 7 | A7 | Genuine owner AAL2 page 1 | HOST+DB | 200; ≤25; fixed fields; audit; headers |
| 8 | A6 | Owner AAL1 token | AUTH+HOST | **403** |
| 9 | A8 | Non-owner AAL2 | AUTH+HOST | **403** |
| 10 | A9 | No header; publishable key as Bearer | HOST | **401** |
| 11 | A10 | Forged (local key+kid; alg none; HS256) | HOST | **401** each |
| 12 | A11 | Payload-edited aal1→aal2, old sig | HOST | **401** |
| 13 | A12 | Expiry window (200 before; 401 ≥90s after exp) | AUTH+HOST | 200 then 401 |
| 14 | A15 | Data API closed (publishable + owner AAL2) | REST | No lead data (401/403/404) |
| 15 | A16/A26 | Bounds + rate limits (isolated keys) | HOST | 400/405/429; generic bodies |
| 16 | A20 | Session/user mismatch via reader RPC | DB reader | Empty+deny; audit |
| 17 | A21 | Allowlist deactivate → 403; restore → 200 | DB+HOST | 403 then 200 |
| 18 | A22 | Reader NOLOGIN + **pool drain** → 503; restore | DB+HOST | 503 never 200; then 200 |
| 19 | A25 | JWKS faults mocked | LOCAL | 401/503/503 |
| 20 | A23 | Reader privilege denials (SQL) | DB reader | All denied |
| 21 | A24 | Reader+live pair residual risk | DB reader | Restricted page; **residual risk**, not auth pass |
| 22 | A13 | Global sign-out; reuse token; refresh | AUTH+HOST | 401; refresh refused |
| 23 | A14 | Expire then refresh → new AAL2 200 | AUTH+HOST | 401 then 200 |
| 24 | A17 | MFA recovery drill | AUTH+HOST | Backup AAL2; factor delete ends sessions |
| 25 | A7 | Positive control repeat (fresh AAL2) | HOST+DB | 200 |
| 26 | A19 | Evidence scan | LOCAL | Zero secret patterns |

Optional: A18-F foreign project token → 401. Pro session controls P-1…P-3: **NOT IN STAGING SCOPE**.

**Case 14 / G4 accept when:** rows 1–26 pass in one run; A24 labeled residual risk; Codex reviews sanitized evidence; case 8 stays simulation-only; Production HOLD.

---

## 9. Supabase-managed dependencies (must verify on real staging)

| Item | Why | Gate |
|------|-----|------|
| `auth.sessions` columns (`id`, `user_id`, `not_after`, `aal`, …) | RPC bind | Observe before locking SQL |
| Grantability of `SELECT` on `auth.sessions` to definer role | May be restricted | If impossible, Codex-approved alternate (e.g. Auth Admin API check) — would be design change needing Atlas |
| JWKS asymmetric algorithm actually served | Pin `SCS_AUTH_JWT_ALG` | Observe JWT keys page / JWKS |
| `signUp` error shape with sign-ups off | A1 | Observe |
| PostgREST exposed schemas / exact A15 statuses | Denial proof | Observe |
| Effect of `ALTER ROLE … NOLOGIN` on pooler backends | A22 / F3 | Observe + pool drain procedure |
| Factor deletion ends sessions | A17 | Observe |

---

## 10. Stronger production authorization alternatives (staging unchanged)

Feasible upgrades for **production preparation** without rewriting the accepted staging shape:

| Alternative | Strength | Cost / complexity | Note |
|-------------|----------|-------------------|------|
| A. Short-lived DB ticket minted after JWT verify (one-time RPC nonce) | Removes standing reader password value for replay | Medium | Endpoint exchanges JWT→nonce; reader secret never enough alone |
| B. Per-invoke ephemeral DB credentials via vault/broker | Eliminates long-lived Netlify DB secret | High | Ops heavy; good for Pro |
| C. Keep Data API closed; add mTLS or private network between Netlify and Postgres | Shrinks credential theft surface | Medium/High | Provider-dependent |
| D. Dual control: JWT verify + owner device WebAuthn step-up on read | Stronger user bind | Medium | UX cost; beyond staging |
| E. Pro session controls (time-box, inactivity, single session) | Limits stolen-token window | Low on Pro | Already NOT IN STAGING SCOPE; enable at prod prep |
| F. Split read replica with revoke-on-logout trigger job | Defense if sessions lag | Medium | Still needs session truth |

**Staging residual risk (F2) stays documented.** Production may adopt A+E as the default hardening path without invalidating G4 evidence.

---

## 11. Implementation effort (estimate)

See also `M7B-G2-G4-PLANNING-SUMMARY-20261124.md`.

| Work package | Effort | Dependencies |
|--------------|--------|--------------|
| Migration 008 + grants | 0.5–1.0 eng-day | G1 applied; `A-SQL`; §10 session schema verify |
| `owner-jwt.js` + pinning | 0.5–1.0 | `jose` pin; observed alg |
| `owner-leads.js` + redirect | 0.5 | JWT + RPC + rate-limit |
| Rate-limit DEFINER RPC | 0.25–0.5 | usage_counters pattern |
| Hosted Auth runner A1–A26 | 1.5–2.5 | G3 deploy; Auth users; Owner TOTP; `A-HOSTTEST` |
| Local unit mocks (A25) | 0.5 | — |
| Evidence sanitizer + docs | 0.5 | — |
| Codex freeze/manifest | 0.5 | All above |

**Calendar:** ~4–6 eng-days after G1–G3 clear, plus Owner wall-clock for TOTP and dashboard steps.

---

## 12. Explicit non-actions this pass

No G4 code landed · no SQL · no Auth users · no deps installed · frozen M7B/R7 untouched · Production HOLD.
