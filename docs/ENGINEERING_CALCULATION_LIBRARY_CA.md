# Audist Engineering Calculation Library — California Base V1.1

## Purpose
This library defines transparent, reproducible engineering calculation methods for Audist. It supports ASHRAE Level 2 audits without hidden AI estimates.

**Core rule:** structured inputs → explicit method → reproducible result → provenance → QA/QC.

AI may select, explain, and QA an approved method, but should not silently substitute an undocumented formula or invent missing inputs.


## V1.1 Engineering Evidence Policy

### No deemed savings by default
Audist must not use deemed savings percentages, deemed operating hours, deemed load factors, or other reference/default values as final site-specific savings inputs unless the auditor explicitly selects and documents them as assumptions. California eTRM values may inform measure applicability, parameter selection, reasonableness checks, and screening, but they do not determine the site-specific engineering result.

### Calculation basis
The preferred chain is:

**physics / engineering method + site-specific inputs + documented provenance + published methodological validation = Audist engineering result**

Published references validate methodology; they do not silently supply missing site conditions.

### Evidence levels
- **Level A — Measurement-based:** critical inputs are measured, trended, utility-derived, or otherwise directly supported at the site.
- **Level B — Site-specific engineering model:** site-specific measured/documented inputs are combined with an explicit engineering model.
- **Level C — Site-specific estimate:** one or more material inputs are estimated from interviews, schedules, drawings, limited observations, or documented engineering judgment.
- **Level D — Screening/default/deemed:** material inputs rely on generic, deemed, or reference assumptions. Suitable for screening unless subsequently supported by site-specific evidence.

### Calculation maturity
Each ECM calculation should carry one of these statuses:
- **SCREENING:** useful for deciding whether further investigation is warranted; may rely materially on Level D evidence.
- **ENGINEERING_ESTIMATE:** sufficiently site-specific for a defensible Level 2 estimate, with assumptions and limitations visible.
- **HIGH_CONFIDENCE_ESTIMATE:** critical inputs are predominantly Level A/B and representative operating conditions are supported by measurements, trends, utility data, or equivalent evidence.

These statuses describe evidence quality; they are not guarantees of realized savings.

### Required source metadata for inputs
Where practical, every calculation input should preserve:
- value and unit
- provenance
- evidence level
- source type
- source description
- timestamp / applicable period
- instrument or method when measured
- assumption rationale when estimated/assumed

### Deemed/default assumption warning
If a Level D or deemed/default value materially affects savings, Audist should display a warning such as:

> Savings depend on a deemed/default assumption. Collect site-specific evidence before finalizing this ECM where practical.

The export must preserve the assumption and its source.

### Calculation readiness
ECM completeness should eventually distinguish between:
1. enough data for screening;
2. enough data for an engineering estimate; and
3. additional evidence needed for a high-confidence estimate.

Missing higher-quality evidence should not erase a valid lower-confidence calculation, but the resulting evidence level and limitations must remain visible.

### California eTRM role
California eTRM is a **reference and cross-check source**, not the default source of Audist site-specific savings. Appropriate uses include:
- identifying recognized measure configurations;
- understanding variables that affect savings;
- reviewing baseline/measure distinctions;
- California applicability and program context;
- reasonableness checks;
- identifying additional data that should be collected.

Audist should not automatically import eTRM deemed savings, hours, load factors, realization rates, or similar assumptions into a final Level 2 calculation.

## Reference hierarchy
1. First-principles engineering relationships and site-specific engineering models.
2. DOE/NREL Uniform Methods Project (UMP).
3. DOE MEASUR and DOE system sourcebooks.
4. California eTRM / Cal TF for California-specific measure structure and assumptions.
5. California Energy Commission standards/compliance guidance.
6. NIST Handbook 135 / BLCC for lifecycle economics.
7. Manufacturer performance data.
8. Documented engineering estimates.

Do not copy a deemed savings value into a custom Level 2 audit as a final site-specific result. If a deemed/default value is deliberately used for screening, classify it as Level D, preserve its source, and show the assumption explicitly.

## Method status
- **READY-V1** — sufficiently defined for initial implementation and testing.
- **VALIDATE-V2** — method direction is sound but needs additional validation before coding.
- **FRAMEWORK** — future system model / advanced analysis.

