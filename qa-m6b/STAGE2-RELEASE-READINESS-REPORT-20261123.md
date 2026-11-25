# Stage 2 — Public V1 Release Readiness Report

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot` (local only; **not** tracking `origin`)  
**Workspace:** `Signal Crest Systems LLC`  
**Mode:** Read-only source inspection + non-destructive local tests + new documentation only  
**STOP:** Awaiting Atlas / human authorization — **no commit, no push, no Netlify deploy, no cloud provisioning**

---

## 1. Readiness verdict

### **CONDITIONAL**

Public Stage 1 UI/build quality is strong enough for a **controlled** production publish of the marketing site **after** Atlas decisions below. Full “Public + Admin V1” (owner inbox, MFA, DB leads) remains **not ready** until Stage 2 backend work is authorized and completed.

| Surface | Verdict | Why |
|---|---|---|
| Public static site (content/UX/CSP/build) | **CONDITIONAL → READY after approvals** | Local build + link checks pass; uncommitted; Forms need live Netlify registration |
| Project-request persistence | **CONDITIONAL** | Real Netlify Forms wiring; persists only after Netlify deploy; no DB yet |
| Owner admin / MFA / CRM | **BLOCKED (by design)** | Design-only; no Auth/DB/Functions implemented |
| Stone Harbor studio | **CONDITIONAL (sandbox)** | Clearly labeled + `noindex`; **still allowlisted into `dist/`** so a production deploy would publish the URL unless excluded |
| Factory / P0-B isolation | **PASS** | No Factory/snapshot/normative P0-B paths in website diffs |

---

## 2. Stage 1 Git inventory (complete review)

### Branch / remote

| Item | Finding |
|---|---|
| Current branch | `feature/public-v1-studio-pilot` @ `c2c2d8d` |
| Upstream | **None** (local only; not pushed) |
| Merge-base with `main` | `5ae9ac6` (`origin/main`) |
| Commits ahead of `main` on branch tip | Same tip as `feature/website-modernization` (`c2c2d8d`); Stage 1 pilot work is **uncommitted** on top |

### Diff layers reviewed

1. **`main...HEAD`** — SC 2.0 modernization already on branch tip (homepage, CSP/`_headers`, `build-public.mjs`, packages, themes, deploy docs, asset optimization, etc.). ~64 paths / ~8.4k insertions in that range.
2. **Staged + unstaged working tree** — Showroom / hero-systems / homepage refinements + Stage 1 pilot pages.
3. **Untracked Stage 1 pilot** — `privacy.html`, `project-request.html`, `transformation-studio/**`.

### Untracked (must be included in any future commit when authorized)

- `privacy.html`
- `project-request.html`
- `transformation-studio/` (HTML/CSS/JS/assets + `OWNER-REVIEW.md`)

### Sensitive / unintended path scan

| Path / artifact | Tracked? | Risk | Recommendation |
|---|---|---|---|
| `Fiverr Account info/` | No (gitignored) | Business PII if ever published | Keep ignored; allowlist builder already excludes |
| `SignalCrest Systems Growth Engine/` | No (gitignored) | Business IP | Keep ignored |
| `SignalCrest Systems pdf downloads/` | No (gitignored) | Business files | Keep ignored |
| `.netlify/` | No (gitignored) | Local CLI state | Do not commit |
| `netlify-init-output.txt` | No (gitignored) | Contains Netlify setup transcript incl. **SSH public key** + webhook URL text | Keep ignored; do not paste into commits/PRs |
| `.env` / `*credentials*` / PEM keys in tree | **None found** | — | OK |
| Stage 1 source delta (`*.html/js/css`) | Inspected | No API keys / service-role strings found | OK |
| `qa-m6b/` reports & screenshots | Local QA | Fine as docs; decide later whether to commit | Optional |

**No production secrets were created or committed in this Stage 2 pass.**

---

## 3. Factory / protected infrastructure

| Boundary | Result |
|---|---|
| Website git diffs include Factory / snapshot / broker / NTFS-ACL paths? | **No** |
| `SignalCrest-Software-Factory` | Exists separately; no git remote; not modified via this website branch |
| `SignalCrest-Software-Factory__snapshot-20261117-152414` | Present; not referenced in website diffs |
| P0-B normative docs (`P0-B-*`, threat model, brokers, ACLs, etc.) | Last writes **2026-11-17**; only new design-folder artifact from Stage 1 is `PUBLIC-V1-STUDIO-PILOT-PROGRESS-REPORT-20261123.md` |
| Website pointer | `qa-m6b/FACTORY-PHASE1-POINTER.md` (read-only pointer) |

**Conclusion:** Protected Factory trees and normative P0-B foundations appear **untouched** by Stage 1 website work.

---

## 4. Project-request persistence finding

### Verdict: **Netlify Forms–ready, not UI-only fake — but not DB-backed; local preview does not reliably persist**

| Layer | Behavior |
|---|---|
| Markup | Real Netlify Forms: `data-netlify="true"`, `data-netlify-honeypot="bot-field"`, hidden `form-name=project-request`, `method="POST"`, `action="/"` |
| Client JS (`script.js`) | Shared handler for `#contact-form` and `#project-request-form`: validates name/email/message/consent; honeypot short-circuits with fake success; `fetch("/", { method:"POST", application/x-www-form-urlencoded })` |
| Persistence today | **Only** via Netlify Forms **after** a Netlify-hosted deploy that registers the `project-request` form |
| Notifications | **No in-repo email/SMS provider.** Any notification depends on Netlify Forms notification settings in the Netlify UI (not coded here) |
| Database | **None** — no Supabase/Postgres/Functions |
| Admin inbox | **None** |
| Local `serve dist` | Static server may return HTTP 200 on POST without storing anything → **false “success” UX** possible (observed 200 on local POST). Stage 1 docs expected error→email fallback; depends on server behavior. **Environment quirk + soft application trust of `response.ok`.** |

Contact form uses the same pattern with `form-name=contact`.

**Do not treat a green local submit as proof of lead capture.**

---

## 5. Local preview verification (this pass)

| Step | Result |
|---|---|
| `node scripts/build-public.mjs` | **PASS** — 73 files → `dist/` (production-release off; `SITE_ORIGIN` unset → sitemap/absolute SEO omitted — expected) |
| Static preview | `npx serve -l 5173 dist` bound to **`http://localhost:64456`** in this environment (port 5173 not used by the process that came up) |
| Route smoke | **200:** `/`, `/project-request.html`, `/privacy.html`, `/transformation-studio/`, `/contact.html`, `/showroom.html`, `/work.html` |
| `node qa-m6b/validate-links.mjs` | **PASS** — failures: none |

Supported commands (from Stage 1 + this re-verify):

```bash
node scripts/build-public.mjs
npx --yes serve -l 5173 dist
# If 5173 is busy, use the port printed by serve
```

---

## 6. Earlier Playwright / server failures — environment vs application

| Incident | Classification | Notes |
|---|---|---|
| Playwright WebKit: `Executable doesn't exist ... webkit-.../Playwright.exe` (recorded in `sc20-polish-hero-metrics-before.json`) | **Environment** | Browsers not installed yet; fixed after `npx playwright install` in later polish runs |
| Local WebKit QA strips `upgrade-insecure-requests` for `http://127.0.0.1` | **Environment harness** | Production `_headers` unchanged; not an app CSP defect |
| Playwright WebKit ≠ real iOS Safari | **Environment / coverage gap** | Documented in polish evidence; device check still outstanding |
| Earlier S1 link/showroom QA without `_headers` missing CSP issues | **Harness gap** (later corrected) | Independent re-gate under real CSP passed |
| Stage 1 axe / integrated / polish results in qa-m6b | **Application OK** at time of Stage 1 | `failed: []` / 32/32 axe / polish WebKit pass after browser install |
| Local Forms POST false-success under some static servers | **Environment + soft client check** | Not a production Forms defect; improve later with clearer local messaging if desired |

**No evidence in Stage 1/2 artifacts that production-blocking Playwright failures are unresolved application defects** after browser install and CSP-aware harnesses.

---

## 7. Privacy policy vs actual collection

`privacy.html` (Last updated Nov 23, 2026) claims:

| Claim | Accuracy vs code/hosting |
|---|---|
| Collects form fields (name, email, company, phone, service, timeline, budget, message) | **Accurate** for `project-request` / contact forms |
| Hosting technical logs (IP, UA, timestamps) | **Plausible / accurate** for Netlify; not implemented in custom code |
| Use for response + spam protection (honeypot) | **Accurate** |
| Owner-only admin records “when enabled” | **Accurate forward-looking**; admin not live |
| Does not sell PII; demos use sample data | **Accurate** (studio/showroom client-side only) |
| Stored via Netlify Forms or future managed DB; **not** Factory | **Accurate** for intended architecture |
| Retention / deletion via email request | **Process claim** — operationally depends on owner Netlify Forms hygiene + future DB |

**Gaps / caveats for legal sign-off:**

1. Policy assumes Netlify Forms (or future DB) — true only **after** deploy.  
2. No cookie/analytics banner section (theme preference may use storage — confirm `theme.js` localStorage and whether policy should mention it).  
3. No subprocessors list beyond hosting implication.  
4. Atlas legal approval still listed as a P0 launch blocker in Stage 1.

---

## 8. Stone Harbor sandbox status

| Check | Status |
|---|---|
| Path | `transformation-studio/` |
| Labels | Banner, footer, env chip: concept / sample / sandbox; not a live client |
| SEO | `noindex,nofollow` |
| Owner gate | `OWNER-REVIEW.md` checklist (source tree) |
| Sample data only | Config + UI copy confirm fictional rates/records; cleared on reset |
| In `build-public` allowlist? | **Yes** — ships into `dist/transformation-studio/` |
| `OWNER-REVIEW.md` in dist? | **No** — banner link would **404** on published dist |
| Public marketing as live client? | **Must not** |
| External share? | **Blocked** until OWNER-REVIEW signed |

**Deploy implication:** A production Netlify publish of current allowlist **would expose** `/transformation-studio/` publicly (discoverable by URL even if `noindex`). Atlas must choose: keep allowlisted + accept sandbox URL, remove from allowlist for V1, or host on a separate gated preview.

---

## 9. Netlify configuration & deployment requirements (exact)

### Active (repo root)

```toml
[build]
  command = "node scripts/build-public.mjs"
  publish = "dist"
```

### Headers / CSP

- Source: `_headers` (copied into `dist/` by builder)  
- Highlights: `script-src 'self'`; Google Fonts style/font; `form-action 'self'`; `connect-src 'self'`; HSTS; no third-party video embeds without CSP change

### Production-release env (required for fail-closed SEO origin)

| Variable | Purpose |
|---|---|
| `SCS_PRODUCTION_RELEASE=1` | Fail build if origin missing |
| `SITE_ORIGIN=https://signalcrestsystems.com` | Absolute SEO / sitemap |

Documented in `site-origin.example` and `deploy/netlify.toml.example` comments. Do **not** rely on `NODE_ENV=production` alone.

### Forms

- Existing: `contact`  
- New: `project-request` — needs deploy (or Forms UI registration) before production POSTs persist  
- Notifications: configure in Netlify UI to owner email (not in repo)

### Isolation

- Allowlist builder prevents publishing `Fiverr Account info/`, Growth Engine, etc.  
- Legacy `deploy/sync-public.ps1` / `site/` path is **superseded** — do not use for production  
- Confirm Netlify site still points at this repo’s root `netlify.toml` (`publish=dist`)

### Out of scope for this report’s authorization

- Actual Netlify deploy  
- DNS / www→apex redirect activation (documented intent only)

---

## 10. Minor product notes (non-blocking unless Atlas elevates)

1. Showroom in-card CTAs still point to `contact.html?service=...` while nav/footer/primary CTAs prefer `project-request.html`.  
2. Studio `OWNER-REVIEW.md` link broken in published `dist`.  
3. Uncommitted / dual staged+unstaged state needs a clean commit when authorized.  
4. Coming-soon remains posters-only (CSP-safe).

---

## 11. Release acceptance checklist (public site)

Use after Atlas authorizes a specific deploy target (staging preferred first).

### Pre-commit / pre-push

- [ ] Atlas authorizes commit on `feature/public-v1-studio-pilot` (and whether to push)
- [ ] Include untracked: `privacy.html`, `project-request.html`, `transformation-studio/**` (or exclude studio by decision)
- [ ] Confirm no `Fiverr*`, Growth Engine, `.env`, `netlify-init-output.txt` in commit
- [ ] Factory / P0-B paths still absent from diff

### Build / QA

- [ ] `node scripts/build-public.mjs` with intended `SITE_ORIGIN` / production-release flags
- [ ] Inspect `dist/` — no business folders; studio inclusion matches Atlas decision
- [ ] Link validation + smoke routes
- [ ] Optional: axe / integrated / polish scripts if time allows
- [ ] Manual: homepage, project-request, privacy, showroom, work demos, mobile nav

### Netlify

- [ ] Staging deploy authorized (or production if explicit)
- [ ] Env: `SITE_ORIGIN`, optionally `SCS_PRODUCTION_RELEASE=1`
- [ ] Confirm `publish=dist` and build command
- [ ] Verify `_headers` CSP live
- [ ] Confirm Forms: `contact` + **`project-request`** appear in Netlify Forms
- [ ] Configure Forms notification email to owner
- [ ] **Do not** submit real customer PII during QA — use clearly labeled test submissions then delete
- [ ] Privacy page live and linked in footer
- [ ] Stone Harbor URL policy verified (excluded, or labeled + accepted)
- [ ] 404 page + key redirects as needed
- [ ] www/apex decision documented

### Post-deploy smoke

- [ ] Homepage + Start a Project CTA
- [ ] One **test** form submit → visible in Netlify Forms → delete test record
- [ ] Privacy + email contact still correct
- [ ] Studio either 404 or clearly concept-labeled

### Explicitly NOT required for “public marketing V1” alone

- [ ] Supabase Auth / MFA
- [ ] Postgres CRM
- [ ] Admin host

Those are Stage 2 backend (see companion plan) and remain blocked without separate authorization.

---

## 12. Companion deliverables

| File | Purpose |
|---|---|
| [STAGE2-BACKEND-IMPLEMENTATION-PLAN-20261123.md](STAGE2-BACKEND-IMPLEMENTATION-PLAN-20261123.md) | Design-only Auth/DB/API/RLS |
| [STAGE2-APPROVAL-MATRIX-20261123.md](STAGE2-APPROVAL-MATRIX-20261123.md) | Decision grid for Atlas |

Stage 1 packet remains under `qa-m6b/PUBLIC-V1-STUDIO-PILOT-*-20261123.md`.

---

## 13. Confirmation of prohibited actions (this pass)

| Action | Performed? |
|---|---|
| Git commit / push | **No** |
| Netlify deployment | **No** |
| External account provisioning | **No** |
| Database migrations | **No** |
| Authentication implementation | **No** |
| Production secrets creation | **No** |
| Factory security changes | **No** |
| Stone Harbor public deployment | **No** |
