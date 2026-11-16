# =============================================================================
# SUPERSEDED — DO NOT RUN
# =============================================================================
# This PowerShell workflow (copy → site/) is obsolete and must not be used for
# Netlify publishing. Accidental execution is blocked below.
#
# Active secure publishing pipeline:
#   - scripts/build-public.mjs   (explicit allowlist builder)
#   - root netlify.toml          (command = node scripts/build-public.mjs)
#   - dist/                      (generated public output; gitignored)
#
# Kept only as historical reference. Do not publish site/ from this script.
# =============================================================================

$ErrorActionPreference = "Stop"
throw @"
SUPERSEDED: deploy/sync-public.ps1 is obsolete and refuses to run.

Use the secure allowlist builder instead:
  node scripts/build-public.mjs

Netlify publish directory is dist/ (see root netlify.toml).
"@

# --- Legacy body retained for history only (unreachable) ---
$root = Split-Path -Parent $PSScriptRoot
$dest = Join-Path $root "site"

$html = @(
  "index.html",
  "about.html",
  "ai-automation.html",
  "case-studies.html",
  "contact.html",
  "packages.html",
  "qa-process.html",
  "resources.html",
  "services.html",
  "work.html"
)

$cssJs = @(
  "styles.css",
  "themes.css",
  "theme.js",
  "script.js",
  "ai-automation.css",
  "packages-pricing.css"
)

$dirs = @(
  "assets",
  "resources"
)

# Never publish these (preview / private)
$neverPublish = @(
  "pricing-preview.html",
  "pricing-preview.css",
  "Fiverr Account info",
  "SignalCrest Systems Growth Engine",
  "SignalCrest Systems pdf downloads"
)

if (Test-Path $dest) {
  Remove-Item -Recurse -Force $dest
}
New-Item -ItemType Directory -Path $dest | Out-Null

foreach ($file in ($html + $cssJs)) {
  $src = Join-Path $root $file
  if (-not (Test-Path $src)) {
    Write-Warning "Missing allowlisted file: $file"
    continue
  }
  Copy-Item -Path $src -Destination (Join-Path $dest $file) -Force
}

foreach ($dir in $dirs) {
  $src = Join-Path $root $dir
  if (-not (Test-Path $src)) {
    Write-Warning "Missing allowlisted directory: $dir"
    continue
  }
  Copy-Item -Path $src -Destination (Join-Path $dest $dir) -Recurse -Force
}

foreach ($blocked in $neverPublish) {
  $check = Join-Path $dest $blocked
  if (Test-Path $check) {
    throw "Refusing to publish blocked path that appeared in site/: $blocked"
  }
}

Write-Host "Public site mirror ready at: $dest"
Get-ChildItem $dest | Select-Object Name, Mode
