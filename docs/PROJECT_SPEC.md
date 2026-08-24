# Audist — Product Specification

## V7.0 professional rendering principle

**Audist owns the engineering facts and numbers. AI may draft prose. The renderer owns formatting.** Deterministic report components read canonical records and approved analyses, preserve nulls, units, provenance, portfolio adjustments, and limitations, and remain separate from the audit model. See `REPORT_RENDERING_SPEC.md`.

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

## Current implementation through V3.3
Audits include facility-level system scope, stable system/equipment UUID relationships, equipment-specific schemas, structured BAS/operations fields, measurement presets, per-field provenance, and equipment-family photo expectations. V3.3 presents this depth through compact system navigation, Core/Recommended/Advanced field tiers, concise workflow statuses, and expandable equipment/ECM detail. These presentation changes do not alter the canonical audit schema and do not imply that engineering calculations exist.

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

## V4.2 workflow principle

**Collect once → auto-bind → calculate later → never re-enter.** Field Mode optimizes collection and Before Leaving Site review. Analysis Mode organizes approved calculation work over the same canonical audit dataset. Field documentation completeness and calculation readiness are distinct; office-only inputs do not reduce field completeness. Auto-binding must be deterministic, preserve provenance and stable source references, surface conflicts, and never silently overwrite better evidence. Proposed conditions require explicit user entry. Representative sampling requires explicit group membership and auditor confirmation.

## V4.3 data ownership

The auditor must be able to export the complete audit and every referenced evidence photo locally, offline, in a predictable package usable without Audist. JSON remains canonical. A complete export must never be declared successful when any referenced photo is missing. Package creation is read-only and must not transmit or mutate customer data.

## V6.2 Level 2 report principle

**The report is a representation of the Audist engineering record. Report generation must not create new engineering facts.** Unsupported references or quantitative claims are rejected, source edits make reports stale, and narrative edits never change canonical engineering data. See `REPORT_ENGINE_SPEC.md`.

## Definition of success
An experienced auditor can enter a facility with an iPhone, work offline, efficiently collect structured evidence, know before leaving whether critical information is missing, perform transparent calculations, and produce a defensible dataset that substantially reduces ASHRAE Level 2 reporting effort.

## V5.0 purchased-energy baseline

Utility bills are evidence of actual purchased energy, water, demand, and cost. V5.0 stores multiple accounts and bills without collapsing meter identity, inventing missing facts, or annualizing partial data. Derived metrics must be reproducible, use explicit units and provenance, require entered area for intensity metrics, and remain QA context rather than silently modifying ECM results. Offline, persistence, migration, and export protections apply equally to utility records.

## V5.1 end-use reconciliation

End-use energy must come from explicit baseline calculation outputs or auditor-entered, traceable estimates with evidence and assumptions. ECM savings must never be reclassified as baseline energy. Whole-building reconciliation must keep utility types in native units, exclude rollups from leaf totals, retain the signed difference and unassigned residual, and show gaps without scaling models. Partial/zero baselines cannot be reconciled. Duplicate membership, stale sources, missing major-system coverage, weak evidence, and savings larger than the applicable end use are visible QA—not silent corrections. See `END_USE_RECONCILIATION.md`.

## V5.2 ECM portfolio principle

**Standalone ECM savings must not be assumed additive.** Portfolio analysis is separate from authoritative standalone calculations. Audist may detect shared boundaries, preserve engineer-confirmed sequence, calculate only transparent approved remaining-baseline interactions, and warn; it may not invent factors, choose alternatives, optimize opaquely, hide adjustments, or force reconciliation. Negative baselines and incompatible alternatives invalidate combined results. See `ECM_PORTFOLIO_INTERACTIONS.md`.

## V5.3 advanced-method principle

Advanced calculations require explicit physical/control models and adequate field, weather, trend, or manufacturer evidence. A complex model does not automatically confer high confidence. Weather bins and performance points retain their source and conditions. RCx is a container of explicit submeasures, never a building-percent savings factor. When method definition or evidence is inadequate, Audist must preserve the opportunity and return a validation/more-data state with no numerical savings. See `ADVANCED_CALCULATIONS.md`.


## V6.0 deterministic QA/QC principle

Whole-audit QA/QC must be explainable, versioned, deterministic, and non-mutating. A rule may identify missing, inconsistent, implausible, stale, or untraceable evidence, but it must not invent or silently correct data. Finding identity must remain stable across save/reload for the same rule and affected records. Engineer dispositions require explicit evidence; corrected conditions auto-clear. Report readiness is advisory and separate from export-package integrity. See `QA_QC_SPEC.md`.

## V6.1 AI engineering-review principle

**AI reviews the engineering record; it does not become the engineering record.** AI operates only after deterministic calculations and QA/QC through a local export and strictly validated import. It cannot alter facts, calculations, savings, costs, provenance, evidence, maturity, deterministic findings, or readiness. AI observations and candidate ECMs remain advisory until explicitly dispositioned by an engineer. No API, backend, authentication, automatic transmission, paid dependency, or report generation is part of V6.1. See `AI_ENGINEERING_REVIEW_SPEC.md`.
## V6.3 workflow principle

**Field Mode captures evidence and opportunities. Analysis Mode develops and evaluates ECMs.** Collect onsite what is difficult to recover; complete utility ingestion, candidate refinement, proposed cases, calculations, economics, portfolios, QA/review, and reports at the desk. See `FIELD_WORKFLOW_V63.md`. No workflow shortcut may reduce provenance, stable relationships, persistence, or offline reliability.
