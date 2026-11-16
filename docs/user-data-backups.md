# User data backups

Before an agent makes any database changes, take a new, verified, full user-scoped backup. This is an operational safeguard for agent-run maintenance; it does not create scheduled backups or run on every normal in-app save.

Run from the repository root:

```powershell
node scripts/backup-user-data.cjs --uid <app-user-uid> --email <verified-email> --project <project-id> --bucket <storage-bucket>
```

Use the app user's UID and verify their email. The Firebase CLI account supplies administrative read credentials; it is not necessarily the target app account.

The command enumerates root collections, captures documents keyed by the user UID, and recursively visits all their subcollections, including descendants of missing documents. Firestore reads share one read time. This covers the current `users/{uid}` and `budgets/{uid}` data model. If a future feature stores user data under a different ownership scheme, extend the discovery before claiming complete coverage.

It also downloads all generations listed under Firebase Storage `users/{uid}/`, preserves metadata and original paths, and verifies referenced uploaded files exist in the backup. External image links remain links; they are not user-uploaded Storage files. Encrypted password-vault data stays encrypted.

A backup is successful only when its manifest says `complete`. Failed reads, missing referenced files, and checksum failures produce a failed manifest and a nonzero exit code. Never perform a dependent database change after a failed backup.

Backups are saved in `local-backups/user-data/<uid>/<timestamp>/` and excluded from Git. They contain sensitive personal and financial data. `firestore.json` preserves raw document paths, typed fields and original timestamps. `manifest.json` records roots, collection/document counts, Storage object metadata and SHA-256 checksums. Never overwrite or silently prune a snapshot. Keep an additional secure copy outside this computer for protection against disk failure.

Before restoring, compare the snapshot with current records and prepare a specific, approved change set. Preserve new records and use write preconditions to prevent accidental overwrites or duplicate payments. Verify both document fields and financial totals afterward.

The earlier Budget-only reset and payment-restoration snapshots are preserved separately under `local-backups/recovery-history/`. They remain partial historical evidence, not full database backups.

Run backup safeguard tests with `node --test scripts/backup-user-data.test.cjs`.

## Download from the app

More and Settings both provide **Download my data**. The browser downloads a ZIP with raw typed Firestore records, a manifest of counts and SHA-256 checksums, and original uploaded files. Vault ciphertext is copied without unlocking or decrypting it. There is no automatic restore or database mutation in this download feature.

The browser cannot enumerate arbitrary Firestore subcollections using user credentials, so `src/app/core/backups/user-data-export.ts` explicitly covers every current and legacy app collection plus vehicle refuels, including refuels beneath missing vehicle records. `node --test scripts/user-export-schema.test.cjs` checks that collection paths in the rules are represented; extend the registry and nested traversal whenever adding stored user data. Owner-only legacy collection reads, settings listing, and Storage prefix listing require the accompanying Firestore and Storage rules to be deployed.

If a record or uploaded file cannot be read, no archive is downloaded. All Firestore reads share the initial server read time; uploaded file generations and checksums are recorded separately. A sign-out or account switch aborts the export. Keep downloaded archives somewhere secure, including a second location for disk-failure protection.
