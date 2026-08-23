# Changelog

## V4.2 Field/Analysis Workflow — release candidate

- Added Field and Analysis modes over one canonical offline audit dataset.
- Classified method inputs as field required, analysis required, or recommended without changing formulas.
- Added deterministic source auto-binding with provenance priority, conflict visibility, explicit selection for equal-ranked conflicts, and reusable stable references.
- Added ECM analysis recipes, an Analysis Queue, separate field-documentation/calculation readiness, and derived export readiness.
- Added Before Leaving Site review for calculation field inputs, ECM field requirements, and equipment-specific required photos.
- Added explicit equipment grouping and auditor-confirmed representative sampling with recorded population/sample membership and Estimated/Level C provenance.
- Added pump VFD and boiler-efficiency ECM templates while preserving the V4.1 method registry and validation-only restrictions.
- Retained audit schema 4, IndexedDB version 3, GitHub Pages/offline architecture, migration safeguards, and prior audit compatibility.

## V4.1 Full Engineering Library — release candidate

- Implemented all 25 `READY-V1` methods from the California V1.1 engineering library with explicit units, provenance, evidence, warnings, and deterministic QA.
- Added 11 non-calculating `VALIDATE-V2` registry/readiness entries with `METHOD_REQUIRES_VALIDATION` status.
- Added explicit baseline, proposed, affected-operation, end-use, energy-stream, component-role, and interaction metadata.
- Added stable calculation dependencies, dependency-chain staleness propagation, prior revision snapshots, and potential-overlap flags.
- Added TOU/demand series inputs, affinity bins, conditional DHW efficiency/COP inputs, and readable method readiness panels.
- Expanded export integrity checks for missing dependencies and source records.
- Retained audit schema 4 and IndexedDB version 3; no audit migration, paid dependency, backend, or hidden default was introduced.

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
