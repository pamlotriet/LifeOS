import {
  collectUserExport,
  USER_COLLECTIONS,
  BUDGET_COLLECTIONS,
  UserExportTransport,
} from '@core/backups/user-data-export';
import { zipSync, unzipSync, strFromU8 } from 'fflate';

describe('Full account export', () => {
  function fixture(fail = false) {
    const root = 'projects/project/databases/(default)/documents';
    const name = 'users/member/vehicles/missing-parent/refuels/fill';
    const photoPath = 'users/member/recipes/r/photo';
    const calls: string[] = [];
    const document = (path: string, fields = {}) => ({
      name: `${root}/${path}`,
      fields,
      createTime: 'before',
    });
    const json = vi.fn(async (address: string) => {
      calls.push(address);
      const url = new URL(address);
      if (url.pathname.endsWith(':batchGet'))
        return [
          {
            found: document('users/member', { email: { stringValue: 'member@example.com' } }),
            readTime: '2026-11-16T12:00:00Z',
          },
        ];
      if (url.hostname === 'firebasestorage.googleapis.com') {
        if (!url.pathname.endsWith('/o'))
          return { size: '3', generation: '1', contentType: 'image/png' };
        return { items: [{ name: photoPath }] };
      }
      const collection = decodeURIComponent(url.pathname.split('/documents/')[1]);
      if (collection === 'users/member/recipes') {
        if (fail) throw new Error('Permission denied');
        return {
          documents: [
            document('users/member/recipes/r', { photoPath: { stringValue: photoPath } }),
          ],
        };
      }
      if (collection === 'users/member/passwords')
        return {
          documents: [
            document('users/member/passwords/secret', {
              ciphertext: { stringValue: 'encrypted-content' },
            }),
          ],
        };
      if (collection === 'users/member/vehicles')
        return { documents: [{ name: `${root}/users/member/vehicles/missing-parent` }] };
      if (collection.endsWith('/refuels'))
        return { documents: [document(name, { amount: { doubleValue: 120 } })] };
      if (collection === 'budgets/member/transactions') {
        if (!url.searchParams.has('pageToken'))
          return {
            documents: [
              document('budgets/member/transactions/one', {
                debtId: { stringValue: 'loan' },
                amount: { doubleValue: 8000 },
              }),
            ],
            nextPageToken: 'next-page',
          };
        return {
          documents: [
            document('budgets/member/transactions/two', {
              debtId: { stringValue: 'loan' },
              amount: { doubleValue: 330 },
            }),
          ],
        };
      }
      return { documents: [] };
    });
    const bytes = vi.fn(async () => new Uint8Array([1, 2, 3]));
    return { transport: { json, bytes } as UserExportTransport, calls, photoPath };
  }
  it('exports paginated debt history, nested refuels, encrypted vault data and original uploaded bytes', async () => {
    const { transport, calls, photoPath } = fixture();
    const result = await collectUserExport({
      uid: 'member',
      project: 'project',
      bucket: 'bucket',
      transport,
    });
    expect(result.manifest.status).toBe('complete');
    expect(result.manifest.documentCount).toBe(6);
    expect(result.manifest.missingParents).toHaveLength(1);
    expect(result.manifest.storageObjects[0].name).toBe(photoPath);
    expect(result.manifest.storageObjects[0].sha256).toHaveLength(64);
    const archive = unzipSync(zipSync(result.files));
    const records = JSON.parse(strFromU8(archive['firestore.json']));
    expect(records.documents.some((doc: any) => doc.name.endsWith('/refuels/fill'))).toBe(true);
    expect(
      records.documents.filter((doc: any) => doc.name.includes('/transactions/')),
    ).toHaveLength(2);
    expect(strFromU8(archive['firestore.json'])).toContain('encrypted-content');
    expect(archive[result.manifest.storageObjects[0].file]).toEqual(new Uint8Array([1, 2, 3]));
    for (const collection of USER_COLLECTIONS)
      expect(calls.some((url) => url.includes(`users/member/${collection}?`))).toBe(true);
    for (const collection of BUDGET_COLLECTIONS)
      expect(calls.some((url) => url.includes(`budgets/member/${collection}?`))).toBe(true);
    expect(
      calls.filter((url) => url.includes('showMissing')).every((url) => url.includes('readTime=')),
    ).toBe(true);
  });
  it('fails rather than returning an incomplete archive after any collection read fails', async () => {
    const { transport } = fixture(true);
    await expect(
      collectUserExport({ uid: 'member', project: 'project', bucket: 'bucket', transport }),
    ).rejects.toThrow('Permission denied');
  });
  it('refuses files belonging to another account', async () => {
    const { transport } = fixture();
    const original = transport.json;
    transport.json = async (url, init) =>
      new URL(url).hostname === 'firebasestorage.googleapis.com'
        ? { items: [{ name: 'users/someone-else/recipes/r/photo' }] }
        : original(url, init);
    await expect(
      collectUserExport({ uid: 'member', project: 'project', bucket: 'bucket', transport }),
    ).rejects.toThrow('outside your account');
  });
  it('rejects file size mismatches', async () => {
    const { transport } = fixture();
    transport.bytes = async () => new Uint8Array([1]);
    await expect(
      collectUserExport({ uid: 'member', project: 'project', bucket: 'bucket', transport }),
    ).rejects.toThrow('changed during backup');
  });
});
