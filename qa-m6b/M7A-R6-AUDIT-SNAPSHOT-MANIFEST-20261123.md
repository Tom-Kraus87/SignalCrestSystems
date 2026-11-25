# M7A-R6 — Audit Snapshot Manifest (SHA-256)

**Audit snapshot timestamp (UTC):** 2026-11-24T03:57:56Z  
**Algorithm:** SHA-256 (lowercase hex)  
**Authoritative baseline preserved:** M7A-R4 @ 2026-11-24T03:21:43Z (`qa-m6b/M7A-R4-AUDIT-SNAPSHOT-MANIFEST-20261123.md`)  
**Prior R4 freeze (historical):** 2026-11-24T03:09:40Z — `M7A-R4-AUDIT-SNAPSHOT-MANIFEST-20261123-FROZEN-030940Z.md`  
**R2 manifest:** UNCHANGED  

## Completeness note

R6 supersedes R4 for Codex re-audit of supplemental findings only. R4 manifests and the R4 PostgreSQL NOT RUN JSON remain on disk as historical evidence (not deleted).

## Manifest

| Path | SHA-256 | Bytes |
|------|---------|------:|
| `netlify.toml` | `579e1607b9f4f7a87fac7f7fd852017c25fc6ee5f542a110d1474236a7b9d352` | 681 |
| `netlify/functions/DEPENDENCY-LOCKING.md` | `a3def69ef01654ac06e180e11ceb3a9d95be45f914f315e735e039369979ccd3` | 2424 |
| `netlify/functions/package.json` | `332334d070a53ce8f004bb497c20f1fb343368021125b75fd46dc1664917054f` | 654 |
| `netlify/functions/package-lock.json` | `af04592c207523715df668df866bc1fb901b7110d11fb1a90896f7e25e79ad8a` | 5409 |
| `netlify/functions/leads.js` | `aefb63db013a2c7eee3a9b1db3c5fb2f97df612afe18a8b5810de1f535ac0b74` | 1255 |
| `netlify/functions/notify-worker.js` | `bd2c2efa317d876231f096cb88e8af32726885b8f1a128fb0d50f6015a91e752` | 2677 |
| `netlify/functions/_lib/pg-client.js` | `6c771925c085d41f2df32c38e41790d302d2db23dff9a807c815a98729ad3c6a` | 12952 |
| `netlify/functions/_lib/process-lead.js` | `54b64db0b6dd7d55e5df5d55c245635e0addee8ef829a097f260c7ba9e43b03e` | 13082 |
| `netlify/functions/_lib/deps.js` | `e0c069de8f47eb906b745575f51bc0ca61d9518d632252cffa308b1620105d07` | 7038 |
| `netlify/functions/_lib/repository.js` | `59f0606b64881fa7fb5e66d789360be3eae5f6ccec013b406a15fb935a53f15e` | 8965 |
| `netlify/functions/_lib/postgres-adapters.js` | `0e1cf20acdf438a480480f3d2700c2c70b97c6f07ec5cd0eab22992a00a7c5ac` | 7715 |
| `netlify/functions/_lib/idempotency.js` | `cbafe0a064eb0d14446df0e691f94a32f9a872463dc35ecf9fc40d35904a0a99` | 2776 |
| `netlify/functions/_lib/schema.js` | `da7af2cecb9a403439eb020bffa5e1c399d6dae2953f1ada53e184d95122b6cf` | 10281 |
| `netlify/functions/_lib/spam-protection.js` | `500483efbcf6461d67de88ebc1adabe150a517a64dd51eb94e0db405e493aab1` | 4218 |
| `netlify/functions/_lib/notify.js` | `af89832e68011b9ba28dec609ee9e122b890597a158debf14eceb301d51d6dc9` | 1387 |
| `netlify/functions/_lib/notify-worker.js` | `cfe21dbe9868e3d8bc10dbdcb6ad9fa8ac3452a0bf755be10800fb3fbcbcd694` | 4921 |
| `netlify/functions/_lib/worker-auth.js` | `49b2cd99f65a17332ff019aeab32de65090c9a27486fcb7a21b2c31b9fc9df27` | 2277 |
| `netlify/functions/_lib/request-meta.js` | `f0550c4651cc3184b5039775905e27dd8cf5abc64261965f0d0344a87d9ac5b7` | 2403 |
| `netlify/functions/_lib/payload-hash.js` | `58765105f149dd7162559bdd7f29b6e4fe21f4e42ab2435f79cd4c7639051429` | 1086 |
| `netlify/functions/_lib/rate-limit.js` | `6c1d933737cc19663dee99b64c3dc29f6d7aed4098b8d2d1b296632d2469a142` | 2872 |
| `netlify/functions/_lib/privacy.js` | `c82da60e24bdfd9f478854378c03b717a4661d160a0f95e71b68e65cd074f2f4` | 824 |
| `netlify/functions/_lib/safe-log.js` | `0e2dd975a59496ca09a5c6d368fd403145484655e904c70421c9cc61bcc6f55b` | 1309 |
| `netlify/functions/_lib/normalize.js` | `fdc5226d4a71840b4401b9534966f6d9b92c407e89769511c15b635fa9261fd8` | 2224 |
| `netlify/functions/_lib/sensitive.js` | `8d3b609ae3fd35267516a74e3f55c7b7a21fd66194df3ad39074565932468018` | 1739 |
| `netlify/functions/_lib/transactional-primitives.js` | `bc659859d4c5b788d3698bacfadfc8e316f24eb13648b3e9df0a98074908c0f9` | 6309 |
| `db/bootstrap/001_m7a_r4_role_bootstrap.sql` | `c9fd204bce78a19b94ff5b4eee8e3ba8c45f7957aed48c702407319c991080db` | 3825 |
| `db/migrations/001_m7a_leads_foundation.sql` | `7f45ae6de2f666bc1e8ea7c2816e6fd60a515b367a51ac7bd1e706ee028b8dc0` | 5572 |
| `db/migrations/002_m7a_rls_least_privilege.sql` | `fbbb319e6215665dfdc02ecfd225c079fd1b396828397e647e2b90be84f58850` | 2584 |
| `db/migrations/003_m7a_retention_procedures.sql` | `509595c5457c989379adb4e51c309e56111104525032a76fec68478b9c0cf472` | 5624 |
| `db/migrations/004_m7a_counters_idempotency.sql` | `0f0ee07642f22cc727891d471f35c6f04d11ad3c9136a495567452a6e7f62888` | 5229 |
| `db/migrations/005_m7a_insert_lead_bundle.sql` | `b2ebc8adb202ffa60c8e83d14230449b893bb34572486dbdfdabd53550c30c39` | 8125 |
| `db/migrations/006_m7a_r2_security_hardening.sql` | `8bde257dd0ac192770622bf59cbf0156c26715529a20bdc73b93e7356b863501` | 24626 |
| `db/migrations/007_m7a_r4_security_corrections.sql` | `dce49eff38a9d1591964bad88be9d00b46969d65050d1b5b96478a997d05d2d8` | 13827 |
| `db/procedures/m7a_insert_lead_transaction.sql` | `36d8cb27901382f7639cd105d477510d1baeb5c081027322e05a78f992bd41ca` | 1355 |
| `db/scripts/m7a-migration-executor-static.mjs` | `0d4f2d058376d73085d673d36eb189d05bbf3d603d0984d4a64a91a80dbe9079` | 6036 |
| `.env.example` | `4bcdd15891c819fa830abeb323e246a435e2b86b0d2f5e52c9d35a27304a5e60` | 9816 |
| `script.js` | `cb927b5f0261fd9a739fb14c4851b24e421e0cbd6cdec5698c051b5c4dc333a9` | 23938 |
| `project-request.html` | `0b62bba9567da13114ce8aafa3c6000f358f34586ec4d8d8a13bfb78e4126a03` | 26224 |
| `contact.html` | `ff3b50b21fca2cf2b72e1104e631facd080327cc74e38e7d8a734861b20c9eef` | 24397 |
| `privacy.html` | `a2a9f3fe92855be18798fe778be45c341e5f6b880ce8acb7470fc441511da0c5` | 22486 |
| `advisor.html` | `f3dddc104a82b84e21268cb1febfb048b415ab049d76e721957e7440a4bbac5b` | 19639 |
| `advisor.js` | `ccf4afc58544bf78f61517f3285dd4a808dd782a969298f66dc70d23af78fb28` | 42591 |
| `advisor-kb.json` | `1b9581bc50558bf73a5a769b2ce9f818ab29ead144d0d848c0edc874366a74aa` | 10795 |
| `scripts/build-public.mjs` | `b8d08e2f9f17d7f349b779e0846b8fb2793bda096e66dfe67862701e01dabb78` | 27876 |
| `qa-m6b/verify-m7a-secure-leads-20261123.mjs` | `1c82661964f5104850347312a8c4beac971472d75cd4c6bb8bbc729e345ded7a` | 64052 |
| `qa-m6b/verify-m7a-r2-postgres-integration-20261123.mjs` | `a27db615198eaa28ce49463f7ab9eb77183453a36587b2f805bb4dcacb59ff77` | 30675 |
| `qa-m6b/_m7a-static-check.mjs` | `08a4b92477c0b70a784c4ea16fff6eaa27c29c82ea5619bbeda671518395a533` | 925 |
| `qa-m6b/M7A-R4-POSTGRES-INTEGRATION-NOT-RUN-20261123.json` | `086ac8dbbcb7af77fb34139b7973045c191786ca28b225f10844d24a8ecb36e4` | 1945 |
| `qa-m6b/M7A-R6-POSTGRES-INTEGRATION-NOT-RUN-20261123.json` | `09cfa0f1f9c64e18e5c86df677e356adeed0d9270b2b9718b3b3266db2b26ad2` | 2904 |
| `qa-m6b/M7A-R6-MIGRATION-EXECUTOR-STATIC-20261123.json` | `50beeb40ba3403aa27776d10a4a921bfb4c3461b526401ad16a04e4ef342436a` | 4165 |
| `qa-m6b/M7A-LOCAL-TEST-RESULTS-20261123.json` | `e73120a7125a41d218d7afa8778819b390acd8d04bd1d7181233cb2229c21f4c` | 24738 |

## Companion deliverables

- M7A-R6-IMPLEMENTATION-REPORT-20261123.md (+ PDF)
- M7A-R6-CODEX-FINDING-RECONCILIATION-20261123.md (+ PDF)
- M7A-R6-DATABASE-EXECUTOR-AND-OWNERSHIP-20261123.md (+ PDF)
- M7A-R6-VERIFICATION-MATRIX-20261123.md (+ PDF)
- M7A-R6-STAGING-READINESS-20261123.md (+ PDF)
- M7A-R6-AUDIT-SNAPSHOT-MANIFEST-20261123.md (+ PDF)

## Hash companions

- `qa-m6b/_r6-manifest-hashes.json`
- Historical: `qa-m6b/_r4-manifest-hashes.json`, `_r4-manifest-hashes-FROZEN-030940Z.json`

## Lockfile summary (unchanged from R4)

| Item | Value |
|------|-------|
| Resolved driver | `pg@8.13.1` |
| Lockfile SHA-256 | `af04592c207523715df668df866bc1fb901b7110d11fb1a90896f7e25e79ad8a` |
| Registries | registry.npmjs.org only |
| npm ci this pass | **NOT executed** |

**Production: HOLD. Real PostgreSQL / hosted verification: NOT RUN.**
