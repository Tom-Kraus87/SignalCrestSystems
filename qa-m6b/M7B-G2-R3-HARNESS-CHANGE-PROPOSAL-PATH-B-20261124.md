# M7B-G2-R3 — Harness Change Proposal (Path B: Shared Session Pooler)

**Date:** 2026-11-24  
**Status:** **PROPOSAL ONLY — NOT IMPLEMENTED**  
**Nature:** Conditional documentation for a separately authorized harness revision  
**Frozen harness:** `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs`  
**Harness SHA-256 (spot-check):** `826bf5c3845c8d9068831a07e87aaaecfdb721f3a009115a7bdda41c96c3d0f9` (**MATCH** freeze)  
**Application helper (read-only):** `netlify/functions/_lib/pg-client.js`  
**Production:** **HOLD**  
**Do not apply this proposal under M7B-G2-R3.** Path A (direct DB host) is the only path compatible with the frozen candidate without a harness change.

---

## 1. Why this proposal exists

Supabase **shared session pooler** authentication for custom roles commonly requires a **project-qualified username** of the form:

```text
<role>.<PROJECT_REF>
```

Example shape (illustrative only — not a live credential):

```text
scs_test_admin.kfclinlrzfwodmichmci
```

The frozen harness and application identity validators require **exact bare role names** (`scs_test_admin`, `scs_intake_runtime`, `scs_notify_worker`, `scs_owner_admin`). Therefore Path B and the frozen candidate are **mutually exclusive** until a separately authorized revision lands.

**Transaction pooler (`…:6543`) is NOT an approved substitute** for this proposal and must not be used without its own review (prepared-statement / transaction semantics differ).

---

## 2. Decision context (mutually exclusive)

| Path | Host | Username shape | Frozen harness |
|------|------|----------------|----------------|
| **A (preferred for G2)** | `db.kfclinlrzfwodmichmci.supabase.co:5432` | Exact role name | Compatible — **no change** |
| **B (this proposal)** | `aws-1-us-east-2.pooler.supabase.com:5432` (session) | Provider project-qualified | **Incompatible** — revision required |
| Transaction pooler | same host `:6543` | (unreviewed) | **Out of scope / forbidden as substitute** |

---

## 3. Read-only inspection — every affected validation point

> Inspection only. No edits performed.

### 3.1 Frozen harness `verify-m7a-r2-postgres-integration-20261123.mjs`

| # | Validation point | Symbol / location | Path B impact |
|---|------------------|-------------------|---------------|
| H1 | Fixture URL username must equal exactly `scs_test_admin` | `assertFixtureTestAdminIdentity` + `FIXTURE_TEST_ADMIN_ROLE` | **FAIL** on `scs_test_admin.<ref>` |
| H2 | All five harness URLs parsed into explicit pool fields + verified TLS | `buildHarnessPoolConfig` for projectAdmin / intake / notify / owner / testAdmin | Host may parse; identity still fails later |
| H3 | `DATABASE_MIGRATION_URL` presence rejected | `resolveRealPgHarnessEnv` | Unchanged; not Path-B-specific |
| H4 | Owner login identity requires `current_user` **and** `session_user` = `scs_owner_admin` | Case 8 owner probe | **FAIL** if pooler login role string ≠ bare name, or session differs |
| H5 | Intake login identity requires both users = `scs_intake_runtime` | Case 12 live identity | **FAIL** on qualified username / mismatched session |
| H6 | Negative control: URL `postgres` rejected by runtime identity helper | Case 12 `assertRuntimeConnectionIdentity` | Qualified admin forms may need explicit deny-list updates |
| H7 | Negative control: `session_user=postgres` with `current_user=scs_intake_runtime` rejected | Case 12 `assertEffectiveDatabaseIdentity` | Remains correct; Path B must still enforce both |
| H8 | Project-admin pool uses `SET ROLE` + `current_user` check only | `setRoleAndVerify` | Session-user stays login role — independent of Path B username shape, but pooler session semantics must be re-proven |
| H9 | TLS wrong-hostname rejection uses intake URL hostname | Case 7 | Must re-validate against pooler hostname / cert SAN |
| H10 | Header / comments document bare-role URL examples | file header lines ~22–26 | Docs must be revised with Path B shapes if authorized |
| H11 | Fixture privilege documentation assumes bare fixture role | `FIXTURE_TEST_ADMIN_MIN_PRIVILEGES` | Mapping layer needed: login name → DB role |

**Do not assume only `DATABASE_TEST_ADMIN_URL` is affected.** Path B touches **all five** URL identities (project admin, intake, notify, owner, fixture) plus TLS hostname evidence and effective-identity checks.

