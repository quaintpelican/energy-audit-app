# Audist Documentation Index

## Purpose
This folder is the product and engineering knowledge base for Audist, an offline-first iPhone energy-auditing PWA supporting high-quality ASHRAE Level 2 audits.

## Authority
Use documents in this order when decisions conflict:

1. **PROJECT_SPEC.md** — product principles, architecture, non-negotiable requirements.
2. **DATA_SCHEMA.md** — canonical data structures, IDs, provenance, relationships, migrations.
3. **ECM_LIBRARY.md** — ECM requirements, field-data completeness rules, applicability.
4. **CALCULATION_LIBRARY.md** — approved deterministic engineering calculation methods.
5. **ROADMAP.md** — priorities and planned sequencing; not proof of implementation.
6. **CHANGELOG.md** — what was actually implemented in each release.

## Important distinction
A requirement in the specification or roadmap is not necessarily implemented. The CHANGELOG and delivered code determine current functionality.

## Source of truth
- GitHub repository: application code and version history.
- ChatGPT Project: product/design/engineering collaboration and reference documents.
- iPhone IndexedDB: active local audit data.
- Exported audit packages: portable project records and AI-analysis inputs.

Never place customer audit data, utility data, or facility photos in a public source-code repository.

V4.2 retains `ENGINEERING_CALCULATION_LIBRARY_CA.md` as the governing calculation-method source. Workflow metadata may organize approved methods and inputs, but it may not alter formulas, invent evidence, or imply that validation-only methods calculate savings.

- [PROFESSIONAL_AUDIT_PACKAGE.md](PROFESSIONAL_AUDIT_PACKAGE.md) — V4.3 ZIP structure, manifest, integrity, photo, CSV, versioning, and limitations.
- [UTILITY_ANALYSIS.md](UTILITY_ANALYSIS.md) — V5.0 account/bill model, baseline calculations, completeness, QA/QC, export, and limitations.
- [END_USE_RECONCILIATION.md](END_USE_RECONCILIATION.md) — V5.1 canonical end-use models, hierarchy, provenance, reconciliation formulas, QA, persistence, export, and limitations.



## V4.0 Phase 1 additions
- [ENGINEERING_CALCULATION_LIBRARY_CA.md](ENGINEERING_CALCULATION_LIBRARY_CA.md) — authoritative California V1.1 engineering/evidence policy and validated method library.
- Executable Phase 1 scope and implementation status are summarized in [CALCULATION_LIBRARY.md](CALCULATION_LIBRARY.md).
