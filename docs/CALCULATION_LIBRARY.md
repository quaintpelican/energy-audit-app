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