### 3.2 Application `netlify/functions/_lib/pg-client.js` (deployed Functions path)

| # | Validation point | Symbol | Path B impact |
|---|------------------|--------|---------------|
| A1 | URL field parse (user/host/port/db); allows informational `pgbouncer=true` | `parseApprovedConnectionFields` | Qualified user string is accepted as opaque `user` |
| A2 | Runtime Functions may only use exact `scs_intake_runtime` / `scs_notify_worker` | `assertRuntimeConnectionIdentity` + `FUNCTION_RUNTIME_ROLES` | **FAIL** on `<role>.<ref>`; also may **not** match `ADMIN_RUNTIME_ROLES` exact set |
| A3 | Effective identity requires `current_user === session_user === expectedRole` | `assertEffectiveDatabaseIdentity` | Requires DB-visible role names to remain bare **or** helper rewrite |
| A4 | Admin / fixture roles forbidden as Function identities (exact names) | `ADMIN_RUNTIME_ROLES` | Qualified forms (`postgres.<ref>`, `scs_test_admin.<ref>`, …) are **not** currently listed — gap if Functions ever pointed at pooler |
| A5 | Verified TLS + hostname check | `buildSslOptions` / `checkServerIdentity` | Must validate against pooler certificate hostname |

Any Path B Functions deploy would require **application** identity-helper revision in addition to harness revision — out of G2 packet apply scope and **not** authorized here.

---

## 4. Minimal change sketch (NOT implemented)

If Owner later authorizes Path B **and** a freeze break:

1. Introduce a single pure helper, e.g. `resolveDatabaseLoginRole(username, projectRef)` that:
   - accepts bare role **or** `<role>.<PROJECT_REF>` when host is the approved session pooler;
   - rejects transaction-pooler port `6543` unless separately authorized;
   - rejects unexpected suffixes / foreign project refs.
2. Thread that helper through:
   - harness `assertFixtureTestAdminIdentity`;
   - harness case 8 / 12 expected role comparisons;
   - application `assertRuntimeConnectionIdentity` / `assertEffectiveDatabaseIdentity` / `ADMIN_RUNTIME_ROLES` checks (or equivalent normalized comparisons).
3. Keep post-connect proof: **both** `current_user` and `session_user` must equal the **bare** database role after login (pooler must map qualified login → bare role). If either differs → FAIL.
4. Update harness header examples and evidence notes for Path B hosts only.
5. Do **not** weaken TLS (`rejectUnauthorized`, `checkServerIdentity`).
6. Do **not** treat `SET ROLE` as a substitute for independent fixture login.

---

## 5. Required tests before accepting a Path B revision

| Test | Expect |
|------|--------|
| Unit: bare username still resolves on direct host | Unchanged Path A behavior |
| Unit: `<role>.kfclinlrzfwodmichmci` on session pooler host resolves to bare role | Pass |
| Unit: wrong project ref suffix | Reject |
| Unit: transaction port `6543` | Reject (until separate review) |
| Unit: qualified `postgres.<ref>` / `scs_test_admin.<ref>` still forbidden for Function runtime | Reject |
| Integration: all five Path B URLs connect with verify-full TLS to pooler hostname | Pass |
| Integration: after connect, `current_user` and `session_user` equal bare roles for intake/notify/owner/fixture | Pass |
| Integration: fixture cases 2, 5, 9, 13 still PASS | Pass |
| Integration: case 7 hostname rejection still FAIL-closed | Pass |
| Regression: Path A direct URLs with bare names still PASS | Pass |
| Freeze: new SHA-256 manifest for revised harness + app helpers | Required before execution |

---

## 6. Freeze implications

| Item | Implication |
|------|-------------|
| Accepted 59-file M7B freeze digest `3c7cebb3…` | Path B **cannot** proceed against this freeze |
| Files likely requiring re-freeze | At minimum harness; likely `pg-client.js`; possibly Function callers if env docs change |
| R3 packet | Documents Path B as blocked; does **not** implement |
| Production | Remains **HOLD** |
| Authorization | Separate Owner tokens for (1) harness/app revision, (2) re-freeze, (3) Path B connectivity proof, (4) `A-DBTEST` |

---

## 7. Recommendation

**Prefer Path A** (direct DB host + bare role usernames + frozen harness) once Owner completes external DNS/TCP/TLS and client discovery.  
**Hold Path B** until connectivity proves Path A impossible **and** Owner authorizes a freeze-breaking revision under this proposal’s test plan.

---

## 8. Authorization boundary (this file)

| Action | Status |
|--------|--------|
| Harness / app code edits | **NOT DONE** |
| SQL / DB / installs / Git / deploy | **NOT DONE** |
| Production | **HOLD** |
