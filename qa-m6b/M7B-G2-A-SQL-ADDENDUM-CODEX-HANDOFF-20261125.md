# M7B-G2 — A-SQL Addendum Codex Handoff

**Date:** 2026-11-25  
**Reviewer:** Codex (independent) — **not yet performed**  
**Covers:** the A-TLS timeout correction and the document-only A-SQL execution addendum  
**Production:** **HOLD**  
**A-SQL:** **unauthorized**  
**A-DBTEST:** **unauthorized**

This is a new handoff. It does not overwrite `qa-m6b/M7B-G2-A-TLS-CODEX-ACCEPTANCE-HANDOFF-20261125.md`. That file was corrected in place for the timeout record and still asks Codex to check the A-TLS artifacts. Implementer statements are not authoritative. Verify from the files.

This handoff does not contain its own digest.

---

## 1. Digests to verify

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| `qa-m6b/evidence/m7b-g2-a-tls-20261125/network-verification.json` | 5436 | `bbaed269e8389cae68be143cd3c1d71cd174e95daa5afa899c6458595980b191` |
| `qa-m6b/evidence/m7b-g2-a-tls-20261125/application-helper-verification.json` | 4013 | `ef8887889b83fb95620dfed3ee4fa451fe0278cef7c32c309c4755056609b16d` |
| `qa-m6b/M7B-G2-A-TLS-VERIFICATION-EVIDENCE-20261125.md` | 8815 | `2b0fe12ce2171dc93a114cf5efa3af987cb0415166aa5ee09c158b7668fd4f5d` |
| `qa-m6b/M7B-G2-A-TLS-CODEX-ACCEPTANCE-HANDOFF-20261125.md` | 6601 | `3ab43370a363c1577cf28c27c25f134416b73c5d4245256e0c247d09c321a611` |
| `qa-m6b/M7B-G2-A-SQL-EXECUTION-ADDENDUM-20261125.md` | 35142 | `758b7303354ebaca62aafbc629aa15b8dcde8ca3ad974be618a8e523270fa7b4` |
| `qa-m6b/M7B-G2-A-SQL-REMAINING-DISCOVERY-QUERIES-20261125.md` | 23434 | `68fa8c610d19117bf5f7cdc5883e4450e8858e07bdd8b99414d26f07a3307696` |

`application-helper-verification.json` is unchanged from the audited bytes.

Pre-correction copies, which must still match these audited digests:

| Preserved file | Bytes | SHA-256 |
|----------------|------:|---------|
| `qa-m6b/evidence/m7b-g2-a-tls-20261125/historical-pre-timeout-correction/M7B-G2-A-TLS-VERIFICATION-EVIDENCE-20261125.md` | 6946 | `b3e9d51384b9dfdb789f2358c2e0e61eccf100e8f41f0b62993180d9563634e8` |
| `qa-m6b/evidence/m7b-g2-a-tls-20261125/historical-pre-timeout-correction/network-verification.json` | 4799 | `f240a430f1e57bfaa62b58b5926456c1dcc26f9a1e548706db7801201154d57d` |
| `qa-m6b/evidence/m7b-g2-a-tls-20261125/historical-pre-timeout-correction/application-helper-verification.json` | 4013 | `ef8887889b83fb95620dfed3ee4fa451fe0278cef7c32c309c4755056609b16d` |
| `qa-m6b/evidence/m7b-g2-a-tls-20261125/historical-pre-timeout-correction/M7B-G2-A-TLS-CODEX-ACCEPTANCE-HANDOFF-20261125.md` | 4649 | `467a7120792229b1f9e8e0ce66853ef083951bb0e0c37f75a4ed462b3f9a6c54` |

The evidence markdown and the A-TLS handoff cite the JSON digests only. They do not cite their own digests. This handoff cites those files. They do not cite this handoff’s digest.

---

## 2. Timeout correction

**Evidence class: observed script configuration supplied by the owner in this assignment.** The owner-executed script contained:

