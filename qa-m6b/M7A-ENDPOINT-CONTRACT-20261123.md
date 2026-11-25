# M7A — Lead Intake Endpoint Contract

**Path:** `POST /api/leads` → `/.netlify/functions/leads`  
**Same-origin only** (prefer no cross-origin CORS for production)

## Request

### Headers
| Header | Required | Notes |
|--------|----------|-------|
| `Content-Type` | yes | `application/json` (preferred) or `application/x-www-form-urlencoded` |
| `Idempotency-Key` | recommended | UUID / `[A-Za-z0-9._~-]{8,128}`; also accepted in body |

### Body size
Max **24 KiB** raw → `413 payload_too_large`

### JSON fields (strict — unknown keys rejected)

| Field | Required | Rules |
|-------|----------|-------|
| `formName` | yes | `project-request` \| `contact` (aliases: `form_name`, `form-name`) |
| `name` | yes | 1–120 |
| `email` | yes | normalized lower; max 254 |
| `message` | yes | 1–5000 |
| `consent` | yes | must be affirmative (`true`/`yes`/`on`/`1`) |
| `privacyVersion` | yes | must be in server allowlist |
| `source` | no | `contact` \| `advisor` \| `project-request` (default `contact`) |
| `company` | no | max 200 |
| `phone` | no | max 40 |
| `service` | no | allowlisted catalog ids |
| `timeline` / `budget` | no | allowlisted |
| `advisorBrief` | no | max 8000 |
| `pagePath` | no | relative path only |
| `botField` | honeypot | non-empty → silent `200 {ok:true}` no persist |
| `idempotencyKey` | no | see header |
| `isTest` | no | staging/QA flag |

### Server-generated
- `receivedAt` ISO timestamp (never trust client clocks for audit)

## Responses

| Status | Code | Meaning |
|--------|------|---------|
| 200 | — | `{ ok:true, receivedAt, receipt }` |
| 400 | `consent_required` | Missing/false consent |
| 400 | `privacy_version_invalid` | Stamp not accepted |
| 400 | `sensitive_content` | Heuristic sensitive hit (no secret logged) |
| 400 | `validation_failed` / `unknown_fields` / `malformed_json` | Schema issues |
| 413 | `payload_too_large` | Body over limit |
| 429 | `rate_limited` | Per IP-hash / email window |
| 503 | `intake_disabled` | Kill switch |
| 500 | `persist_failure` | Safe generic message |
| 405 | `method_not_allowed` | Non-POST |

## Logging rules
Log method/path/status/code/idempotency presence only. **Never** log body, email, message, or matched secret text.

## Sensitive detection disclaimer
Pattern filter is best-effort. **Does not claim complete credential detection.**

## Client integration
`script.js` builds JSON payload and `fetch("/api/leads")`. Forms no longer use Netlify Forms attributes.