## Calculation record
Each calculation should preserve:
- calculationId
- methodId
- methodVersion
- ecmId
- equipmentRecordIds[]
- inputs[] with values, units, and provenance
- formulaDescription
- outputs[]
- assumptions[]
- warnings[]
- confidence
- sourceReferences[]
- evidenceLevel
- calculationMaturity
- calculatedAt

### Provenance
Measured, Nameplate, Manufacturer, Calculated, Estimated, Assumed, Utility Bill, BAS / Trend.

### Confidence
**High:** critical inputs measured/nameplate/manufacturer/utility/BAS supported.
**Moderate:** core data supported but one or more important operating variables estimated.
**Low:** savings materially depend on assumptions or limited observations.

---

# READY-V1 METHODS

## CALC-GEN-001 — Annual Energy From Power and Runtime
**Status:** READY-V1

Inputs: affected power `kW`, annual operating hours `hr/yr`.

`Annual Energy (kWh/yr) = kW × hr/yr`

`Annual kWh Savings = (Baseline kW - Proposed kW) × affected hr/yr`

Do not use nameplate power as actual operating power without explicitly identifying the assumption.

## CALC-ELEC-001 — Single-Phase Real Power
**Status:** READY-V1

Inputs: Voltage `V`, Current `A`, Power Factor `PF`.

`kW = V × A × PF / 1000`

Direct true-power measurement is preferred for variable/nonlinear loads.

## CALC-ELEC-002 — Balanced Three-Phase Real Power
**Status:** READY-V1

Inputs: line-line voltage `V`, line current `A`, power factor.

`kW = √3 × V × A × PF / 1000`

Do not apply blindly to badly unbalanced loads.

## CALC-LTG-001 — Lighting Retrofit Energy Savings
**Status:** READY-V1

Inputs:
- Existing fixture input watts
- Proposed fixture input watts
- Quantity
- Annual affected operating hours

`Existing kW = Existing W × Quantity / 1000`

`Proposed kW = Proposed W × Quantity / 1000`

`Demand Reduction kW = Existing kW - Proposed kW`

`Annual kWh Savings = Demand Reduction kW × Annual Hours`

Preferred provenance:
- Existing watts: measured or documented fixture/ballast input
- Proposed watts: manufacturer
- Quantity: field count/takeoff
- Hours: BAS/schedule/trend preferred

Warnings:
- Maintain required illumination/functionality.
- HVAC interactive effects are separate.
- Demand savings require peak coincidence analysis.
- Review applicable California lighting requirements.

## CALC-LTG-002 — Lighting Controls Savings
**Status:** READY-V1 when control reduction is supported

Preferred method:

`Annual kWh Savings = Controlled Lighting kW × (Baseline Hours - Proposed Hours)`

Alternative with monitored reduction:

`Annual kWh Savings = Baseline kWh × Verified Reduction Fraction`

Never present a generic occupancy-sensor percentage as measured savings.

## CALC-HVAC-001 — Equipment Schedule Reduction
**Status:** READY-V1 when operating power/load is supported

`Annual kWh Savings = Baseline Affected kW × (Baseline Hours - Proposed Hours)`

More rigorous: calculate by operating mode or hourly/trended load.

Review warm-up/pull-down, humidity, ventilation, freeze protection, process requirements, optimum start/stop, and load variation.

## CALC-FAN-001 — Fan Electrical Energy From Measured Power
**Status:** READY-V1

`Annual Fan Energy = Measured kW × hr/yr`

Representative measured kW is the preferred baseline for fan ECMs.

## CALC-FAN-002 — Fan VFD / Affinity-Law Screening
**Status:** READY-V1 for applicable variable-torque systems

`P2 / P1 = (N2 / N1)^3`

`P2 = P1 × (N2 / N1)^3`

`kWh Savings = (P1 - P2) × Hours`

For multiple operating conditions, sum across bins.

Review applicability where fixed/static pressure, minimum ventilation, system resistance, damper/control effects, or motor/VFD losses are material. Validate higher-confidence analyses against DOE MEASUR/FSAT-style methods.

## CALC-PUMP-001 — Pump Hydraulic and Input Power
**Status:** READY-V1

Inputs: flow `Q` gpm, TDH `H` ft, specific gravity `SG`, pump efficiency, motor efficiency.

`Hydraulic hp = Q × H × SG / 3960`

`Electrical kW = Hydraulic hp × 0.746 / (ηpump × ηmotor)`

