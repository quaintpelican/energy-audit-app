# Audist V7.0 Professional Report Rendering

## Governing boundary

**Audist owns the engineering facts and numbers. AI may draft prose. The renderer owns formatting.** The professional report is a versioned derived deliverable. Generation, editing, configuration, rendering, revision, preview, and export must never mutate equipment, measurements, photos, utility bills, calculations, ECMs, portfolios, QA findings, provenance, evidence, or maturity.

## Architecture and model

The offline pipeline is canonical audit data → deterministic utility/end-use/portfolio/QA analysis → validated report model → optional engineer/AI narrative → deterministic tables/charts/figures → standalone HTML/CSS → browser Print / Save as PDF. `report-renderer.js` contains no calculation formulas and uses no backend, API, network font, PDF service, or paid dependency.

V7 reports use independent report schema 2 inside additive `reports[]`. They retain audit/fingerprint/time identity, title/client/preparer/theme, configurable sections and appendices, deterministic tables/charts, selected photo figures, ECM calculation snapshots, limitations, source references, status, revision history, and timestamps. Audit schema remains 4 and IndexedDB remains 3. V6.2 schema-1 imported drafts remain readable and exportable.

## Structure and deterministic content

The default body contains Executive Summary, Facility Description, Audit Scope and Methodology, Utility Analysis, Existing Building Systems, End-Use Analysis, Energy Conservation Measures, ECM Portfolio Summary, Financial Analysis, Implementation Considerations, M&V Considerations, Assumptions and Limitations, and Conclusions. A generated TOC lists included sections without PDF page numbers. Sections carry `include`, `order`, `heading`, and narrative independently of deterministic components.

Appendices A–G cover equipment, measurements, utility bills, detailed calculations, photo log, QA/QC, and supporting assumptions/limitations. Each appendix can be included or excluded without deleting source evidence.

Executive, facility, utility, end-use, system-family, ECM, portfolio, financial, appendix, and calculation-input tables come directly from canonical records or current deterministic modules. Missing values render as `Not Calculated` or `—`, never zero. Portfolio tables use current interaction-adjusted results; standalone results are not summed over an adjusted portfolio.

Monthly utility and end-use charts are native accessible SVG, start at zero, carry labels and units, render offline, and are omitted when no points exist. AI never supplies chart values. Every ECM uses a consistent section and summary callout, retains recommendation status, supports unquantified opportunities, shows method/version/formula/input provenance where present, and states that missing results require more data or a validated method.

## Theme, figures, and accessibility

Theme configuration is limited to logo, company, accent color, footer, confidentiality text, and prepared-by information. The default remains readable in grayscale. The cover includes facility, address, prepared-for/by, audit/report dates, project number, revision, and integrity.

Only photos explicitly marked `includeInReport` become figures. Figure metadata retains photo ID, equipment, section, caption, order, alt text, and full/half layout. Preview resolves IndexedDB Blobs locally; exported HTML points to packaged photo files. Originals remain evidence Blobs and are not altered.

### Premium publication design

The V7 publication layer uses reusable offline design tokens and components rather than page-specific styling. The system defines a print-safe typographic scale, vertical rhythm, neutral/accent palette, KPI metrics, engineering/financial/executive/utility/appendix table variants, chart panels, ECM headers and performance strips, provenance/status labels, calculation panels, callouts, and single/two-column figure layouts.

Executive content prioritizes decisions and current metrics; the main report prioritizes engineering interpretation; appendices prioritize traceability. Numeric table columns are right-aligned and protected from wrapping. Missing values retain explicit `Not Calculated`, `Not Quantified`, or em-dash presentation and are never converted to zero for appearance. Charts remain deterministic accessible SVG with zero baselines, units, restrained gridlines, annual-total context, and a ranked horizontal end-use view. Recommendation states remain legible by text and border treatment in grayscale.

The cover, table of contents, numbered section headers, running elements, paragraph widths, table density, photograph sizing/captions, widow/orphan controls, and selective page breaks are optimized for US Letter output. Screen preview adds only a neutral workspace and page shadow; these effects are removed in print.

## Status, revisions, and integrity

Statuses are `DRAFT`, `NEEDS_ENGINEER_REVIEW`, `READY_TO_ISSUE`, `STALE`, and `SUPERSEDED`. Generation does not imply approval. Engineer confirmation creates a lightweight revision with number, date, note, and source audit timestamp. Engineering fingerprint changes make the report stale; no issued report is silently refreshed.

Integrity returns `PASS`, `PASS_WITH_WARNINGS`, or `FAIL`. It verifies audit/schema identity, source references, selected photo relationships/payload context, staleness, limitations, and engineer approval. Existing V6.2 numeric-claim validation remains authoritative for imported AI narrative.

## HTML, print, and package behavior

HTML uses US Letter layout, 0.7-inch print margins, web-safe fonts, repeatable table headings where supported, conservative page breaks, bounded images, captions, semantic table headers, chart ARIA labels, cover, TOC, and running header/footer fallbacks. Browser page-number/header/footer support varies; desktop Chrome or Safari is recommended for final PDF review. Page-numbered TOC and DOCX remain future work.

Professional Audit Package format 10 includes `report/report.json`, standalone `report/report.html`, selected photo assets, and manifest report ID/schema/renderer/revision/status/integrity/source timestamp. `audit.json` remains canonical.
