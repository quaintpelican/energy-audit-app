# Audist — V6.0 Deterministic Audit QA/QC

Offline-first iPhone energy-auditing PWA supporting structured field evidence and deterministic, inspectable engineering calculations.

V6.0 adds a local, deterministic whole-audit QA/QC engine without changing the V5.3 calculation boundary. Versioned rules identify data-integrity, field, measurement, photo, utility, calculation, provenance, end-use, ECM, portfolio, economics, export, and report-readiness issues without inventing or silently correcting engineering data.

Analysis Mode now groups findings by severity/category, exposes evidence and recommended action, supports explicit engineer review or accepted-limitations notes, and reports whole-audit readiness. Field Exit Review receives only onsite-relevant blocker/high findings.

## Portable audit package

**Export Audit Package** creates a complete ZIP locally and offline. `audit.json` is canonical; UTF-8 CSV tables and normal image files are interoperable representations of the same evidence. `manifest.json` records package format version 5, including weather, manufacturer-performance, and RCx counts. A referenced photo that cannot be packaged is always `FAIL`.

The export is read-only. Current IndexedDB photo Blobs are processed sequentially without base64 conversion; legacy embedded data URLs remain exportable. The package uses sanitized human-readable paths while stable UUIDs remain authoritative. iPhone Web Share is used when file sharing is supported, with a standard download fallback.

## V4.2 workflow baseline

V4.2 separates fast onsite collection from office analysis without creating a second copy of audit data. Field Mode retains facility, systems, equipment, measurements, photos, ECM capture, and a Before Leaving Site review. Analysis Mode provides a deterministic ECM queue, method recipes, source auto-binding, proposed-condition entry, utility-rate entry, and readiness states. A value is collected once, referenced by stable UUID/source metadata, and snapshotted only when a calculation is saved.

Inputs are classified as `FIELD_REQUIRED`, `ANALYSIS_REQUIRED`, or `RECOMMENDED`. Missing office-only values do not make field documentation incomplete. Conflicting equal-priority evidence requires an explicit selection; no hidden default or silent overwrite is used. Explicit equipment groups and auditor-confirmed representative samples retain membership, sample size, population size, and downgraded Estimated/Level C provenance.

## V4.1 calculation baseline

The registry now contains 29 implemented methods and seven validation-only entries. V5.3 adds `CALC-HVAC-002`, `CALC-CHW-002`, `CALC-REF-003`, and `CALC-PLUG-001`; every remaining validation-only entry returns `METHOD_REQUIRES_VALIDATION` and never generates savings.

Every saved calculation contains the method/version, formula, exact input snapshot, units, provenance, evidence level, source references, assumptions, warnings, QA flags, outputs, maturity, explicit baseline/proposed/operation/end-use/energy-stream boundaries, ECM UUID, stable equipment UUIDs, dependencies, and prior revisions. Source changes propagate **Needs Recalculation** through dependency chains. Equipment display-ID renames do not break relationships.

No deemed/default value is silently supplied. An auditor may explicitly enter an estimate or assumption, but it remains visible, produces QA review information, and Level D/default evidence cannot exceed `SCREENING` maturity.

## V5.2 portfolio model

Analysis Mode supports multiple explicitly selected portfolios. Audist screens shared equipment, systems, end uses, streams, calculation sources, parent/child measures, and alternatives. It adjusts savings only when an engineer confirms `SEQUENTIAL_REMAINING_BASELINE`, supplies a shared baseline, and defines sequence. Standalone results remain unchanged and visible beside adjusted results. Negative baselines and mutually exclusive selections invalidate the combined result.

## V5.1 reconciliation model

Manual end-use models require a site-specific basis and explicit assumption, retain provenance/evidence/maturity, link through stable UUIDs, save immediately, and roll back on failed persistence. Calculated baseline outputs may create automatic models; savings outputs are explicitly excluded. Only current leaf records aggregate, utility types stay in native units, and incomplete utility years do not produce reconciliation.

