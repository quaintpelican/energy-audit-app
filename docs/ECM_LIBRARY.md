# ECM Library — V4.1 Calculation Associations

V4 calculations attach to saved ECMs by `ecmId` and stable equipment UUIDs. The editor does not replace or erase calculation IDs or unrelated engineering/economic fields.

Implemented associations are deliberately narrow:

- Lighting retrofit ECMs may use `CALC-LTG-001`, followed by `CALC-UTIL-001` and `CALC-FIN-001` when their explicit inputs exist.
- Lighting controls ECMs may use `CALC-LTG-002`.
- HVAC schedule ECMs may use `CALC-HVAC-001`.
- Fan/VFD ECMs may use `CALC-FAN-001` for measured baseline energy and `CALC-FAN-002` for documented bin-based screening.
- `CALC-GEN-001`, `CALC-ELEC-001`, and `CALC-ELEC-002` provide approved general energy/power stages where applicability and evidence are documented.

The UI exposes all approved `READY-V1` methods and clearly marked `VALIDATE-V2` readiness entries. Method selection does not fabricate inputs or imply ECM applicability. Every component records its baseline/proposed boundary, affected operation/end use/energy stream, component role, and interaction category. QA flags identify equipment outside the ECM relationship and likely overlap with other ECM calculations.

