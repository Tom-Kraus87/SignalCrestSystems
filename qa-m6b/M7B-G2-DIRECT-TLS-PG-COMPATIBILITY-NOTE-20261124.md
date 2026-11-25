# M7B-G2 — pg@8.13.1 Compatibility Note (Path A TLS)

**Date:** 2026-11-24  
**Scope:** Read-only resolution check for Atlas Path A client selection  
**Production:** HOLD  

## Result

**`pg@8.13.1` resolves from `netlify/functions` without install or package modification.**

| Check | Outcome |
|-------|---------|
| `netlify/functions/package.json` | `"pg": "8.13.1"` |
| `netlify/functions/package-lock.json` | Locked `node_modules/pg` @ **8.13.1** |
| On-disk `node_modules/pg` | Present; `package.json` version **8.13.1** |
| `require(.../pg)` | `Pool` available |
| `require(.../pg/lib/connection-parameters)` | Available (matches `inspectEffectivePgSsl`) |
| Node / npm (workstation) | v22.22.3 / 12.0.1 |
| Native `psql` | Not required for Path A TLS procedure |

## TLS helper alignment

Accepted helper `netlify/functions/_lib/pg-client.js` is written for **pg@8.13.1** explicit-field + SSL object behavior (no `connectionString` overwrite). Path A direct TLS verification should use this installed tree and the Owner procedure in `M7B-G2-DIRECT-TLS-VERIFICATION-PROCEDURE-20261124.md`.

## CA

Supply Supabase Dashboard SSL CA via `DATABASE_SSL_CA` / `DATABASE_SSL_CA_PATH` / `PGSSLROOTCERT`. System store alone is not accepted for Path A PASS evidence.

## Not done this pass

No live connect, no SQL, no dependency install, no harness changes, freeze/successor untouched.
