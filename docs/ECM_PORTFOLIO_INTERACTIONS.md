# Audist V5.2 ECM Portfolio and Interaction Analysis

**Standalone ECM savings must not be assumed additive.** V5.2 preserves every approved calculation as a standalone result and creates a separate portfolio layer for combined-savings review.

## Canonical portfolio

Optional `ecmPortfolios[]` supports multiple explicit scenarios. Each record contains a stable `portfolioId`, name/description, explicitly included `ecmIds[]`, ordered `sequence[]`, `interactionRecords[]`, explicit cost adjustments, baseline references, standalone and adjusted savings, combined economics, evidence/maturity, QA, status, timestamps, source fingerprint, and calculation trace. An ECM recommendation status (`Candidate`, `Recommended`, `Not Recommended`, `Alternative`, or `Deferred`) is independent of calculation readiness and does not automatically include the ECM.

Interactions use `INDEPENDENT`, `OVERLAPPING`, `SEQUENTIAL`, `SYNERGISTIC`, `ANTAGONISTIC`, `MUTUALLY_EXCLUSIVE`, `DEPENDENT`, or `UNKNOWN_REVIEW_REQUIRED`. Records retain stable ECM/equipment relationships, utility/end use, method, adjustment inputs, assumptions, warnings, notes, confirmation, and trace. Option groups on ECMs identify mutually exclusive alternatives; both analyses remain intact.

## Detection and calculation

Audist screens pairs for shared equipment UUIDs, systems, end uses, baseline energy streams, calculation sources, parent/child relationships, and option groups. Detection creates a review item and never subtracts savings.

V5.2 implements one deterministic adjusted method: `SEQUENTIAL_REMAINING_BASELINE`. The engineer must confirm the interaction, enter the shared original baseline, and define sequence. Audist subtracts the first adjusted savings, derives the second standalone reduction fraction, applies it to the remaining baseline, and preserves the full trace. This supports schedule-before-power reduction and replacement-before-controls without generic percentages. Other types remain review records until an approved method exists.

## Safety, evidence, and economics

Negative sequential baselines, broken relationships, missing required sequence, and mutually exclusive ECMs invalidate combined results. QA also covers stale inputs, shared baseline claims, savings above relevant end-use or complete utility baselines, and demand above observed peak. Results are never capped or forced to reconcile.

Portfolio evidence/maturity cannot exceed the weakest component. Combined implementation cost uses included ECM costs plus only explicit adjustments. Combined simple payback is combined net cost divided by combined annual cost savings; individual paybacks are never averaged. No incentive, measure life, discount, escalation, or replacement cycle is assumed.

## Persistence, export, and limitations

V5.2 retains audit schema 4 and IndexedDB version 3. Package format 4 adds `tables/ecm_portfolios.csv`, `tables/ecm_interactions.csv`, complete canonical records, derived analysis, manifest summary, and reference validation.

V5.2 does not optimize portfolios, apply generic percentages, automatically choose alternatives, calculate full lighting/HVAC effects, perform hourly simulation, generate reports, or use cloud services. Complex interaction networks and an in-app mutually-exclusive override workflow remain future work; the release defaults to rejecting incompatible bundles.