Measured input kW is preferred where available.

## CALC-PUMP-002 — Pump VFD / Affinity-Law Screening
**Status:** READY-V1

`Q2 / Q1 = N2 / N1`

`H2 / H1 = (N2 / N1)^2`

`P2 / P1 = (N2 / N1)^3`

Do not assume cube-law savings for systems with significant static head. Use actual system/pump curves for higher-confidence work.

## CALC-WTR-001 — Water-Side Thermal Load
**Status:** READY-V1

For water near typical HVAC conditions:

`Btu/h = 500 × gpm × ΔT`

`Cooling tons = Btu/h / 12,000`

The factor 500 approximates density × specific heat × 60 min/hr. Use fluid-specific properties for glycol or unusual temperatures. Flow and temperatures should represent the same operating period.

## CALC-CHW-001 — Chiller Operating Efficiency
**Status:** READY-V1

`kW/ton = Chiller kW / Simultaneous Cooling Tons`

Cooling tons may be derived using CALC-WTR-001 when flow and ΔT are adequately supported.

Clarify whether pumps/towers are included in the electrical boundary.

## CALC-AIR-001 — Air-Side Sensible Heat Transfer
**Status:** READY-V1 approximate standard-air method

`Sensible Btu/h = 1.08 × cfm × ΔT`

Does not include latent load. Correct for nonstandard air density when higher accuracy is required.

## CALC-AIR-002 — Air-Side Total Heat Transfer From Enthalpy
**Status:** READY-V1 approximate standard-air method

`Total Btu/h = 4.5 × cfm × Δh`

Psychrometric inputs must be internally consistent.

## CALC-BLR-001 — Boiler Efficiency Upgrade Fuel Savings
**Status:** READY-V1 when useful load is supported

`Baseline Fuel Input = Useful Load / η1`

`Proposed Fuel Input = Useful Load / η2`

`Fuel Savings = Useful Load × (1/η1 - 1/η2)`

If baseline fuel use is supported:

`Useful Load = Baseline Fuel Input × η1`

Nameplate combustion efficiency is not automatically seasonal/system efficiency.

## CALC-DHW-001 — Domestic Hot Water Thermal Load
**Status:** READY-V1

Inputs: gallons/day, inlet temperature, delivered temperature, operating days/year.

`Daily Btu = gallons/day × 8.33 × ΔT`

`Annual Useful Btu = Daily Btu × operating days`

Recirculation, storage, standby, distribution, and process losses are separate where material.

## CALC-DHW-002 — Water-Heating Efficiency / Fuel-Switch Savings
**Status:** READY-V1

Combustion:

`Fuel Input = Useful Load / Efficiency`

Heat pump/electric:

`Electric kWh = Useful Load (Btu) / (3412 × COP)`

Rated COP should not automatically be treated as annual system COP.

## CALC-REF-001 — Refrigeration Evaporator / Case Fan Retrofit
**Status:** READY-V1

`Direct kWh Savings = (Baseline W - Proposed W) × Quantity × Hours / 1000`

Any reduction in refrigeration load from reduced fan heat is an interactive effect and should be calculated separately.

## CALC-CA-001 — Compressed-Air End-Use/Leak Energy
**Status:** READY-V1 when system specific power is supported

Inputs: reduced air flow `cfm`, system specific power `kW/100 cfm`, annual affected hours.

`kW Reduction = Flow Reduction × Specific Power / 100`

`Annual kWh Savings = kW Reduction × Hours`

Specific power must represent the actual compressor-system/control condition. Use DOE MEASUR/AirMaster-style system analysis for multi-compressor systems.

## CALC-ENV-001 — Envelope Conductive Load Difference
**Status:** READY-V1 for screening

Instantaneous:

`ΔBtu/h = (Uexisting - Uproposed) × Area × ΔT`

Annual using degree-hours:

`Annual Thermal Btu = ΔU × Area × Degree-Hours`

Annual utility savings require HVAC efficiency/COP and heating/cooling separation. Solar, infiltration, thermal bridges, and dynamic effects are not captured here.

---

# CALIFORNIA UTILITY METHODS

## CALC-UTIL-001 — Simple Energy Cost Savings
**Status:** READY-V1

`Annual Cost Savings = Annual kWh Savings × applicable $/kWh`

A blended rate must be labeled as a simplification.

