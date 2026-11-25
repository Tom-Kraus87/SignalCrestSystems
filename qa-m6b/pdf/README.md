# Atlas / Owner PDF copies

These PDFs are **Atlas upload copies** of the Markdown sources in `qa-m6b/`.

- **Markdown remains the source of truth.** Edit the `.md` file first.
- **Regenerate when MD is revised** so Atlas is never working blind against Markdown-only artifacts.
- Download any `.pdf` here and upload it to Atlas immediately.

## Regenerate

From this folder (requires Node.js and Chrome or Edge locally):

```powershell
npm install
node convert-md-to-pdf.mjs
```

Or convert specific sources (filenames relative to `qa-m6b/`):

```powershell
node convert-md-to-pdf.mjs M7A-OWNER-RELEASE-READINESS-20261123.md
```

## Policy

Future Atlas / Owner-facing documentation under `qa-m6b/` must emit a matching presentable PDF into this folder whenever the Markdown is created or revised. See `.cursor/rules/atlas-owner-md-pdf-handoff.mdc`.
