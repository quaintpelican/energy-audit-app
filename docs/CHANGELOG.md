# Changelog

## V6.1 AI-Assisted Engineering Review — release candidate

- Added local `Export → external AI review → validated structured import`; Audist transmits nothing and has no AI API dependency.
- Added review schema 1, standardized instructions, strict response validation, record-reference enforcement, and all-or-nothing import.
- Added historical advisory reviews, finding dispositions/notes, engineering-fingerprint staleness, and explicit candidate-to-normal-ECM acceptance without invented values.
- Added a visually distinct Analysis Mode AI review section while preserving deterministic QA/readiness authority.
- Advanced the professional package to format 7 with AI request/instructions, historical review JSON, manifest summary, and `ai_review_findings.csv`.
- Retained audit schema 4, IndexedDB version 3, offline field operation, and all prior migration/rollback behavior.

## V6.0 Deterministic Audit QA/QC — release candidate

- Added a versioned registry of 58 deterministic QA/QC rules spanning 13 engineering categories.
- Added stable findings, explicit engineer review/limitation states, auto-clear behavior, and whole-audit readiness.
- Added full Analysis Mode QA review and onsite-only Field Exit findings.
- Added canonical QA dispositions without changing audit schema 4 or IndexedDB version 3.
- Advanced the professional package to format 6 with full `auditQa`, manifest summary, and `tables/qa_findings.csv`; package integrity remains separate.
- Added deterministic, lifecycle, Blob-context, export, and large-audit regression tests.

## V5.3 Advanced Calculations & Controls — release candidate

- Implemented unitary cooling efficiency from supported annual load/COP, boundary-consistent chiller performance-bin integration, anti-sweat heater duty controls, and verified plug-load scheduling.
- Added strict weather-bin, manufacturer-performance, RCx-container, and advanced-readiness validation without online APIs or fabricated values.
- Kept economizer, BAS resets, floating head, DCKV thermal effects, RCx aggregation, and selected HVAC/refrigeration interactions non-calculating until their methods are validated.
- Advanced the professional package to format 5 while retaining audit schema 4 and IndexedDB version 3.

## V5.2 ECM Portfolio & Interaction Analysis — release candidate

- Added optional multi-scenario `ecmPortfolios[]`, explicit ECM inclusion/sequence, recommendation statuses, option groups, interaction taxonomy, source fingerprints, and reproducible traces.
- Added deterministic overlap screening across stable equipment/system/end-use/stream/source/parent/option relationships without automatic subtraction.
- Added only the engineer-confirmed `SEQUENTIAL_REMAINING_BASELINE` method, preserving standalone results and intermediate/final portfolio energy.
- Added invalid-result protection for negative baselines and incompatible alternatives plus end-use, utility, demand, stale-source, evidence, economics, and reference QA.
- Added Analysis Mode portfolio and interaction review with explicit cost hooks; no generic factors or hidden optimization.
- Advanced the professional package to format 4 with portfolio and interaction CSVs and manifest analysis summary.
- Retained audit schema 4, IndexedDB version 3, offline operation, and all V5.1 behavior without migration.

## V5.1 End-Use & Whole-Building Reconciliation — release candidate

- Added canonical manual `endUseModels[]` with stable UUID relationships, native utility units, provenance, evidence, maturity, basis, assumptions, hierarchy, source versions, and immediate serialized persistence.
- Added conservative automatic assembly only from explicit calculated baseline-energy outputs; ECM savings are excluded from baseline assembly.
- Added current-leaf aggregation, explicit utility residuals and signed/absolute reconciliation, centralized QA thresholds, present-system coverage, duplicate/stale/unit/weak-evidence flags, and ECM savings-to-end-use scale checks.
- Added an Analysis Mode reconciliation summary, evidence-colored end-use chart, auditable detail panels, editable manual estimates, coverage review, and QA review.
- Advanced the independent professional package to format 3 with `tables/end_uses.csv`, complete derived `endUseAnalysis`, manifest reconciliation summary, and stable relationship validation.
- Retained audit schema 4, IndexedDB version 3, offline operation, GitHub Pages compatibility, and all V5.0 data without migration or rewrite.

## V5.0 Utility Analysis & Energy Baseline — release candidate

