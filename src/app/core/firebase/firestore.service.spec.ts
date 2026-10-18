import '@angular/compiler';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WriteFeedback } from './write-feedback.service';
import { FirestoreService } from './firestore.service';

describe('FirestoreService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('creates a user document only when the user has no profile', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal('fetch', request);

    await new FirestoreService({success:vi.fn()} as unknown as WriteFeedback).createUserIfMissing('user-1', 'id-token', {
      email: 'user@example.com', displayName: 'User', photoUrl: null,
    });

    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0][0]).toContain('/users/user-1');
    expect(request.mock.calls[1][0]).toContain('/users?documentId=user-1');
    expect(request.mock.calls[1][1].headers.Authorization).toBe('Bearer id-token');
  });

  it('returns an empty list when a collection has no documents', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', request);

    const documents = await new FirestoreService({success:vi.fn()} as unknown as WriteFeedback).listDocuments('users/user-1/vehicles', 'id-token');

    expect(documents).toEqual([]);
    expect(request.mock.calls[0][0]).toContain('/users/user-1/vehicles');
  });

  it('keeps an existing user profile on later sign-ins', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', request);

    await new FirestoreService({success:vi.fn()} as unknown as WriteFeedback).createUserIfMissing('user-1', 'id-token', {
      email: 'user@example.com', displayName: 'User', photoUrl: null,
    });

    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][1].method).toBeUndefined();
  });

  it('reads every page of a collection', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ documents: [{ name: 'car-1' }], nextPageToken: 'more' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ documents: [{ name: 'car-2' }] }) });
    vi.stubGlobal('fetch', request);

    const documents = await new FirestoreService({success:vi.fn()} as unknown as WriteFeedback).listDocuments('users/user-1/vehicles', 'id-token');

    expect(documents.map((document) => document.name)).toEqual(['car-1', 'car-2']);
    expect(request.mock.calls[1][0]).toContain('pageToken=more');
  });

  it('commits related document writes in one request', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', request);
    const writes = [{ delete: 'projects/test/databases/(default)/documents/users/user-1/vehicles/car-1/refuels/old' }];

    await new FirestoreService({success:vi.fn()} as unknown as WriteFeedback).commitWrites(writes, 'id-token');

    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][0]).toContain('/documents:commit');
    expect(request.mock.calls[0][1].headers.Authorization).toBe('Bearer id-token');
    expect(JSON.parse(request.mock.calls[0][1].body).writes).toEqual(writes);
  });
  it('notifies only after successful writes and keeps setup batches silent', async () => {
    const success = vi.fn();
    const service = new FirestoreService({success} as unknown as WriteFeedback);
    const request = vi.fn().mockResolvedValue({ok:true,json:async()=>({name:'saved'})});
    vi.stubGlobal('fetch',request);
    await service.createDocument('users/u/books','b',{},'token');
    await service.updateDocument('users/u/books/b',{},'token');
    await service.deleteDocument('users/u/books','b','token');
    expect(success.mock.calls.map(call=>call[0])).toEqual(['save','save','delete']);
    success.mockClear();
    await service.commitWrites([{delete:'doc'}],'token',false);
    expect(success).not.toHaveBeenCalled();
    request.mockResolvedValue({ok:false,status:403});
    await expect(service.deleteDocument('users/u/books','b','token')).rejects.toThrow();
    expect(success).not.toHaveBeenCalled();
  });

});
