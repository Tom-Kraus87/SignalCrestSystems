# M7B-G2 — A-TLS Verification Evidence

**Date:** 2026-11-25  
**Milestone:** M7B-G2 A-TLS evidence recording  
**Authorization:** Atlas — evidence documentation only, within the owner's existing A-TLS authorization  
**Nature:** Record of owner-executed results. This pass did not rerun the checks.  
**Production:** **HOLD**  
**Staging database work:** **unauthorized**  
**A-SQL:** **not started**

**Machine-readable companions:**

- `qa-m6b/evidence/m7b-g2-a-tls-20261125/network-verification.json`
- `qa-m6b/evidence/m7b-g2-a-tls-20261125/application-helper-verification.json`

## Evidence classes

| Class | Meaning in this record |
|-------|------------------------|
| observed | Owner-executed result from the supplied result set. Preserved as supplied. |
| static | Conclusion from reading existing repository artifacts, or from this documentation pass, without rerunning TLS, SQL, or authentication. |
| inferred | Not used. This record states no inferred pass/fail results. |

---

## 1. Network TLS verification

**evidenceClass: observed.** Owner-executed credential-free Path A network TLS verification.

| Field | Supplied result |
|-------|-----------------|
| Supabase project | `scs-staging` |
| Project reference | `kfclinlrzfwodmichmci` |
| Host | `db.kfclinlrzfwodmichmci.supabase.co` |
| Port | `5432` |
| Connection path | A, direct IPv6 |
| Certificate file SHA-256 | `700723581420DD1AC98FD7E9AC529F0EF210EADCAF87FC868A3AD7D114C2F3B7` |
| Network verification timestamp | `2026-11-25T05:01:27.350Z` |
| Positive TLS verification | **PASS** |
| Certificate authorized | `true` |
| Protocol | `TLSv1.3` |
| Issuer | Supabase Intermediate 2021 CA |
| Certificate expiration | November 23, 2028 |
| Server certificate fingerprint | `11:CB:BA:C0:5D:EB:8A:B3:6F:B1:AC:6D:F5:73:79:86:65:E8:A4:F4:F2:23:F8:0B:7F:CE:2F:6E:BF:08:9D:15` |
| Negative hostname control | **PASS** |
| Rejection code | `ERR_TLS_CERT_ALTNAME_INVALID` |
| Correct SNI preserved | `true` |
| Expected incorrect hostname | `intentional-mismatch.invalid` |

### Corrected negative control

**evidenceClass: observed.** The executed negative control preserves the correct SNI while checking the deliberately incorrect hostname `intentional-mismatch.invalid`. The observed rejection is `ERR_TLS_CERT_ALTNAME_INVALID`. The negative hostname control result is **PASS**.

**evidenceClass: static.** The preparation procedure `qa-m6b/M7B-G2-DIRECT-TLS-VERIFICATION-PROCEDURE-20261124.md` sample sets TLS `servername` to the incorrect hostname. That sample is not the owner-executed result recorded here. The owner-executed result is the corrected control in the table above.

### Bounded network timeout

**evidenceClass: observed.** bounded network timeout: owner-executed; duration not included in the supplied result set

**evidenceClass: static.** `qa-m6b/M7B-G2-DIRECT-TLS-VERIFICATION-PROCEDURE-20261124.md` sample network probes call `socket.setTimeout(10000)`. That figure is procedure text. It is not the observed duration of the owner-executed run at `2026-11-25T05:01:27.350Z`.

**evidenceClass: static.** The CA and server certificate were not copied into the repository. This note records the owner-supplied certificate file SHA-256 and server certificate fingerprint only.

---

## 2. Application helper verification

**evidenceClass: observed.** Owner-executed local application TLS helper verification.

| Field | Supplied result |
|-------|-----------------|
| Application helper verification timestamp | `2026-11-25T05:06:08.107Z` |
| PostgreSQL driver | `pg@8.13.1` |
| Production-like | `true` |
| Dependency mode | `postgres_required` |
| Normalized SSL mode | `verify-full` |
| `rejectUnauthorized` | `true` |
| Native hostname verification | `true` |
| CA loaded | `true` |
| CA matches local file | `true` |
| Connection string forwarded | `false` |

### Negative controls

**evidenceClass: observed.** All seven negative controls passed.

| # | Control | Result |
|--:|---------|--------|
| 1 | Environment TLS disable | **PASS** |
| 2 | Environment certificate verification disable | **PASS** |
| 3 | URL TLS downgrade | **PASS** |
| 4 | URL hostname verification downgrade | **PASS** |
| 5 | Duplicate TLS parameter | **PASS** |
| 6 | libpq compatibility override | **PASS** |
| 7 | Driver connection string override | **PASS** |

### Helper boundary

**evidenceClass: observed.**

- No real credentials transmitted.
- No database authentication.
- No SQL executed.
- No network connection attempted by the local helper test.

Individual rejection codes for the seven helper controls were not in the supplied result set and are not recorded here.

---

## 3. Frozen R4 inventory

**evidenceClass: static.** Read-only recomputation. The frozen manifest was not regenerated or replaced.

| Check | Result |
|-------|--------|
| Inventory | `qa-m6b/M7B-G2-R4-SUCCESSOR-HASH-INVENTORY-20261124.json` |
| Manifest | `qa-m6b/M7B-G2-R4-SUCCESSOR-CANDIDATE-MANIFEST-20261124.md` |
| Method | Canonical lines `path<TAB>sha256<TAB>bytes`, sorted by path with the freeze tooling (`Sort-Object Path`), UTF-8, joined by `\n`, SHA-256 lowercase hex. Inventory JSON and companion reports are excluded. |
| JSON entries | 64 |
| Manifest table rows | 64 |
| JSON and manifest path, SHA-256, and byte length | Agree |
| Expected count | 64 |
| Count match | **Yes** |
| Expected canonical inventory digest | `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d` |
| Recomputed digest | `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d` |
| Digest match | **Yes** |
| On-disk SHA-256 and byte length of each of the 64 paths versus the frozen inventory | **Match** |
| Discrepancies | **None** |

**evidenceClass: static.** These new evidence files are outside the frozen candidate inventory:

- `qa-m6b/M7B-G2-A-TLS-VERIFICATION-EVIDENCE-20261125.md`
- `qa-m6b/evidence/m7b-g2-a-tls-20261125/network-verification.json`
- `qa-m6b/evidence/m7b-g2-a-tls-20261125/application-helper-verification.json`
- `qa-m6b/M7B-G2-A-TLS-CODEX-ACCEPTANCE-HANDOFF-20261125.md`

---

## 4. This documentation pass

**evidenceClass: static.** This recording pass did not rerun network verification, authenticate to Supabase, execute SQL, provision roles or migrations, access or request passwords, copy the CA into the repository, install dependencies, run Git, deploy, or initiate A-SQL. No application code was changed. No frozen candidate file was modified.

---

## 5. Remaining blockers

| Item | Status |
|------|--------|
| Production | **HOLD** |
| A-SQL | **Not started** |
| Staging database work | **Unauthorized** |
| Independent Codex review of this evidence | **Not done** |

This note does not accept the evidence on Codex's behalf and does not authorize database work.
