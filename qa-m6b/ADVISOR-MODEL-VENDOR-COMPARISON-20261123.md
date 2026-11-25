# Model Vendor Comparison — Phase B Adaptive Technical Support

**Date:** 2026-11-23  
**Status:** Planning only — no accounts provisioned, no API keys created in this round  
**Estimates only — not guarantees; verify current list prices before purchase**

## Selection criteria

| Criterion | Weight |
|-----------|--------|
| Server-side keys only; adapter-friendly | Required |
| Mid-tier chat quality for beginner troubleshooting | High |
| Low $/token for 3-issue free sessions | High |
| JSON / instruction adherence for schema | High |
| US data handling / DPA availability | High |
| Latency from Netlify Function regions | Medium |
| Streaming (future) | Low for v1 |

## Shortlist

| Vendor / class | Example model tier | Strengths | Risks | Fit |
|----------------|--------------------|-----------|-------|-----|
| **OpenAI** | GPT-4.1-mini / GPT-4o-mini class | Broad tooling, cheap mini tier, strong JSON mode | Policy/branding optics; price changes | **Strong default** |
| **Anthropic** | Claude Haiku / Sonnet class | Safety posture, instruction following | Haiku vs Sonnet cost tradeoff | **Strong alternate** |
| **Google** | Gemini Flash class | Aggressive pricing, long context | Grounding/schema discipline varies | Viable #3 |
| Large flagship only (Opus / GPT-4.1 / o-series) | — | Higher quality | Cost spikes; overkill for KB-grounded steps | **Defer** |

## Adapter recommendation

Ship **provider-independent `ModelAdapter`** with:

1. Primary: mid-tier OpenAI **or** Anthropic Haiku-class (Owner pick at approval).  
2. Secondary failover adapter (other vendor) behind same schema.  
3. `StubAdapter` for CI / eval harness (no network).

Do **not** hard-code a single vendor in the client. Do **not** expose keys to the browser.

## Non-functional notes

- Prefer vendors supporting explicit `max_tokens` / output caps.  
- Prefer structured outputs or constrained decoding for `{steps[], serviceHint}`.  
- System prompt must forbid credential requests, remote execution claims, and invented Signal Crest prices.  
- Eval gate: ≥15 prompt-injection cases must pass before public flag-on.

## Decision gate

Owner chooses primary vendor **after** Phase B implementation approval; comparison here does not authorize procurement.