```js
const timer = setTimeout(() => { finish(new Error('TLS verification timeout')); }, 15000);
```

`timeoutMs` **15000** is the configured timeout. It is not a measured elapsed duration and not an independently tested timeout rejection. **10000** ms remains only the historical procedure sample `socket.setTimeout(10000)` in `qa-m6b/M7B-G2-DIRECT-TLS-VERIFICATION-PROCEDURE-20261124.md`. TLS tests were not rerun. The rest of the observed network and helper results are unchanged.

---

## 3. Addendum scope

`qa-m6b/M7B-G2-A-SQL-EXECUTION-ADDENDUM-20261125.md` addresses Claude’s F1–F9 from `C:\Users\tkrau\Downloads\M7B-G2 Pre-A-SQL Architecture Readiness Review.pdf`, using the R3 packet, the R4 amendment, the R4 final acceptance, and the discovery status record. The companion file holds the SQL text. That SQL is not authorized to run now.

Confirm the addendum:

- Restates §B.2c in effective SET terms for PostgreSQL 16+ automatic admin edges and preserved `anon` / `authenticated` edges. Missing means no SET edge. Unexpected automatic options are STOP. `SHOW createrole_self_grant` is remaining discovery.
- Does not establish a Node SCRAM procedure. Built-in `crypto` primitives exist. No reviewed verifier implementation and no `saslprep` package are installed. No password or verifier was generated. Dashboard UI and `psql` are compared and not selected.
- Prepares read-only default-ACL, schema, extension, and post-apply matrix text, including PostgreSQL 17 `MAINTAIN`. Unexpected lead-data access is STOP. Data API disablement does not justify grants. No frozen migration was edited. A new migration is reported to Atlas and was not written.
- Makes a `citext` schema mismatch a mandatory STOP. Extensions are not relocated.
- Requires future capture of 006 and 007 notices. Any skipped role or grant is STOP.
- Places `scs_test_admin` at phase 3 only.
- Keeps the bootstrap recovery row and separates re-run safety from authorization to re-run.
- Reconciles §A.4 and §A.5 as already **NOT PROVISIONED**, with the status note’s headings swapped relative to the R3 titles, and does not request those queries again.
- Records G3 Netlify IPv6 connectivity as unresolved. Path B is not selected. No IPv4 add-on is purchased. The connection validator is not modified.

---

## 4. Frozen inventory

Recomputed in this documentation pass from `qa-m6b/M7B-G2-R4-SUCCESSOR-HASH-INVENTORY-20261124.json`: 64 entries, canonical digest `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d`, on-disk match, manifest not modified. Recompute independently. If the digest disagrees, record the discrepancy. Do not fix the manifest.

The corrected evidence, the preservation directory, this handoff, the addendum, and the discovery companion are outside the frozen inventory.

---

## 5. Acceptance checklist

- [ ] Network JSON `timeoutMs` is 15000 and is labeled observed script configuration, not a measured duration and not a tested rejection
- [ ] 10000 ms is only the historical procedure sample
- [ ] Helper JSON is byte-identical to the audited digest above
- [ ] Preservation copies match the audited digests and were not edited after the copy
- [ ] Evidence markdown and A-TLS handoff cite JSON digests only and do not contain their own digests
- [ ] F1–F9 are addressed from the Claude review and the local R3 / R4 / discovery files, without a new migration or a frozen-file edit
- [ ] Remaining SQL is marked not authorized to run now, and completed A.4 / A.5 discovery is not requested again
- [ ] No password, verifier, SQL execution, install, Git, deploy, Path B selection, or IPv4 purchase is present
- [ ] Inventory count is 64 and the canonical digest matches
- [ ] Production remains **HOLD**
- [ ] A-SQL and A-DBTEST remain unauthorized

---

## 6. Stop line

Do not rerun TLS, authenticate, execute the companion SQL, provision roles, generate passwords or verifiers, install dependencies, run Git, deploy, or modify frozen candidate files.

**This handoff does not authorize database work.**
