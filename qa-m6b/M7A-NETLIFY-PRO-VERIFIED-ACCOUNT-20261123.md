# M7A — Netlify Pro Verified Account (Evidence Record)

**Date:** 2026-11-23  
**Source:** Owner-provided Netlify billing / account screenshots + owner confirmation  
**Atlas decision:** **RETAIN** existing Netlify Pro for initial staging/production planning  
**Billing action:** **NONE** — no upgrade, no downgrade, no plan change in this pass  
**Scope:** Documentation only for account facts. M7A-R1 local code remediation is separate and does not change Netlify billing.

---

## Verified account facts

| Fact | Value |
|------|-------|
| Plan | **Netlify Pro** |
| Plan price | **$20 / month** |
| Monthly credit allowance | **3,000** |
| Recorded consumption | **3.3 credits** |
| Available credits (at prior screenshot) | **2,996.7** |
| Automatic credit recharge | **DISABLED AND SAVED** (owner-confirmed) |
| Paid add-ons | **None** |
| Credits shared across team projects | **Yes** |
| Concurrent builds | **3** |
| Team members | **1** |

---

## Verified Pro capabilities (relevant to M7A)

| Capability | Verified |
|------------|----------|
| Private organization repositories | Supported |
| Shared environment variables | Supported (use with caution — see WARN) |
| Password-protected projects | Supported |

---

## Atlas planning posture

- **Retain Pro** as the hosting plan for early staging/production planning.  
- Auto-recharge is **DISABLED AND SAVED** — unexpected credit spend from recharge will not occur under current owner setting.  
- Credits are **shared across team projects** — monitor aggregate consumption when multiple sites exist.  
- **Production remains HOLD.** This record does not authorize deploy, DNS, or external provisioning.

---

## OPEN verification items (hosted — still pending)

| Item | Status | Notes |
|------|--------|-------|
| Automatic credit recharge | **CONFIRMED DISABLED AND SAVED** | Owner confirmed |
| Pro function log retention | **OPEN** | Confirm retention window for Function logs used in staging/prod forensics |
| Isolated staging project configuration | **OPEN** | Confirm separate Netlify site/project for staging vs production |
| Environment-specific secret isolation | **OPEN** | Confirm secrets are scoped per context/site — not shared across staging/prod/customer projects |
| Aggregate credit consumption across hosted projects | **OPEN** (policy known) | Pool is shared; ongoing metering still required |

---

## WARN — shared environment variables

**Shared environment variables must NOT expose production credentials to staging or unrelated customer projects.**

- Do not place production `SUPABASE_*`, `LEAD_IP_HASH_SALT`, or other production secrets in team/org-wide shared variables that staging or other sites inherit.  
- Prefer **site-scoped** and **deploy-context-scoped** secrets (`staging` vs `production`).  
- Treat shared-variable support as a capability to use carefully — not as a default for production secrets.

---

## Related documents

- Revised budget matrix: `M7A-OWNER-COST-ESTIMATE-REVISED-NETLIFY-PRO-20261123.md`  
- M7A-R1 cost/provisioning update: `M7A-R1-OWNER-COST-PROVISIONING-UPDATE-20261123.md`  
- Readiness: `M7A-R1-OWNER-RELEASE-READINESS-20261123.md`  
- Staging checklist: `M7A-R1-HOSTED-STAGING-ACCEPTANCE-CHECKLIST-20261123.md`

---

## STOP

Evidence recorded. No billing change, no Netlify config change, no git commit/push, no deployment from this document alone.
