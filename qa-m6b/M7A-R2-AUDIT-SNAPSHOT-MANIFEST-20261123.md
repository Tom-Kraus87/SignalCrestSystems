# M7A-R2 — Audit Snapshot Manifest (SHA-256)

**Audit snapshot timestamp (UTC):** 2026-11-24T02:07:16Z  
**Workspace:** Signal Crest Systems LLC  
**Source edits after this timestamp:** STOPPED for Atlas/Codex review  
**Algorithm:** SHA-256 (lowercase hex)

## Manifest (implementation + tests + contracts)

| Path | SHA-256 | Bytes |
|------|---------|------:|
| `netlify/functions/leads.js` | `aefb63db013a2c7eee3a9b1db3c5fb2f97df612afe18a8b5810de1f535ac0b74` | 1255 |
| `netlify/functions/notify-worker.js` | `395057707edaf674159f9f379db8265bb3afbcb37c5f4f37645cf31d7a15a2b9` | 3342 |
| `netlify/functions/_lib/pg-client.js` | `39a1238d8849eb7607bd79d4d26fb9197d674e1edc1df6d4f8d447d814c936ea` | 9425 |
| `netlify/functions/_lib/process-lead.js` | `b86011fa01b3ab562a03f3564ecdcb4d52307575bfd8aca6ff06535daada8b1f` | 11110 |
| `netlify/functions/_lib/deps.js` | `9f5baad2a6c6158b1db3c6f1a8dbaaf54cbc1cf5cd1e728876820337ab1a3190` | 6998 |
| `netlify/functions/_lib/repository.js` | `dac04dd35dc2ebf1f45c2afc2cda2e4e1abadcd97bbdb1f7874ffbf119c681e8` | 8759 |
| `netlify/functions/_lib/postgres-adapters.js` | `6fb00aec7e6437bc8e10aaa35029b83af4f3462213a5a189ce88a25b06f12a33` | 6683 |
| `netlify/functions/_lib/idempotency.js` | `cbafe0a064eb0d14446df0e691f94a32f9a872463dc35ecf9fc40d35904a0a99` | 2776 |
| `netlify/functions/_lib/schema.js` | `da7af2cecb9a403439eb020bffa5e1c399d6dae2953f1ada53e184d95122b6cf` | 10281 |
| `netlify/functions/_lib/spam-protection.js` | `500483efbcf6461d67de88ebc1adabe150a517a64dd51eb94e0db405e493aab1` | 4218 |
| `netlify/functions/_lib/notify.js` | `af89832e68011b9ba28dec609ee9e122b890597a158debf14eceb301d51d6dc9` | 1387 |
| `netlify/functions/_lib/notify-worker.js` | `194b1bc85eb8fe98e2693fd570e8425b0895e972329d59e552c97c9181f03ec8` | 5207 |
| `netlify/functions/_lib/request-meta.js` | `f0550c4651cc3184b5039775905e27dd8cf5abc64261965f0d0344a87d9ac5b7` | 2403 |
| `netlify/functions/_lib/payload-hash.js` | `58765105f149dd7162559bdd7f29b6e4fe21f4e42ab2435f79cd4c7639051429` | 1086 |
| `netlify/functions/_lib/rate-limit.js` | `6c1d933737cc19663dee99b64c3dc29f6d7aed4098b8d2d1b296632d2469a142` | 2872 |
| `netlify/functions/_lib/privacy.js` | `c82da60e24bdfd9f478854378c03b717a4661d160a0f95e71b68e65cd074f2f4` | 824 |
| `netlify/functions/_lib/safe-log.js` | `0e2dd975a59496ca09a5c6d368fd403145484655e904c70421c9cc61bcc6f55b` | 1309 |
| `netlify/functions/_lib/normalize.js` | `fdc5226d4a71840b4401b9534966f6d9b92c407e89769511c15b635fa9261fd8` | 2224 |
| `netlify/functions/_lib/sensitive.js` | `8d3b609ae3fd35267516a74e3f55c7b7a21fd66194df3ad39074565932468018` | 1739 |
| `netlify/functions/_lib/transactional-primitives.js` | `bc659859d4c5b788d3698bacfadfc8e316f24eb13648b3e9df0a98074908c0f9` | 6309 |
| `db/migrations/001_m7a_leads_foundation.sql` | `7f45ae6de2f666bc1e8ea7c2816e6fd60a515b367a51ac7bd1e706ee028b8dc0` | 5572 |
| `db/migrations/002_m7a_rls_least_privilege.sql` | `fbbb319e6215665dfdc02ecfd225c079fd1b396828397e647e2b90be84f58850` | 2584 |
| `db/migrations/003_m7a_retention_procedures.sql` | `509595c5457c989379adb4e51c309e56111104525032a76fec68478b9c0cf472` | 5624 |
| `db/migrations/004_m7a_counters_idempotency.sql` | `0f0ee07642f22cc727891d471f35c6f04d11ad3c9136a495567452a6e7f62888` | 5229 |
| `db/migrations/005_m7a_insert_lead_bundle.sql` | `b2ebc8adb202ffa60c8e83d14230449b893bb34572486dbdfdabd53550c30c39` | 8125 |
| `db/migrations/006_m7a_r2_security_hardening.sql` | `8bde257dd0ac192770622bf59cbf0156c26715529a20bdc73b93e7356b863501` | 24626 |
| `db/procedures/m7a_insert_lead_transaction.sql` | `f9eeb2666b3b639a336f1e240d4b88f1e7b65d54f07f8ad0d3a2cdb0e63dc530` | 1068 |
| `.env.example` | `1ce2638d7ef33ce67c819ef0e5a0892fd01e9c776b94e2e1caa03b0f448d2c57` | 7177 |
| `script.js` | `cb927b5f0261fd9a739fb14c4851b24e421e0cbd6cdec5698c051b5c4dc333a9` | 23938 |
| `project-request.html` | `0b62bba9567da13114ce8aafa3c6000f358f34586ec4d8d8a13bfb78e4126a03` | 26224 |
| `contact.html` | `ff3b50b21fca2cf2b72e1104e631facd080327cc74e38e7d8a734861b20c9eef` | 24397 |
| `qa-m6b/verify-m7a-secure-leads-20261123.mjs` | `596344a74376f6f86fdb6ea3523ceeab33343ca612c30eb3fc9e2734d01df680` | 36328 |
| `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs` | `f0dbe64f778dcac2a97f123b4e2206ce6affe780873b471f1047327b937fcbf3` | 5518 |
| `netlify.toml` | `47118dfc94d3e08c20bba357286437f6e5e77d790c5ca02ca45417a86377b0b8` | 482 |

## Companion Owner/Atlas deliverables

- `qa-m6b/M7A-R2-IMPLEMENTATION-REPORT-20261123.md`
- `qa-m6b/M7A-R2-CONSOLIDATED-FINDING-REGISTER-20261123.md`
- `qa-m6b/M7A-R2-DATABASE-MIGRATION-PERMISSION-INVENTORY-20261123.md`
- `qa-m6b/M7A-R2-LOCAL-TEST-EVIDENCE-20261123.md`
- `qa-m6b/M7A-R2-HOSTED-STAGING-ACCEPTANCE-CHECKLIST-20261123.md`
- `qa-m6b/M7A-R2-OWNER-RELEASE-READINESS-ADDENDUM-20261123.md`
- Matching PDFs under `qa-m6b/pdf/`

## Forbidden actions confirmation

- No external provisioning / paid subscriptions
- No remote migrations / DNS / deployment
- No git commit or push
- No Docker start / software install
- No live AI activation / Software Factory modifications
- No self-certification of M7A hosted controls
- No regeneration of historical cost reports

**Production: HOLD.**
