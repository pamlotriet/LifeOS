import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirestoreService } from '../../../core/firebase/firestore.service';
import { StoragePhotoService } from '../../../core/firebase/storage-photo.service';
import { AuthService } from '../authentication/authentication.service';
import { VehicleService } from './vehicle.service';

describe('VehicleService', () => {
  const session = vi.fn();
  const listDocuments = vi.fn();
  const createDocument = vi.fn();
  const uploadVehiclePhoto = vi.fn();
  const deleteVehiclePhoto = vi.fn();

  function createService(): VehicleService {
    const injector = Injector.create({ providers: [
      { provide: AuthService, useValue: { getSession: session } },
      { provide: FirestoreService, useValue: { listDocuments, createDocument } },
      { provide: StoragePhotoService, useValue: { uploadVehiclePhoto, deleteVehiclePhoto } },
    ] });
    return runInInjectionContext(injector, () => new VehicleService());
  }

  const vehicle = {
    make: 'Toyota', model: 'Corolla', year: '2024', registration: 'CAA 123 456',
    fuelType: 'Petrol', tankCapacity: 55, odometer: 12500, photoUrl: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    session.mockResolvedValue({ uid: 'user-1', token: 'id-token' });
  });

  it('reads saved Storage photo URLs from the signed-in user collection', async () => {
    listDocuments.mockResolvedValue([{ name: 'users/user-1/vehicles/car-1', fields: {
      make: { stringValue: 'Toyota' },
      photoStoragePath: { stringValue: 'users/user-1/vehicles/car-1/photo' },
      photoUrl: { stringValue: 'https://firebasestorage.googleapis.com/photo' },
    } }]);

    const [saved] = await createService().list('user-1');

    expect(listDocuments).toHaveBeenCalledWith('users/user-1/vehicles', 'id-token');
    expect(saved.photoUrl).toBe('https://firebasestorage.googleapis.com/photo');
  });

  it('rejects another user collection', async () => {
    await expect(createService().list('another-user')).rejects.toThrow('session has changed');
    expect(listDocuments).not.toHaveBeenCalled();
  });

  it('saves a vehicle without a photo', async () => {
    createDocument.mockResolvedValue({ name: 'saved' });
    const saved = await createService().add(vehicle);
    expect(createDocument).toHaveBeenCalledWith('users/user-1/vehicles', saved.id,
      expect.objectContaining({ photoStoragePath: { nullValue: null }, photoUrl: { nullValue: null } }),
      'id-token');
    expect(uploadVehiclePhoto).not.toHaveBeenCalled();
  });

  it('removes an uploaded Storage photo if saving the vehicle fails', async () => {
    const path = 'users/user-1/vehicles/car-1/photo';
    const url = 'https://firebasestorage.googleapis.com/photo';
    uploadVehiclePhoto.mockResolvedValue({ path, url });
    createDocument.mockRejectedValue(new Error('Firestore unavailable'));

    await expect(createService().add({ ...vehicle, photoUrl: 'blob:photo' })).rejects.toThrow('Firestore unavailable');
    expect(uploadVehiclePhoto).toHaveBeenCalledWith('user-1', expect.any(String), 'blob:photo', 'id-token');
    expect(deleteVehiclePhoto).toHaveBeenCalledWith(path, 'id-token');
    expect(createDocument).toHaveBeenCalledWith('users/user-1/vehicles', expect.any(String),
      expect.objectContaining({ photoStoragePath: { stringValue: path }, photoUrl: { stringValue: url } }),
      'id-token');
  });
});
