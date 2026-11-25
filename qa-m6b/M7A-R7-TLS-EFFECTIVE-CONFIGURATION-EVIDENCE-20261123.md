# M7A-R7 — TLS Effective Configuration Evidence

**Date:** 2026-11-23  
**Audit snapshot:** 2026-11-24T04:20:26Z  
**Driver:** pinned `pg@8.13.1` at `netlify/functions/node_modules/pg`  
**Database connection:** **NONE** (Pool constructed idle / ended immediately; no query to a live host)  
**npm install / npm ci this pass:** **NOT executed**  
**Machine-readable companion:** `qa-m6b/M7A-R7-TLS-EFFECTIVE-CONFIGURATION-EVIDENCE-20261123.json`

## Vulnerability (Codex reproduction)

`pg@8.13.1` `lib/connection-parameters.js`:

```js
if (config.connectionString) {
  config = Object.assign({}, config, parse(config.connectionString))
}
this.ssl = typeof config.ssl === 'undefined' ? readSSLConfigFromEnvironment() : config.ssl
```

When both `connectionString` and a secure `ssl` object are supplied, the parsed URL **overwrites** `ssl`.

| Input | Effective `rejectUnauthorized` |
|-------|-------------------------------:|
| `connectionString` with `sslmode=require&uselibpqcompat=true` **plus** secure `ssl` | **`false`** (downgrade) |
| Explicit fields + secure `ssl` (no connectionString) | **`true`** |

## Application correction

`createPgQueryClient`:

1. `parseApprovedConnectionFields(url)` — strict allowlist; reject overrides  
2. `buildSslOptions` — `rejectUnauthorized: true`, `checkServerIdentity: tls.checkServerIdentity`  
3. `new Pool({ user, password, host, port, database, ssl, … })` — **no `connectionString`**  
4. `inspectEffectivePgSsl(poolConfig)` via real `ConnectionParameters` — fail closed if effective TLS is weak  

Credentials / full URLs are never logged (redacted evidence only).

## Case results (local; no DB)

| Case | Result | Effective TLS / notes |
|------|--------|------------------------|
| Codex baseline (raw ConnectionParameters + connectionString) | Demonstrated downgrade | `rejectUnauthorized: false` |
| Factory: `sslmode=require&uselibpqcompat=true` | **REJECT** `database_url_uselibpqcompat_forbidden` | N/A |
| Positive: `sslmode=verify-full` direct | **PASS** | `rejectUnauthorized: true`, hostname check present, `hasConnectionString: false` |
| Positive: `sslmode=require` alone | **PASS** (normalized) | Effective verify-full; require not passed to driver |
| Positive: pooler host `:6543` + `pgbouncer=true` | **PASS** | Verified TLS; host/port preserved |
| Reject: `sslmode=disable` | **REJECT** | |
| Reject: `sslmode=verify-ca` | **REJECT** | |
| Reject: `sslrootcert=` injection | **REJECT** | |
| Reject: duplicate `sslmode` | **REJECT** | |

## Claim boundary

This evidence proves the **final effective TLS object** the pinned PostgreSQL client would use. It does **not** prove live certificate validation against a hosted Supabase endpoint (that remains staging-only case 7 / hosted verification).
