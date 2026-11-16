import '@angular/compiler';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StoragePhotoService } from '@core/firebase/storage-photo.service';

describe('StoragePhotoService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uploads an image to the signed-in user path and returns its download URL', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['photo'], { type: 'image/jpeg' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ downloadTokens: 'download-token' }),
      });
    vi.stubGlobal('fetch', request);

    const photo = await new StoragePhotoService().uploadVehiclePhoto(
      'user-1',
      'car-1',
      'blob:photo',
      'id-token',
    );

    expect(photo.path).toBe('users/user-1/vehicles/car-1/photo');
    expect(photo.url).toContain('token=download-token');
    expect(String(request.mock.calls[1][0])).toContain(
      'name=users%2Fuser-1%2Fvehicles%2Fcar-1%2Fphoto',
    );
    expect(request.mock.calls[1][1].headers.Authorization).toBe('Firebase id-token');
  });

  it('downloads recipe bytes with authentication and an encoded storage path', async () => {
    const photo = new Blob(['photo'], { type: 'image/png' });
    const request = vi.fn().mockResolvedValue({ ok: true, blob: async () => photo });
    vi.stubGlobal('fetch', request);
    const result = await new StoragePhotoService().downloadRecipePhoto(
      'user-1',
      'bagels',
      'users/user-1/recipes/bagels/photo-123',
      'id-token',
    );
    expect(result).toBe(photo);
    expect(request.mock.calls[0][0]).toContain(
      'users%2Fuser-1%2Frecipes%2Fbagels%2Fphoto-123?alt=media',
    );
    expect(request.mock.calls[0][1].headers.Authorization).toBe('Firebase id-token');
    await expect(
      new StoragePhotoService().downloadRecipePhoto(
        'user-1',
        'bagels',
        'users/other/recipes/bagels/photo',
        'id-token',
      ),
    ).rejects.toThrow('signed-in user');
    expect(request).toHaveBeenCalledOnce();
  });

  it('rejects unsupported images before upload', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['x'], { type: 'image/svg+xml' }),
    });
    vi.stubGlobal('fetch', request);
    await expect(
      new StoragePhotoService().uploadVehiclePhoto('user-1', 'car-1', 'blob:photo', 'id-token'),
    ).rejects.toThrow('Choose a JPG');
    expect(request).toHaveBeenCalledOnce();
  });
});
