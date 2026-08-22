# Audist — Changelog

## V3.1
### Added/fixed
- Immediate persistence of new equipment and measurements.
- Dedicated IndexedDB Blob storage for new photos.
- Atomic audit/photo addition and deletion transactions.
- Explicit application, audit-schema, and IndexedDB versions.
- Recoverable pre-migration audit backups.
- Refusal to overwrite unsupported future-schema audits.
- Stable equipment `recordId` relationships for ECMs.
- Duplicate equipment-ID prevention before persistence.
- Editable ECMs and dynamic completeness recalculation.
- Required vs recommended completeness items and photo rules.
- Integrity diagnostics in JSON export.
- Safer service-worker activation behavior.

### Known limitations
- Legacy embedded photos are not converted to Blob records.
- JSON export includes photo metadata but not current photo Blobs.
- Canonical measurement parameter IDs and unit conversion are not implemented.
- Engineering calculations and cloud backup remain future work.

### Verification
- JavaScript syntax checks for `app.js`, `db.js`, and `sw.js`.
- Automated regression tests for schema refusal, migration relationship resolution, completeness evidence, photo availability, and ECM ID generation.
- Manual iPhone/offline/migration procedure remains required before production field use.

## V3
### Added
- Utility-rate fields.
- Monthly electric/gas utility records.
- Seven initial ECM templates:
  - HVAC Supply Fan VFD
  - HVAC Schedule Optimization
  - Economizer Repair / Optimization
  - LED Lighting Retrofit
  - Lighting Controls
  - Heat Pump Water Heater
  - Tankless Water Heater
- Initial required-data rules.
- ECM completeness percentage and visual progress bar.
- Utility-month count in audit review.
- Utility/ECM metadata included in JSON export.

### Known limitations
- ECM completeness is calculated when the ECM is created and does not yet dynamically recalculate.
- ECM editing is limited/not implemented.
- Utility CSV import is not implemented.
- Deterministic engineering calculation engine is not yet implemented.
- Cloud backup is not implemented.

## V2.1
### Added
- Photo categories.
- Optional photo notes.
- Automatic client-side JPEG resizing/compression.
- Automatic filenames tied to equipment ID/category.
- Photo dimensions and storage metadata.
- Improved photo cards.

### Photo categories
Nameplate, Equipment Overview, Controls, Motor/Drive, Electrical, Deficiency, Measurement Setup, Other.

## V2
### Architecture change
Replaced V1 `localStorage` audit storage with IndexedDB.

### Added
- Multiple audits.
- Audit dashboard.
- Autosave.
- Visible save timestamp/status.
- Editable equipment records.
- Structured measurements.
- Provenance options: Measured, Nameplate, Estimated, Assumed, Calculated.
- Camera/photo attachment support.
- Audit summary counts.
- JSON export.
- Updated offline Service Worker.

### Migration note
V1 localStorage audits were not automatically migrated into V2. Users were instructed to export valuable V1 data before upgrade.

## V1.1
### Added/fixed
- Visible save confirmation.
- Local-storage write verification.
- Save-error message.
- Improved Service Worker update/cache behavior.

## V1
### Initial prototype
- Site record.
- HVAC equipment.
- Lighting records.
- Domestic hot water records.
- ECM opportunity records.
- Local browser storage.
- Offline PWA shell.
- Structured JSON export.
- AI-analysis prompt.

## Release discipline going forward
Each release should document:
- problem solved;
- data-model changes;
- files changed;
- deployment procedure;
- migration requirements;
- limitations;
- iPhone/offline/persistence tests.

