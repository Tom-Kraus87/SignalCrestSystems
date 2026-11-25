# M7B-G2 — Direct TLS Discovery Status Record

**Date:** 2026-11-24  
**Milestone:** M7B-G2 Direct TLS Verification Preparation  
**Nature:** Status record only — preparation / local read-only inspection  
**Path:** A (direct host) only  
**Production:** **HOLD**  
**Live TLS execution:** **NOT AUTHORIZED** in this pass — awaiting Atlas and Owner approval  

**Companion procedure:** `qa-m6b/M7B-G2-DIRECT-TLS-VERIFICATION-PROCEDURE-20261124.md`  
**Compatibility note:** `qa-m6b/M7B-G2-DIRECT-TLS-PG-COMPATIBILITY-NOTE-20261124.md`

---

## 1. Authorization boundary (this pass)

| Allowed | Forbidden |
|---------|-----------|
| Read-only inspection of installed `pg`, lockfiles, accepted TLS helper | Live DB connect / SQL / TLS handshake to staging |
| Record A.4 / A.5 acceptances | Access stored credentials / env secrets |
| Draft Owner-executable PowerShell for later approval | Install / modify packages; change harness or `pg-client.js` |
| Create **new** docs under `qa-m6b/` (+ PDFs) | Modify freeze / successor payloads; Path B; Supabase config; Git ops; deploy; R5 |

**Freeze / successor:** All **64** successor candidate payloads and historical freeze artifacts remain **UNTOUCHED**.

---

## 2. Owner discovery — A.4 / A.5 (accepted & recorded)

### A.4 — Migration role

| Field | Recorded value |
|-------|----------------|
| Provision status | **NOT PROVISIONED** |
| `rolcanlogin` | **NULL** (role absent — not queryable) |
| `rolsuper` | **NULL** |
| `rolcreaterole` | **NULL** |

### A.5 — Broader provision status

| Field | Recorded value |
|-------|----------------|
| Overall provision status | **NOT PROVISIONED** |
| Intake role present | **false** |
| Fixture roles present | **false** |
| Idempotency table present | **false** |
| Lookup function present | **false** |
| Conditional privilege results | **NULL** |

**Implication for TLS work:** Direct-host TLS transport verification can proceed (when authorized) **without** migration/runtime role provisioning. Authenticated PostgreSQL identity checks remain blocked until roles exist and Owner supplies credentials out of band.

---

## 3. Client selection (accepted)

| Item | Result |
|------|--------|
| Node | **v22.22.3** |
| npm | **12.0.1** |
| Native `psql` | **Not located** |
| Winget | **Available** (install not authorized this pass) |
| Selected Path A client | Existing Node PostgreSQL driver **`pg@8.13.1`** under `netlify/functions` |
| Additional dependency install | **Not required** |

---

## 4. Target (Path A only)

| Item | Value |
|------|-------|
| Project | `scs-staging` |
| `PROJECT_REF` | `kfclinlrzfwodmichmci` |
| Host | `db.kfclinlrzfwodmichmci.supabase.co` |
| Port | `5432` |
| Pooler / Path B | **Out of scope** this procedure |

---

## 5. `pg` resolution (read-only)

| Check | Result |
|-------|--------|
| `netlify/functions/package.json` pin | `"pg": "8.13.1"` |
| `netlify/functions/package-lock.json` | `node_modules/pg` → **8.13.1** (integrity present) |
| On-disk `netlify/functions/node_modules/pg/package.json` | **version 8.13.1** |
| `require('pg')` from installed tree | **Resolves** (`Pool` function present) |
| `pg/lib/connection-parameters` | **Resolves** (matches accepted helper inspection path) |
| Packages installed/modified this pass | **None** |

**Verdict:** `pg@8.13.1` **resolves from `netlify/functions` without install or package modification.**

---

## 6. Accepted TLS helper inspection (read-only)

**Primary helper:** `netlify/functions/_lib/pg-client.js`  
**Harness TLS builder (reuses helper):** `buildHarnessPoolConfig` in `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs`

### Effective policy (prod-like / Path A verification)

| Control | Requirement |
|---------|-------------|
| `rejectUnauthorized` | **must be `true`** |
| Hostname verification | `tls.checkServerIdentity` **required** |
| URL `sslmode=require` | Treated as insecure for passthrough; factory **forces** verified TLS (`normalizedSslmode: verify-full`) |
| `sslmode=disable|allow|prefer|no-verify|verify-ca` | **Forbidden** |
| `connectionString` + secure `ssl` together | **Forbidden** (explicit approved fields only) |
| `rejectUnauthorized:false` | **Forbidden** in prod-like modes |

### CA certificate inputs (optional in code; **required for Supabase verify-full practice**)

| Env var | Role |
|---------|------|
| `DATABASE_SSL_CA` | Inline PEM ( `\n` → newline) |
| `PGSSLROOTCERT_PEM` | Alternate inline PEM |
| `DATABASE_SSL_CA_PATH` | Filesystem path to CA file |
| `PGSSLROOTCERT` | Alternate path (libpq-compatible name) |

If none are set, Node uses the **system trust store**. For Supabase direct Postgres, official docs require the **project SSL CA** from Dashboard → Database Settings → SSL Configuration for `verify-full`. **Do not rely on system store alone** for Path A PASS evidence.

**Helper / harness files were not modified in this pass.**

---

## 7. Credential-free vs authenticated scope

| Layer | Feasible without DB password? | What it proves |
|-------|-------------------------------|----------------|
| **TLS transport** (SSLRequest → TLS handshake + cert/hostname) | **Yes** | Encryption + CA chain + hostname match to Path A host |
| **PostgreSQL identity** (`current_user` / `session_user`, roles) | **No** — needs Owner credentials | Login role and session identity |

A.4/A.5 **NOT PROVISIONED** does **not** block transport TLS verification. It **does** block meaningful authenticated identity verification until provisioning + Owner credentials exist.

---

## 8. Stop gate

| Item | Status |
|------|--------|
| Preparation docs | Ready for Atlas / Owner review |
| Live TLS probe | **STOP** — not executed |
| Production | **HOLD** |
| Next step | Owner + Atlas approval → Owner executes procedure on trusted machine → sanitized evidence only |

---

## 9. Related artifacts (reference only — not modified)

- `qa-m6b/M7B-G2-R4-SUCCESSOR-CANDIDATE-MANIFEST-20261124.md` (64 entries)
- `qa-m6b/evidence/m7b-g2-r4-historical-harness-826bf5c3-20261124/`
- `netlify/functions/_lib/pg-client.js`
- `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs`
- Official CA guidance: [Supabase Postgres SSL Enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement)
