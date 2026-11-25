# M7B-G2 — Direct TLS Verification Procedure (Owner-Executable)

**Date:** 2026-11-24  
**Milestone:** M7B-G2 Direct TLS Verification Preparation  
**Nature:** Preparation only — **do not execute** until Atlas **and** Owner approve  
**Path:** A (direct host) only — `db.kfclinlrzfwodmichmci.supabase.co:5432`  
**Client:** Installed `pg@8.13.1` under `netlify/functions` (no new install)  
**Production:** **HOLD**  

**Discovery record:** `qa-m6b/M7B-G2-DIRECT-TLS-DISCOVERY-STATUS-20261124.md`  
**Compatibility note:** `qa-m6b/M7B-G2-DIRECT-TLS-PG-COMPATIBILITY-NOTE-20261124.md`

---

## 0. Hard rules

1. **Do not run this procedure** until Atlas and Owner explicitly approve live Path A TLS execution.  
2. Never print, paste into chat, commit, or screenshot: passwords, full connection URLs, tokens, or env secret values. Use placeholders in evidence.  
3. Distinguish **TLS transport verification** (cert + hostname) from **authenticated PostgreSQL identity** (login role).  
4. Do **not** modify freeze/successor payloads, harness, or `netlify/functions/_lib/pg-client.js`.  
5. Path B / pooler hosts / port `6543` are **out of scope**.  
6. After the session: clear session env vars; do not persist secrets to User/Machine env or `.env` files.

---

## 1. Two verification layers

| Layer | Goal | Credentials | When |
|-------|------|-------------|------|
| **Layer T — TLS transport** | Prove strict chain + hostname to Path A host | **None** (credential-free SSLRequest + TLS) | First — sufficient for M7B-G2 direct TLS gate |
| **Layer I — Identity** | Prove login works under verified TLS | Owner-entered password (SecureString) | Optional / later — only after roles exist; **separate** from Layer T |

A.4/A.5 are **NOT PROVISIONED**. Layer T does **not** require roles. Layer I will fail closed until provisioning completes.

---

## 2. Obtain Supabase CA certificate (manual dashboard)

Official source: [Postgres SSL Enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement) and [Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres).

### Owner steps

1. Sign in to the **Supabase Dashboard**.  
2. Open project **`scs-staging`** (`PROJECT_REF` `kfclinlrzfwodmichmci`).  
3. Go to **Project Settings → Database** (Database Settings).  
4. Locate **SSL Configuration**.  
5. **Download** the server root / CA certificate (commonly named like `prod-ca-2021.crt`).  
6. Store the file on the **trusted machine only**, outside the repo, e.g.:  
   `C:\Users\<YOU>\AppData\Local\SCS-Secrets\scs-staging-prod-ca-2021.crt`  
7. Confirm the file is PEM text (`-----BEGIN CERTIFICATE-----` …). Do **not** commit it to git.

### Wire into Node / accepted helper env (session-only)

```powershell
# Owner sets AFTER approval — path only; never commit the cert
$env:DATABASE_SSL_CA_PATH = "C:\Users\<YOU>\AppData\Local\SCS-Secrets\scs-staging-prod-ca-2021.crt"
# Equivalents also accepted by pg-client.js:
#   $env:PGSSLROOTCERT = $env:DATABASE_SSL_CA_PATH
#   $env:DATABASE_SSL_CA = (Get-Content -Raw $env:DATABASE_SSL_CA_PATH)
```

**PASS (CA prep):** File exists, readable, PEM-shaped; path set in **session** env only.  
**FAIL:** Missing file, unreadable path, or cert committed to the workspace.

**Note:** System trust store alone is **not** accepted as Path A PASS evidence. Align with application helper inputs (`DATABASE_SSL_CA` / `DATABASE_SSL_CA_PATH` / `PGSSLROOTCERT`).

---

## 3. Preflight (no network to DB)

