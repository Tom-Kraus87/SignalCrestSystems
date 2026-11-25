# V1 Staging Release — Netlify Forms Acceptance Procedure

**Date:** 2026-11-23  
**Environment:** Staging Netlify site only  
**STOP:** Do **not** execute live against `https://signalcrestsystems.com` / production Forms inbox without separate owner approval

---

## Purpose

Prove that Netlify Forms **registers**, **stores**, and **notifies** for the public lead forms after a staging deploy of `dist/`. Local static servers can return HTTP 200 on POST without persistence — local green submits are **not** acceptance.

---

## Forms under test

| Form name | Page | Key attributes |
|---|---|---|
| `contact` | `/contact.html` | `data-netlify="true"`, honeypot `bot-field`, hidden `form-name=contact` |
| `project-request` | `/project-request.html` | Same pattern; fields include company, phone, timeline, budget, **consent** |

Client handler: `script.js` shared validation + `application/x-www-form-urlencoded` POST to `/`.

---

## Preconditions

1. Staging site deployed from allowlist build (`publish = dist`).  
2. Staging site is **not** production (`signalcrestsystems.com`).  
3. Owner notification email configured in Netlify Forms settings (staging site).  
4. Tester uses a clearly fake address (e.g. `staging-test+YYYYMMDD@example.com`).

---

## Procedure A — Registration check (no submit yet)

1. Open Netlify UI → staging site → **Forms**.  
2. Confirm form names appear: **`contact`**, **`project-request`**.  
3. If missing: confirm `dist/contact.html` and `dist/project-request.html` were in the deploy; trigger a new deploy; re-check.  
4. Open Forms notification settings; set owner email; save.

**Pass criteria:** Both form names listed; notifications configured.

---

## Procedure B — `project-request` submission & retrieval

1. Open staging URL `/project-request.html`.  
2. Fill labeled test data:

| Field | Suggested value |
|---|---|
| Name | `STAGING TEST — DELETE` |
| Email | `staging-test+YYYYMMDD@example.com` |
| Company | `Signal Crest Staging QA` |
| Phone | `555-0100` |
| Service | any valid option |
| Timeline | any valid option |
| Budget | any valid option |
| Message | `V1 staging Forms acceptance — safe to delete` |
| Consent | checked |

3. Leave honeypot `bot-field` empty.  
4. Submit.  
5. UI should show success state (not mailto fallback).  
6. Netlify UI → Forms → `project-request` → verify submission body matches.  
7. Confirm notification email received (if enabled).  
8. **Delete** the test submission from Netlify UI.

**Pass criteria:** Stored submission visible + deletable; no production site involvement.

---

## Procedure C — `contact` submission & retrieval

1. Open staging `/contact.html`.  
2. Submit with name `STAGING TEST — DELETE`, unique test email, short message.  
3. Verify under Forms → `contact`.  
4. Delete test record.

**Pass criteria:** Same as B for `contact`.

---

## Procedure D — Negative / spam control (optional)

1. Attempt submit with honeypot filled (if reachable via DevTools) — client should fake success and **not** POST.  
2. Confirm no new Netlify submission created.  
3. CAPTCHA is **not** configured; document residual spam risk for owner.

---

## Explicit non-goals

| Action | Status |
|---|---|
| Live test on production domain | **Out of scope** for this procedure |
| Claiming local `python -m http.server` persistence | Invalid |
| Enabling Stage 2 DB dual-write | Out of scope |
| Keeping test PII | Delete after verification |

---

## Evidence to record (when executed under approval)

- Staging site name + deploy ID / URL  
- Timestamp of each test submit  
- Screenshot or note: Forms list shows both names  
- Confirmation emails received (yes/no)  
- Deletion confirmation  

**This handoff pass did not execute live Forms tests.**
