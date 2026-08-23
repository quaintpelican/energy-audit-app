# Audist V5.3 Advanced Calculations

V5.3 implements only methods with explicit boundaries and hand-verifiable numerical cases. It supplies no generic HVAC, controls, refrigeration, RCx, or interaction percentages.

## Implemented

- `CALC-HVAC-002`: annual supported cooling load divided by baseline/proposed representative COP. COP bases and fan boundaries must match; nominal tons are not annual load.
- `CALC-CHW-002`: `Σ(tons × kW/ton × hours)` for baseline and proposed performance bins. Electrical boundaries must match.
- `CALC-REF-003`: `connected kW × (baseline duty − proposed duty) × hours`.
- `CALC-PLUG-001`: `controlled kW × verified avoided hours`.

## Evidence architecture

Optional `weatherDatasets[]` retains ID, source, station, location, period, provenance, and dry-bulb/hour bins with optional humidity/enthalpy. Optional `manufacturerPerformanceDatasets[]` retains manufacturer, model, source document/date, metric/unit, and conditioned performance points. Missing values are rejected; partial weather is warned and never annualized.

`rcxContainers[]` references explicit submeasure calculation IDs. Generic RCx percent savings are invalid. Stale or missing submeasures prevent a ready portfolio result.

## Partially implemented / requires validation

`CALC-HVAC-003`, `CALC-CTRL-001`, `CALC-REF-002`, `CALC-KV-001`, `CALC-RCX-001`, food-service upgrades, and selected lighting/HVAC or refrigeration interactions remain non-calculating. Audist records readiness or an opportunity requiring more data; no weather, performance map, schedule, efficiency, or interaction factor is fabricated.

V5.3 retains audit schema 4 and IndexedDB version 3. Professional package format 5 preserves the complete multidimensional JSON records and adds their counts to the manifest. CSV is intentionally not used for performance maps.
