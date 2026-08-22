# Audist — Product Specification

## Mission
Build a professional, field-ready iPhone energy-auditing application supporting high-quality ASHRAE Level 2 audits.

North star:

**Field data → structured audit dataset → engineering calculations → ECM analysis → QA/QC → AI-assisted ASHRAE Level 2 report**

Audist is not a generic inspection app. It should understand what an energy auditor needs, guide collection, identify missing information before departure, perform transparent calculations, and organize evidence for professional reporting.

## Product priorities
1. Never lose field data.
2. Work fully offline during audits.
3. Minimize field-entry time and friction.
4. Capture structured data instead of relying on narrative notes.
5. Preserve engineering provenance.
6. Never fabricate missing information.
7. Identify missing data while onsite.
8. Produce defensible, reproducible calculations.
9. Preserve backward compatibility or provide migrations.
10. Keep operating cost at or near $0 where practical.
11. Prefer simple, robust architecture over unnecessary complexity.

## Current architecture
- iPhone-first Progressive Web App.
- HTML/CSS/JavaScript.
- GitHub source control and GitHub Pages hosting.
- Service Worker for offline application access.
- IndexedDB for local audit storage.
- ChatGPT analyzes exported audit data.
- No paid backend.

Before introducing paid APIs, hosting, databases, App Store requirements, or recurring services, document: problem solved, recommendation, cost, free alternatives, tradeoffs, and whether it can be postponed.

## Offline and data safety
All field functions must work without internet. Changes should autosave locally. The mature UI should distinguish:
- Saved Locally
- Backup Pending
- Backed Up

IndexedDB is the working database, not sufficient disaster recovery by itself. Support exports, schema versioning, migrations, recovery, and eventually secure cloud backup/synchronization.

## Field UX
Assume one-handed iPhone use on roofs and in mechanical rooms, possibly with gloves, sunlight, movement, noise, and no reception.

Prioritize:
- large touch targets;
- minimal typing;
- sensible defaults;
- repeated-value reuse;
- equipment duplication;
- autosave and visible status;
- rapid categorized photo capture;
- minimal navigation;
- obvious missing requirements;
- protection from accidental deletion.

When visual elegance conflicts with field speed, choose field speed.

## Engineering model
Use stable relationships:

**Facility → Utilities → Systems → Equipment → Measurements / Photos / Observations → ECMs → Calculations → Financial Analysis → Report**

Use stable human-readable IDs such as RTU-01, AHU-03, PUMP-02, DHW-01, and ECM-07.

## Provenance
Classify engineering values wherever practical:
- Measured
- Nameplate
- Calculated
- Estimated
- Assumed

Calculated values should preserve inputs, units, methodology, and method/version where useful. Assumptions must remain visible. Never present assumptions or AI guesses as measured facts.

## Equipment and measurements
Use equipment-specific schemas rather than a universal generic form. Planned coverage includes HVAC, chillers, boilers, towers, pumps, fans, motors, lighting, DHW, refrigeration, compressed air, process loads, BAS/controls, envelope, plug loads, renewables, and storage.

Measurements are structured records containing parameter, value, unit, provenance, equipment association, timestamp, instrument/method, and notes.

## Photos
Photos are engineering evidence. Associate them with equipment and categories such as Overview, Nameplate, Controls, Motor/Drive, Electrical, Deficiency, and Measurement Setup. Automatically name and compress photos while preserving report usefulness.

## ECMs
ECMs are structured engineering objects, not notes. Support affected equipment, existing/proposed condition, required/recommended/missing data, methodology, assumptions, savings, costs, economics, confidence, risks, implementation considerations, and M&V considerations.

Core question:

**Do I have enough information to evaluate this ECM?**

Each ECM template should define required and recommended inputs. Completeness should dynamically recalculate as underlying audit data changes and warn the auditor while onsite.

## Calculations
Prefer:

**structured inputs → explicit formula/method → result**

Use deterministic engineering methods where available. AI should reason over and QA calculations, not conceal methodology.

Calculation coverage should progressively include lighting, motors, fans, pumps, affinity laws, HVAC schedules, economizers, efficiency upgrades, DHW, refrigeration, compressed air, envelope, utility analysis, simple payback, NPV, and lifecycle metrics.

## ASHRAE Level 2 and AI
The app supports professional engineering judgment; it does not claim to replace it.

AI may identify missing data, organize observations, suggest ECMs, interpret structured data, check calculations, identify inconsistencies, perform QA/QC, and draft report sections.

AI must never silently invent measurements, specifications, schedules, utility rates, site conditions, costs, or savings. Insufficient information must be stated explicitly.

## Security
Customer audit data must never be committed to a public GitHub repository. Before cloud sync, address authentication, encryption, authorization, backup, ownership, retention, and deletion.

## Development standard
For meaningful features:
1. Define the field/engineering problem.
2. Evaluate data-model impact.
3. Protect backward compatibility.
4. Build the smallest robust solution.
5. Test offline behavior and persistence.
6. Test on iPhone.
7. Evaluate exported data.
8. Iterate from real field use.

For major decisions use:

**Problem → Recommendation → Why → Tradeoffs → Cost → Future impact**

## Release standard
Use versions such as V3.1 and V4.0. Each release should identify changes, deployment steps, migration issues, limitations, and test procedures. Never claim functionality exists unless implemented in delivered code.

## Definition of success
An experienced auditor can enter a facility with an iPhone, work offline, efficiently collect structured evidence, know before leaving whether critical information is missing, perform transparent calculations, and produce a defensible dataset that substantially reduces ASHRAE Level 2 reporting effort.