Run from the workspace root in PowerShell:

```powershell
Set-Location "C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC"

node -e "const p=require('./netlify/functions/node_modules/pg/package.json'); if(p.version!=='8.13.1') process.exit(2); console.log('pg_ok', p.version);"

Test-Path $env:DATABASE_SSL_CA_PATH
```

**PASS:** Prints `pg_ok 8.13.1` and `DATABASE_SSL_CA_PATH` Test-Path is `True`.  
**FAIL:** Wrong/missing `pg`, or CA path unset/missing.

---

## 4. Layer T — Credential-free TLS probe (strict)

Uses PostgreSQL **SSLRequest**, then Node `tls` with:

- `rejectUnauthorized: true`
- `checkServerIdentity: tls.checkServerIdentity` (hostname must match Path A host)
- CA from `DATABASE_SSL_CA_PATH` (required)

**No username, password, or SQL.**

### 4.1 Positive control (correct hostname)

```powershell
# Requires: $env:DATABASE_SSL_CA_PATH already set (section 2)
$env:SCS_TLS_HOST = "db.kfclinlrzfwodmichmci.supabase.co"
$env:SCS_TLS_PORT = "5432"

node --input-type=module -e @"
import fs from 'node:fs';
import net from 'node:net';
import tls from 'node:tls';

const host = process.env.SCS_TLS_HOST;
const port = Number(process.env.SCS_TLS_PORT || 5432);
const caPath = process.env.DATABASE_SSL_CA_PATH;
if (!host || !caPath) { console.log(JSON.stringify({ ok:false, stage:'config', error:'missing_host_or_ca' })); process.exit(1); }
const ca = fs.readFileSync(caPath);

const SSL_REQUEST = Buffer.alloc(8);
SSL_REQUEST.writeInt32BE(8, 0);
SSL_REQUEST.writeInt32BE(80877103, 4); // PostgreSQL SSLRequest code

const socket = net.connect({ host, port });
socket.setTimeout(10000);

socket.once('timeout', () => { console.log(JSON.stringify({ ok:false, stage:'tcp', error:'timeout' })); socket.destroy(); process.exit(1); });
socket.once('error', (e) => { console.log(JSON.stringify({ ok:false, stage:'tcp', error:e.code||e.message })); process.exit(1); });

socket.once('connect', () => {
  socket.write(SSL_REQUEST);
});

socket.once('data', (buf) => {
  const reply = buf.toString('utf8', 0, 1);
  if (reply !== 'S') {
    console.log(JSON.stringify({ ok:false, stage:'sslrequest', error:'server_refused_ssl', reply }));
    socket.destroy();
    process.exit(1);
  }
  const secure = tls.connect({
    socket,
    servername: host,
    ca,
    rejectUnauthorized: true,
    checkServerIdentity: tls.checkServerIdentity,
    minVersion: 'TLSv1.2',
  });
  secure.once('secureConnect', () => {
    const peer = secure.getPeerCertificate();
    const out = {
      ok: true,
      layer: 'TLS_TRANSPORT',
      host,
      port,
      authorized: secure.authorized,
      protocol: secure.getProtocol(),
      // sanitized cert metadata only — no PEMs
      peer: {
        subject: peer && peer.subject ? peer.subject.CN || peer.subject : null,
        issuer: peer && peer.issuer ? peer.issuer.CN || peer.issuer : null,
        valid_to: peer && peer.valid_to ? peer.valid_to : null,
      },
      hasCaFile: true,
      rejectUnauthorized: true,
      hostnameVerification: true,
      credentialsUsed: false,
      sqlExecuted: false,
    };
    console.log(JSON.stringify(out));
    secure.end();
    process.exit(0);
  });
  secure.once('error', (e) => {
    console.log(JSON.stringify({
      ok: false,
      layer: 'TLS_TRANSPORT',
      stage: 'tls',
      host,
      errorCode: e.code || null,
      error: String(e.message || e).slice(0, 200),
      credentialsUsed: false,
      sqlExecuted: false,
    }));
    process.exit(1);
  });
});
"@
```

