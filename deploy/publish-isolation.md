# Publish isolation (prepared, not activated)

## Risk
`netlify.toml` currently uses `publish = "."`, so the Netlify deploy directory is the repository root. Untracked business folders in the repo root can become publicly reachable if they are present at deploy time:

- `Fiverr Account info/`
- `SignalCrest Systems Growth Engine/`
- `SignalCrest Systems pdf downloads/`

Business files were **not** moved or deleted as part of this preparation.

## Recommended approach
Use a dedicated public publish directory (`site/`) that contains only website assets. Keep business folders outside that directory (they can remain in the repo root).

## Files prepared here
- `netlify.toml.example` — proposed publish/`site` build settings (do not copy over live `netlify.toml` until approved)
- `.netlifyignore.example` — interim deny-list if staying on `publish = "."` briefly
- `sync-public.ps1` — allowlist copy into `site/` without touching business folders

## Activation checklist (requires explicit approval)
1. Review allowlist in `sync-public.ps1`
2. Run `deploy/sync-public.ps1` locally and inspect `site/`
3. Replace root `netlify.toml` with `deploy/netlify.toml.example` (or merge its `[build]` block)
4. Confirm Netlify Forms still detect `contact.html` inside `site/`
5. Deploy and verify private folders return 404 on the live host
6. Keep `pricing-preview.html` out of `site/` (preview-only; not part of production)

## Do not activate yet
Live `netlify.toml` remains `publish = "."` until deployment settings are explicitly approved.

## Also prepared in repo root
`.gitignore` now excludes `site/`, the private business folders, and `pricing-preview.*` so they are not committed accidentally. This does **not** change Netlify publish settings by itself.
