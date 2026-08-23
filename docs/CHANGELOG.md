# Audist — Changelog

## V3.3 — Field Workflow & Progressive Disclosure
### Changed
- Replaced the always-visible 20-system scope grid with a selected-system summary and expandable scope editor.
- Added compact system tabs and equipment counts.
- Organized equipment forms into visible Core data plus expandable Recommended, Controls/Operating Conditions, and Advanced sections.
- Reduced equipment-card noise to ID/type, key size, measurement count, concise photo status, linked ECM count, and workflow status.
- Added concise Complete, Missing Critical Data, Recommended Data Missing, and In Progress states.
- Kept missing active-ECM and required-photo information visible above collapsed details.
- Streamlined measurement entry to preset, value, automatic parameter/unit, Measured provenance, and optional instrument/note.
- Added compact equipment-linked ECM and photo requirement sections.
- Reserved V4 Engineering Analysis locations in equipment and ECM workflows without implementing calculations.

### Schema and storage
- Audit schema remains version 4.
- IndexedDB remains database version 3.
- Complete V3.2 audits open without a migration or field-data rewrite.
- Autosave, photo Blob transactions, UUID relationships, unresolved references, and export integrity are unchanged.

### Explicit exclusions
No engineering formulas, savings, financial calculations, new system families, AI API, cloud sync, backend, paid dependency, or framework migration were added.

### Verification
- 40 automated tests, including presentation non-mutation, system-filter integrity, measurement preset safety, unchanged completeness, and all V3.1/V3.2 storage behavior.
- Interactive 390 × 844 browser validation of audit scope, system navigation, chiller progressive disclosure, missing-critical status, and preset-first measurements.
- Manual physical-iPhone offline, camera, background/relaunch, and bright-light testing remains required before production deployment.


## V3.2 — System Coverage & Field Schema
### Added
- Facility-level System Inventory / Audit Scope with 20 selectable system families.
- Stable `systems[]` records and UUID relationships from systems to equipment.
- Scope-controlled equipment workflows; absent systems do not generate prompts.
- Equipment-specific field schemas and subtype choices across major commercial and industrial energy systems.
- Structured BAS/controls schedules, setpoints, reset strategies, DCV, staging, and operational observations.
- Per-field equipment provenance.
- Equipment duplication with unique next IDs; measurements and photos are intentionally not copied.
- Equipment-family measurement presets that populate parameter/unit without values.
- Equipment-family required versus recommended photo expectations.

### Migration and storage
- Audit schema advances from 3 to 4.
- V3.1 audits receive a pre-migration backup before structural migration.
- Existing equipment, measurements, photo metadata/Blobs, ECM UUID relationships, and unresolved legacy references are preserved.
- IndexedDB remains database version 3; no new object stores or DB upgrade are required.
- The V3.1 DB3 rollback bridge remains the rollback-compatible baseline.

### Explicit exclusions
No savings calculations, affinity-law tools, financial calculations, AI API, cloud sync, backend, paid dependency, or framework migration were added.

### Verification
- JavaScript syntax checks.
- 35 automated tests, including V3.1 → V3.2 migration, system persistence/relationships, duplication, presets, photo rules, existing ECM integrity, IndexedDB persistence, photos, transactions, and rollback behavior.
- Interactive iPhone-width browser validation of system selection and chiller workflow.
- Manual physical-iPhone offline and camera testing remains required before production deployment.


## V3.1
### Added/fixed
- Immediate persistence of new equipment and measurements.
- Dedicated IndexedDB Blob storage for new photos.
- Atomic audit/photo addition and deletion transactions.
- Explicit application, audit-schema, and IndexedDB versions.
- Recoverable pre-migration audit backups.
- User-exportable pre-migration backup JSON and backup deletion with permanent audit deletion.
- Refusal to overwrite unsupported future-schema audits.
- Stable equipment `recordId` relationships for ECMs.
- Explicit preservation of unresolved legacy ECM equipment references.
- Duplicate equipment-ID prevention before persistence.
- Editable ECMs and dynamic completeness recalculation.
- Required vs recommended completeness items and photo rules.
- Integrity diagnostics in JSON export.
- DB-v3 production bridge artifact for rollback-safe deployment.
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



---

# Changelog

## V4.0 Phase 1 — release candidate

- Added the authoritative California V1.1 engineering calculation library and no-deemed-savings/evidence policy.
- Added a pure offline calculation engine containing only ten approved, versioned Phase 1 methods.
- Added exact input snapshots, provenance, evidence levels, maturity, assumptions, warnings, QA flags, stable source relationships, and source fingerprints.
- Added compact calculation create/inspect/recalculate/delete workflows within saved ECMs.
- Added stale-result detection when a linked equipment field, measurement, utility rate, ECM cost, or upstream calculation changes/disappears.
- Protected calculation-linked equipment and ECMs from deletion.
- Included complete calculation records and calculation-integrity warnings in JSON export.
- Added `calculations.js` to the service-worker cache without changing production Pages architecture.
- Added deterministic numerical and lifecycle tests while retaining the V3 reliability suite.
- Retained audit schema 4 and IndexedDB version 3; no destructive migration is introduced.

No backend, AI calculation, paid dependency, deemed-savings automation, framework migration, new equipment family, or unrelated engineering method was added.

