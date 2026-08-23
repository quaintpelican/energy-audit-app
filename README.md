# Audist — V5.1 End-Use & Whole-Building Reconciliation

Offline-first iPhone energy-auditing PWA supporting structured field evidence and deterministic, inspectable engineering calculations.

V5.1 adds traceable end-use models, conservative assembly from explicit baseline calculations, whole-building reconciliation, residual and evidence QA, system coverage, and package-format-3 export while preserving the V5.0 utility baseline. It never converts ECM savings into baseline consumption or forces modeled energy to match bills. See `docs/END_USE_RECONCILIATION.md`.

## Portable audit package

**Export Audit Package** creates a complete ZIP locally and offline. `audit.json` is canonical; UTF-8 CSV tables and normal image files are interoperable representations of the same evidence. `manifest.json` records package format version 3, record/photo/utility/end-use counts, summarized utility and reconciliation analysis, warnings, errors, and integrity status. A referenced photo that cannot be packaged is always `FAIL`.

The export is read-only. Current IndexedDB photo Blobs are processed sequentially without base64 conversion; legacy embedded data URLs remain exportable. The package uses sanitized human-readable paths while stable UUIDs remain authoritative. iPhone Web Share is used when file sharing is supported, with a standard download fallback.

## V4.2 workflow baseline

V4.2 separates fast onsite collection from office analysis without creating a second copy of audit data. Field Mode retains facility, systems, equipment, measurements, photos, ECM capture, and a Before Leaving Site review. Analysis Mode provides a deterministic ECM queue, method recipes, source auto-binding, proposed-condition entry, utility-rate entry, and readiness states. A value is collected once, referenced by stable UUID/source metadata, and snapshotted only when a calculation is saved.

Inputs are classified as `FIELD_REQUIRED`, `ANALYSIS_REQUIRED`, or `RECOMMENDED`. Missing office-only values do not make field documentation incomplete. Conflicting equal-priority evidence requires an explicit selection; no hidden default or silent overwrite is used. Explicit equipment groups and auditor-confirmed representative samples retain membership, sample size, population size, and downgraded Estimated/Level C provenance.

## V4.1 calculation baseline

V4.1 implements all 25 `READY-V1` methods in the governing California V1.1 library. The registry covers general/electrical, lighting, HVAC schedule, fan and pump, water/chiller/air-side loads, boiler/DHW, refrigeration, compressed air, envelope, energy/TOU/demand cost, simple payback, and NPV. Eleven `VALIDATE-V2` entries are visible for field-readiness collection but always return `METHOD_REQUIRES_VALIDATION` and never generate savings.

Every saved calculation contains the method/version, formula, exact input snapshot, units, provenance, evidence level, source references, assumptions, warnings, QA flags, outputs, maturity, explicit baseline/proposed/operation/end-use/energy-stream boundaries, ECM UUID, stable equipment UUIDs, dependencies, and prior revisions. Source changes propagate **Needs Recalculation** through dependency chains. Equipment display-ID renames do not break relationships.

No deemed/default value is silently supplied. An auditor may explicitly enter an estimate or assumption, but it remains visible, produces QA review information, and Level D/default evidence cannot exceed `SCREENING` maturity.

## V5.1 reconciliation model

Manual end-use models require a site-specific basis and explicit assumption, retain provenance/evidence/maturity, link through stable UUIDs, save immediately, and roll back on failed persistence. Calculated baseline outputs may create automatic models; savings outputs are explicitly excluded. Only current leaf records aggregate, utility types stay in native units, and incomplete utility years do not produce reconciliation.

Analysis Mode shows modeled energy, utility baseline, unassigned residual, signed/absolute gap, evidence-colored end uses, major-system coverage, stale/duplicate/weak-evidence QA, and ECM savings scale flags. See `docs/END_USE_RECONCILIATION.md` for exact formulas and limitations.

## Storage and migration

V5.1 keeps audit schema version 4 and IndexedDB database version 3. `endUseModels[]` is additive and optional, so existing V5.0 audits require no migration and are not rewritten merely by opening them. Existing evidence, utility, migration-backup, unresolved-reference, and DB-v3 rollback protections remain in force.

## Offline behavior and export

`calculations.js` is in the service-worker precache. Calculation execution requires no network, API, paid dependency, AI, or backend. JSON export includes complete reproducible calculation objects and reports stale/orphaned calculation relationships as integrity warnings. Photo Blobs remain outside the JSON export.

## Test

