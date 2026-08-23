# Audist Data Schema — V4.1

V4 retains audit schema `4` and IndexedDB database version `3`. The canonical audit continues to include `systems[]`, `equipment[]`, `ecms[]`, and `calculations[]`. No V3.3 field data is rewritten to enable calculations.

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

## Compatibility

V3.3 audits lacking `calculations[]` normalize to an empty array. This is additive and does not invent evidence or calculations. Existing migration backups, photo Blobs, and unresolved legacy ECM equipment references remain unchanged.

