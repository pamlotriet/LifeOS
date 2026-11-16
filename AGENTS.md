# User database backup requirement

The user requires a full backup of the signed-in user's data before any agent-operated database write, reset, migration, bulk update, deletion, or restoration.

- Verify the target user UID and email first. Never substitute the Firebase CLI account UID for the app user's UID.
- Run `node scripts/backup-user-data.cjs --uid <app-user-uid> --email <verified-email> --project <project-id> --bucket <storage-bucket>` before changing data.
- Back up all user-scoped root documents and recursively enumerate every subcollection, including descendants of missing parent documents. A Budget-only backup is insufficient.
- Capture uploaded Firebase Storage files and their metadata, not just image URLs. Preserve encrypted vault records as stored; do not decrypt them.
- Require `manifest.json` status `complete`, verified checksums, recorded paths/counts, and a durable backup under ignored `local-backups/user-data/`. Never use the system temporary directory as the only backup.
- If any read or verification fails, stop all dependent database writes. Never label a partial snapshot a full backup.
- Before destructive changes, compare source records against the verified snapshot and verify preservation requirements at the record and computed-balance level. Explicitly examine paid and planned debt history.
- Preserve backups; do not commit them, upload them publicly, silently prune them, or overwrite earlier snapshots. Backups do not themselves authorize database changes.

Application implementation conventions are in `src/app/AGENTS.md`.