Run `npm test`. The suite includes hand-verifiable reconciliation, hierarchy/no-double-counting, native-fuel separation, baseline-vs-savings assembly, stale/duplicate/coverage/evidence/ECM QA, manual persistence/rollback, package export, workflow, calculations, IndexedDB, photos, migration, and reliability coverage.

## iPhone release-candidate procedure

1. Open the V5.1 HTTPS preview in Safari, refresh once online, then add it to the Home Screen.
2. Create/open a test audit containing two systems, two equipment records, measurements, a utility month, an ECM, and a saved calculation.
3. Capture an Overview and Nameplate photo, background the app immediately, relaunch, and confirm both photos remain visible.
4. Turn on Airplane Mode, fully close the Home Screen app, relaunch, and choose **Export Audit Package**.
5. Confirm progress advances through validation, photos, ZIP building, and verification. Confirm the result counts match the audit and integrity is `PASS` (or shows every intentional warning).
6. Tap **Save / Share Package**, save to Files, and confirm the filename ends `_Audist.zip`.
7. In Analysis Mode, add a manual Lighting estimate with a basis, assumption, evidence level, and stable system/equipment links. Background and relaunch; verify it persists.
8. Confirm modeled electricity, utility baseline, residual, signed/absolute gap, coverage, and QA are understandable. Deliberately model more than the baseline and confirm Audist flags it without changing the entered value.
9. Open/extract the ZIP in Files or on a desktop. Confirm `audit.json`, `manifest.json`, all seven files under `tables/` including `end_uses.csv`, and every expected image under `photos/` open normally.
10. Verify `manifest.json` reports `packageFormatVersion: 3`, matching utility/end-use/photo counts, utility and reconciliation summaries, and `photosReferenced == photosExported`.
11. Verify a CSV containing commas/notes opens with intact columns and that `audit.json` retains UUIDs, provenance, end-use sources, reconciliation residuals, readiness, calculations, dependencies, assumptions, QA flags, and photo package paths.
12. Return to Audist and confirm the audit, calculations, estimates, and photos are unchanged. Delete one test photo Blob only in a disposable browser test environment, export again, and confirm integrity is `FAIL`, never a warning/pass.

### Existing calculation and migration regression

1. Install/open the V4 branch preview in Safari, refresh once online, then add it to the Home Screen.
2. Open an existing V3.3 audit and verify its systems, equipment, measurements, photos, ECM links, unresolved references, and migration warning/export remain unchanged.
3. Create a lighting ECM linked to lighting equipment. Add `CALC-LTG-001`; enter 80 W existing, 30 W proposed, quantity 100, and 3,000 hr/yr with explicit provenance/evidence. Confirm 8.0 kW baseline, 3.0 kW proposed, 5.0 kW reduction, and 15,000 kWh/yr savings.
4. Add `CALC-UTIL-001`, select the saved energy result as its source, add an explicit utility rate, and confirm cost savings. Add `CALC-FIN-001` using that saved cost result and an explicit implementation cost.
5. Expand each calculation and verify method/version, formula, units, provenance, evidence, maturity, assumptions, warnings, QA flags, outputs, and sources are readable.
6. Change the linked lighting quantity or source measurement. Reopen the ECM and confirm the old result says **Needs Recalculation** and is not presented as current. Recalculate and verify the result changes.
7. Rename the equipment display ID and confirm the ECM and calculations stay linked. Attempt to delete the equipment and confirm deletion is blocked.
8. Add a deliberate Assumed/Level D runtime with rationale and confirm maturity is `SCREENING` with a visible warning.
9. Export JSON and confirm `calculations[]` contains complete reproducible input/output/source/QA records and stable UUID relationships.
10. Turn on Airplane Mode, fully close the Home Screen app, relaunch it, inspect calculations, create/recalculate a calculation, background immediately, relaunch, and confirm it persisted.

## Known limitations

- `VALIDATE-V2` methods collect readiness information only; their methodologies remain future engineering validation work.
- Fan and pump affinity-law results remain screening/engineering estimates and require applicability review.
- Interactive effects are separate components; the app flags likely overlap but does not automatically net competing ECMs.
- Reconciliation does not weather-normalize, infer percentage disaggregation, allocate residuals, or perform hourly simulation.
- No tariffs, incentives, escalation rates, equipment performance, or other engineering assumptions are supplied automatically.
- Legacy embedded photos remain readable but JSON export does not package IndexedDB photo Blobs.

Do not merge this feature branch to `main` until review and iPhone testing are complete.