- Added additive multi-account utility bills with stable UUIDs, declared source, explicit units, billing dates/days, demand, cost boundaries, estimated flags, and offline manual entry.
- Added conservative V4.x month conversion without invented dates, provider, meter, tariff, demand, usage, or cost; legacy fields remain intact.
- Added deterministic completeness, annual/partial totals, daily normalization, EUI, demand intensity, seasonal characterization, baseload screening, blended rates, and facility ECM plausibility QA.
- Added compact offline monthly charts with bill-list text equivalents.
- Added explicitly labeled derived-rate calculation candidates and bill fingerprints; entered rates are never overwritten.
- Expanded JSON and Professional Audit Package export; package format 2 validates utility relationships and exports account/bill CSV fields plus a manifest summary.
- Added explicit CSV parsing/mapping architecture; interactive provider-header mapping is deferred to V5.0.x.
- Kept audit schema 4, IndexedDB version 3, offline/GitHub Pages deployment, and V4.3 evidence and rollback protections.

## V4.3 Professional Audit Package Export — release candidate

- Added local offline ZIP generation with `packageFormatVersion: 1` and no dependency or backend.
- Added canonical `audit.json`, integrity `manifest.json`, six UTF-8 CSV tables, and human-readable photo folders.
- Added sequential IndexedDB Blob export, legacy data-URL decoding, safe filenames, collision protection, orphan detection, and ZIP verification.
- Missing referenced photos and broken authoritative relationships produce `FAIL`; incomplete expert exports remain explicitly labeled.
- Added visible progress, result counts, Web Share file support, and download fallback.
- Retained audit schema 4, IndexedDB version 3, all V4.2 persistence/calculation behavior, and read-only export semantics.

## V4.2 Field/Analysis Workflow — release candidate

- Added Field and Analysis modes over one canonical offline audit dataset.
- Classified method inputs as field required, analysis required, or recommended without changing formulas.
- Added deterministic source auto-binding with provenance priority, conflict visibility, explicit selection for equal-ranked conflicts, and reusable stable references.
- Added ECM analysis recipes, an Analysis Queue, separate field-documentation/calculation readiness, and derived export readiness.
- Added Before Leaving Site review for calculation field inputs, ECM field requirements, and equipment-specific required photos.
- Added explicit equipment grouping and auditor-confirmed representative sampling with recorded population/sample membership and Estimated/Level C provenance.
- Added pump VFD and boiler-efficiency ECM templates while preserving the V4.1 method registry and validation-only restrictions.
- Retained audit schema 4, IndexedDB version 3, GitHub Pages/offline architecture, migration safeguards, and prior audit compatibility.

## V4.1 Full Engineering Library — release candidate

- Implemented all 25 `READY-V1` methods from the California V1.1 engineering library with explicit units, provenance, evidence, warnings, and deterministic QA.
- Added 11 non-calculating `VALIDATE-V2` registry/readiness entries with `METHOD_REQUIRES_VALIDATION` status.
- Added explicit baseline, proposed, affected-operation, end-use, energy-stream, component-role, and interaction metadata.
- Added stable calculation dependencies, dependency-chain staleness propagation, prior revision snapshots, and potential-overlap flags.
- Added TOU/demand series inputs, affinity bins, conditional DHW efficiency/COP inputs, and readable method readiness panels.
- Expanded export integrity checks for missing dependencies and source records.
- Retained audit schema 4 and IndexedDB version 3; no audit migration, paid dependency, backend, or hidden default was introduced.

## V4.0 Phase 1 — release candidate

- Added the authoritative California V1.1 engineering calculation library and no-deemed-savings/evidence policy.
- Added a pure offline calculation engine containing only ten approved, versioned Phase 1 methods.
- Added exact input snapshots, provenance, evidence levels, maturity, assumptions, warnings, QA flags, stable source relationships, and source fingerprints.
- Added compact calculation create/inspect/recalculate/delete workflows within saved ECMs.
- Added stale-result detection when a linked equipment field, measurement, utility rate, ECM cost, or upstream calculation changes/disappears.
- Protected calculation-linked equipment and ECMs from deletion.
- Included complete calculation records and calculation-integrity warnings in JSON export.
- Added `calculations.js` to the service-worker cache without changing production Pages architecture.
- Added deterministic numerical and lifecycle tests while retaining the V3 reliability suite.
- Retained audit schema 4 and IndexedDB version 3; no destructive migration is introduced.

No backend, AI calculation, paid dependency, deemed-savings automation, framework migration, new equipment family, or unrelated engineering method was added.