Analysis Mode shows modeled energy, utility baseline, unassigned residual, signed/absolute gap, evidence-colored end uses, major-system coverage, stale/duplicate/weak-evidence QA, and ECM savings scale flags. See `docs/END_USE_RECONCILIATION.md` for exact formulas and limitations.

## Storage and migration

V6.0 keeps audit schema version 4 and IndexedDB database version 3. Optional QA declarations and finding dispositions are additive; existing audits require no migration or rewrite. Professional package format 6 adds `auditQa`, a manifest QA summary, and `tables/qa_findings.csv` while keeping package integrity independent.

## Offline behavior and export

`calculations.js` is in the service-worker precache. Calculation execution requires no network, API, paid dependency, AI, or backend. JSON export includes complete reproducible calculation objects and reports stale/orphaned calculation relationships as integrity warnings. Photo Blobs remain outside the JSON export.

## Test

Run `npm test`. The suite includes hand-verifiable reconciliation, hierarchy/no-double-counting, native-fuel separation, baseline-vs-savings assembly, stale/duplicate/coverage/evidence/ECM QA, manual persistence/rollback, package export, workflow, calculations, IndexedDB, photos, migration, and reliability coverage.

## iPhone release-candidate procedure

1. Open the V5.3 HTTPS preview in Safari, refresh once online, then add it to the Home Screen.
2. Create/open a test audit containing two systems, two equipment records, measurements, a utility month, an ECM, and a saved calculation.
3. Capture an Overview and Nameplate photo, background the app immediately, relaunch, and confirm both photos remain visible.
4. Turn on Airplane Mode, fully close the Home Screen app, relaunch, and choose **Export Audit Package**.
5. Confirm progress advances through validation, photos, ZIP building, and verification. Confirm the result counts match the audit and integrity is `PASS` (or shows every intentional warning).
6. Tap **Save / Share Package**, save to Files, and confirm the filename ends `_Audist.zip`.
7. In Analysis Mode, add a manual Lighting estimate with a basis, assumption, evidence level, and stable system/equipment links. Background and relaunch; verify it persists.
8. Confirm modeled electricity, utility baseline, residual, signed/absolute gap, coverage, and QA are understandable. Deliberately model more than the baseline and confirm Audist flags it without changing the entered value.
9. Create a Recommended Portfolio with two overlapping ECMs. Confirm the interaction, enter the shared baseline, and set sequence. Verify standalone and adjusted values remain separately visible.
10. Open/extract the ZIP in Files or on a desktop. Confirm `audit.json`, `manifest.json`, all ten files under `tables/` including `qa_findings.csv`, and every expected image under `photos/` open normally.
11. Verify `manifest.json` reports `packageFormatVersion: 5`, matching portfolio, weather, manufacturer-performance, RCx, and photo counts.
12. Verify a CSV containing commas/notes opens with intact columns and that `audit.json` retains UUIDs, provenance, end-use sources, portfolio inclusion/sequence/interactions, standalone and adjusted results, assumptions, QA flags, and photo package paths.
13. Return to Audist and confirm the audit, calculations, portfolios, estimates, and photos are unchanged. Delete one test photo Blob only in a disposable browser test environment, export again, and confirm integrity is `FAIL`, never a warning/pass.

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

- Economizer, BAS/control reset, floating-head, DCKV composite thermal, RCx aggregation, and selected HVAC interactive-effect methods remain validation/readiness frameworks and do not calculate savings.
- The V5.3 application accepts weather/performance evidence in canonical JSON and calculation series inputs; dedicated dataset import/edit screens remain future work.
- Fan and pump affinity-law results remain screening/engineering estimates and require applicability review.
- Interactive effects are separate components; the app flags likely overlap but does not automatically net competing ECMs.
- Reconciliation does not weather-normalize, infer percentage disaggregation, allocate residuals, or perform hourly simulation.
- No tariffs, incentives, escalation rates, equipment performance, or other engineering assumptions are supplied automatically.
- Legacy embedded photos remain readable but JSON export does not package IndexedDB photo Blobs.

Do not merge this feature branch to `main` until review and iPhone testing are complete.
