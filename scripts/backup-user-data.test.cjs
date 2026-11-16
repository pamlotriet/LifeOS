const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { backupUserData } = require('./backup-user-data.cjs');

const auth = {
  getGlobalDefaultAccount: () => ({ tokens: { refresh_token: 'test' } }),
  getAccessToken: async () => ({ access_token: 'test' }),
};
function fixture(fail = false) {
  const prefix = 'projects/test/databases/(default)/documents/';
  const root = prefix + 'users/member';
  const requests = [];
  const response = (data, status = 200) => ({ ok: status === 200, status, json: async () => data });
  const fetch = async (address, options = {}) => {
    const url = new URL(address);
    const name = url.pathname.replace(/^\/v1\//, '');
    requests.push({ name, time: url.searchParams.get('readTime') });
    if (url.hostname === 'storage.googleapis.com') return response({ items: [] });
    if (name === root)
      return response({
        name: root,
        fields: { email: { stringValue: 'test@example.com' } },
        createTime: 'before',
      });
    if (name.endsWith(':listCollectionIds')) {
      const parent = name.slice(0, -':listCollectionIds'.length);
      if (parent === prefix.slice(0, -1)) return response({ collectionIds: ['users'] });
      if (parent === root) return response({ collectionIds: ['vehicles'] });
      if (parent === root + '/vehicles/orphan')
        return fail ? response({}, 403) : response({ collectionIds: ['refuels'] });
      return response({ collectionIds: [] });
    }
    if (name === root + '/vehicles')
      return response({ documents: [{ name: root + '/vehicles/orphan' }] });
    if (name === root + '/vehicles/orphan/refuels')
      return response({
        documents: [
          {
            name: root + '/vehicles/orphan/refuels/fill',
            fields: { amount: { doubleValue: 123 } },
            createTime: 'before',
          },
        ],
      });
    throw new Error('Unexpected test request: ' + name);
  };
  return { fetch, requests };
}
async function run(fail, verify) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lifeos-backup-test-'));
  try {
    await verify(directory);
  } finally {
    if (
      !path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep) ||
      !path.basename(directory).startsWith('lifeos-backup-test-')
    )
      throw new Error('Unexpected test cleanup path.');
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
test('captures records below missing parents and verifies a complete manifest', () =>
  run(false, async (directory) => {
    const { fetch } = fixture();
    const output = path.join(directory, 'snapshot');
    await backupUserData({
      args: { uid: 'member', email: 'test@example.com', project: 'test', bucket: 'test', output },
      auth,
      fetch,
    });
    const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json')));
    const firestore = JSON.parse(fs.readFileSync(path.join(output, 'firestore.json')));
    assert.equal(manifest.status, 'complete');
    assert.equal(manifest.documentCount, 2);
    assert.equal(manifest.missingParentCount, 1);
    assert.ok(firestore.documents.some((document) => document.name.endsWith('/refuels/fill')));
    assert.ok(manifest.checksums['firestore.json']);
  }));
test('any failed nested read prevents a complete backup', () =>
  run(true, async (directory) => {
    const { fetch } = fixture(true);
    const output = path.join(directory, 'snapshot');
    await assert.rejects(
      backupUserData({
        args: { uid: 'member', email: 'test@example.com', project: 'test', bucket: 'test', output },
        auth,
        fetch,
      }),
      /database changes must stop/,
    );
    assert.equal(JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'))).status, 'failed');
  }));