#### Layer T positive — PASS / FAIL

| Result | Criteria |
|--------|----------|
| **PASS** | JSON `ok:true`, `authorized:true`, `credentialsUsed:false`, `sqlExecuted:false`, `host` equals Path A host, `rejectUnauthorized`/`hostnameVerification` true |
| **FAIL** | TCP timeout; SSLRequest not `S`; `UNABLE_TO_VERIFY_LEAF_SIGNATURE` / `CERT_*` / other TLS errors; `authorized:false` |

**Sanitized evidence to retain:** the JSON object above (no PEM, no passwords). Save under a **new** evidence filename only after an authorized run (do not invent PASS results in this preparation pass).

---

### 4.2 Negative control (intentional wrong hostname)

Same CA and TCP target IP path is **not** required — connect to the **real** Path A host for TCP/SSLRequest, but set TLS `servername` / identity check hostname to a **wrong** name so certificate hostname verification must fail.

```powershell
$env:SCS_TLS_HOST = "db.kfclinlrzfwodmichmci.supabase.co"
$env:SCS_TLS_PORT = "5432"
$env:SCS_TLS_EXPECT_HOST = "db.wrong-hostname.example.invalid"
# DATABASE_SSL_CA_PATH still set

node --input-type=module -e @"
import fs from 'node:fs';
import net from 'node:net';
import tls from 'node:tls';

const connectHost = process.env.SCS_TLS_HOST;
const expectHost = process.env.SCS_TLS_EXPECT_HOST;
const port = Number(process.env.SCS_TLS_PORT || 5432);
const ca = fs.readFileSync(process.env.DATABASE_SSL_CA_PATH);

const SSL_REQUEST = Buffer.alloc(8);
SSL_REQUEST.writeInt32BE(8, 0);
SSL_REQUEST.writeInt32BE(80877103, 4);

const socket = net.connect({ host: connectHost, port });
socket.setTimeout(10000);
socket.once('timeout', () => { console.log(JSON.stringify({ ok:false, stage:'tcp', error:'timeout' })); process.exit(2); });
socket.once('error', (e) => { console.log(JSON.stringify({ ok:false, stage:'tcp', error:e.code||e.message })); process.exit(2); });
socket.once('connect', () => socket.write(SSL_REQUEST));
socket.once('data', (buf) => {
  if (buf.toString('utf8', 0, 1) !== 'S') {
    console.log(JSON.stringify({ ok:false, stage:'sslrequest' }));
    process.exit(2);
  }
  const secure = tls.connect({
    socket,
    servername: expectHost,
    ca,
    rejectUnauthorized: true,
    checkServerIdentity: (host, cert) => tls.checkServerIdentity(expectHost, cert),
    minVersion: 'TLSv1.2',
  });
  secure.once('secureConnect', () => {
    console.log(JSON.stringify({
      ok: false,
      layer: 'TLS_NEGATIVE_CONTROL',
      unexpected: 'handshake_succeeded',
      connectHost,
      expectHost,
    }));
    secure.end();
    process.exit(1);
  });
  secure.once('error', (e) => {
    const code = e.code || '';
    const msg = String(e.message || e);
    const hostnameReject =
      code === 'ERR_TLS_CERT_ALTNAME_INVALID' ||
      /Hostname\/IP does not match|altnames|host name/i.test(msg);
    console.log(JSON.stringify({
      ok: hostnameReject,
      layer: 'TLS_NEGATIVE_CONTROL',
      connectHost,
      expectHost,
      errorCode: code || null,
      error: msg.slice(0, 200),
      credentialsUsed: false,
      sqlExecuted: false,
    }));
    process.exit(hostnameReject ? 0 : 1);
  });
});
"@
```

#### Layer T negative — PASS / FAIL

