# Audist — Calculation Library

## Purpose
Define transparent, reproducible engineering methods used by ECMs. This file is intentionally conservative: methods should be added only when equations, units, assumptions, applicability, and limitations are defined well enough for professional review.

## Calculation method standard
Every approved method should include:
- Method ID
- Version
- Purpose
- Applicability
- Required inputs and units
- Optional inputs
- Formula/method
- Outputs and units
- Assumptions
- Limitations/warnings
- Source/provenance requirements
- ECM templates using the method
- Test cases

Calculated outputs should reference their inputs and preserve `methodId` and `methodVersion`.

---

## CALC-LTG-001 — Lighting Retrofit Energy Savings
**Status:** initial method definition.

Inputs:
- existing fixture watts, W
- proposed fixture watts, W
- fixture quantity
- annual operating hours, hr/yr

Method:
```text
Existing kW = Existing W × Quantity / 1000
Proposed kW = Proposed W × Quantity / 1000
Demand Reduction kW = Existing kW - Proposed kW
Annual kWh Savings = Demand Reduction kW × Annual Operating Hours
```

Outputs:
- existing connected kW
- proposed connected kW
- demand reduction kW
- annual kWh savings

Warnings:
- Do not assume proposed wattage without a documented proposed fixture.
- HVAC interactive effects are not included unless separately calculated.
- Demand-bill savings require tariff/demand coincidence analysis.

---

## CALC-FIN-001 — Simple Payback
Inputs:
- net implementation cost, $
- annual cost savings, $/yr

Method:
```text
Simple Payback (yr) = Net Implementation Cost / Annual Cost Savings
```

Warnings:
- Undefined when annual savings ≤ 0.
- Does not account for financing, escalation, discount rate, maintenance timing, or measure life.

---

## Planned methods requiring engineering definition
- CALC-FAN-001 Fan power / VFD affinity-law savings
- CALC-PUMP-001 Pump power / affinity-law savings
- CALC-SCH-001 HVAC schedule reduction
- CALC-ECO-001 Economizer savings
- CALC-HVAC-001 Cooling efficiency upgrade
- CALC-HTG-001 Heating efficiency upgrade
- CALC-DHW-001 Useful DHW load
- CALC-DHW-002 DHW efficiency/fuel-switch savings
- CALC-ENV-001 Envelope conductive heat transfer
- CALC-UTIL-001 Blended utility-rate analysis
- CALC-FIN-002 NPV
- CALC-FIN-003 lifecycle savings

## AI boundary
AI may select, explain, review, and QA an approved method. It must not silently substitute an undocumented formula or invent missing inputs.



---

# Calculation Library — V4.0 Phase 1

The governing engineering policy and full validated library are in `ENGINEERING_CALCULATION_LIBRARY_CA.md` (California V1.1). The application follows its no-deemed-savings policy: no site input, savings percentage, runtime, load factor, cost, or performance value is supplied silently. Explicit estimates/assumptions retain their evidence and rationale; material Level D/default inputs cap maturity at `SCREENING`.

## Implemented and automated-test validated

- `CALC-GEN-001`: `kWh = kW × hr`; savings `(baseline kW − proposed kW) × hr`.
- `CALC-ELEC-001`: single-phase `kW = V × A × PF / 1000`.
- `CALC-ELEC-002`: balanced three-phase `kW = √3 × V × A × PF / 1000`.
- `CALC-LTG-001`: explicit existing/proposed fixture watts × quantity and annual hours.
- `CALC-LTG-002`: controlled lighting kW × avoided annual hours; no generic control factor.
- `CALC-HVAC-001`: affected operating kW × avoided annual hours.
- `CALC-FAN-001`: measured fan kW × annual hours.
- `CALC-FAN-002`: bin-based affinity-law screening `P2=P1(N2/N1)^3`; never high-confidence by method alone.
- `CALC-UTIL-001`: annual kWh savings × explicit applicable/blended energy rate.
- `CALC-FIN-001`: net implementation cost / positive annual cost savings.

Each registry definition declares ID/version, applicability, inputs, units, formula, outputs, warnings, evidence requirements, V1.1 source basis, and numerical-test reference.

## Validated in the governing library but not implemented

Other READY-V1 methods documented in the governing library remain reference material only. Their presence in documentation does not make them executable in V4.0.

## Future

Pump, water-side, chiller, boiler/DHW, compressed-air, envelope, HVAC interactive-effect, tariff-demand, incentive, lifecycle, and report calculations are out of scope for Phase 1. They require separate validation and release review before implementation.

