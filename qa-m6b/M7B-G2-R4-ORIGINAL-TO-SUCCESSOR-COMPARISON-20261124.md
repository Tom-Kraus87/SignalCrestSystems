# M7B-G2-R4 — Original → Successor Inventory Comparison

**Date:** 2026-11-24  
**Original freeze:** M7B 59-file digest `3c7cebb3f27ebf55d1d002e2d8c480a451932ff43d1b4f39f579956cb2ad4d0b`  
**Successor:** `M7B-G2-R4-SUCCESSOR-20261124` @ `2026-11-25T00:25:29Z`  
**Successor digest:** `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d` (64 entries)  
**Machine-readable:** `M7B-G2-R4-ORIGINAL-TO-SUCCESSOR-COMPARISON-20261124.json`

---

## Summary

| Status | Count | Notes |
|--------|------:|-------|
| unchanged | 58 | Same SHA-256 as historical M7B freeze |
| modified | 1 | Revised harness only |
| added | 5 | R4 test, historical harness freeze, attestation, fixture overlay, R4 results |
| removed | 0 | None |

Historical freeze artifacts were **not** overwritten.

---

## Modified

| Path | Original SHA-256 | Successor SHA-256 | Reason |
|------|------------------|-------------------|--------|
| `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs` | `826bf5c3845c8d9068831a07e87aaaecfdb721f3a009115a7bdda41c96c3d0f9` | `6f4f95ce3a6e7734a5cc769a9f46c7114f7c64d7d80901e6835150b2c9bcd2a2` | A-HARNESS: Path A five-pool independent identity preflight + `finally` cleanup |

---

## Added

| Path | Successor SHA-256 | Reason |
|------|-------------------|--------|
| `qa-m6b/tests/m7b-g2-r4-independent-pool-identity-20261124.mjs` | `ad053dbc78a05e8f1b08fc43111d42593c04948441685bad4658464be374df1b` | New R4 mock/static regression |
| `qa-m6b/evidence/m7b-g2-r4-historical-harness-826bf5c3-20261124/verify-m7a-r2-postgres-integration-20261123.mjs` | `826bf5c3845c8d9068831a07e87aaaecfdb721f3a009115a7bdda41c96c3d0f9` | Recoverable pre-mutation harness (original hash verified) |
| `qa-m6b/evidence/m7b-g2-r4-historical-harness-826bf5c3-20261124/ORIGINAL-SHA256.txt` | *(see file)* | Freeze attestation |
| `qa-m6b/M7B-G2-R3-staging-fixture-rls-policies-20261124.sql` | *(see inventory JSON)* | Applicable staging fixture overlay for completeness |
| `qa-m6b/M7B-G2-R4-LOCAL-REGRESSION-RESULTS-20261124.json` | `d5e7d7e05dc33bb2a42fde63c8dc127544f7bb54b00d60ec607f5f991d10754a` | R4 local mock/static evidence (not real-PG) |

---

## Unchanged (representative)

All remaining original 58 inventory paths retain their freeze hashes, including:

- `netlify/functions/_lib/pg-client.js` (TLS/identity helpers — reused as-is)
- Functions package.json / package-lock.json
- All `db/bootstrap` + `db/migrations` SQL
- Build/deploy: `netlify.toml`, `_headers`, `scripts/build-public.mjs`
- Security-relevant application sources (leads path, advisor, forms)
- Historical NOT RUN JSON (R4/R6/R7) and M7B NOT RUN JSON
- Historical local test / TLS evidence artifacts

Full per-path listing: successor manifest + comparison JSON.

---

## Removed

None.
