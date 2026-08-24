# Audist V6.2 Level 2 Report Engine

## V7.0 deterministic renderer

V7 extends the schema-1 narrative and numeric-claim validator with the separate schema-2 renderer in `REPORT_RENDERING_SPEC.md`. Existing fingerprints, canonical metrics, strict AI-response validation, and source separation remain authoritative. Deterministic tables and charts never depend on AI prose, and report approval remains an explicit engineer action.

## Governing boundary

**The report is a representation of the Audist engineering record. Report generation must not create new engineering facts.** The engine organizes, validates, renders, and permits narrative edits to a derived deliverable. It never changes measurements, utility bills, equipment facts, ECMs, calculations, provenance, evidence, QA findings, or portfolio results.

## Model and workflow

Optional `reports[]` stores version-1 derived reports with stable report/audit identity, source fingerprint/timestamps, QA/AI/portfolio references, structured sections, deterministic tables, selected figures, limitations, unresolved issues, source references, numeric claims, timestamps, and lightweight revision history. Audit schema remains 4 and IndexedDB remains version 3; existing audits need no migration.

Analysis Mode evaluates `NOT_READY`, `READY_WITH_LIMITATIONS`, or `READY_FOR_DRAFT`. Data-integrity blockers prevent preparation. Other unresolved issues remain visible. `Prepare Report Draft` creates local `report_request.json` and `REPORT_DRAFT_INSTRUCTIONS.md`; Audist does not transmit them.

## Validation and traceability

Import is all-or-nothing. It rejects malformed or wrong-audit responses, unsupported schema, unknown ECM/calculation/photo/table references, and unsupported numeric claims. Material numeric claims must identify a canonical metric and match the stored value within a 0.1% or 0.01-unit rounding tolerance. Missing values remain null and render as “Not calculated,” never zero.

Sections retain `sourceRecordIds[]`; quantitative claims retain canonical metric IDs and calculation/ECM references. This supports report → ECM → calculation → method/version → inputs → provenance → evidence.

Photos remain user-selected through `includeInReport`; caption, section, and order metadata are additive. Narrative edits change only the report. Material source changes make the report stale. Report integrity is independent from package integrity and returns `PASS`, `PASS_WITH_WARNINGS`, or `FAIL`.

## Output and limitations

V6.2 supports structured JSON and responsive printable HTML. Browser Print → Save as PDF is the initial PDF workflow. Browser pagination, very large image memory, DOCX, automatic AI APIs, backend transport, cloud sync, paid PDF generation, and complex desktop publishing remain future work.
## V6.3 report boundary

Reports continue to recommend accepted ECM records only. Opportunity flags and rejected/deferred/unaccepted candidates do not become recommendations and affect report content only through an intentional later observations/future-investigation workflow. V6.3 field-handoff metadata does not stale an otherwise current report; accepting a candidate creates an ECM and therefore changes the engineering fingerprint.
