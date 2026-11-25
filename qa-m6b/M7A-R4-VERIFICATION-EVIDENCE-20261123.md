# M7A-R4 — Verification Evidence

**Date:** 2026-11-23  
**Audit snapshot:** 2026-11-24T03:21:43Z  
**Prior R4 freeze:** 2026-11-24T03:09:40Z (historical)  
**Result:** **215 / 215 PASS** (mock/static)  
**Real PostgreSQL:** **NOT RUN** (13 cases)

| Class | Result |
|-------|--------|
| (1)+(2) Mock + static | **215/215 PASS** |
| (3) Real PostgreSQL | **0 executed / 13 NOT RUN** |
| (4) Hosted | **0 / HOLD** |

### Commands executed this pass

| Command | Exit |
|---------|-----:|
| `cd netlify/functions && npm install --package-lock-only --ignore-scripts` | 0 |
| `node qa-m6b/verify-m7a-secure-leads-20261123.mjs` | 0 |
| `node qa-m6b/_m7a-static-check.mjs` | 0 |

### R3-08 lockfile verification (static)

- `packages[""].dependencies.pg` = `8.13.1`
- `packages["node_modules/pg"].version` = `8.13.1` with npm integrity
- All `resolved` URLs under `https://registry.npmjs.org/`
- Lockfile SHA-256: `af04592c207523715df668df866bc1fb901b7110d11fb1a90896f7e25e79ad8a`

1. Runtime identities and effective grants — NOT RUN  
2. Warm-cache and cold-cache idempotency — NOT RUN  
3. Concurrent same-key submissions — NOT RUN  
4. Concurrent conflicting payloads — NOT RUN  
5. Deleted-key replay with cached receipts — NOT RUN  
6. Role-bootstrap failure conditions — NOT RUN  
7. TLS certificate and hostname rejection — NOT RUN  
8. Owner allowlist and AAL2 positive and negative — NOT RUN  
9. Expired and reclaimed worker leases — NOT RUN  
10. Unauthorized notification invocation — NOT RUN  
11. Missing hosted IP-hash salt — NOT RUN  
12. Administrative runtime credential rejection — NOT RUN  
13. Retention purge and outbox foreign keys — NOT RUN  

**Mock PASS is not database integration evidence. Real PostgreSQL and hosted verification have NOT passed.**
