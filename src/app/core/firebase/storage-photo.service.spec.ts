import '@angular/compiler';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StoragePhotoService } from './storage-photo.service';

describe('StoragePhotoService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uploads an image to the signed-in user path and returns its download URL', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({ ok: true, blob: async () => new Blob(['photo'], { type: 'image/jpeg' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ downloadTokens: 'download-token' }) });
    vi.stubGlobal('fetch', request);

    const photo = await new StoragePhotoService().uploadVehiclePhoto('user-1', 'car-1', 'blob:photo', 'id-token');

    expect(photo.path).toBe('users/user-1/vehicles/car-1/photo');
    expect(photo.url).toContain('token=download-token');
    expect(String(request.mock.calls[1][0])).toContain('name=users%2Fuser-1%2Fvehicles%2Fcar-1%2Fphoto');
    expect(request.mock.calls[1][1].headers.Authorization).toBe('Firebase id-token');
  });

  it('rejects unsupported images before upload', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['x'], { type: 'image/svg+xml' }) });
    vi.stubGlobal('fetch', request);
    await expect(new StoragePhotoService().uploadVehiclePhoto('user-1', 'car-1', 'blob:photo', 'id-token'))
      .rejects.toThrow('Choose a JPG');
    expect(request).toHaveBeenCalledOnce();
  });

});
