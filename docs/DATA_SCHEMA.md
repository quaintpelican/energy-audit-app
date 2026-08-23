# Audist Data Schema — V5.3

V4.3 retains audit schema `4` and IndexedDB database version `3`. The canonical audit continues to include `systems[]`, `equipment[]`, `ecms[]`, and `calculations[]`, with optional additive `equipmentGroups[]`. Existing schema-4 audit data is not rewritten on open.

V5.0 keeps those versions and adds optional `utilityAccounts[]` inside the audit object. Account and bill UUIDs are stable and unique; every bill repeats its parent `utilityAccountId`. Legacy `utility` is retained. Only audits containing legacy monthly data receive an additive conversion and migration backup; empty V4.x audits remain byte-equivalent on open. See `UTILITY_ANALYSIS.md`.

V5.1 also adds optional canonical `endUseModels[]` for auditor-entered end-use estimates. Stable UUID relationships may reference systems, equipment, and baseline calculations. Every model records utility/category, annual native-unit energy, provenance, evidence, maturity, basis, assumptions, hierarchy role, source versions, and status. Automatically assembled end uses and reconciliation results are derived and are not persisted over canonical source data. See `END_USE_RECONCILIATION.md`.

V5.2 adds optional `ecmPortfolios[]` and optional ECM `recommendationStatus`, `optionGroupId`, and `parentEcmId`. Portfolio records contain stable ECM membership, sequence, interactions, explicit cost adjustments, standalone/adjusted summaries, trace, evidence/maturity, status, QA, timestamps, and a source fingerprint. Derived `portfolioAnalysis` never replaces standalone calculations. See `ECM_PORTFOLIO_INTERACTIONS.md`.

V5.3 adds optional `weatherDatasets[]`, `manufacturerPerformanceDatasets[]`, and `rcxContainers[]`. Weather records retain stable ID, source/station/location/period/provenance and explicit bins. Performance records retain stable ID, manufacturer/model/source document/date, metric/unit, and conditioned points. RCx records are containers referencing explicit calculation UUIDs; generic savings percentages are invalid. All additions are optional and require no audit migration.

## Workflow additions

- `equipmentGroups[]`: `groupId`, name, stable `equipmentRecordIds[]`, optional explicit `sampling` (`populationSize`, `sampleSize`, sampled UUIDs, confirmation timestamp, Estimated provenance, evidence level C), and creation timestamp.
- ECM optional `analysisRecipe`: recipe version and approved `methodIds[]`; recipes never contain fabricated input values.
- ECM optional `equipmentGroupId`: stable group relationship. The ECM retains its individual stable equipment UUIDs as well.
- Calculation input definitions expose `timing`: `FIELD_REQUIRED`, `ANALYSIS_REQUIRED`, or `RECOMMENDED`.
- Export adds derived `engineeringAnalysis[]` readiness. This is recomputed from current audit evidence and does not replace canonical audit records.

Auto-binding candidates retain provenance, evidence level, source kind, source UUID/field/version, and description. Calculations still save exact immutable input snapshots; source records themselves are not mutated or consumed.

## Canonical calculation object

Each `calculations[]` record contains:

- `calculationId`, stable within the audit;
- `methodId` and `methodVersion`;
- `status`: `Calculated`, `Needs Recalculation`, or `METHOD_REQUIRES_VALIDATION`;
- `formulaDescription`;
- `inputs[]`: parameter ID/name, exact value used, unit, provenance, evidence level, source/assumption description, rationale, optional source kind/record/field and source fingerprint;
- `outputs[]`: parameter ID/name, numeric value, and unit;
- `evidenceLevel` (A–D) and `maturity` (`SCREENING`, `ENGINEERING_ESTIMATE`, or `HIGH_CONFIDENCE_ESTIMATE`);
- `assumptions[]`, `warnings[]`, and deterministic `qaFlags[]`;
- `ecmId`, `systemRecordIds[]`, `equipmentRecordIds[]`, `dependencyCalculationIds[]`, and `sourceReferences[]` using stable relationships;
- `baselineDefinition`, `proposedDefinition`, `affectedOperation`, `affectedEndUse`, `baselineEnergyStream`, `componentRole`, and `interactionCategory`;
- `revisionHistory[]`, retaining prior input/output/result snapshots when a calculated record is recalculated;
- `calculatedAt`, `updatedAt`, and optional `staleAt`.

An ECM may contain `calculationIds[]`. Editing an ECM preserves this and all unrelated fields. Equipment or ECM deletion is blocked while calculations reference it. Export includes calculation records unchanged. Calculations store input snapshots for reproducibility while source fingerprints detect changed or missing sources.

## Export container

The professional package has independent `packageFormatVersion: 5`; this does not change audit schema 4. Canonical JSON preserves advanced multidimensional datasets without flattening them. The manifest adds weather, manufacturer-performance, and RCx counts. The stored audit is not changed.

## Compatibility

V3.3 audits lacking `calculations[]` normalize to an empty array. This is additive and does not invent evidence or calculations. Existing migration backups, photo Blobs, and unresolved legacy ECM equipment references remain unchanged.
