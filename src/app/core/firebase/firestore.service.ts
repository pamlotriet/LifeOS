import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  nullValue?: null;
  timestampValue?: string;
}

export interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
}

interface FirestoreList {
  documents?: FirestoreDocument[];
  nextPageToken?: string;
}

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private readonly baseUrl = `https://firestore.googleapis.com/v1/projects/${environment.firebaseConfig.projectId}/databases/(default)/documents`;

  async createUserIfMissing(
    uid: string,
    token: string,
    profile: { email: string | null; displayName: string | null; photoUrl: string | null },
  ): Promise<void> {
    const existing = await this.request(`${this.baseUrl}/users/${encodeURIComponent(uid)}`, token);
    if (existing.ok) return;
    if (existing.status === 403) {
      throw new Error('Firestore denied access to your profile. Publish the project Firestore rules for the (default) database.');
    }
    if (existing.status !== 404) {
      throw new Error(`Could not check the Firebase user profile (${existing.status}).`);
    }

    const response = await this.request(
      `${this.baseUrl}/users?documentId=${encodeURIComponent(uid)}`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          fields: {
            email: { stringValue: profile.email ?? '' },
            displayName: { stringValue: profile.displayName ?? '' },
            photoUrl: { stringValue: profile.photoUrl ?? '' },
          },
        }),
      },
    );

    // An existing profile is expected on every sign-in after the first one.
    if (response.status !== 409 && !response.ok) {
      throw new Error(`Could not create the Firebase user profile (${response.status}).`);
    }
  }

  async listDocuments(path: string, token: string): Promise<FirestoreDocument[]> {
    const documents: FirestoreDocument[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(`${this.baseUrl}/${path}`);
      url.searchParams.set('pageSize', '100');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const response = await this.request(url.toString(), token);
      if (!response.ok) throw new Error(`Could not list Firestore documents (${response.status}).`);

      const page = (await response.json()) as FirestoreList;
      documents.push(...(page.documents ?? []));
      pageToken = page.nextPageToken;
    } while (pageToken);

    return documents;
  }

  async createDocument(
    path: string,
    id: string,
    fields: Record<string, FirestoreValue>,
    token: string,
  ): Promise<FirestoreDocument> {
    const response = await this.request(
      `${this.baseUrl}/${path}?documentId=${encodeURIComponent(id)}`,
      token,
      { method: 'POST', body: JSON.stringify({ fields }) },
    );
    if (!response.ok) throw new Error(`Could not create Firestore document (${response.status}).`);
    return (await response.json()) as FirestoreDocument;
  }

  async getDocument(path: string, token: string): Promise<FirestoreDocument> {
    const response = await this.request(`${this.baseUrl}/${path}`, token);
    if (!response.ok) throw new Error(`Could not get Firestore document (${response.status}).`);
    return (await response.json()) as FirestoreDocument;
  }

  async updateDocument(path: string, fields: Record<string, FirestoreValue>, token: string): Promise<void> {
    const url = new URL(`${this.baseUrl}/${path}`);
    for (const field of Object.keys(fields)) url.searchParams.append('updateMask.fieldPaths', field);
    const response = await this.request(url.toString(), token, {
      method: 'PATCH',
      body: JSON.stringify({ fields }),
    });
    if (!response.ok) throw new Error(`Could not update Firestore document (${response.status}).`);
  }

  async updateDocumentField(
    path: string,
    id: string,
    field: string,
    value: FirestoreValue,
    token: string,
  ): Promise<void> {
    const url = new URL(`${this.baseUrl}/${path}/${encodeURIComponent(id)}`);
    url.searchParams.set('updateMask.fieldPaths', field);
    const response = await this.request(url.toString(), token, {
      method: 'PATCH',
      body: JSON.stringify({ fields: { [field]: value } }),
    });
    if (!response.ok) throw new Error(`Could not update Firestore document (${response.status}).`);
  }

  async deleteDocument(path: string, id: string, token: string): Promise<void> {
    const response = await this.request(
      `${this.baseUrl}/${path}/${encodeURIComponent(id)}`,
      token,
      { method: 'DELETE' },
    );
    if (!response.ok && response.status !== 404) {
      throw new Error(`Could not delete Firestore document (${response.status}).`);
    }
  }

  private request(url: string, token: string, init: RequestInit = {}): Promise<Response> {
    return fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  }
}
