# Field Energy Audit — V2

Offline-first Progressive Web App for structured field energy audits.

## V2 upgrades
- IndexedDB instead of localStorage
- Multiple audits
- Audit dashboard
- Autosave with visible save status
- Editable equipment records
- Structured measurement records with provenance
- Camera/photo attachment support
- Audit summary counts
- JSON export for AI / ASHRAE Level 2 analysis
- Updated offline service worker

## Deploy on GitHub Pages
Replace the files in your existing repository root with these files and commit the changes.
Your existing GitHub Pages URL can remain the same.

## Important backup note
V2 is still local-first. IndexedDB is more appropriate than localStorage, but it is not cloud backup.
Export JSON after field work until cloud sync is added.

## Recommended next milestone
V2.1 / V3 should add:
1. photo categories and compression
2. utility bill / interval data
3. ECM templates with required-data checklists
4. automatic data completeness scoring
5. engineering calculators
6. optional cloud backup/sync
