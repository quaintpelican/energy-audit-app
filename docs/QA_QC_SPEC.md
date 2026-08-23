# Audist V6.0 Deterministic Audit QA/QC

## Purpose and boundary

V6.0 adds a deterministic, local-only review engine for whole-audit quality control. It does not infer missing facts, change engineering inputs, calculate savings, repair records, or replace engineer judgment. The same audit and evidence always produce the same rule findings; timestamps are presentation metadata and do not participate in finding identity.

## Canonical model

The engine is implemented in `qa-rules.js` as a versioned registry. Each current finding contains a stable `findingId`, `ruleId`, `ruleVersion`, category, severity, state, title, description, affected record type and UUIDs, evidence, recommended action, optional engineer note, and generation time.

Severities are `BLOCKER`, `HIGH`, `MEDIUM`, `LOW`, and `INFO`. Categories are data integrity, field completeness, measurement QA, photo evidence, utility QA, calculation QA, end-use reconciliation, ECM QA, portfolio QA, provenance QA, economics QA, export QA, and report readiness.

Finding states are `OPEN`, `REVIEWED`, `ACCEPTED_LIMITATION`, `RESOLVED`, and `NOT_APPLICABLE`. `RESOLVED` is assigned by disappearance of the deterministic condition, not by a manual override. Accepted limitations and not-applicable dispositions require an engineer note and timestamp. Canonical dispositions are retained in `qaFindingStates[]`; corrected findings no longer appear in the current `auditQa.findings[]` result.

## Readiness

- `FIELD_INCOMPLETE`: unresolved blocker/high field-completeness evidence remains.
- `ANALYSIS_INCOMPLETE`: material utility, calculation, end-use, ECM, or portfolio review remains.
- `ENGINEERING_REVIEW_REQUIRED`: another unresolved blocker/high finding remains.
- `REPORT_READY_WITH_LIMITATIONS`: no material unresolved finding remains, but a current accepted limitation or lower-severity finding exists.
- `REPORT_READY`: no current deterministic finding remains.

The two review declarations (`fieldScopeReviewed` and `analysisScopeReviewed`) are explicit engineer actions. They are not inferred from record counts.

## Field and analysis modes

Field Exit Review includes only unresolved blocker/high `FIELD_COMPLETENESS` findings in addition to its existing onsite evidence list. It intentionally excludes economics, office analysis, portfolio review, and report preparation. Analysis Mode displays the full grouped finding set, evidence, recommended action, disposition control, severity counts, category counts, and readiness state.

## Export

Professional package format 6 embeds the complete generated `auditQa` object in canonical `audit.json`, includes an `auditQaSummary` in `manifest.json`, and adds `tables/qa_findings.csv`. Engineering QA is independent from package integrity: a package can be structurally complete while its audit is not report-ready.

## Rule coverage and limitations

The V6.0 registry checks stable IDs and references, unresolved migration relationships, field declarations and required ECM evidence, measurement IDs/units/provenance/plausibility, referenced photo payloads, utility baseline warnings, stale or incomplete calculations, source traceability, evidence/maturity conflict, end-use gaps, unsupported ECM savings, incomplete ECM definitions, economics consistency, portfolio QA flags, export errors, and analysis review declaration.

Rules are intentionally conservative and inspect only represented evidence. V6.0 does not perform statistical anomaly detection, peer benchmarking, automatic correction, narrative report generation, cloud review, or AI judgment. New rule behavior requires a new rule version and regression tests.
