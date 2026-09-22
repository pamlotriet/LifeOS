import '@angular/compiler';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FirestoreService } from './firestore.service';

describe('FirestoreService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('creates a user document only when the user has no profile', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal('fetch', request);

    await new FirestoreService().createUserIfMissing('user-1', 'id-token', {
      email: 'user@example.com', displayName: 'User', photoUrl: null,
    });

    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0][0]).toContain('/users/user-1');
    expect(request.mock.calls[1][0]).toContain('/users?documentId=user-1');
    expect(request.mock.calls[1][1].headers.Authorization).toBe('Bearer id-token');
  });

  it('returns an empty list when the user has no vehicle documents', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', request);

    const vehicles = await new FirestoreService().listDocuments('users/user-1/vehicles', 'id-token');

    expect(vehicles).toEqual([]);
    expect(request.mock.calls[0][0]).toContain('/users/user-1/vehicles');
  });

  it('keeps an existing user profile on later sign-ins', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', request);

    await new FirestoreService().createUserIfMissing('user-1', 'id-token', {
      email: 'user@example.com', displayName: 'User', photoUrl: null,
    });

    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][1].method).toBeUndefined();
  });

  it('reads every page of a user vehicle collection', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ documents: [{ name: 'car-1' }], nextPageToken: 'more' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ documents: [{ name: 'car-2' }] }) });
    vi.stubGlobal('fetch', request);

    const vehicles = await new FirestoreService().listDocuments('users/user-1/vehicles', 'id-token');

    expect(vehicles.map((vehicle) => vehicle.name)).toEqual(['car-1', 'car-2']);
    expect(request.mock.calls[1][0]).toContain('pageToken=more');
  });
});
