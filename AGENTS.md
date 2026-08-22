# AGENTS.md

## Repository purpose

Audist is an offline-first, iPhone-focused energy-auditing PWA supporting professional ASHRAE Level 2 fieldwork.

## Required context

Before significant changes:

1. Read `docs/DOCUMENTATION_INDEX.md`.
2. Follow the authority order defined there.
3. Inspect the current code and changelog before claiming a requirement is implemented.
4. Keep each task within the user's stated scope.

## Non-negotiable engineering rules

- Never risk losing field data.
- All field workflows must remain usable offline.
- Preserve existing IndexedDB audits through backward-compatible changes or explicit, tested migrations.
- Never fabricate measurements, specifications, schedules, utility data, costs, savings, or other engineering facts.
- Preserve provenance: Measured, Nameplate, Calculated, Estimated, or Assumed.
- Prefer structured data and transparent, reproducible calculations.
- Optimize field workflows for one-handed iPhone use, minimal typing, and clear save state.
- Do not place customer audit data, utility records, facility photos, credentials, or secrets in this public repository.
- Do not introduce paid services, recurring costs, a backend, or new deployment requirements without explicit approval and documented tradeoffs.
- Prefer the smallest robust change over unnecessary architectural complexity.

## Change discipline

For meaningful changes:

1. Define the field or engineering problem.
2. Evaluate schema and migration impact.
3. Protect offline behavior and persistence.
4. Test in proportion to risk, including legacy-audit compatibility where applicable.
5. Document release changes, limitations, deployment steps, and required iPhone verification.
6. Do not claim functionality exists unless it is present in delivered code.

Do not modify application behavior, deployment configuration, or release versions unless the task explicitly requires it.
