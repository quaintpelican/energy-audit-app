# Audist — V3.1

Offline-first iPhone energy-auditing PWA supporting structured ASHRAE Level 2 field data collection.

## V3.1 focus
Data safety, migration control, referential integrity, and dynamic completeness.

## Reliability patch
- Audit/photo additions and deletions commit atomically across IndexedDB stores.
- Database upgrades retain recoverable pre-migration audit copies.
- Audits from unsupported future schema versions are refused rather than overwritten.
- Ambiguous legacy equipment relationships are preserved as migration warnings.
- Unresolved legacy ECM relationships retain their original display IDs in `unresolvedEquipmentReferences` until explicit future resolution.
- Saves are serialized and destructive UI changes roll back when persistence fails.
- Duplicate equipment IDs are blocked before persistence.
- ECM completeness requires selected equipment and usable measurement/photo evidence.
- ECM display relationships refresh from stable record IDs.
- ECM IDs remain unique after deletions.
- JSON exports include integrity diagnostics and explicitly disclose that photo blobs are excluded.
- Audits with migration backups expose an **Export Pre-Migration Backup** action.
- Service-worker updates no longer take control of an already-open page immediately.

## Major changes
- True equipment autosave: new equipment is persisted immediately.
- Measurements persist immediately.
- Photo files are stored as IndexedDB Blobs in a dedicated `photos` object store.
- Equipment editor uses **Done** rather than relying on Save as the persistence event.
- Pending saves flush when the app backgrounds/page hides.
- Save functions return success/failure; dialogs remain open on failed critical writes.
- Introduced explicit `APP_VERSION`, `SCHEMA_VERSION`, and IndexedDB `DB_VERSION`.
- Existing V2/V3-style audits are migrated to schema version 3 on open.
- ECM relationships use stable equipment `recordId` UUIDs while retaining display IDs for readability.
- Duplicate equipment display IDs are blocked.
- Linked equipment cannot be deleted until ECM relationships are removed.
- ECMs are editable.
- ECM completeness dynamically recalculates from current audit data.
- Required and Recommended ECM inputs are distinguished.
- Equipment photo completeness is shown.
- Measurement records now include `numericValue` when numeric input is provided.
- Service Worker only removes Audist/legacy Field Energy Audit caches.

## Migration
Opening an older IndexedDB audit automatically adds missing V3 structures and stable ECM equipment relationships where they can be resolved. Migration does not invent engineering values.

Before replacing the primary audit, Audist validates the migrated structure and stores the complete original audit in the `migrationBackups` object store. Ambiguous or missing legacy equipment IDs remain in each ECM's `unresolvedEquipmentReferences` and continue to block potentially destructive equipment deletion.

### Migration-backup recovery

When a backup exists, open the migrated audit and select **Export Pre-Migration Backup**. This downloads the exact pre-migration audit JSON. Keep it until the migrated audit has passed relationship, equipment, measurement, photo, and export verification. Permanently deleting the audit also deletes its migration backups.

### Rollback-safe deployment

Deploy the DB-v3 bridge in `release/rollback-bridge/` before the complete V3.1 release. Once a device has opened database version 3, roll back only to the bridge release, never to the original DB-v2 build.

Legacy V2.1/V3 photos embedded as `dataUrl` remain readable. New photos use the dedicated IndexedDB photo store.

## Known limitations
- Legacy embedded photos are not automatically converted into Blob records yet.
- JSON export contains audit metadata but does not yet package new photo Blobs as JPG files.
- Canonical measurement parameter IDs and unit validation are not yet implemented.
- Engineering calculation engine is not yet implemented.
- Cloud backup/sync is not yet implemented.
- The JSON export is not a complete photo backup; retain original field photos until a portable photo-package export is implemented.

## Deployment
Replace the repository root files with this release and commit to GitHub. Open the GitHub Pages URL in Safari once after deployment to allow the new Service Worker and IndexedDB schema to activate.

## Required test procedure
1. Open an existing V3 audit and confirm it loads.
2. Create a new audit and verify V3.1 is shown.
3. Add equipment, type fields, close the equipment dialog without pressing Done, reopen, and confirm data remains.
4. Add a measurement, close/reopen, confirm persistence.
5. Add a photo, close/reopen, confirm persistence.
6. Put the phone in Airplane Mode and repeat field edits.
7. Create an ECM linked to equipment; rename the equipment ID and confirm the ECM remains linked.
8. Add missing ECM data and verify completeness updates.
9. Attempt to delete equipment linked to an ECM and confirm deletion is blocked.
10. Export JSON and confirm the audit dataset is readable.

