# Audist — V4.0 Phase 1

Offline-first iPhone energy-auditing PWA supporting structured field evidence and deterministic, inspectable engineering calculations.

## V4.0 calculation release

V4 adds a pure, versioned calculation registry for ten approved methods: `CALC-GEN-001`, `CALC-ELEC-001`, `CALC-ELEC-002`, `CALC-LTG-001`, `CALC-LTG-002`, `CALC-HVAC-001`, `CALC-FAN-001`, `CALC-FAN-002`, `CALC-UTIL-001`, and `CALC-FIN-001`.

Every saved calculation contains the method/version, formula, exact input snapshot, units, provenance, evidence level, source references, assumptions, warnings, QA flags, outputs, maturity, ECM UUID, and stable equipment UUIDs. Source changes mark the result **Needs Recalculation**. Equipment display-ID renames do not break relationships.

No deemed/default value is silently supplied. An auditor may explicitly enter an estimate or assumption, but it remains visible, produces QA review information, and Level D/default evidence cannot exceed `SCREENING` maturity.

## Storage and migration

V4 keeps audit schema version 4 and IndexedDB database version 3. Existing complete V3.3 audits open without structural migration or field-data rewriting; `calculations[]` is initialized only when absent. Existing audit, equipment, measurement, photo, ECM, migration-backup, and unresolved-reference safeguards remain in force. The DB-v3 rollback bridge remains compatible.

## Offline behavior and export

`calculations.js` is in the service-worker precache. Calculation execution requires no network, API, paid dependency, AI, or backend. JSON export includes complete reproducible calculation objects and reports stale/orphaned calculation relationships as integrity warnings. Photo Blobs remain outside the JSON export.

## Test

Run `npm test`. The suite includes deterministic numerical and validation coverage for all ten methods plus prior IndexedDB, autosave, photo, migration, relationship, rollback, and offline reliability tests.

## iPhone release-candidate procedure

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

- V4.0 implements only the ten approved Phase 1 methods; pump, water-side, chiller, boiler/DHW, compressed-air, and envelope calculations remain future work.
- Fan affinity-law results are capped below high-confidence maturity and require applicability review.
- Results do not include HVAC interactive effects, billing demand, automatic incentives/costs, or report generation.
- Legacy embedded photos remain readable but JSON export does not package IndexedDB photo Blobs.

Do not merge this feature branch to `main` until review and iPhone testing are complete.

