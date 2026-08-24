# Professional Audit Package — Format Version 8

`audit.json` is the canonical structured dataset. CSV and image files are interoperable representations of the same audit evidence; they do not replace stable UUID relationships.

## Structure

- `audit.json`
- `manifest.json`
- `tables/systems.csv`, `equipment.csv`, `measurements.csv`, `utilities.csv`, `end_uses.csv`, `ecms.csv`, `calculations.csv`, `ecm_portfolios.csv`, `ecm_interactions.csv`
- `photos/<system type>/<equipment display ID>/<equipment>_<category>_<sequence>.<ext>`

## Manifest and integrity

The manifest records `packageFormatVersion`, audit/facility/date/app/schema identity, generation time, record/photo/utility/end-use/portfolio/weather/performance/RCx counts, analysis summaries, and integrity warnings/errors. Status is `PASS`, `PASS_WITH_WARNINGS`, or `FAIL`. Any referenced photo without a readable IndexedDB Blob or legacy embedded image is an error and makes the package `FAIL`.

## Photo behavior

Current photo Blobs are exported directly as image files. Legacy data URLs are decoded during export without requiring migration. Exported photo metadata retains its UUID and gains a relative `packagePath` and exported MIME type in the package copy. Filenames are sanitized without changing display IDs in the audit; deterministic suffixes prevent overwriting.

## ZIP and memory behavior

The zero-dependency writer uses the standard uncompressed ZIP storage method for broad compatibility. It computes CRCs and handles photos sequentially, retaining original Blobs as final ZIP parts rather than base64 copies. This reduces avoidable peak memory, although the browser must still construct the final package Blob. The end record and file count are verified before the package is offered.

## Known limitations

- ZIP entries are stored rather than recompressed because Audist photos are already compressed and recompression would increase CPU/memory use.
- iOS may impose device-dependent memory limits for exceptionally large audits; export progress remains visible, but no browser can guarantee a package larger than available memory.
- Format version 4 uses ZIP32 and therefore does not support individual files or packages at/above 4 GiB.
- Orphan Blobs are reported but not exported because they have no authoritative audit relationship.
- CSV intentionally flattens a useful subset; complete fidelity remains in JSON.

Format 5 retains all nine prior CSV tables. Weather bins, conditioned manufacturer performance points, RCx containers, advanced calculations, dependencies, and interactions remain canonical in JSON because flattening them would discard engineering structure. It does not change audit schema 4 or IndexedDB version 3.

Format 6 retains those tables and adds `tables/qa_findings.csv`. Canonical `audit.json` includes the full generated `auditQa` snapshot and persisted `qaFindingStates[]`; `manifest.json` includes readiness, severity/category summaries, unresolved count, and current accepted limitations. `manifest.integrity` remains strictly about package/reference/photo integrity and does not become `FAIL` merely because engineering QA is unresolved.

Format 7 adds `tables/ai_review_findings.csv` plus `ai_review/ai_review_request.json`, `ai_review/AI_REVIEW_INSTRUCTIONS.md`, and historical review JSON under `ai_review/reviews/`. The request excludes photo binaries and review recursion. Existing review records and engineer dispositions remain canonical in `audit.json`. AI review is optional, advisory, does not affect package integrity or deterministic readiness, and causes no network transmission during export.

Format 8 adds the current audit-owned draft under `report/report.json` and `report/report.html`, plus report count, identity, currency, and independent report-integrity metadata in `manifest.json`. Stale reports remain explicitly marked. Report files are derived and do not replace canonical `audit.json`.
## V6.3 package format 9

Format 9 retains every prior artifact and adds `tables/opportunity_flags.csv`. Canonical `audit.json` preserves opportunity/candidate lifecycle, utility field receipt/import status, and utility source-file metadata; the manifest exposes a compact field-workflow summary. Source utility binaries are not stored or exported by V6.3.
