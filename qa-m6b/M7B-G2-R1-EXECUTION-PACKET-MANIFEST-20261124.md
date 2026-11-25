# M7B-G2-R1 — Execution Packet SHA-256 Manifest

**Date:** 2026-11-24  
**Nature:** Packet documentation / SQL overlay integrity index only  
**Does NOT replace** the accepted 59-file M7B freeze (`M7B-AUDIT-SNAPSHOT-MANIFEST-20261124.md`, digest `3c7cebb3f27ebf55d1d002e2d8c480a451932ff43d1b4f39f579956cb2ad4d0b`)  
**Authoritative apply text:** Markdown SQL execution packet (not PDF)  
**G2 SQL / Production:** unauthorized / **HOLD**

---

## Summary

| Field | Value |
|-------|-------|
| Packet payload entries (below) | **9** |
| Algorithm | SHA-256 (lowercase hex) |
| Snapshot time (local authoring) | 2026-11-24 |
| Harness change proposal required | **No** (policies-only) |
| Frozen harness SHA-256 (spot-check) | `826bf5c3845c8d9068831a07e87aaaecfdb721f3a009115a7bdda41c96c3d0f9` (**MATCH** freeze) |

Companion hash JSON (payload only): `qa-m6b/_m7b-g2-r1-packet-hashes.json`

---

## Payload entries

| # | Path | Bytes | SHA-256 |
|--:|------|------:|---------|
| 1 | `qa-m6b/M7B-G2-R1-IMPLEMENTATION-PREPARATION-REPORT-20261124.md` | 8073 | `2dbd1fe25203680a68af31d0f081fbd0a3720114f75463765c0bcd0e94ad16eb` |
| 2 | `qa-m6b/M7B-G2-R1-SQL-EXECUTION-PACKET-20261124.md` | 31487 | `d2394f099020fced073211eeda3b7ae38c0d4e4a677b54ad1aa841ab2b0a0174` |
| 3 | `qa-m6b/M7B-G2-R1-OWNER-WALKTHROUGH-20261124.md` | 8493 | `a9a3b4f96b59967375947d39a58849eab457041e52d030cbff35b751f62da818` |
| 4 | `qa-m6b/M7B-G2-R1-CORRECTION-REPORT-20261124.md` | 6777 | `07ee1071f9414214ce0f8cd1d436ab8052d2439cca840d9afeef8792537ca757` |
| 5 | `qa-m6b/M7B-G2-R1-staging-fixture-rls-policies-20261124.sql` | 5938 | `cbcb3f9231407f5f44b325287e08da751733ce4af818381b2a50ecfda81a0a34` |
| 6 | `qa-m6b/pdf/M7B-G2-R1-IMPLEMENTATION-PREPARATION-REPORT-20261124.pdf` | 248478 | `050cd7f77c709e2ec21f82c6515e1ae2f1d6a1e35f6b62093daea1683572a5b3` |
| 7 | `qa-m6b/pdf/M7B-G2-R1-SQL-EXECUTION-PACKET-20261124.pdf` | 472251 | `7cc57148fcc5543700cf31b8c96b9224c97c74084b5b0bdda54da509346f6733` |
| 8 | `qa-m6b/pdf/M7B-G2-R1-OWNER-WALKTHROUGH-20261124.pdf` | 268628 | `c2a024a855cc87eeb6a50b4a6b6e6f96cccf57a33378ae09b67fc936a57eec35` |
| 9 | `qa-m6b/pdf/M7B-G2-R1-CORRECTION-REPORT-20261124.pdf` | 213242 | `134fd683a53f376258dbeb86eb478e2a19b6aa4c5809dd72232eb0fcd1927b8c` |

**Payload entry count: 9**

---

## Index artifacts (this manifest)

Self-hashes for this Markdown and its PDF are recorded in the companion stamp (avoids circular inclusion in the payload table):

- `qa-m6b/_m7b-g2-r1-manifest-file-sha256.txt`
- PDF copy: `qa-m6b/pdf/M7B-G2-R1-EXECUTION-PACKET-MANIFEST-20261124.pdf`

**Official packet payload entry count remains 9** (table above). Index stamp is supplemental.

---

## Historical G2 packets (retained; not re-hashed into this payload)

Prior G2 docs remain on disk as historical evidence and were **not deleted**:

- `qa-m6b/M7B-G2-SQL-EXECUTION-PACKET-20261124.md` (+ PDF)
- `qa-m6b/M7B-G2-OWNER-WALKTHROUGH-20261124.md` (+ PDF)
- `qa-m6b/M7B-G2-IMPLEMENTATION-PREPARATION-REPORT-20261124.md` (+ PDF)
- `qa-m6b/M7B-G2-EXECUTION-READINESS-PROCEDURE-20261124.md` (+ PDF)
- `qa-m6b/M7B-G2-G4-PLANNING-SUMMARY-20261124.md` (+ PDF)

R1 supersedes them for **apply guidance** only.

---

## Freeze confirmation (spot-check this pass)

| Object | Result |
|--------|--------|
| Harness vs freeze SHA-256 | MATCH |
| Bootstrap 001 vs freeze | MATCH |
| Migration 001 vs freeze | MATCH |
| Migration 007 vs freeze | MATCH |
| Freeze files edited for R1 | **NONE** |

---

## Authorization reminder

This manifest records local packet artifacts only. It does **not** authorize SQL execution, harness runs, installs, Git, deploy, or production changes.
