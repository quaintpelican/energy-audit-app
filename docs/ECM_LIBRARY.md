# Audist — ECM Library

## Status
Initial library. V3 implements seven template concepts and basic completeness scoring. Requirements below are starting engineering definitions and must be refined through field use before being treated as final audit standards.

## ECM template standard
Each template should ultimately define:
- template ID and version;
- applicability;
- affected equipment types;
- existing/proposed condition;
- required inputs;
- recommended inputs;
- required/recommended photos;
- calculation method ID;
- acceptable estimates/assumptions;
- disqualifying/missing information;
- risks and implementation considerations;
- completeness rules.

Completeness states should evolve to: Complete, Missing, Recommended, Not Applicable.

---

## ECM-HVAC-001 — Supply Fan VFD
**Purpose:** reduce fan energy by modulating speed with system demand.

Initial required data:
- motor HP;
- operating schedule;
- existing control method;
- fan speed/load or airflow profile;
- static pressure.

Recommended:
- motor efficiency;
- measured kW/amps/voltage/PF;
- design/current airflow;
- minimum airflow/ventilation requirement;
- static pressure setpoint;
- BAS trend data;
- occupancy requirements.

Photos:
- fan/motor;
- motor nameplate;
- existing starter/VFD;
- controls/BAS screen where useful.

Calculation family: fan power / affinity laws, subject to system applicability.

---

## ECM-HVAC-002 — HVAC Schedule Optimization
Initial required:
- existing equipment schedule;
- occupancy/operating schedule;
- equipment type/capacity.

Recommended:
- BAS trends;
- warm-up/cool-down requirements;
- setback/setup temperatures;
- critical-process requirements;
- measured or estimated operating power.

Calculation family: avoided runtime × baseline power/load with interaction considerations.

---

## ECM-HVAC-003 — Economizer Repair / Optimization
Initial required:
- existing controls/sequence;
- outside-air temperature;
- return-air temperature;
- supply-air temperature.

Recommended:
- humidity/enthalpy where relevant;
- damper condition/position;
- minimum OA requirement;
- cooling-system efficiency;
- operating schedule;
- climate/weather data;
- BAS trend data.

Calculation family: economizer/free-cooling analysis.

---

## ECM-LTG-001 — LED Lighting Retrofit
Initial required:
- fixture quantity;
- existing fixture wattage;
- annual operating hours;
- fixture/lamp type.

Recommended:
- measured wattage;
- proposed fixture wattage;
- illumination measurements;
- controls;
- space type;
- replacement constraints.

Photos:
- representative fixture;
- lamp/ballast/driver where useful;
- existing controls.

Calculation family:
`(Existing W - Proposed W) × Quantity × Annual Hours / 1000`
with HVAC interactive effects treated separately when warranted.

---

## ECM-LTG-002 — Lighting Controls
Initial required:
- existing controls;
- annual operating hours;
- fixture quantity;
- existing wattage.

Recommended:
- occupancy pattern;
- proposed control type;
- control savings factor or measured vacancy;
- daylight availability;
- space type.

Calculation family: connected load × affected hours × defensible control reduction factor.

---

## ECM-DHW-001 — Heat Pump Water Heater
Initial required:
- existing fuel;
- input capacity;
- storage volume;
- existing efficiency/UEF;
- operating schedule.

Recommended:
- hot-water consumption/load profile;
- inlet and delivery temperatures;
- recirculation;
- installation-space conditions;
- electric service capacity;
- proposed COP/performance data;
- utility rates.

Calculation family: useful DHW load divided by existing/proposed system efficiency/COP, including fuel-switch economics.

---

## ECM-DHW-002 — Tankless Water Heater
Initial required:
- fuel;
- input capacity;
- storage volume;
- existing efficiency/UEF;
- recirculation configuration.

Recommended:
- DHW load/usage;
- temperature rise;
- peak flow;
- proposed efficiency;
- venting/gas/electrical constraints;
- utility rates.

Calculation family: useful DHW load and standby/efficiency impacts.

---

## Development rule
Do not add a completeness requirement merely because it is easy to collect. Every required field should answer: **Why is this necessary to determine applicability, calculate savings, estimate cost, or manage implementation risk?**



---

# ECM Library — V4.0 Calculation Associations

V4 calculations attach to saved ECMs by `ecmId` and stable equipment UUIDs. The editor does not replace or erase calculation IDs or unrelated engineering/economic fields.

Implemented associations are deliberately narrow:

- Lighting retrofit ECMs may use `CALC-LTG-001`, followed by `CALC-UTIL-001` and `CALC-FIN-001` when their explicit inputs exist.
- Lighting controls ECMs may use `CALC-LTG-002`.
- HVAC schedule ECMs may use `CALC-HVAC-001`.
- Fan/VFD ECMs may use `CALC-FAN-001` for measured baseline energy and `CALC-FAN-002` for documented bin-based screening.
- `CALC-GEN-001`, `CALC-ELEC-001`, and `CALC-ELEC-002` provide approved general energy/power stages where applicability and evidence are documented.

The UI permits only approved Phase 1 registry methods. Method selection does not fabricate inputs or imply ECM applicability; QA flags identify equipment sources outside the ECM relationship.

