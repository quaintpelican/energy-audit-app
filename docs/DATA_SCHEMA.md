# Audist — Canonical Data Schema

## Status
Canonical schema through V3.3. Changes must preserve existing audits through migration. Changes must preserve existing audits through migration.

V3.3 introduces no canonical data fields, schema migration, object stores, or database-version change. Progressive-disclosure state is presentation-only and is not persisted in audit records.

## Schema principles
- Every audit has a `schemaVersion`.
- Major entities use stable machine IDs plus useful human-readable IDs.
- Relationships use IDs, not narrative-only references.
- Engineering values preserve provenance.
- Missing values remain null/empty; never fabricate defaults that appear factual.
- Calculations preserve inputs and methodology.

## Audit
```text
Audit
- schemaVersion
- auditId
- createdAt
- updatedAt
- status
- site
- utility
- systems[]
- equipment[]
- ecms[]
- calculations[]          [planned]
- financialAnalysis       [planned]
- metadata
```

## Site
```text
site
- facilityName
- address
- facilityType
- area
- hoursWeek
- auditDate
- siteNotes
```

Future fields may include climate zone, year built, occupancy, contacts, weather station, building use details, and operating schedules.

## Utility
```text
utility
- electricRate
- demandRate
- gasRate
- notes
- months[]
```

Monthly record:
```text
- utilityMonthId
- month
- kwh
- kw
- electricCost
- therms
- gasCost
- notes
```

Future design should support multiple accounts/meters, billing-period dates, tariffs, water, other fuels, interval data, and imported source metadata.

## System

V3.2 introduces a first-class facility system inventory:
```text
system
- systemRecordId            stable machine UUID
- systemId                  human-readable ID, e.g. CHWS-01
- systemType
- name
- status                    Present / Not Audited / Out of Service
- equipmentRecordIds[]
- controlsSummary
- operatingSchedule
- notes
- createdAt
- updatedAt
```

Only systems selected as present/in scope drive equipment workflows. Unselected systems do not create completeness prompts. Equipment references its parent with `systemRecordId`.

## Equipment
Current common structure:
```text
equipment
- recordId                 machine UUID
- equipmentId              e.g. RTU-01
- systemType               HVAC / Lighting / DHW / ...
- equipmentSubtype
- equipment-specific fields
- fieldProvenance{}         field key → provenance enum
- systemRecordId            parent system UUID
- notes
- potentialEcmFlags[]
- measurements[]
- photos[]
- createdAt
- updatedAt
```

Equipment-specific schemas should evolve without forcing irrelevant fields onto other equipment types.

## Measurement
```text
measurement
- measurementId
- parameter
- value
- unit
- source                   Measured / Nameplate / Calculated / Estimated / Assumed
- method                   instrument or method
- notes
- capturedAt
```

Required evolution:
- numeric value separate from display value;
- canonical parameter IDs;
- unit validation/conversion;
- explicit equipment association if stored outside equipment;
- optional instrument ID;
- optional photo association;
- calculated-value provenance including input IDs and calculation method.

## Photo
```text
photo
- photoId
- name
- category
- note
- dataUrl                  current local representation
- capturedAt
- width
- height
- originalBytes
- compressedBytes
```

Current categories include Nameplate, Equipment Overview, Controls, Motor/Drive, Electrical, Deficiency, Measurement Setup, Other.

Future export should produce normal image files rather than relying only on embedded data URLs.

## ECM
```text
ecm
- ecmId
- title
- category
- affectedEquipmentIds[]
- affectedEquipmentRecordIds[]
- unresolvedEquipmentReferences[]
- existingCondition
- proposedImprovement
- missingData
- confidence
- templateKey
- completenessPercent
- completenessItems[]
- savings
- implementationCost
- simplePaybackYears
- createdAt
```

Savings currently reserves:
```text
- electricKwh
- demandKw
- therms
- cost
- method
```

Required evolution:
- requiredData[];
- recommendedData[];
- assumptions[];
- calculationIds[];
- capitalCost provenance;
- incentives;
- netCost;
- risks;
- implementation considerations;
- M&V;
- dynamic completeness recalculation.

Unresolved legacy relationship:
```text
- displayId                 original editable equipment ID
- source                    e.g. legacy-affectedEquipmentIds
- reason                    duplicate-display-id / equipment-not-found
- candidateRecordIds[]      conservative candidate UUIDs captured during migration
- migratedAt
- resolution               null until an explicit future resolution workflow
```

Unresolved references must remain exportable, must not be overwritten by completeness recalculation, and must conservatively block deletion of matching equipment until explicitly resolved.

## Calculation [planned canonical object]
```text
calculation
- calculationId
- methodId
- methodVersion
- ecmId
- equipmentIds[]
- inputs[]
- formula/method
- outputs[]
- assumptions[]
- warnings[]
- calculatedAt
```

Input:
```text
- parameterId
- value
- unit
- provenance
- sourceRecordId
```

Output:
```text
- parameterId
- value
- unit
```

## Provenance enum
Use:
- Measured
- Nameplate
- Calculated
- Estimated
- Assumed

Do not silently change provenance during transformations.

## ID rules
Human-readable equipment IDs should be unique within an audit where practical:
- RTU-01
- AHU-01
- CH-01
- BLR-01
- PUMP-01
- FAN-01
- LTG-AREA-01
- DHW-01
- ECM-01

Machine UUIDs should remain stable even if a display ID is edited.

## Schema migration
Never overwrite incompatible old structures blindly.

Recommended pattern:
```text
schemaVersion 2.0 → migrateV2toV3() → schemaVersion 3
schemaVersion 3 → migrateV3toV4() → schemaVersion 4
```

V3.2 keeps IndexedDB at database version 3 because `systems[]` and equipment fields are embedded in existing audit objects. The DB3 bridge therefore remains rollback-compatible.

Migration must:
1. retain original values;
2. create missing structures safely;
3. avoid inventing engineering data;
4. be testable with saved legacy audits;
5. preserve export capability if migration fails.

