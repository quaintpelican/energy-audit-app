# Professional Audit Package — Format Version 3

`audit.json` is the canonical structured dataset. CSV and image files are interoperable representations of the same audit evidence; they do not replace stable UUID relationships.

## Structure

- `audit.json`
- `manifest.json`
- `tables/systems.csv`, `equipment.csv`, `measurements.csv`, `utilities.csv`, `end_uses.csv`, `ecms.csv`, `calculations.csv`
- `photos/<system type>/<equipment display ID>/<equipment>_<category>_<sequence>.<ext>`

## Manifest and integrity

The manifest records `packageFormatVersion`, audit/facility/date/app/schema identity, generation time, record/photo/utility/end-use counts, concise derived utility and end-use reconciliation summaries, and integrity warnings/errors. Status is `PASS`, `PASS_WITH_WARNINGS`, or `FAIL`. Utility account/bill and canonical end-use UUID relationships are validated. Any referenced photo without a readable IndexedDB Blob or legacy embedded image is an error and makes the package `FAIL`. Orphan photo Blobs and unresolved legacy ECM references are warnings. Broken relationships are errors.

## Photo behavior

Current photo Blobs are exported directly as image files. Legacy data URLs are decoded during export without requiring migration. Exported photo metadata retains its UUID and gains a relative `packagePath` and exported MIME type in the package copy. Filenames are sanitized without changing display IDs in the audit; deterministic suffixes prevent overwriting.

## ZIP and memory behavior

The zero-dependency writer uses the standard uncompressed ZIP storage method for broad compatibility. It computes CRCs and handles photos sequentially, retaining original Blobs as final ZIP parts rather than base64 copies. This reduces avoidable peak memory, although the browser must still construct the final package Blob. The end record and file count are verified before the package is offered.

## Known limitations

- ZIP entries are stored rather than recompressed because Audist photos are already compressed and recompression would increase CPU/memory use.
- iOS may impose device-dependent memory limits for exceptionally large audits; export progress remains visible, but no browser can guarantee a package larger than available memory.
- Format version 3 uses ZIP32 and therefore does not support individual files or packages at/above 4 GiB.
- Orphan Blobs are reported but not exported because they have no authoritative audit relationship.
- CSV intentionally flattens a useful subset; complete fidelity remains in JSON.

Format 3 retains the format-2 utility rows and adds `tables/end_uses.csv` with stable model/source relationships, energy, evidence, maturity, status, assumptions, and warnings. Complete fidelity and reconciliation QA remain in JSON. It does not change audit schema 4 or IndexedDB version 3.
