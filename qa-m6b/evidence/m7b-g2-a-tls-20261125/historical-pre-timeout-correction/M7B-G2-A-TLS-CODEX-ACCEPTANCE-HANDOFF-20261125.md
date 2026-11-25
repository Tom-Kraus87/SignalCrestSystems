# M7B-G2 — A-TLS Codex Acceptance Handoff

**Date:** 2026-11-25  
**Reviewer:** Codex (independent) — **not yet performed**  
**Handoff from:** Evidence recording under Atlas authorization for documentation only  
**Production:** **HOLD**  
**Successor candidate:** `M7B-G2-R4-SUCCESSOR-20261124` remains the frozen inventory. This handoff does not replace it.

This is a new acceptance handoff. It does not overwrite `M7B-G2-R4-CODEX-REVIEW-CHECKLIST-20261124.md` or any earlier Codex note. Implementer and recorder statements are not authoritative. Verify from the artifacts.

---

## 1. Evidence under review

| Artifact | Role |
|----------|------|
| `qa-m6b/M7B-G2-A-TLS-VERIFICATION-EVIDENCE-20261125.md` | Human-readable record |
| `qa-m6b/evidence/m7b-g2-a-tls-20261125/network-verification.json` | Owner-executed network TLS results |
| `qa-m6b/evidence/m7b-g2-a-tls-20261125/application-helper-verification.json` | Owner-executed local helper results |

Observed results, static analysis, and inferred conclusions are separated in those files. The inferred lists are empty.

---

## 2. What the owner executed

**evidenceClass: observed.** Credential-free Path A network TLS verification at `2026-11-25T05:01:27.350Z`, and local application TLS helper verification at `2026-11-25T05:06:08.107Z`. Preserve the companion files as the supplied result set. Do not treat this handoff as a second execution.

Corrected negative control, as supplied: it preserves the correct SNI while checking the deliberately incorrect hostname `intentional-mismatch.invalid`. Observed rejection: `ERR_TLS_CERT_ALTNAME_INVALID`. Negative hostname control: **PASS**.

Bounded network timeout, as supplied: bounded network timeout: owner-executed; duration not included in the supplied result set.

**evidenceClass: static.** The preparation procedure states `socket.setTimeout(10000)` on its sample probes. That number is procedure text, not the observed duration of the owner run.

---

## 3. Frozen inventory check already recorded

**evidenceClass: static.** Recomputed from `qa-m6b/M7B-G2-R4-SUCCESSOR-HASH-INVENTORY-20261124.json` using the manifest method: canonical lines `path<TAB>sha256<TAB>bytes`, sorted by path with the freeze tooling (`Sort-Object Path`), UTF-8, joined by `\n`, SHA-256 lowercase hex. Inventory JSON and companion reports excluded.

| Check | Recorded result |
|-------|-----------------|
| Entry count | 64 |
| Count versus expected 64 | **Match** |
| Canonical inventory digest | `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d` |
| Digest versus expected | **Match** |
| On-disk bytes of the 64 frozen paths versus recorded hashes | **Match** |
| Discrepancies | **None** |
| New evidence files inside the frozen inventory | **No** |

The frozen manifest was not modified. Codex should recompute independently. If a recomputation disagrees, record the discrepancy. Do not "fix" the manifest in this review.

---

## 4. Acceptance checklist

- [ ] Owner-executed network facts match the supplied result set and are labeled observed
- [ ] Corrected negative control keeps the correct SNI, checks `intentional-mismatch.invalid`, and records `ERR_TLS_CERT_ALTNAME_INVALID`
- [ ] Helper facts match the supplied result set, including all seven named negative controls as **PASS**
- [ ] Helper boundary is limited to the supplied statements: no real credentials transmitted, no database authentication, no SQL executed, no network connection attempted by the local helper test
- [ ] No extra pass/fail results were inferred
- [ ] CA material was not copied into the repository
- [ ] R4 inventory count is 64 and the canonical digest matches `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d`
- [ ] New evidence files are outside the frozen candidate inventory
- [ ] Frozen candidate files were not modified
- [ ] Production remains **HOLD**
- [ ] A-SQL was not started
- [ ] Staging database work remains unauthorized

---

## 5. Remaining blockers

| Item | Status |
|------|--------|
| Production | **HOLD** |
| A-SQL | **Not started** |
| Staging database work | **Unauthorized** |
| This Codex review | **Not done** |

---

## 6. Prohibited for this handoff

Do not rerun network verification, authenticate, execute SQL, provision roles or migrations, request passwords, copy the CA into the repository, install dependencies, run Git, deploy, or initiate A-SQL. Do not modify frozen candidate files or existing manifests.

**Stop after independent review. This handoff does not authorize database work.**
