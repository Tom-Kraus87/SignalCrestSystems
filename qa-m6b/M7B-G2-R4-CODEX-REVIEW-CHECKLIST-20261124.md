# M7B-G2-R4 — Independent Codex Review Checklist

**Date:** 2026-11-24  
**Reviewer:** Codex (independent)  
**Implementer claims are not authoritative — verify from artifacts**  
**Production:** **HOLD** · Successor: **provisional**

---

## Freeze / recoverability

- [ ] Historical 59-file digest `3c7cebb3…` untouched (`_m7b-manifest-file-sha256.txt` / audit manifest unchanged)
- [ ] Historical harness backup exists under `qa-m6b/evidence/m7b-g2-r4-historical-harness-826bf5c3-20261124/`
- [ ] Backup SHA-256 equals `826bf5c3845c8d9068831a07e87aaaecfdb721f3a009115a7bdda41c96c3d0f9`
- [ ] Successor manifest is a **new** artifact (does not rewrite historical freeze)
- [ ] Successor entry count = 64; digest = `683cc3f5162ed2b86f5eb7cee5822ed2598e76c00dc51c996188f8c22622542d` (recompute independently)

## Path / scope

- [ ] Path A selected; Path B / transaction pooler **not** implemented
- [ ] Allowlist respected: only harness modified + new R4 test (+ docs/evidence)
- [ ] `netlify/functions/_lib/pg-client.js` unchanged
- [ ] No migration/bootstrap/application feature edits
- [ ] No dependency installation evidence

## Preflight correctness

- [ ] Preflight runs for **all five** pools before fixture DML / cases 1–13
- [ ] Each pool requires **both** `current_user` and `session_user` = expected bare role
- [ ] Admin pool proves CREATEROLE (or SUPERUSER via same probe)
- [ ] Auth / connect / mismatch failures fail closed with **no** admin credential fallback
- [ ] SET ROLE-only session cannot satisfy preflight (R5)
- [ ] Path A host/port gates reject pooler and `:6543`
- [ ] Bare usernames only; qualified `<role>.<ref>` rejected
- [ ] Existing TLS verification path preserved (`rejectUnauthorized`, `checkServerIdentity`, CA env)
- [ ] No credentials / full URLs in logs or evidence
- [ ] `finally` / `endPoolsQuietly` closes all pools after partial preflight failure
- [ ] Cases 1–13 assertions preserved; case 14 still separate NOT RUN

## Regression evidence hygiene

- [ ] R4 test file executed locally: 21/21 PASS (mock/static)
- [ ] Secure leads 265/265 PASS (mock/static)
- [ ] Mock results **not** labeled as real PostgreSQL evidence
- [ ] Real-PG 1–13 marked **NOT RUN**
- [ ] Hosted Auth/AAL2 case 14 marked **NOT RUN**
- [ ] Hosted staging marked **NOT RUN**

## Membership / SQL boundary

- [ ] No unauthorized SQL apply this pass
- [ ] §B.2 reconcile rules (preserve provider anon/authenticated) remain documentation-only until `A-SQL`

## Production

- [ ] Production remains **HOLD**
- [ ] No Git / deploy / Netlify production changes claimed without Owner auth

---

**Stop after review. Do not authorize `A-DBTEST` from this packet alone.**
