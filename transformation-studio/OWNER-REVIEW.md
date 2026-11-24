# Transformation Studio — Owner Review Gate

**Pilot:** Stone Harbor Tradeworks (Website Transformation Studio)  
**Location:** `transformation-studio/` (sandboxed under the public website repo)  
**Status:** Concept preview — **not approved for external sharing**

## Rule

Do **not** share this preview URL, screenshots for client proposals, or embed links on the public marketing site until the Signal Crest owner has reviewed and explicitly approved.

## What this is

- A **manual** reuse of the Home Services Transformation Studio (Oakline engine), rebranded for Stone Harbor Tradeworks.
- Client-side only. Sample estimates, scheduling, assistant replies, and workflows are **simulated**.
- Separated from the AI Software Factory, brokers, and protected infrastructure.

## What this is not

- Not a live Stone Harbor production site  
- Not a paid blueprint checkout  
- Not connected to real calendars, email, SMS, CRM, or payments  
- Not Factory / P0-B / privileged tooling  

## Checklist before sharing

- [ ] Owner walked the before/after upgrades and operations views  
- [ ] Copy and brand claims are acceptable for the intended audience  
- [ ] Concept / sample-data disclaimers remain visible  
- [ ] Decision recorded: local-only vs allowlisted for public `dist` vs separate host  
- [ ] No Factory secrets, client PII, or protected assets included  

## Publish status (staging V1)

**Excluded from `scripts/build-public.mjs` allowlist** and listed under forbidden publish prefixes.  
A staging/production Netlify publish of `dist/` must **not** include `/transformation-studio/`.  
Keep this folder in the working tree for private local review only until Atlas authorizes a publish policy.

## Local preview (source sandbox — not dist)

From the website repo root (serves the working tree, not the public allowlist build):

```bash
npx --yes serve -l 5173 .
# open the URL printed by serve, then /transformation-studio/
```

Do **not** expect this path under `dist/` after `node scripts/build-public.mjs`.
