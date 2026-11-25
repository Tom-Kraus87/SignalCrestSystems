# M7A — Phase B Compatibility Primitives (no live AI)

**Code:** `netlify/functions/_lib/transactional-primitives.js`  
**Production backing:** PostgreSQL `usage_counters` / `atomic_counter_*` (migration `004`)  
**Cost override:** Prior Redis recommendation **superseded** — Postgres UPSERT preferred.

## Primitives shipped (local mock)

| Primitive | Function | Backing |
|-----------|----------|---------|
| Issue credits | `reserveIssueCredit` | Atomic INCR + compensate |
| Rate windows | `checkRateWindow` | INCR + EXPIRE |
| Idempotency | `rememberIdempotent` | SET NX (`idempotency_set_nx` / Blobs onlyIfNew OK) |
| Spend reservation | `reserveSpend` / `releaseSpend` / `commitSpend` | Atomic accumulator |
| Daily/monthly ceilings | `dailySpendKey` / `monthlySpendKey` | Key helpers |
| Kill switch | `isKillSwitchOn` | Env primary + optional flag key |

## Non-goals this round

No live vendor calls, no public LLM Mode A enablement, **no Redis provisioning**, no live Postgres wiring.
