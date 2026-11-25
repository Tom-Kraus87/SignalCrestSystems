# Staging Prep — Netlify Forms Validation Report

**Date:** 2026-11-23  
**Forms reviewed:** `project-request` (primary), `contact` (existing)  
**Claim boundary:** Markup + client validation reviewed. **No claim that live submissions are stored** until staging Netlify deploy + Forms UI confirmation.

---

## 1. Build-time discoverability (`project-request`)

Netlify Forms needs the HTML form present in the published build (static parse). After allowlist build:

| Attribute / field | Present in `dist/project-request.html` |
|---|---|
| `name="project-request"` | Yes |
| `method="POST"` | Yes |
| `action="/"` | Yes |
| `data-netlify="true"` | Yes |
| `data-netlify-honeypot="bot-field"` | Yes |
| Hidden `form-name=project-request` | Yes |
| Honeypot `bot-field` | Yes |
| Fields: name, email, company, phone, service, timeline, budget, message, consent | Yes |

**Verdict:** Build-time discoverable for Netlify registration on first deploy of this HTML.

---

## 2. Client validation / UX (`script.js`)

Shared handler for `#contact-form` and `#project-request-form`:

| Behavior | Status |
|---|---|
| Required: name, email, message | Enforced |
| Email format check | Enforced |
| Consent required when `#consent` present | Enforced on project-request |
| Honeypot filled → fake success (no POST) | Implemented |
| POST `application/x-www-form-urlencoded` to `/` | Implemented |
| Success copy on `response.ok` | Implemented |
| Error → mailto fallback to `tom@signalcrestsystems.com` | Implemented |
| `?service=` preselect | Implemented |

---

## 3. Spam controls

| Control | Notes |
|---|---|
| Honeypot `bot-field` | Present; CSS visually-hidden |
| Netlify provider spam filtering | Depends on Netlify account settings post-deploy |
| CAPTCHA | **Not** configured in markup |

---

## 4. Local vs live persistence

| Environment | Persistence |
|---|---|
| `python -m http.server` / `serve dist` | May return HTTP 200 on POST **without** storing — **false success possible** |
| Netlify staging/production after form registration | Netlify Forms storage + optional email notifications |

**Do not treat a green local submit as proof of lead capture.**

---

## 5. Privacy.html vs actual fields (owner-approval flags)

### Project-request fields vs privacy copy

Privacy claims collection of name, email, company, phone, service interest, timeline, budget notes, and message — **matches** `project-request` field set (plus consent checkbox / honeypot / technical logs).

### Contact form gaps (flag for owner)

| Topic | Finding | Ask |
|---|---|---|
| Contact fields | Contact collects name, email, service, message only (no company/phone/timeline/budget/consent) | Confirm privacy wording “contact or project-request” is acceptable as “such as …” examples |
| Consent | `contact` form has **no** consent checkbox / privacy link in the form body | Approve adding consent, or keep as-is with explicit owner acceptance |
| Theme preference | `theme.js` / `theme-boot.js` use **localStorage** for theme preference | Approve mentioning site preference storage on privacy page, or leave until legal review |
| Subprocessors | Privacy implies hosting (Netlify) without a named subprocessors list | Legal skim / owner sign-off |
| Retention | Process claim only (email request for deletion) | Confirm operational readiness before heavy PII intake |
| Forms→DB | Privacy allows “future managed database” | Accurate forward-looking; admin not live |

**No invented legal assurances added in this pass.**

---

## 6. Post-staging Forms checklist (human)

1. Deploy to **staging** Netlify site (not production domain).  
2. Confirm Forms list shows **`contact`** and **`project-request`**.  
3. Configure notification email to owner.  
4. Submit **one clearly labeled test** lead; verify it appears; **delete** test record.  
5. Only then treat Forms as production-ready for real inquiries.