| Result | Criteria |
|--------|----------|
| **PASS** | Probe **fails** TLS with hostname mismatch (`ERR_TLS_CERT_ALTNAME_INVALID` or equivalent); JSON `ok:true` for the negative-control script meaning “correctly rejected” |
| **FAIL** | Handshake succeeds with wrong hostname, or failure is unrelated (missing CA, TCP down) without proving hostname check |

---

## 5. Optional alignment check with accepted helper (still credential-free)

Does **not** connect. Confirms `buildSslOptions` / effective `pg` SSL shape for Path A host with CA loaded.

```powershell
Set-Location "C:\Users\tkrau\OneDrive\Desktop\Full Stack Engineer\Solo Designer Projects\Signal Crest Systems LLC"
# $env:DATABASE_SSL_CA_PATH must be set

node -e @"
const path = require('path');
const pgClient = require('./netlify/functions/_lib/pg-client.js');
const redactedUrl = 'postgresql://PROBE_USER:REDACTED@db.kfclinlrzfwodmichmci.supabase.co:5432/postgres?sslmode=verify-full';
const env = Object.assign({}, process.env, {
  SCS_ENV: 'staging',
  NODE_ENV: 'production',
});
const ssl = pgClient.buildSslOptions(env, { isProdLike: true, databaseUrl: redactedUrl });
const fields = pgClient.parseApprovedConnectionFields(redactedUrl);
const poolConfig = {
  user: fields.user,
  password: fields.password,
  host: fields.host,
  port: fields.port,
  database: fields.database,
  ssl,
};
const effective = pgClient.inspectEffectivePgSsl(poolConfig);
const out = {
  ok:
    ssl && ssl.rejectUnauthorized === true &&
    typeof ssl.checkServerIdentity === 'function' &&
    Boolean(ssl.ca) &&
    effective.rejectUnauthorized === true &&
    effective.hasCheckServerIdentity === true &&
    effective.sslIsObject === true,
  host: fields.host,
  port: fields.port,
  database: fields.database,
  userPlaceholder: fields.user,
  normalizedSslmode: fields.normalizedSslmode,
  tls: {
    rejectUnauthorized: ssl.rejectUnauthorized === true,
    hasCheckServerIdentity: typeof ssl.checkServerIdentity === 'function',
    hasCa: Boolean(ssl.ca),
  },
  effective: {
    rejectUnauthorized: effective.rejectUnauthorized,
    hasCheckServerIdentity: effective.hasCheckServerIdentity,
    sslIsObject: effective.sslIsObject,
  },
  connected: false,
  passwordLogged: false,
};
console.log(JSON.stringify(out));
process.exit(out.ok ? 0 : 1);
"@
```

**PASS:** `ok:true`, `hasCa:true`, `rejectUnauthorized:true`, hostname check present, `connected:false`.  
**FAIL:** Missing CA, insecure effective SSL, or parse/build throws.

---

## 6. Layer I — Authenticated verification (SEPARATE; only if authorized later)

**Do not run** as part of the TLS-only gate. Requires Owner credentials and (for meaningful identity) provisioned roles (A.4/A.5 currently **NOT PROVISIONED**).

### 6.1 Secure credential entry (PowerShell)

```powershell
# Session-only — never echo or Set-ItemProperty to User/Machine
$DbUser = Read-Host "DB user (e.g. postgres or provisioned role)"
$SecurePassword = Read-Host "DB password" -AsSecureString
$BSTR = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
try {
  $Plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($BSTR)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR) | Out-Null
}

# Build URL in memory only — do not Print / Write-Output the URL
$HostName = "db.kfclinlrzfwodmichmci.supabase.co"
# URL-encode user/password if needed before use; keep in $env: only for the probe process
```

Prefer passing **explicit fields** into `pg.Pool` (same as accepted helper) — not logging `connectionString`.

### 6.2 Read-only queries only

Allowed after TLS success:

