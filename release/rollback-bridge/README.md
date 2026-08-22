# Audist V3.1 DB-v3 Rollback Bridge

This bridge is deployed before the V3.1 reliability release. Its `db.js` changes the production database-opening layer so the current application can open IndexedDB version 3. The separately published `audist-v3.1-db3-bridge` branch also carries the minimum application compatibility guards needed to preserve unresolved relationships, ECM engineering/economic fields, and failed equipment-creation rollback after a V3.1 rollback.

## Deployment order

1. Review and deploy the complete `audist-v3.1-db3-bridge` branch. It changes `db.js` plus narrowly scoped data-preservation guards in `app.js`.
2. Verify existing audits and photos on iPhone, online and offline.
3. Keep the bridge commit/tag as the rollback target.
4. Deploy the complete V3.1 reliability release.

## Rollback

- Before V3.1: roll back to the original production release if the bridge has not opened the database. Once any device opens DB v3, use the bridge commit—not the original DB-v2 commit—as the rollback target.
- After V3.1: roll back all application files to the bridge release. The bridge opens DB v3, ignores the extra `migrationBackups` store, and continues using the existing `audits` and `photos` stores.

Never roll an upgraded device back to code that calls `indexedDB.open("FieldEnergyAuditDB", 2)`.

