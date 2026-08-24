# V6.3 Field Workflow and Desk Handoff

**Field Mode captures evidence and opportunities. Analysis Mode develops and evaluates ECMs.**

V6.3 follows one rule: collect onsite what is difficult to recover, then analyze at the desk. The canonical equipment, measurement, photo, calculation, ECM, utility, QA, AI-review, portfolio, and report records remain intact.

## Field Mode

Field Mode centers on site/system scope, equipment identity and nameplates, measurements, photos, controls/schedules, observations, lightweight opportunity flags, and the Before Leaving Site review. Its utility summary records which fuels are present, known provider/rate information, receipt status (`NOT_REQUESTED`, `REQUESTED`, `RECEIVED`, `PARTIAL`, or `NOT_AVAILABLE`), an optional explicitly entered analysis rate, and notes. Monthly bills are not a field-completion requirement.

Equipment duplication creates a fresh record UUID and next available display ID. It copies reusable specifications, controls, schedule, system association, and their existing provenance, while clearing serial number, measurements, photos, deficiencies, observations, AI findings, calculations, and ECM conclusions. The source record is never changed.

Refrigeration uses subtype-specific progressive disclosure for self-contained cases, walk-ins, racks, condensing units, evaporators, condensers, ice machines, prep tables, display cases, medical refrigerators, legacy Reach-In records, and Other Refrigeration. Measurement presets fill parameter and unambiguous unit only—never a value. Photo expectations vary by subtype.

Opportunity flags retain stable equipment/system UUIDs, origin, lifecycle status, observation, and timestamps. They are not ECMs and contain no savings. Deterministic rules only suggest candidates; no suggestion is automatically accepted or calculated.

The Field Exit Review includes missing identity, subtype, required photo evidence, high/blocking onsite QA, and field-required evidence associated with flagged opportunities. It deliberately excludes monthly utility history, proposed performance, costs, portfolio analysis, AI review, and report work.

## Analysis Mode

Full V5 utility accounts/bills and deterministic analysis remain in Analysis Mode. Utility-file handoff stores source metadata only; the source binary is not put into the audit database. Audist creates a versioned local extraction request and instructions for an external tool. A response is imported only after structural validation, audit/type/date/unit/numeric/duplicate/overlap checks, a visible preview, and explicit user confirmation. Confirmed bills retain source filename/type, extraction method, `AI Extracted / User Verified`, and import time. No paid API or backend is used.

The ECM Candidate Review combines user flags, deterministic suggestions, and imported V6.1 AI suggestions. `ACCEPT` creates a normal ECM with candidate origin, stable relationships, applicable recipes, and safely derivable existing-condition context. It never invents proposed performance, costs, savings, or assumptions. `REJECT` and `DEFER` preserve history and engineer notes. Manual `+ Create Custom ECM` remains available for unusual measures.

The Analysis Queue summarizes utility receipt/import status, candidate totals/review readiness, calculation readiness, and the existing end-use/reconciliation state. Reports continue to treat accepted ECM records—not flags or unaccepted candidates—as recommendations.

## Compatibility and storage

Audit schema remains 4 and IndexedDB remains 3. The additive `opportunityFlags[]`, `utilityFieldSummary`, and `utilitySourceFiles[]` collections are initialized at runtime/new-audit creation; opening an older V6.2 audit does not rewrite its utility history or existing ECMs. Existing manually created ECMs are not converted into flags. Professional package format 9 adds `tables/opportunity_flags.csv` and handoff/source metadata in canonical `audit.json` and the manifest summary.

