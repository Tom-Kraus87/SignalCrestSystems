# M7A — Legacy Forms Bypass Elimination Evidence

**Verdict:** Public Netlify Forms ingestion path for contact / project-request is **removed from source and dist**. A secure endpoint alongside unrestricted Forms is **not** present.

## Evidence

| Check | Evidence |
|-------|----------|
| `project-request.html` no `data-netlify` | Source + `dist` verified |
| `contact.html` no `data-netlify` | Source verified |
| Form `action` | Both forms use `action="/api/leads"` |
| Client submit | `script.js` uses `fetch("/api/leads", { method:"POST", ...})` |
| No Forms root POST | `script.js` no longer `fetch("/")` for forms |
| Netlify redirect | `netlify.toml` maps `/api/leads` → function |
| Consent on contact | Checkbox required; server rejects without it |
| Harness | `formsBypassGone: true` in static check; M7A suite asserts no `data-netlify` |

## What remains intentional

- Honeypot `bot-field` retained as anti-spam (server silent-drop).  
- Mailto fallback for users if endpoint unavailable.  
- Historical docs under `deploy/` / older STAGE2 notes may still mention Forms — treat as superseded by M7A for intake.

## Hosted verification still required

Confirm in Netlify UI after staging deploy:

1. No active Forms submissions accepted for `contact` / `project-request` form names from the new build.  
2. Function logs show `/api/leads` hits only.  
3. Attempting classic Forms POST to `/` with form-urlencoded does **not** create a trusted CRM lead (DB empty / Function never bypassed).
