# Audist — Product Roadmap

## Current state: V3.1 reliability baseline
Validated on iPhone:
- PWA deployment through GitHub Pages;
- offline application loading;
- IndexedDB persistence;
- multiple audits;
- autosave and visible local-save status;
- HVAC, Lighting, DHW equipment records;
- structured measurements with provenance;
- categorized/compressed equipment photos;
- utility rates and monthly records;
- ECM records;
- seven initial ECM templates;
- initial completeness scoring;
- JSON export for AI analysis.

## Completed — V3.1: Reliability + dynamic completeness
Problem: V3 completeness is calculated when an ECM is created, not continuously.

Goals:
- dynamically recalculate ECM completeness when equipment/measurements change;
- make ECMs editable;
- expose missing required data clearly;
- add recommended vs required distinction;
- add photo completeness rules;
- strengthen deletion protection;
- verify V2/V2.1 → V3 migration behavior.

Success criterion: auditor can open an ECM at any time and see an accurate onsite missing-data list.

## Current candidate — V3.2: System Coverage & Field Schema
- facility System Inventory / Audit Scope;
- first-class `systems[]` with stable equipment relationships;
- broad commercial/industrial equipment taxonomy;
- pragmatic equipment-specific field schemas;
- structured BAS/operations data;
- equipment duplication and next IDs;
- measurement presets;
- equipment-family photo expectations;
- no engineering calculators.

Success criterion: an auditor can represent the major energy-using systems in most commercial/industrial buildings without falling back to generic notes.

## V3.3: Field-speed refinement
- repeated-value reuse;
- improved navigation/search;
- equipment status/completeness;
- faster one-handed iPhone workflows informed by V3.2 field testing.

## V4.0: Engineering calculation engine
Start with rigorously defined methods:
1. lighting retrofit savings;
2. simple payback;
3. HVAC schedule savings;
4. fan VFD/affinity-law analysis;
5. DHW load/efficiency measures.

Requirements:
- explicit inputs/units;
- provenance;
- method IDs/versions;
- visible assumptions;
- reproducible outputs;
- warnings when data is insufficient.

## V4.x: Coverage refinement and calculation expansion
Progressively add equipment-specific schemas and ECMs for:
- boilers/chillers/towers;
- pumps/fans/motors;
- BAS/controls;
- refrigeration;
- compressed air;
- envelope;
- process and plug loads;
- renewables/storage.

## V5.0: Backup and synchronization
Only after local reliability is strong.

Desired states:
- Saved Locally
- Backup Pending
- Backed Up

Before implementation evaluate free/low-cost options, authentication, encryption, authorization, ownership, retention, deletion, offline conflict resolution, and recurring cost.

## V5.x: Professional export package
Generate a portable package such as:
```text
Facility_Audit.zip
- audit.json
- equipment.csv
- measurements.csv
- utility.csv
- ecms.csv
- calculations.csv
- photos/
```

## V6.0: ASHRAE Level 2 report workflow
- automated audit QA/QC;
- missing-data report;
- utility characterization;
- ECM calculation tables;
- cost/economic tables;
- report-ready photo organization;
- AI-assisted narratives;
- assumptions/limitations;
- appendices.

## Long-term AI copilot
Potential functions:
- suggest next field action;
- identify likely missing evidence;
- suggest ECMs;
- interpret nameplates/photos with human verification;
- review calculations;
- identify inconsistencies;
- draft report sections.

AI must never silently fabricate engineering facts.

## Sequencing rule
Do not expand feature breadth faster than the underlying schema, persistence, calculation provenance, and migration architecture can support.

