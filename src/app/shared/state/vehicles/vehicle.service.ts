import { inject, Injectable } from '@angular/core';
import { FirestoreDocument, FirestoreService, FirestoreValue } from '../../../core/firebase/firestore.service';
import { StoragePhotoService } from '../../../core/firebase/storage-photo.service';
import { AuthService } from '../authentication/authentication.service';
import type { VehicleRecord } from './vehicle-store';

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private readonly auth = inject(AuthService);
  private readonly firestore = inject(FirestoreService);
  private readonly photos = inject(StoragePhotoService);

  async list(uid: string): Promise<VehicleRecord[]> {
    const session = await this.auth.getSession();
    if (session.uid !== uid) throw new Error('Your sign-in session has changed.');
    const documents = await this.firestore.listDocuments(`users/${uid}/vehicles`, session.token);
    documents.sort((a, b) => (b.createTime ?? '').localeCompare(a.createTime ?? ''));
    return documents.map((document) => this.toVehicle(document));
  }

  async get(id: string): Promise<VehicleRecord> {
    const { uid, token } = await this.auth.getSession();
    return this.toVehicle(await this.firestore.getDocument(`users/${uid}/vehicles/${encodeURIComponent(id)}`, token));
  }

  async add(vehicle: Omit<VehicleRecord, 'id'>): Promise<VehicleRecord> {
    const { uid, token } = await this.auth.getSession();
    const id = globalThis.crypto?.randomUUID?.() ?? `vehicle-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `users/${uid}/vehicles`;
    const record: VehicleRecord = { ...vehicle, id, photoUrl: null, photoStoragePath: null };
    if (vehicle.photoUrl) {
      const uploaded = await this.photos.uploadVehiclePhoto(uid, id, vehicle.photoUrl, token);
      record.photoStoragePath = uploaded.path;
      record.photoUrl = uploaded.url;
    }
    const fields = this.toFields(record);

    try {
      await this.firestore.createDocument(path, id, fields, token);
      return record;
    } catch (error) {
      if (record.photoStoragePath) {
        try {
          await this.photos.deleteVehiclePhoto(record.photoStoragePath, token);
        } catch (cleanupError) {
          console.error('Could not clean up the vehicle photo', cleanupError);
        }
      }
      throw error;
    }
  }

  async update(id: string, changes: Omit<VehicleRecord, 'id' | 'photoStoragePath'>): Promise<VehicleRecord> {
    const { uid, token } = await this.auth.getSession();
    const previous = await this.get(id);
    const record: VehicleRecord = { ...previous, ...changes, id };
    let uploadedPath: string | null = null;
    if (changes.photoUrl && changes.photoUrl !== previous.photoUrl) {
      const uploaded = await this.photos.uploadVehiclePhoto(uid, id, changes.photoUrl, token, `photo-${crypto.randomUUID()}`);
      record.photoUrl = uploaded.url;
      record.photoStoragePath = uploaded.path;
      uploadedPath = uploaded.path;
    }
    try {
      await this.firestore.updateDocument(`users/${uid}/vehicles/${encodeURIComponent(id)}`, this.toFields(record), token);
    } catch (error) {
      if (uploadedPath) await this.photos.deleteVehiclePhoto(uploadedPath, token).catch((cleanupError) => console.error('Could not clean up the vehicle photo', cleanupError));
      throw error;
    }
    if (uploadedPath && previous.photoStoragePath) {
      await this.photos.deleteVehiclePhoto(previous.photoStoragePath, token).catch((cleanupError) => console.error('Could not remove the old vehicle photo', cleanupError));
    }
    return record;
  }

  async delete(id: string): Promise<void> {
    const { uid, token } = await this.auth.getSession();
    const previous = await this.get(id);
    await this.firestore.deleteDocument(`users/${uid}/vehicles`, id, token);
    if (previous.photoStoragePath) {
      await this.photos.deleteVehiclePhoto(previous.photoStoragePath, token).catch((cleanupError) => console.error('Could not remove the vehicle photo', cleanupError));
    }
  }

  private toFields(record: VehicleRecord): Record<string, FirestoreValue> {
    return {
      make: { stringValue: record.make },
      model: { stringValue: record.model },
      year: { stringValue: record.year },
      registration: { stringValue: record.registration },
      fuelType: { stringValue: record.fuelType },
      tankCapacity: record.tankCapacity === null
        ? { nullValue: null }
        : { doubleValue: record.tankCapacity },
      odometer: { doubleValue: record.odometer },
      photoStoragePath: record.photoStoragePath
        ? { stringValue: record.photoStoragePath }
        : { nullValue: null },
      photoUrl: record.photoUrl
        ? { stringValue: record.photoUrl }
        : { nullValue: null },
    };
  }

  private toVehicle(document: FirestoreDocument): VehicleRecord {
    const fields = document.fields ?? {};
    const numberValue = (value?: FirestoreValue): number | null => {
      const raw = value?.doubleValue ?? value?.integerValue;
      return raw === undefined ? null : Number(raw);
    };
    return {
      id: document.name.split('/').at(-1) ?? '',
      make: fields['make']?.stringValue ?? '',
      model: fields['model']?.stringValue ?? '',
      year: fields['year']?.stringValue ?? '',
      registration: fields['registration']?.stringValue ?? '',
      fuelType: fields['fuelType']?.stringValue ?? '',
      tankCapacity: numberValue(fields['tankCapacity']),
      odometer: numberValue(fields['odometer']) ?? 0,
      photoUrl: fields['photoStoragePath']?.stringValue ? fields['photoUrl']?.stringValue ?? null : null,
      photoStoragePath: fields['photoStoragePath']?.stringValue ?? null,
    };
  }
}
