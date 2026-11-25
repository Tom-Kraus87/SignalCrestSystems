# M7A — Privacy Policy Decision Matrix

**Current stamp:** `privacy-2026-11-23`  
**Legacy accepted (cutover):** `advisor-privacy-2026-11-16`  
**Owner/Atlas action:** Approve stamp retirement + retention day counts before production.

| Topic | Decision / recommendation | Owner | Status |
|-------|---------------------------|-------|--------|
| Processor of record for leads | Netlify Functions + managed Postgres (Supabase) — **not** Netlify Forms | Atlas + Owner | Proposed |
| Consent | Affirmative checkbox required server-side for contact + project-request | Atlas | Implemented locally |
| Privacy version | Server allowlist; reject unknown stamps | Atlas | Implemented locally |
| Advisor sessionStorage | Brief + routing only; **no** name/email/company | Atlas | Implemented locally |
| IP handling | Store **hash only** (`ip_hash`) unless counsel requires otherwise | Owner/legal | Draft |
| Retention — soft delete scrub | Yes (message/brief/phone/company) | Owner | Draft SQL |
| Retention — hard purge soft-deleted | **365 days** default | Owner | **OPEN** approve |
| Retention — test rows | **30 days** | Owner | **OPEN** approve |
| Retention — **unconverted leads** | Proposed **12 months** (365 days) | Owner | **PENDING_FINAL_PRIVACY_APPROVAL** |
| Sensitive filter disclosure | Heuristic; not complete credential detection | Atlas | Documented |
| Factory isolation | Confirmed — no Factory storage | Atlas | Hold as invariant |
| Live AI / Phase B transcripts | Out of scope until Phase B approval + retention sign-off | Atlas + Owner | Not started |
| Privacy.html copy | Updated to secure endpoint + retention language | Owner | Local update — legal review OPEN |

## Cutover recommendation

1. Ship stamp `privacy-2026-11-23` on forms (done locally).  
2. Keep legacy stamp accepted for ≤1 staging cycle.  
3. Remove `advisor-privacy-2026-11-16` from allowlist after confirmed no in-flight clients.  
4. Owner completes **PENDING_FINAL_PRIVACY_APPROVAL** for 12-month unconverted retention; then schedule purge jobs.  
5. Only after (4) claim privacy ops gate closed for production.
