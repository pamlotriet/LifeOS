import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

interface StoredPhoto {
  downloadTokens?: string;
}

@Injectable({ providedIn: 'root' })
export class StoragePhotoService {
  private readonly bucket = environment.firebaseConfig.storageBucket;
  private readonly baseUrl = `https://firebasestorage.googleapis.com/v0/b/${this.bucket}/o`;

  async uploadVehiclePhoto(uid: string, vehicleId: string, localUrl: string, token: string, photoName = 'photo'): Promise<{ path: string; url: string }> {
    const photoResponse = await fetch(localUrl);
    if (!photoResponse.ok) throw new Error('Could not read the selected photo.');
    const photo = await photoResponse.blob();
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(photo.type)) {
      throw new Error('Choose a JPG, PNG, WEBP, or HEIC vehicle photo.');
    }
    if (photo.size === 0 || photo.size > 5 * 1024 * 1024) {
      throw new Error('Choose a photo smaller than 5 MB.');
    }

    const path = `users/${uid}/vehicles/${vehicleId}/${photoName}`;
    const boundary = `lifeos-${crypto.randomUUID()}`;
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: path, contentType: photo.type })}\r\n`,
      `--${boundary}\r\nContent-Type: ${photo.type}\r\n\r\n`,
      photo,
      `\r\n--${boundary}--`,
    ], { type: `multipart/related; boundary=${boundary}` });
    const url = new URL(this.baseUrl);
    url.searchParams.set('name', path);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Firebase ${token}`,
        'X-Goog-Upload-Protocol': 'multipart',
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    if (!response.ok) throw new Error(`Could not upload the vehicle photo to Firebase Storage (${response.status}).`);
    const metadata = (await response.json()) as StoredPhoto;
    const downloadToken = metadata.downloadTokens?.split(',')[0];

    if (!downloadToken) {
      await this.deleteVehiclePhoto(path, token);
      throw new Error('Firebase Storage did not return a photo download link.');
    }
    
    return {
      path,
      url: `${this.baseUrl}/${encodeURIComponent(path)}?alt=media&token=${encodeURIComponent(downloadToken)}`,
    };
  }

  async deleteVehiclePhoto(path: string, token: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(path)}`, {
      method: 'DELETE',
      headers: { Authorization: `Firebase ${token}` },
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Could not remove the vehicle photo from Firebase Storage (${response.status}).`);
    }
  }
}
