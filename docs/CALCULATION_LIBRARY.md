# Calculation Library — V4.2

The governing source is `ENGINEERING_CALCULATION_LIBRARY_CA.md` V1.1. `calculations.js` is the executable offline registry; it may implement only a method and status authorized by that library.

V4.2 adds workflow metadata, not formulas. Every input is classified by collection timing. Deterministic auto-binding considers only associated equipment/group records, utility/ECM values, or approved upstream calculation outputs; preserves provenance and stable source references; surfaces conflicts; and requires explicit selection for equal-priority conflicting evidence. Proposed conditions remain explicit user inputs.

## Implemented `READY-V1` inventory (25)

- General/electrical: `CALC-GEN-001`, `CALC-ELEC-001`, `CALC-ELEC-002`.
- Lighting/HVAC/fans: `CALC-LTG-001`, `CALC-LTG-002`, `CALC-HVAC-001`, `CALC-FAN-001`, `CALC-FAN-002`.
- Pumps/water/chiller/air: `CALC-PUMP-001`, `CALC-PUMP-002`, `CALC-WTR-001`, `CALC-CHW-001`, `CALC-AIR-001`, `CALC-AIR-002`.
- Thermal/end use: `CALC-BLR-001`, `CALC-DHW-001`, `CALC-DHW-002`, `CALC-REF-001`, `CALC-CA-001`, `CALC-ENV-001`.
- Utility/finance: `CALC-UTIL-001`, `CALC-UTIL-002`, `CALC-UTIL-003`, `CALC-FIN-001`, `CALC-FIN-002`.

Each method has explicit applicability, formula, required/optional inputs, canonical units, output units, evidence policy, warnings, QA rules, and deterministic test cases. No implicit unit conversion, default efficiency, tariff, schedule, COP, weather profile, cost, or savings factor is used.

## `VALIDATE-V2` registry/readiness inventory (11)

`CALC-HVAC-002`, `CALC-HVAC-003`, `CALC-CTRL-001`, `CALC-CHW-002`, `CALC-REF-002`, `CALC-REF-003`, `CALC-FOOD-001`, `CALC-KV-001`, `CALC-PLUG-001`, `CALC-RCX-001`, and `CALC-FIN-003` are recognized but not numerically implemented. They expose applicable systems, required/recommended evidence, warnings, and readiness. Running one returns `METHOD_REQUIRES_VALIDATION` with no output and cannot be presented as savings.

## Components, dependencies, and interactions

An ECM may contain multiple calculation components. Each component records the exact baseline and proposed condition, affected operation, end use, baseline energy stream, role, interaction category, stable equipment links, and upstream calculation IDs. Linked output fingerprints include upstream version/update state. A stale or missing upstream result propagates `Needs Recalculation` through the chain.

Direct savings, thermal interactions, demand effects, and economics remain separate components. The engine flags calculations on the same equipment/end-use/energy-stream across ECMs as potential overlap; it does not silently net or remove them. Recalculation saves prior calculated inputs and outputs in `revisionHistory[]`.

## Maturity and evidence

Every material input requires unit, provenance, evidence level, and a source/assumption description. Estimated or assumed inputs require rationale. Level D/assumed evidence caps maturity at `SCREENING`; direct evidence alone does not automatically imply high confidence. `VALIDATE-V2` entries with no evidence are `NOT_ASSESSED`.

## Validation

Run `npm test` in the application directory. The calculation suite exercises all 25 methods, known reference results, missing inputs, unit mismatch, provenance omission, domain constraints, immutable snapshots, overlap QA, dependency fingerprints, and the no-calculation contract for every validation-only entry.
