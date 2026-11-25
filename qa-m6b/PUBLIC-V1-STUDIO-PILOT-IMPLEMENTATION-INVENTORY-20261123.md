# Public Website V1 + Transformation Studio Pilot — Implementation Inventory

**Date:** 2026-11-23  
**Branch:** `feature/public-v1-studio-pilot` (local only; not pushed)  
**Workspace:** Signal Crest Systems LLC (Netlify static public site)  
**Plan inputs:** `PUBLIC-ADMIN-V1-*-20261118.md` (architecture design folder)  
**Mode:** Stage 1 executed; admin/auth/DB/deploy **design only**

---

## 1. Correct website project & deployment configuration

| Item | Finding |
|---|---|
| Repo | `Signal Crest Systems LLC` |
| Host | Netlify (`netlify.toml` → `node scripts/build-public.mjs` → publish `dist/`) |
| CSP | `_headers` Content-Security-Policy: `script-src 'self'`; fonts from Google; `form-action 'self'`; no third-party video embeds without CSP change |
| Builder | Allowlist-based `scripts/build-public.mjs` (fail-closed production origin mode available) |
| Forms | Existing Netlify Forms on `contact`; new `project-request` form uses same client-side pattern |

**Hard boundaries confirmed untouched:** SignalCrest-Software-Factory, Factory snapshots, P0-B normative security docs (read-only), B3–B7, brokers, Windows ACLs/credentials.

---

## 2. Current public surface (after Stage 1)

### Retained / refined

- Homepage (SC 2.0 hero, capabilities, showroom preview, Product Lab, How It Works, CTA)
- Services, AI Automation, Packages, Work, Showroom, About, Contact, Case Studies, QA Process, Resources, 404
- Responsive header + Solutions dropdown + mobile nav toggle

### Added

| Route | Purpose |
|---|---|
| `/project-request.html` | Primary intake form (Netlify Forms attrs + honeypot + consent) |
| `/privacy.html` | Privacy / data-handling page |
| `/#coming-soon` | Coming-soon posters (CSP-safe placeholders) |
| `/transformation-studio/` | Sandboxed Stone Harbor Tradeworks concept preview (`noindex`) |

### Navigation

- **Start a Project** CTA → `project-request.html` (nav + primary homepage CTAs)
- Footer **Privacy** link added across public pages
- Contact page retained for general inquiries

---

## 3. Transformation Studio (Stone Harbor pilot)

| Item | Detail |
|---|---|
| Path | `transformation-studio/` (isolated under website repo) |
| Source | Reused Home Services Studio (`SignalCrest-HomeServices-Studio`) modules — copied, not linked to Factory |
| Brand | Stone Harbor Tradeworks (concept / sample data) |
| Disclaimers | Banner + footer + `OWNER-REVIEW.md` — owner review required before external share |
| CTA handoff | `../project-request.html?service=custom-software` |
| Production | Allowlisted for local `dist` preview; still **concept / noindex**; do not market as live client |

---

## 4. Explicitly not executed (design only)

- Managed email/password auth + mandatory MFA
- Owner-only admin dashboard
- Database provisioning / migrations
- Email provider integration
- Public arbitrary-URL fetching
- Paid blueprint checkout
- Production GitHub push or Netlify deploy