## CALC-UTIL-002 — Time-of-Use Energy Cost Savings
**Status:** READY-V1

`Annual Energy Cost Savings = Σ(kWh_period × Rate_period)`

Prefer this in California when savings differ materially by time of day or season.

## CALC-UTIL-003 — Demand-Charge Savings
**Status:** READY-V1 only with peak-coincidence support

`Demand Cost Savings = Σ(Peak kW Reduction_period × Demand Rate_period)`

Connected-load reduction is not automatically billing-demand reduction.

---

# FINANCIAL METHODS

## CALC-FIN-001 — Simple Payback
**Status:** READY-V1

`Simple Payback (yr) = Net Implementation Cost / Annual Cost Savings`

Undefined when annual savings ≤ 0.

## CALC-FIN-002 — Net Present Value
**Status:** READY-V1

`NPV = -C0 + Σ[CFt / (1+r)^t]`

Document cash-flow convention and discount-rate basis. Use NIST Handbook 135 / BLCC conventions for formal LCCA.

## CALC-FIN-003 — Savings-to-Investment Ratio
**Status:** VALIDATE-V2

`SIR = Present Value of Savings / Present Value of Investment-Related Costs`

Use NIST/FEMP definitions when implemented; do not simplify until replacement, residual, and cost boundaries are defined.

---

# VALIDATE-V2 QUEUE

## CALC-HVAC-002 — Unitary HVAC Efficiency Upgrade
Needs load profile/equivalent full-load hours, climate/load dependence, fan interaction, and baseline/proposed efficiency definitions. Primary public basis: DOE/NREL UMP small commercial unitary/split cooling protocol.

## CALC-HVAC-003 — Economizer Repair / Optimization
Needs weather/bin or hourly conditions, OA/RA state, ventilation minimum, cooling efficiency, control limits, and humidity/enthalpy logic where applicable. Do not use a flat percent savings assumption.

## CALC-CTRL-001 — BAS / HVAC Controls
Includes SAT reset, static-pressure reset, CHW/HW reset, optimum start/stop, DCV, staging. Calculate the specific control change rather than applying a generic “BAS savings” percentage. Primary public basis: DOE/NREL HVAC Controls and Retrocommissioning protocols.

## CALC-CHW-002 — Chiller Efficiency Upgrade / Plant Optimization
Needs simultaneous load and kW, part-load profile, condenser conditions, pump/tower boundary, staging, and proposed performance data. Primary public basis: DOE/NREL UMP Chiller protocol plus manufacturer data.

## CALC-REF-002 — Refrigeration Floating Head Pressure
Needs compressor/rack performance, ambient conditions, condensing-pressure controls, minimum pressure limits, and annual weather/load distribution.

## CALC-REF-003 — Anti-Sweat Heater Controls
Needs connected heater load, baseline duty, proposed duty/control, and operating/ambient conditions.

## CALC-FOOD-001 — Commercial Food-Service Equipment Upgrade
Use measured energy or standardized/manufacturer/ENERGY STAR data for the specific appliance category rather than a generic percent savings assumption. Priority: ovens, fryers, griddles, steamers, dish machines, ice machines, hot-food holding, kitchen ventilation.

## CALC-KV-001 — Demand-Control Kitchen Ventilation
Needs baseline fan power/speed, proposed profile, schedule, makeup-air heating/cooling interaction, and hood control strategy. Direct fan savings may reference CALC-FAN-002; makeup-air effects require separate calculation.

## CALC-PLUG-001 — Plug-Load Scheduling / Controls
Preferred method: `controlled kW × verified avoided hours`. Avoid generic percent savings unless explicitly treated as an estimate.

## CALC-RCX-001 — Retrocommissioning / Operational Measures
Represent RCx as a collection of explicit operational changes using individual methods rather than one generic percent-savings ECM.

---

# QA/QC RULES

Flag for engineering review when:
1. ECM annual kWh savings exceed facility annual electricity use.
2. ECM annual fuel savings exceed facility annual fuel use.
3. Proposed power exceeds baseline power for an efficiency replacement without explanation.
4. Runtime exceeds 8,760 hr/yr.
5. Efficiency is outside physically valid bounds for its parameter definition.
6. A method requires operating power but only nameplate capacity is available.
7. An Assumed input is used without a visible assumption.
8. Demand savings are reported without a tariff/demand basis.
9. Units are missing or incompatible.
10. The calculation uses equipment not explicitly associated with the ECM.
11. Measurements are non-simultaneous where the method requires simultaneity.
12. Baseline/proposed calculation boundaries differ.
13. Calculated ECM savings are inconsistent with utility-bill scale or end-use plausibility.
14. A deemed/default/reference value materially affects savings without Level D classification and a visible warning.
15. A SCREENING result is being presented as an ENGINEERING_ESTIMATE or HIGH_CONFIDENCE_ESTIMATE.

