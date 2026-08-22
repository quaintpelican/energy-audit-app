# Audist — Changelog

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