```sql
SELECT 1 AS ok;
SELECT current_user, session_user, current_database();
```

**Forbidden:** DDL/DML, role creation, grants, fixture writes, anything beyond identity probes.

### 6.3 Minimal Owner pattern (outline — execute only when Layer I authorized)

Use installed `pg` with `ssl` from `buildSslOptions` / explicit fields; on success print **only**:

- `tlsAuthorized: true`
- `current_user` / `session_user` / `current_database` (role names, not secrets)
- `readOnlyQueries: ["SELECT 1", "SELECT current_user, session_user, current_database()"]`

On auth failure after TLS success, record: `tlsOk: true`, `authOk: false`, `errorCode: <sanitized>` — still useful as “transport worked; identity failed.”

### 6.4 Layer I PASS / FAIL

| Result | Criteria |
|--------|----------|
| **PASS** | TLS verified **and** `SELECT 1` succeeds; `current_user`/`session_user` match expected role for that credential |
| **FAIL** | Auth error, wrong role, or any write attempted |
| **BLOCKED** | A.4/A.5 still NOT PROVISIONED / no Owner credential — do not invent PASS |

### 6.5 Credential cleanup

```powershell
Remove-Item Env:DATABASE_URL, Env:DATABASE_PROJECT_ADMIN_URL, Env:DATABASE_INTAKE_URL, Env:DATABASE_NOTIFY_URL, Env:DATABASE_OWNER_URL, Env:DATABASE_TEST_ADMIN_URL, Env:DATABASE_SSL_CA, Env:DATABASE_SSL_CA_PATH, Env:PGSSLROOTCERT, Env:PGSSLROOTCERT_PEM, Env:SCS_TLS_HOST, Env:SCS_TLS_PORT, Env:SCS_TLS_EXPECT_HOST -ErrorAction SilentlyContinue
$Plain = $null
$SecurePassword = $null
[GC]::Collect()
```

---

## 7. Evidence requirements (sanitized)

After an **authorized** run, create a **new** evidence file (do not overwrite freeze artifacts). Include only:

| Include | Exclude |
|---------|---------|
| Timestamp (UTC), Path A host/port, project ref | Passwords, full URLs, tokens |
| Layer T positive JSON (sanitized) | PEM certificate bodies |
| Layer T negative JSON (hostname reject) | Screenshot of dashboard password fields |
| Helper alignment JSON (`connected:false`) | Any `.env` contents |
| Explicit PASS/FAIL per control | Unredacted connection strings |
| Statement: Production HOLD; freeze untouched | |

Suggested new names (post-approval only):

- `qa-m6b/M7B-G2-DIRECT-TLS-TRANSPORT-EVIDENCE-YYYYMMDD.json`
- `qa-m6b/M7B-G2-DIRECT-TLS-TRANSPORT-EVIDENCE-YYYYMMDD.md`

---

## 8. Overall gate summary

| Control | Required for G2 direct TLS prep completion after live run |
|---------|------------------------------------------------------------|
| CA downloaded + session `DATABASE_SSL_CA_PATH` | Yes |
| `pg@8.13.1` resolves locally | Yes (already confirmed in discovery) |
| Layer T positive PASS | Yes |
| Layer T wrong-hostname negative PASS | Yes |
| Helper alignment `hasCa` + strict flags | Yes |
| Layer I authenticated identity | **Not required** for TLS transport gate; separate when A.4/A.5 provisioned |

---

## 9. Stop — approval required

| Item | Status |
|------|--------|
| This document | Preparation complete |
| Live TCP/TLS/SQL | **NOT RUN** in preparation pass |
| Freeze / 64 successor payloads | **UNTOUCHED** |
| Production | **HOLD** |
| Next actor | **Owner** after Atlas + Owner approval |

**Related:** Discovery status companion; R4 successor manifest (64); `netlify/functions/_lib/pg-client.js` (unchanged).