These are review flags, not automatic declarations that a result is impossible.

---

# CALIFORNIA ECM PRIORITY MATRIX

## Offices / Retail / Schools / Hotels / Warehouses
- LED retrofit
- lighting controls/scheduling
- HVAC schedule optimization
- BAS/control corrections
- RTU efficiency/replacement
- economizer repair
- fan VFD/reset
- pump VFD/reset where applicable
- DHW efficiency
- envelope screening
- plug-load scheduling
- retrocommissioning

## Grocery / Refrigerated Retail / Cold Storage
Add:
- evaporator/case fan upgrades
- floating head pressure
- anti-sweat controls
- defrost optimization
- compressor controls/VFD
- refrigeration commissioning
- condenser optimization

## Restaurants / Commercial Kitchens
Add:
- efficient food-service equipment
- demand-control kitchen ventilation
- DHW
- refrigeration
- ice machines
- hood/makeup-air scheduling

## Hotels
Add:
- DHW load/efficiency
- recirculation optimization
- guest-room HVAC controls
- central plant optimization
- laundry/process hot water
- pool/spa systems when present

## Light Industrial
Add:
- compressed-air leaks/pressure/control
- motors
- pumps
- fans
- process heating
- steam
- process scheduling
- waste heat recovery

---

# SOURCE REGISTER

## California
- California eTRM: https://www.caetrm.com/
- Cal TF eTRM Roadmap: https://www.caltf.org/etrm-roadmap
- Cal TF Tools: https://www.caltf.org/tools
- California Energy Commission Building Energy Efficiency Standards: https://www.energy.ca.gov/programs-and-topics/programs/building-energy-efficiency-standards

## Federal / National
- DOE Uniform Methods Project: https://www.energy.gov/cmei/buildings/uniform-methods-project-determining-energy-efficiency-savings-specific-measures
- DOE MEASUR: https://www.energy.gov/cmei/ito/measur
- DOE MEASUR calculators: https://www.energy.gov/cmei/amo/measur-calculator-list-and-descriptions
- NIST Handbook 135 (2025): https://nvlpubs.nist.gov/nistpubs/hb/2025/NIST.HB.135e2025.pdf
- NIST BLCC: https://www.nist.gov/services-resources/software/building-life-cycle-cost-programs

---

# FIRST IMPLEMENTATION WAVE

Recommended first deterministic implementation set:
1. CALC-GEN-001
2. CALC-ELEC-001
3. CALC-ELEC-002
4. CALC-LTG-001
5. CALC-LTG-002
6. CALC-HVAC-001
7. CALC-FAN-001
8. CALC-FAN-002
9. CALC-PUMP-001
10. CALC-PUMP-002
11. CALC-WTR-001
12. CALC-CHW-001
13. CALC-AIR-001
14. CALC-AIR-002
15. CALC-BLR-001
16. CALC-DHW-001
17. CALC-DHW-002
18. CALC-REF-001
19. CALC-CA-001
20. CALC-ENV-001
21. CALC-UTIL-001
22. CALC-UTIL-002
23. CALC-UTIL-003
24. CALC-FIN-001
25. CALC-FIN-002

Do not implement the VALIDATE-V2 queue until each method has additional source review, applicability rules, and numerical test cases.

# Next research tasks
1. Extract field/calculation requirements from DOE UMP protocols for lighting, controls, VFDs, unitary HVAC, HVAC controls, chillers, compressed air, and retrocommissioning.
2. Review current California eTRM packages for the highest-priority commercial measures.
3. Define canonical parameter IDs and units.
4. Build numerical test cases and expected outputs for all READY-V1 methods.
5. Define source-strength/confidence rules programmatically.
6. Define California TOU/demand tariff structures without hardcoding utility rates.
7. Define HVAC interactive effects for lighting and refrigeration.
8. Expand food-service methods by appliance class.

