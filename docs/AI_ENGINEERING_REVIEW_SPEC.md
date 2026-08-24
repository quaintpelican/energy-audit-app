# Audist V6.1 AI-Assisted Engineering Review

## Governing boundary

**AI reviews the engineering record; it does not become the engineering record.** V6.1 has no AI API, backend, credential, paid service, automatic transmission, or internet requirement for field operation. Audist creates local files for an authorized external review and accepts only a validated structured response.

AI advice is always separate from field evidence, deterministic calculations, deterministic QA/QC, engineering evidence level, calculation maturity, and deterministic audit readiness. Import cannot modify equipment, measurements, photos, utilities, calculations, ECM savings, costs, provenance, evidence, maturity, or deterministic finding states.

## Request protocol

AI review schema version 1 is independent from audit schema 4. `ai_review_request.json` contains request/schema/app/audit versions, audit ID and engineering fingerprint, audit update time, objectives, a review-optimized audit snapshot, derived utility/end-use/portfolio analysis, deterministic QA, privacy notice, standardized instructions, and the required response shape.

Photo metadata includes photo ID, equipment UUID/display ID, category, note, package path, and capture time. Data URLs, Blobs, browser state, database internals, credentials, and unrelated device data are excluded. The basic request therefore cannot support visual or nameplate interpretation unless the user separately supplies authorized images.

`AI_REVIEW_INSTRUCTIONS.md` requires the reviewer to treat supplied evidence as authoritative, respect provenance, distinguish fact/calculation/inference/recommendation/insufficient information, avoid invented values, leave deterministic calculations and QA intact, and return only the required JSON object.

## Response validation

The response requires schema version, matching audit ID, reviewed audit time/fingerprint, reviewer/model metadata, summary/assessment, structured findings, ECM candidates, calculation reviews, data-quality observations, report limitations, preparation notes, and warnings.

Findings have unique IDs, approved category/priority/confidence values, affected record UUIDs, basis, recommendation, and `requiresEngineerReview`. Candidate and finding IDs must be unique. Calculation reviews must reference an existing calculation. Unknown affected records, wrong audit, unsupported schema, unsupported properties that could attempt factual edits, missing arrays, malformed JSON, and duplicate IDs reject the complete import; no partial import occurs.

## Advisory lifecycle

Imported reviews are appended to optional `aiReviews[]`; prior reviews are never overwritten or automatically deleted. Finding dispositions are `OPEN`, `REVIEWED`, `ACCEPTED`, `REJECTED`, and `ACTION_REQUIRED`. Accepted, rejected, and action-required dispositions require an engineer note and timestamp.

AI confidence describes confidence in an observation only. It cannot upgrade evidence level or maturity. Effective AI status is independent from deterministic readiness and may be `NOT_REVIEWED`, `EXPORTED_FOR_REVIEW`, `REVIEW_IMPORTED`, `ENGINEER_REVIEW_REQUIRED`, `REVIEWED`, or `STALE`.

An engineering fingerprint excludes timestamps, review exports, imported reviews, and their dispositions. Changing evidence or engineering records makes historical reviews stale; reviewing AI advice does not. Stale reviews remain readable.

## ECM candidates

AI candidates remain inside their source review as `SUGGESTED`, `REVIEWED`, `ACCEPTED`, or `REJECTED`. Acceptance requires explicit confirmation and creates a normal empty Audist ECM with `origin: AI_SUGGESTED`, source review/candidate IDs, and only valid affected equipment UUIDs. No conditions, specifications, calculations, savings, costs, or evidence are invented. Normal ECM completeness, calculation, QA, and engineer review rules then apply. Rejection retains the candidate and engineer note. An accepted candidate cannot create a second ECM.

## Package and future API path

Professional package format 7 adds `tables/ai_review_findings.csv`, `ai_review/ai_review_request.json`, `ai_review/AI_REVIEW_INSTRUCTIONS.md`, and one JSON file per imported historical review under `ai_review/reviews/`. `audit.json` remains canonical. AI review remains optional and never determines package integrity.

The same versioned request/response validators can later sit behind an explicitly authorized API transport. V6.1 implements no such transport. V6.2 may draft a report only from deterministic records plus engineer-reviewed advisory material; it must retain citations, provenance, limitations, and human approval.
## V6.3 candidate and utility boundaries

V6.1 AI ECM suggestions remain advisory inputs to V6.3 Candidate Review and require explicit engineer accept/reject/defer. Utility extraction is a separate versioned ingestion protocol, not engineering reasoning; Audist makes no API call and imports nothing until validation, preview, and explicit user verification succeed.
