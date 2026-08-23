# ECM Library — V4.2 Workflow Recipes

V4 calculations attach to saved ECMs by `ecmId` and stable equipment UUIDs. The editor does not replace or erase calculation IDs or unrelated engineering/economic fields.

Implemented associations are deliberately narrow:

- Lighting retrofit ECMs may use `CALC-LTG-001`, followed by `CALC-UTIL-001` and `CALC-FIN-001` when their explicit inputs exist.
- Lighting controls ECMs may use `CALC-LTG-002`.
- HVAC schedule ECMs may use `CALC-HVAC-001`.
- Fan/VFD ECMs may use `CALC-FAN-001` for measured baseline energy and `CALC-FAN-002` for documented bin-based screening.
- `CALC-GEN-001`, `CALC-ELEC-001`, and `CALC-ELEC-002` provide approved general energy/power stages where applicability and evidence are documented.
- Pump VFD, boiler-efficiency, economizer, and DHW templates create only their approved routine/validation recipe; validation-only recipes never calculate.

Field documentation completeness and calculation readiness are separate. Required field evidence and equipment-specific required photos appear in Before Leaving Site review. Proposed conditions, costs, financial inputs, and utility rates are office inputs unless explicitly captured onsite. One measurement may support multiple ECMs without being copied or consumed.

Equipment grouping is explicit. Group membership uses stable equipment UUIDs. Representative sampling affects population provenance only after the auditor confirms the population and sampled records; inferred similarity alone never changes provenance.

The UI exposes all approved `READY-V1` methods and clearly marked `VALIDATE-V2` readiness entries. Method selection does not fabricate inputs or imply ECM applicability. Every component records its baseline/proposed boundary, affected operation/end use/energy stream, component role, and interaction category. QA flags identify equipment outside the ECM relationship and likely overlap with other ECM calculations.

V5.2 formalizes ECM recommendation status independently from calculation readiness and supports explicit alternative option groups. Standalone calculation results remain authoritative. Portfolio membership is explicit; nonrecommended/deferred/alternative ECM analyses are preserved. Option-group members are mutually exclusive in a portfolio unless a future explicit override workflow is separately reviewed.

V5.3 makes unitary HVAC efficiency, chiller-bin optimization, anti-sweat control, and verified plug scheduling executable when their strict method inputs exist. RCx remains a parent/container of explicit submeasure calculations. Economizer, BAS reset, floating-head, DCKV thermal, and interactive-effect opportunities may be documented but cannot claim numerical savings until their required weather, trend, performance, and boundary evidence support a validated method.
