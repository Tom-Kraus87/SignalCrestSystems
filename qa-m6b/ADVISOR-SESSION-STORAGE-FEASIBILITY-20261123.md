# Session Storage Feasibility — Netlify Blobs Atomicity Assessment

**Date:** 2026-11-23  
**Scope:** Phase B Adaptive Support counters, sessions, idempotency  
**Design only — no provisioning**

## Verdict

**Netlify Blobs alone cannot provide demonstrably safe atomic credit / rate / spend enforcement under concurrency.**  
Ordinary read-modify-write (RMW) is **not** sufficient. Conditional writes (`onlyIfMatch` / `onlyIfNew`) are useful for **idempotency keys** and **session payload CAS**, but are **not** a substitute for atomic `INCR` / transactional counters. Atlas security/concurrency requirements therefore mandate a **transactional alternative** for ceilings.

## Platform facts (Netlify Blobs)

| Property | Behavior |
|----------|----------|
| Concurrency model | **Last write wins** — no built-in concurrency control |
| Consistency | Default **eventual**; optional **strong** for read visibility |
| Conditional writes | `onlyIfNew`, `onlyIfMatch` (ETag) — atomic *conditional* put, not increment |
| Official guidance | Optimized for frequent reads / infrequent writes; advanced concurrency → database integrations |
| Skill/docs note | Do **not** build counters / balances on blob keys even with `onlyIfMatch` retries for transactional data |

## Failure mode under concurrent RMW

Two overlapping Mode A turns for the same session / IP:

1. Both read `creditsUsed = 2`.  
2. Both classify as new issue and decide to allow.  
3. Both write `creditsUsed = 3`.  
→ **Fourth free issue can slip through**; spend ceilings similarly under-count.

`onlyIfMatch` retries reduce lost updates but:

- Require careful retry loops under load.  
- Still race on “check then charge” across multiple keys (credits + daily spend + rate).  
- Do not give a single-key atomic increment primitive.  
- Are explicitly discouraged for counter/balance designs in current Netlify guidance.

**Therefore:** atomic enforcement **cannot** be demonstrated with Blobs RMW as the sole control plane.

## Recommended storage split

| Data | Store | Why |
|------|-------|-----|
| Idempotency key → response | **Netlify Blobs** + `onlyIfNew` | Create-once fits Blobs |
| Signed session token | Client cookie/header; HMAC server-side | Stateless verification |
| Optional session transcript stub | Blobs strong consistency + short TTL | Non-authoritative UX resume |
| Issue credits / turn counts | **Atomic counter store** | Redis/`INCR`, Upstash, or Netlify DB transaction |
| Per-IP rate window | **Atomic counter store** | Same |
| Daily / monthly spend micros | **Atomic counter store** or transactional row | Pre/post debit must serialize |
| Kill switch flag | Env var (primary) + optional Blobs flag | Fast global disable |

## Transactional alternatives (ranked for this site)

1. **Upstash Redis / Redis `INCR` + `EXPIRE`** — simplest atomic rate/credit/spend; fits Netlify Functions.  
2. **Netlify DB (Postgres)** — `UPDATE … SET credits = credits + 1 WHERE credits < 3 RETURNING *` style row locks.  
3. **External durable single-writer** (e.g. Cloudflare DO) — only if multi-cloud accepted (usually not for this stack).

## Acceptance criteria for “atomic enforcement demonstrated”

Before public LLM launch, prove with tests:

- Concurrent `start_issue` at credit boundary → exactly one success.  
- Concurrent spend near daily ceiling → no silent overage.  
- Replayed idempotency key → no double debit.  
- Kill switch → zero vendor calls within one request of flag flip.

If these cannot be shown → **keep Mode A on Phase A knowledge pack**; do not enable live Adaptive Support.

## Phase A note

Phase A correctly uses **client sessionStorage** credit UX only. That is acceptable for deterministic guided help with disclosure; it is **not** a Phase B trust boundary.
