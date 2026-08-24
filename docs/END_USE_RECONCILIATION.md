# Audist V5.1 End-Use and Whole-Building Reconciliation

V5.1 compares explicit, traceable end-use models with complete purchased-energy baselines. It is a QA and modeling layer, not an allocation engine. Audist never forces end uses to equal utility bills, distributes a residual, or turns ECM savings into baseline consumption.

## Canonical model

Optional `endUseModels[]` contains auditor-entered models. Each record has a stable `endUseModelId`; `origin: MANUAL`; utility type, category and optional subcategory; annual energy and native unit; optional annual cost; provenance; evidence level A–D; maturity; basis/method; explicit assumptions and warnings; status; aggregation role (`LEAF` or `ROLLUP`); optional parent category; stable system, equipment, and calculation UUID relationships; source-version fingerprints; and reserved `monthlyValues[]`.

Automatic models are derived at analysis/export time from calculated records with one of the explicit baseline outputs `annualEnergyKwh`, `baselineElectricKwh`, or `baselineFuelInputBtu`. `annualKwhSavings`, fuel savings, cost savings, and other ECM outputs are never accepted as baseline energy. Automatic models retain calculation, ECM, system, and equipment relationships. An explicit manual model that claims a calculation suppresses that calculation's automatic model to prevent duplicate membership.

Only current leaf models are aggregated. Rollups remain visible but are excluded from totals. Electricity remains in kWh/yr; natural gas and other fuel remain in therms/yr. Cross-fuel conversion or source-energy aggregation is not performed.

## Provenance and evidence

Manual estimates require a category, nonnegative annual energy, basis/method, and at least one explicit assumption. Supported provenance labels are Measured, BAS / Trend, Calculated, Estimated, and Assumed. Evidence levels use the existing A–D hierarchy and maturity is explicit. Large Level C/D end uses are flagged; estimates remain permissible and visible.

## Reconciliation

Reconciliation is available only when every account for the utility type forms a complete annual baseline. For each utility type:

- `difference = modeled end-use energy - utility baseline energy`
- `residual = utility baseline energy - modeled end-use energy`
- `reconciliationPercent = difference / utility baseline energy × 100`
- `absoluteGapPercent = abs(reconciliationPercent)`

Default centralized thresholds are Close at no more than 10%, Review at no more than 20%, and Material Gap above 20%. Thresholds can be supplied to the pure analysis method. Zero or incomplete utility baselines produce an unavailable reconciliation, never division by zero or implied annualization. Residuals remain explicit and are not assigned to “Other.”

## QA and coverage

V5.1 reports modeled energy above the utility baseline, material residuals, duplicate calculation or equipment membership, stale/missing sources, unit conflicts, large weak-evidence end uses, present major systems without models, and ECM savings above the relevant modeled end-use baseline. The ECM comparison is diagnostic only and does not modify calculations or modeled energy.

System coverage is limited to systems explicitly marked Present. A Not Applicable system is not treated as a gap. Categories currently map to the established Audist system families; unmapped systems remain visible without a fabricated category.

## Persistence, compatibility, and export

Manual records save immediately through the existing serialized IndexedDB audit save path and roll back in memory on a failed initial save. Equipment and calculation deletion is blocked while a manual end-use model references the record. Source calculation changes make linked manual models stale through stored source fingerprints.

V5.1 retains audit schema 4 and IndexedDB database version 3. Existing V5.0 audits need no migration and are not modified merely by opening them. The professional package advances independently to format 3, adds `tables/end_uses.csv`, a complete derived `endUseAnalysis` in the exported audit copy, and a concise manifest reconciliation summary. Export remains read-only and offline.

## Limitations

V5.1 does not provide percentage disaggregation, weather regression, hourly simulation, EnergyPlus, inferred schedules, automatic residual allocation, automatic system interactions, or automatic correction. `monthlyValues[]` is reserved for later interval/monthly evidence and is not calculated. End-use estimates remain only as defensible as their entered evidence and assumptions.
## V6.3 workflow note

End-use modeling and reconciliation remain Analysis Mode work. V6.3 does not change aggregation, native-unit handling, utility completeness, reconciliation, or ECM scale rules, and it does not require this desk analysis before leaving the site.
