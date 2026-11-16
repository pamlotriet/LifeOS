import { FirestoreDocument } from '@core/firebase/firestore.service';

// Keep this registry aligned with every user-scoped collection in firestore.rules.
export const USER_COLLECTIONS = [
  'books',
  'bookTags',
  'readingGoals',
  'gymExercises',
  'gymPlan',
  'nutrition',
  'ingredients',
  'recipes',
  'mealPlan',
  'groceryItems',
  'vault',
  'passwords',
  'vehicles',
  'planningEvents',
  'planningReminders',
] as const;
export const BUDGET_COLLECTIONS = [
  'transactions',
  'categories',
  'plans',
  'debts',
  'settings',
  'spendingBalances',
  'accounts',
] as const;
export interface BackupProgress {
  phase: 'records' | 'files' | 'archive';
  documents: number;
  files: number;
}
export interface UserExportTransport {
  json(url: string, init?: RequestInit): Promise<any>;
  bytes(url: string): Promise<Uint8Array>;
}
export interface UserExportOptions {
  uid: string;
  project: string;
  bucket: string;
  transport: UserExportTransport;
  progress?: (progress: BackupProgress) => void;
}
export async function collectUserExport(options: UserExportOptions) {
  const { uid, project, bucket, transport } = options;
  const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
  const userName = `projects/${project}/databases/(default)/documents/users/${uid}`;
  const initial = await transport.json(base + ':batchGet', {
    method: 'POST',
    body: JSON.stringify({ documents: [userName] }),
  });
  const profile = initial.find((row: any) => row.found?.name === userName);
  if (!profile?.readTime) throw new Error('Could not start a consistent account backup.');
  const readTime: string = profile.readTime;
  const documents: FirestoreDocument[] = [profile.found];
  const collections: string[] = [];
  const paths: string[] = USER_COLLECTIONS.map((collection) => `users/${uid}/${collection}`);
  paths.push(...BUDGET_COLLECTIONS.map((collection) => `budgets/${uid}/${collection}`));
  const missingParents: string[] = [];
  const report = (phase: BackupProgress['phase'], files = 0) =>
    options.progress?.({ phase, documents: documents.length, files });
  async function listCollection(collection: string): Promise<void> {
    collections.push(collection);
    let pageToken: string | undefined;
    do {
      const page = await transport.json(
        `${base}/${collection}?pageSize=300&showMissing=true&readTime=${encodeURIComponent(readTime)}${pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''}`,
      );
      for (const document of page.documents ?? []) {
        if (document.fields || document.createTime) documents.push(document);
        else missingParents.push(document.name);
        if (collection === `users/${uid}/vehicles`) {
          const id = document.name.split('/').at(-1);
          await listCollection(`users/${uid}/vehicles/${encodeURIComponent(id)}/refuels`);
        }
      }
      pageToken = page.nextPageToken;
      report('records');
    } while (pageToken);
  }
  for (const collection of paths) await listCollection(collection);
  const storageBase = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o`;
  const items: Array<{ name: string; bucket?: string }> = [];
  let pageToken: string | undefined;
  do {
    const page = await transport.json(
      `${storageBase}?prefix=${encodeURIComponent(`users/${uid}/`)}&maxResults=1000${pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''}`,
    );
    items.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  const files: Record<string, Uint8Array> = {};
  const storageObjects: Array<{
    name: string;
    file: string;
    metadata: unknown;
    sha256: string;
    size: number;
  }> = [];
  const hash = async (data: Uint8Array) =>
    Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(data).buffer)))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  for (const item of items) {
    if (!item.name.startsWith(`users/${uid}/`))
      throw new Error('The backup returned a file outside your account.');
    const address = `${storageBase}/${encodeURIComponent(item.name)}`;
    const metadata = await transport.json(address);
    const bytes = await transport.bytes(
      `${address}?alt=media${metadata.generation ? '&generation=' + encodeURIComponent(metadata.generation) : ''}`,
    );
    if (metadata.size !== undefined && Number(metadata.size) !== bytes.length)
      throw new Error('An uploaded file changed during backup. Please try again.');
    const nameHash = await hash(new TextEncoder().encode(item.name));
    const filename = `storage/${nameHash}.bin`;
    files[filename] = bytes;
    storageObjects.push({
      name: item.name,
      file: filename,
      metadata,
      sha256: await hash(bytes),
      size: bytes.length,
    });
    report('files', storageObjects.length);
  }
  const captured = new Set(storageObjects.map((item) => item.name));
  function verifyReferences(value: any, key = ''): void {
    if (value && typeof value === 'object') {
      if (
        /^(photoPath|receiptPath|photoStoragePath)$/.test(key) &&
        value.stringValue?.startsWith(`users/${uid}/`) &&
        !captured.has(value.stringValue)
      )
        throw new Error(
          'An uploaded file referenced by your records is missing. The backup was not completed.',
        );
      for (const [childKey, child] of Object.entries(value)) verifyReferences(child, childKey);
    }
  }
  documents.forEach((document) => verifyReferences(document.fields));
  const encode = (value: unknown) =>
    new Uint8Array(new TextEncoder().encode(JSON.stringify(value, null, 2)));
  files['firestore.json'] = encode({ readTime, documents, collections, missingParents });
  const manifest = {
    version: 1,
    status: 'complete',
    project,
    uid,
    bucket,
    readTime,
    completedAt: new Date().toISOString(),
    documentCount: documents.length,
    collectionCount: collections.length,
    missingParents,
    storageObjects,
    checksums: {
      'firestore.json': await hash(files['firestore.json']),
      ...Object.fromEntries(storageObjects.map((item) => [item.file, item.sha256])),
    },
    scope:
      'All current and legacy LifeOS user collections in the export registry, including vehicle refuels and all uploaded files under the user Storage prefix. Password-vault records remain encrypted.',
  };
  files['manifest.json'] = encode(manifest);
  files['README.txt'] = new Uint8Array(
    new TextEncoder().encode(
      'LifeOS full account copy\n\nfirestore.json contains original document paths and typed data. manifest.json lists collection coverage, counts, file paths, metadata and SHA-256 checksums. storage/ contains uploaded files; use the manifest to recover original filenames and content types.\n\nPassword-vault records stay encrypted and require your original master password. External image links remain links. Keep this archive private. This archive does not automatically restore or overwrite data.\n',
    ),
  );
  report('archive', storageObjects.length);
  return { files, manifest };
}
