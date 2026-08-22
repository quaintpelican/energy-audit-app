# Field Energy Audit — V1

A zero-backend Progressive Web App for collecting structured field energy-audit data on an iPhone.

## Included in V1
- Site record
- HVAC equipment records
- Lighting records
- Domestic hot water records
- ECM opportunity records
- Local browser storage
- Offline PWA shell
- Structured JSON export
- Copyable AI-analysis prompt

## Fastest way to run it
Because browsers restrict service workers on local files, host the folder on any free static host.

### GitHub Pages
1. Create a free GitHub repository.
2. Upload all files from this folder.
3. In repository Settings → Pages, publish from the main branch/root.
4. Open the generated HTTPS URL in Safari on iPhone.
5. Share → Add to Home Screen.

### Cloudflare Pages
Upload/deploy this folder as a static site. No build command is required.

## Important
Audit records are currently stored only in the browser's local storage. Export JSON frequently as a backup.

## Next engineering milestones
1. Replace localStorage with IndexedDB.
2. Add photo capture and attachment storage.
3. Add structured measurement objects with units and provenance.
4. Add utility-bill entry/import.
5. Add audit completeness checks by ECM.
6. Add engineering calculators.
7. Generate a complete audit ZIP package containing JSON/CSV/photos.
