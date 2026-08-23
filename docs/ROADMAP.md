# Audist Roadmap

## V5.0 utility baseline — release candidate

Implemented: account/bill evidence, legacy conversion, completeness and QA flags, complete-period purchased-energy/cost baseline, EUI/demand intensity, normalized and seasonal views, baseload screening, derived rates, ECM scale QA, manual-entry UI, offline charts, and package-format-2 export. The explicit CSV parser/mapping layer is present; provider-specific mapping UI is deferred.

## Recommended V5.1

Reconcile documented end-use estimates and ECM portfolios against the purchased-energy baseline with explicit boundaries and uncertainty. Weather normalization requires a separately specified and tested evidence, station-selection, regression-validation, and offline-data strategy.

## Completed baselines

- V3.1: field-data reliability, autosave, Blob photos, UUID ECM relationships, migration/rollback safeguards.
- V3.2: structured facility system inventory and equipment-family collection.
- V3.3: compact iPhone field workflow and progressive disclosure.

## V4.0 Phase 1 — release candidate

Deterministic offline calculation registry; ten approved methods; canonical reproducible records; provenance/evidence/maturity; explicit assumptions; source linking and stale detection; QA flags; compact ECM analysis UI; complete JSON calculation export; numerical/reliability tests.

## V4.1 full engineering library — release candidate

All 25 California V1.1 `READY-V1` methods are implemented offline with explicit units, evidence, boundaries, dependencies, revision history, and overlap QA. `VALIDATE-V2` methods are registry/readiness entries only and remain non-calculating until separately validated.

## V4.2 field/analysis workflow — release candidate

Field and Analysis modes; input-timing classification; deterministic source auto-binding; routine ECM recipes; analysis queue; Before Leaving Site review; explicit equipment groups and representative sampling; separate field-documentation/calculation readiness; derived export readiness. No calculation method or formula changed.

## V4.3 professional audit package — release candidate

Offline ZIP export containing canonical JSON, manifest integrity results, interoperable CSV tables, current photo Blobs, and legacy photos; safe filenames; iPhone share/download; no schema/database migration.

## Future — requires separate approval

Validate each `VALIDATE-V2` methodology, add field evidence, deterministic references, and independent release review before numerical implementation. Report generation, cloud sync, tariff automation, inferred grouping, and deemed/default savings remain outside V4.3.
