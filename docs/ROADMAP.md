# Audist Roadmap

## V7.0 professional report renderer — release candidate

- Separate report-schema-2 model with configurable structure, branding, figures, appendices, statuses, revisions, staleness, and integrity.
- Deterministic executive, utility, end-use, system, ECM, portfolio, and calculation tables plus offline SVG charts.
- Professional standalone HTML with US Letter print CSS and browser Print / Save as PDF.
- Package format 10; no audit/database migration, backend, paid PDF service, DOCX, or new engineering calculation.

## V6.3 field workflow simplification — release candidate

- Field evidence and lightweight opportunity capture separated from desk ECM development.
- Concise field utility summary plus validated, explicitly confirmed external utility extraction in Analysis Mode.
- Safe repetitive-equipment duplication and subtype-specific refrigeration capture.
- User/rule/AI candidate review with explicit conversion into the unchanged ECM model.
- Onsite-only Field Exit Review and revised post-field Analysis Queue.
- Professional package format 9; no schema/database increase, backend, paid service, or automatic AI acceptance.

## V6.2 AI-assisted ASHRAE Level 2 report engine — release candidate

- Local versioned report request and all-or-nothing structured import.
- Readiness, numeric/source validation, selected figures, narrative-only editing, staleness, revision history, integrity, and printable HTML.
- Professional package format 8 report JSON/HTML and metadata.
- No API, backend, paid PDF service, DOCX, factual edits, calculations, or schema/database migration.

## V6.1 AI-assisted engineering review — release candidate

- Versioned, local AI review request and standardized engineering-review instructions.
- Strict whole-response import validation with wrong-audit, schema, duplicate-ID, unknown-reference, and unsupported-property rejection.
- Historical advisory reviews, engineer dispositions, engineering-fingerprint staleness, and explicit AI-candidate-to-normal-ECM acceptance.
- Analysis Mode review UI and professional package format 7 AI review artifacts/CSV.
- No API, backend, automatic transmission, paid dependency, factual edits, deterministic QA changes, or report generation.

## V6.0 deterministic audit QA/QC — release candidate

- Versioned local rule registry and stable finding lifecycle.
- Whole-audit readiness with field, analysis, engineering-review, limitation, and report-ready states.
- Analysis Mode dashboard plus onsite-only Field Exit contribution.
- Canonical JSON, manifest summary, and `qa_findings.csv` export in package format 6.
- No schema/IndexedDB migration, AI, backend, or new calculations.

## V5.3 advanced calculations — release candidate

Implemented: four bounded advanced methods (`CALC-HVAC-002`, `CALC-CHW-002`, `CALC-REF-003`, `CALC-PLUG-001`), reusable offline weather/performance evidence validation, RCx container rules, advanced readiness, numerical tests, and package-format-5 canonical export. Economizer, BAS resets, floating head, DCKV thermal effects, and interactive HVAC effects remain explicitly unquantified pending method validation.

## V5.0 utility baseline — release candidate

Implemented: account/bill evidence, legacy conversion, completeness and QA flags, complete-period purchased-energy/cost baseline, EUI/demand intensity, normalized and seasonal views, baseload screening, derived rates, ECM scale QA, manual-entry UI, offline charts, and package-format-2 export. The explicit CSV parser/mapping layer is present; provider-specific mapping UI is deferred.

## V5.1 end-use reconciliation — release candidate

Implemented: canonical traceable end-use estimates, conservative automatic assembly from explicit baseline-energy calculation outputs, hierarchy/no-double-count controls, native-fuel aggregation, whole-building reconciliation with explicit residuals, major-system coverage, stale/duplicate/weak-evidence QA, ECM savings scale checks, Analysis Mode review, and package-format-3 export. No residual is allocated and no ECM savings output becomes baseline consumption.

## V5.2 ECM portfolio interactions — release candidate

Implemented: explicit multi-scenario portfolio schema, recommendation/alternative metadata, deterministic overlap screening, engineer-confirmed sequence, remaining-baseline schedule/power and replacement/controls adjustment, immutable standalone results, mutually exclusive option rejection, staleness/evidence/economics/utility/end-use QA, Analysis Mode review, and package-format-4 export.

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

Validate each `VALIDATE-V2` methodology, add field evidence, deterministic references, and independent release review before numerical implementation. Weather normalization requires a separately specified and tested evidence, station-selection, regression-validation, and offline-data strategy. Report generation, cloud sync, tariff automation, inferred percentage disaggregation, hourly simulation, and deemed/default savings remain future work.
