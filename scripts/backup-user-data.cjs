/* Read-only user backup. Usage: node scripts/backup-user-data.cjs --uid UID --email EMAIL --project PROJECT --bucket BUCKET */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');

async function main(options = {}) {
  const fetch = options.fetch || globalThis.fetch;
  const args =
    options.args ||
    Object.fromEntries(
      process.argv.slice(2).reduce((pairs, value, index, all) => {
        if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1]]);
        return pairs;
      }, []),
    );
  for (const key of ['uid', 'email', 'project', 'bucket'])
    if (!args[key] || args[key].startsWith('--')) throw new Error(`Missing --${key}`);
  if (
    !/^[a-zA-Z0-9_-]+$/.test(args.uid) ||
    !/^[a-z0-9.-]+$/.test(args.project) ||
    !/^[a-z0-9.-]+$/.test(args.bucket)
  )
    throw new Error('Invalid backup scope.');
  let auth = options.auth;
  if (!auth) {
    try {
      auth = require('firebase-tools/lib/auth');
    } catch {
      auth = require(
        path.join(
          execSync('npm root -g', { encoding: 'utf8' }).trim(),
          'firebase-tools/lib/auth.js',
        ),
      );
    }
  }
  const account = auth.getGlobalDefaultAccount();
  if (!account) throw new Error('Sign in with Firebase CLI before backing up.');
  const token = await auth.getAccessToken(account.tokens.refresh_token, [
    'https://www.googleapis.com/auth/cloud-platform',
  ]);
  const headers = { Authorization: `Bearer ${token.access_token}` };
  const base = `https://firestore.googleapis.com/v1/projects/${args.project}/databases/(default)/documents`;
  const profileResponse = await fetch(`${base}/users/${args.uid}`, { headers });
  if (!profileResponse.ok)
    throw new Error(`Cannot verify the target user (HTTP ${profileResponse.status}).`);
  const profile = await profileResponse.json();
  if (profile.fields?.email?.stringValue?.toLowerCase() !== args.email.toLowerCase())
    throw new Error('Target user email does not match.');
  const readTime = new Date().toISOString();
  const destination = path.resolve(
    args.output ||
      path.join('local-backups', 'user-data', args.uid, readTime.replace(/[:.]/g, '-')),
  );
  if (fs.existsSync(destination))
    throw new Error('Backup destination already exists; backups must never be overwritten.');
  fs.mkdirSync(path.join(destination, 'storage'), { recursive: true });
  const manifest = {
    version: 1,
    status: 'in-progress',
    project: args.project,
    uid: args.uid,
    email: args.email,
    bucket: args.bucket,
    readTime,
    roots: [],
    rootCollections: [],
    documentCount: 0,
    missingParentCount: 0,
    collectionCount: 0,
    storageObjects: [],
    checksums: {},
    completedAt: null,
  };
  const manifestFile = path.join(destination, 'manifest.json');
  const saveManifest = () => fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  saveManifest();
  async function json(url, init = {}, allowMissing = false) {
    const response = await fetch(url, {
      ...init,
      headers: { ...headers, ...init.headers },
      signal: AbortSignal.timeout(60000),
    });
    if (allowMissing && response.status === 404) return null;
    if (!response.ok)
      throw new Error(`Backup read failed (HTTP ${response.status}) for ${new URL(url).pathname}.`);
    return response.json();
  }
  async function collectionIds(parent) {
    const ids = [];
    let cursor;
    do {
      const result = await json(`${parent}:listCollectionIds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageSize: 100, readTime, ...(cursor ? { pageToken: cursor } : {}) }),
      });
      ids.push(...(result.collectionIds || []));
      cursor = result.nextPageToken;
    } while (cursor);
    return ids;
  }
  const documents = new Map();
  const collections = [];
  const missingParents = new Set();
  async function visitDocument(document, suppliedChildren) {
    if (document.fields || document.createTime) documents.set(document.name, document);
    else missingParents.add(document.name);
    const parent = `https://firestore.googleapis.com/v1/${document.name}`;
    const ids = suppliedChildren || (await collectionIds(parent));
    for (const id of ids) {
      const collectionPath = `${parent}/${encodeURIComponent(id)}`;
      collections.push(document.name + '/' + id);
      let cursor;
      do {
        const result = await json(
          `${collectionPath}?pageSize=300&showMissing=true&readTime=${encodeURIComponent(readTime)}${cursor ? '&pageToken=' + encodeURIComponent(cursor) : ''}`,
        );
        // Visit even missing documents: their descendants can still contain user data.
        for (let index = 0; index < (result.documents || []).length; index += 6) {
          await Promise.all(
            result.documents.slice(index, index + 6).map((child) => visitDocument(child)),
          );
        }
        cursor = result.nextPageToken;
      } while (cursor);
    }
  }
  try {
    const roots = await collectionIds(base);
    manifest.rootCollections = roots;
    for (const root of roots) {
      const url = `${base}/${encodeURIComponent(root)}/${args.uid}`;
      const document = await json(`${url}?readTime=${encodeURIComponent(readTime)}`, {}, true);
      const children = await collectionIds(url);
      if (document || children.length) {
        const name = `projects/${args.project}/databases/(default)/documents/${root}/${args.uid}`;
        manifest.roots.push(name);
        await visitDocument(document || { name }, children);
      }
    }
    const firestore = {
      readTime,
      documents: [...documents.values()],
      collections,
      missingParents: [...missingParents],
    };
    const firestoreFile = path.join(destination, 'firestore.json');
    fs.writeFileSync(firestoreFile, JSON.stringify(firestore, null, 2));
    const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
    manifest.checksums['firestore.json'] = sha256(fs.readFileSync(firestoreFile));
    const storageBase = `https://storage.googleapis.com/storage/v1/b/${args.bucket}/o`;
    const objects = [];
    let cursor;
    do {
      const result = await json(
        `${storageBase}?prefix=${encodeURIComponent('users/' + args.uid + '/')}&maxResults=1000${cursor ? '&pageToken=' + encodeURIComponent(cursor) : ''}`,
      );
      objects.push(...(result.items || []));
      cursor = result.nextPageToken;
    } while (cursor);
    for (const object of objects) {
      const response = await fetch(
        `${storageBase}/${encodeURIComponent(object.name)}?alt=media&generation=${encodeURIComponent(object.generation)}`,
        { headers, signal: AbortSignal.timeout(60000) },
      );
      if (!response.ok)
        throw new Error(
          `Could not back up Storage object ${object.name} (HTTP ${response.status}).`,
        );
      const bytes = Buffer.from(await response.arrayBuffer());
      if (String(bytes.length) !== object.size)
        throw new Error(`Storage size mismatch for ${object.name}.`);
      const filename = 'storage/' + sha256(object.name) + '.bin';
      fs.writeFileSync(path.join(destination, filename), bytes);
      const checksum = sha256(bytes);
      if (sha256(fs.readFileSync(path.join(destination, filename))) !== checksum)
        throw new Error('Backup file verification failed.');
      manifest.storageObjects.push({
        name: object.name,
        file: filename,
        generation: object.generation,
        metadata: object,
        size: bytes.length,
        sha256: checksum,
      });
      manifest.checksums[filename] = checksum;
    }
    // Verify that referenced uploaded files were actually captured, rather than retaining URLs alone.
    const captured = new Set(objects.map((object) => object.name));
    function checkReferences(value, key = '') {
      if (value && typeof value === 'object') {
        if (
          /^(photoPath|receiptPath|photoStoragePath)$/.test(key) &&
          value.stringValue?.startsWith(`users/${args.uid}/`) &&
          !captured.has(value.stringValue)
        )
          throw new Error(`Referenced uploaded file is missing: ${value.stringValue}`);
        for (const [childKey, child] of Object.entries(value)) checkReferences(child, childKey);
      }
    }
    firestore.documents.forEach((document) => checkReferences(document.fields));
    if (sha256(fs.readFileSync(firestoreFile)) !== manifest.checksums['firestore.json'])
      throw new Error('Firestore backup verification failed.');
    manifest.documentCount = documents.size;
    manifest.collectionCount = collections.length;
    manifest.missingParentCount = missingParents.size;
    manifest.status = 'complete';
    manifest.completedAt = new Date().toISOString();
    saveManifest();
    console.log(
      JSON.stringify(
        {
          destination,
          status: manifest.status,
          documents: manifest.documentCount,
          collections: manifest.collectionCount,
          uploadedFiles: manifest.storageObjects.length,
          roots: manifest.roots.map((root) => root.split('/documents/')[1]),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    manifest.status = 'failed';
    manifest.error = error.message;
    saveManifest();
    throw new Error(
      `Backup incomplete; database changes must stop. ${error.message} Backup: ${destination}`,
    );
  }
}
module.exports = { backupUserData: main };
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
