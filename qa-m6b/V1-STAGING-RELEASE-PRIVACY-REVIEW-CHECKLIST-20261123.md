# V1 Staging Release — Privacy Review Checklist

**Date:** 2026-11-23  
**Source page:** `privacy.html` (Last updated: November 23, 2026)  
**Status:** Draft published in working tree — **owner / legal approval required** before treating as binding for real PII intake

---

## A. Language that requires owner approval

Approve, edit, or reject each statement before staging collects real inquiries.

| # | Topic | Current language / behavior | Owner decision |
|---|---|---|---|
| A1 | Operator identity | “Signal Crest Systems LLC … operates signalcrestsystems.com” + `tom@signalcrestsystems.com` | ☐ Approve / ☐ Change |
| A2 | Collection scope | Contact **or** project-request; examples include name, email, company, phone, service, timeline, budget notes, message | ☐ Approve / ☐ Narrow / ☐ Expand |
| A3 | Technical logs | Hosting provider may receive IP, timestamps, user agent | ☐ Approve / ☐ Change |
| A4 | Use purposes | Respond to inquiry; keep lead/follow-up records (owner admin when enabled); spam/abuse protection | ☐ Approve / ☐ Change |
| A5 | Sale of data | “We do not sell personal information.” | ☐ Approve / ☐ Change |
| A6 | Demo data claim | “Showroom and Transformation Studio demos use fictional sample data and do not create real customer records.” | ☐ Approve / ☐ Change |
| A7 | Storage | “Public form submissions currently use Netlify Forms (or a future managed database…)” | ☐ Approve / ☐ Change |
| A8 | Factory isolation claim | Submissions are “**not** stored in the protected AI Software Factory infrastructure.” | ☐ Approve / ☐ Change |
| A9 | Retention | Keep only as long as needed, then delete/archive by operational need (no fixed period) | ☐ Approve / ☐ Set period |
| A10 | Individual rights | Email owner to request access / correction / deletion | ☐ Approve / ☐ Change |
| A11 | Updates clause | Page may change as site/admin evolve | ☐ Approve / ☐ Change |

---

## B. Gaps / mismatches flagged for owner call

| # | Finding | Risk | Ask |
|---|---|---|---|
| B1 | `contact` form has **no** consent checkbox; `project-request` requires consent + privacy link | Inconsistent notice UX | Add consent to contact, or accept as-is |
| B2 | Privacy “such as …” lists company/phone/timeline/budget — contact collects a **subset** | Over-broad wording risk | Confirm “such as” framing is intentional |
| B3 | Theme preference via `localStorage` (`theme.js` / `theme-boot.js`) not mentioned | Incomplete disclosure | Add preference storage sentence, or defer |
| B4 | Subprocessors not named (Netlify implied only) | Legal completeness | Name Netlify / future DB vendor or keep high-level |
| B5 | Forward-looking “future managed database” / “owner-only admin, when enabled” | Accurate but aspirational | Keep for Stage 2, or remove until live |
| B6 | No fixed retention schedule | Operational readiness | Confirm owner can fulfill delete requests |
| B7 | Staging vs production Forms inboxes | Test PII contamination | Use staging site Forms only for acceptance tests |

---

## C. Field inventory vs privacy copy

### `project-request` fields

name, email, company, phone, service, timeline, budget, message, consent, honeypot `bot-field`

→ Privacy examples **align**.

### `contact` fields

name, email, service, message, honeypot `bot-field` (no company/phone/timeline/budget/consent)

→ Covered only if “such as” examples are acceptable.

---

## D. Pre-staging privacy gate

- [ ] Owner approves `privacy.html` as the binding notice for staging (with any agreed edits).  
- [ ] Decision recorded on B1 (contact consent).  
- [ ] Decision recorded on B3 (localStorage).  
- [ ] Test submissions use fake data and are deleted.  
- [ ] Production Forms not used for acceptance testing.

**No legal assurances were invented or strengthened in this review pass.**
