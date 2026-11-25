# Estimated Operating Costs — Phase B Adaptive Support

**Date:** 2026-11-23  
**Label:** **Estimates only — not guarantees**  
**Sources:** `qa-m6a/M6C-phase-b-adaptive-technical-support.md` §10 + current mid-tier chat pricing bands

## Assumptions

- Mid-tier chat model (mini / Haiku / Flash class).  
- Rough vendor band: ~**$0.40–$3.00 / 1M input tokens**, ~**$1.50–$15.00 / 1M output tokens** (verify at buy time).  
- Per issue: ~8–20 turns; ~4k–12k input cumulative + ~1.5k–4k output.  
- Free session: up to **3 issues**.  
- Abuse controls mandatory (atomic rate + daily/monthly ceilings).

## LLM variable cost per maxed free session

| Scenario | Est. cost | Notes |
|----------|-----------|-------|
| Light | **~$0.01–$0.05** | Tight prompts; small model |
| Typical | **~$0.05–$0.25** | Mixed follow-ups; 3 issues |
| Heavy | **~$0.25–$1.00+** | Verbose users; larger model |

## Non-LLM drivers

| Driver | Est. impact |
|--------|-------------|
| Netlify Function invocations | Usually cents / session at low volume |
| Atomic counter store (Redis/Upstash/DB) | Low fixed + per-command; budget ~$0–$20/mo early |
| Blobs for idempotency / stubs | Negligible at low volume |
| Logging / observability | Keep minimal (privacy + cost) |
| Human follow-up after handoff | Dominant **labor** cost — not LLM |

## Suggested ceilings (starting points — tune in runbook)

| Ceiling | Starting suggestion |
|---------|---------------------|
| Per-IP rate | 30 LLM turns / 10 min |
| Per-session turns | 40 |
| Per-session tokens | 80k in + 20k out |
| Daily USD | Hard cap (e.g. $25–$100) → kill/degrade |
| Monthly USD | Hard cap (e.g. $200–$500) → kill/degrade |

## Phase A cost

Phase A deterministic Advisor: **$0 LLM**. Only static hosting / form traffic.

## Gate

Do not publish live Adaptive Support without atomic spend enforcement and kill switch tested.
