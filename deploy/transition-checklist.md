# Deployment transition checklist (`publish = "."` → `site/`)

> **SUPERSEDED — do not follow this checklist for production publishing.**
>
> This historical checklist targeted a PowerShell → `site/` workflow.
> The active secure pipeline is:
>
> - `scripts/build-public.mjs`
> - root `netlify.toml` (`publish = "dist"`)
> - generated `dist/` output
>
> Do not activate `deploy/sync-public.ps1` or treat `site/` as the publish directory.

Status: **prepared only — not activated, not deployed.** *(legacy plan; superseded)*

## Target configuration
Use `deploy/netlify.toml.example` as the source for the live `netlify.toml` when approved:

```toml
[build]
  command = "powershell -NoProfile -ExecutionPolicy Bypass -File deploy/sync-public.ps1"
  publish = "site"
```

## Pre-activation verification

### Build command
- [x] `deploy/sync-public.ps1` allowlists HTML/CSS/JS/`assets`/`resources` only
- [x] Script refuses if blocked business/preview paths appear under `site/`
- [ ] Run sync on Netlify Windows/Linux build image once in a draft deploy (after approval)

### Public assets (10 pages)
Must be present under `site/` after sync:

| Page | In allowlist | Verified locally in `site/` |
|------|--------------|-------------------------------|
| `index.html` | yes | yes |
| `about.html` | yes | yes |
| `ai-automation.html` | yes | yes |
| `case-studies.html` | yes | yes |
| `contact.html` | yes | yes |
| `packages.html` | yes | yes |
| `qa-process.html` | yes | yes |
| `resources.html` | yes | yes |
| `services.html` | yes | yes |
| `work.html` | yes | yes |

Supporting assets also allowlisted: `styles.css`, `themes.css`, `theme.js`, `script.js`, `ai-automation.css`, `packages-pricing.css`, `assets/`, `resources/`.

### Netlify Forms (critical after publish-dir change)
Netlify detects forms from files in the **final publish directory**.

- [x] `contact.html` includes `data-netlify="true"`, honeypot `bot-field`, and `form-name=contact`
- [x] Synced `site/contact.html` retains those attributes
- [ ] After first approved deploy with `publish = "site"`, confirm the `contact` form appears in Netlify UI → Forms
- [ ] Submit one real test message and confirm notification delivery
- [ ] If the form is missing, add a build-time HTML parse path or a stub form Netlify can see in `site/` (do not keep `publish = "."`)

### Redirects / headers / SEO
Currently **not present** in the repo root or `site/`:

| Asset | Status |
|-------|--------|
| `_redirects` | missing — add to allowlist if created |
| `_headers` | missing — add to allowlist if created |
| `robots.txt` | missing — add to allowlist if created |
| `sitemap.xml` | missing — add to allowlist if created |

No change required to activate `site/` publishing, but create and allowlist these before relying on SEO/crawl controls.

### Must remain excluded from `site/`
- Business folders (`Fiverr Account info`, `SignalCrest Systems Growth Engine`, `SignalCrest Systems pdf downloads`)
- `pricing-preview.html` / `pricing-preview.css`
- `deploy/`, `scripts/`, `.netlify/`, `.git/`

## Activation sequence (requires explicit approval later)
1. Confirm local `deploy/sync-public.ps1` output looks correct.
2. Replace root `netlify.toml` with the example `[build]` block.
3. Deploy (manual approval).
4. Verify all 10 pages return 200.
5. Verify business folder URLs return 404.
6. Verify Netlify detects the `contact` form and accept a test submission.
7. Only then remove any temporary `.netlifyignore` workaround if one was used.
