# Field Energy Audit — V3

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


## V2.1 photo upgrades
- Camera / photo-picker input on iPhone.
- Required photo categorization workflow.
- Optional photo notes.
- Automatic client-side image compression before IndexedDB storage.
- Automatic filenames tied to equipment IDs and categories.
- Photo metadata stores original/compressed byte counts and resized dimensions.
- Photo cards display category, note, and approximate stored size.

### Recommended field photo pattern
For major equipment, capture at minimum:
- Equipment Overview
- Nameplate
- Controls
- Deficiency, when applicable


## V3 upgrades
- Utility-rate fields and monthly utility records
- ECM templates for common HVAC, lighting, and DHW measures
- Required-data rules for each ECM template
- Automatic ECM completeness scoring
- Visual completeness bars in the ECM list
- Utility months included in audit review and AI export

## Current ECM templates
- HVAC Supply Fan VFD
- HVAC Schedule Optimization
- Economizer Repair / Optimization
- LED Lighting Retrofit
- Lighting Controls
- Heat Pump Water Heater
- Tankless Water Heater

## Next milestone
- equipment-specific required-photo logic
- editable ECMs
- utility CSV import
- engineering calculators for first ECM families
- optional cloud backup/sync
