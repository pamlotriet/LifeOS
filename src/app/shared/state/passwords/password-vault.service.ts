import { inject, Injectable } from '@angular/core';
import { FirestoreDocument, FirestoreService, FirestoreValue } from '../../../core/firebase/firestore.service';
import { AuthService } from '../authentication/authentication.service';
import { EncryptedPayload, PasswordInput, PasswordRecord } from './password.model';
import { VaultCryptoService } from './vault-crypto.service';
const text = (value: string): FirestoreValue => ({ stringValue: value });

@Injectable({ providedIn: 'root' })
export class PasswordVaultService {
  private readonly auth = inject(AuthService); private readonly firestore = inject(FirestoreService); readonly crypto = inject(VaultCryptoService);
  async exists(): Promise<boolean> { const { uid, token } = await this.auth.getSession(); const exists = !!await this.firestore.tryGetDocument(`users/${uid}/vault/settings`, token); return exists; }
  async create(passphrase: string): Promise<void> {
    if (passphrase.length < 12) throw new Error('Use a master password with at least 12 characters.');
    const { uid, token } = await this.auth.getSession(); const salt = this.crypto.randomSalt(); const rawKey = await this.crypto.deriveBytes(passphrase, salt); const key = await this.crypto.importKey(rawKey);
    const verifier = await this.crypto.encrypt({ marker: 'lifeos-vault-v1' }, `vault:${uid}`, key);
    await this.firestore.createDocument(`users/${uid}/vault`, 'settings', { salt: text(salt), verifierIv: text(verifier.iv), verifierCipher: text(verifier.cipherText), version: { integerValue: '1' } }, token);
    this.crypto.setKey(key);
  }
  async unlock(passphrase: string): Promise<void> {
    const { uid, token } = await this.auth.getSession(); const doc = await this.firestore.getDocument(`users/${uid}/vault/settings`, token); const f = doc.fields ?? {};
    const rawKey = await this.crypto.deriveBytes(passphrase, f['salt']?.stringValue ?? ''); const key = await this.crypto.importKey(rawKey);
    await this.verifyKey(key, uid, f, 'Incorrect master password.');
    this.crypto.setKey(key);
  }
  async list(): Promise<PasswordRecord[]> { const { uid, token } = await this.auth.getSession(); const docs = await this.firestore.listDocuments(`users/${uid}/passwords`, token); return Promise.all(docs.map((doc) => this.decryptDocument(doc, uid))); }
  async get(id: string): Promise<PasswordRecord> { const { uid, token } = await this.auth.getSession(); return this.decryptDocument(await this.firestore.getDocument(`users/${uid}/passwords/${encodeURIComponent(id)}`, token), uid); }
  async save(input: PasswordInput, id?: string): Promise<PasswordRecord> {
    if (!input.name.trim() || !input.username.trim() || !input.password) throw new Error('Name, username and password are required.');
    const { uid, token } = await this.auth.getSession(); const recordId = id ?? crypto.randomUUID(); const now = new Date().toISOString();
    const existing = id ? await this.get(id) : null; const record: PasswordRecord = { ...input, name: input.name.trim(), username: input.username.trim(), id: recordId, createdAt: existing?.createdAt ?? now, updatedAt: now };
    const encrypted = await this.crypto.encrypt(record, `password:${uid}:${recordId}`); const fields = { iv: text(encrypted.iv), cipherText: text(encrypted.cipherText), createdAt: { timestampValue: record.createdAt }, updatedAt: { timestampValue: record.updatedAt } };
    if (id) await this.firestore.updateDocument(`users/${uid}/passwords/${encodeURIComponent(id)}`, fields, token); else await this.firestore.createDocument(`users/${uid}/passwords`, recordId, fields, token);
    return record;
  }
  async delete(id: string): Promise<void> { const { uid, token } = await this.auth.getSession(); await this.firestore.deleteDocument(`users/${uid}/passwords`, id, token); }
  private async verifyKey(key: CryptoKey, uid: string, fields: Record<string, FirestoreValue>, message: string): Promise<void> { try { const value = await this.crypto.decrypt<{ marker: string }>({ iv: fields['verifierIv']?.stringValue ?? '', cipherText: fields['verifierCipher']?.stringValue ?? '' }, `vault:${uid}`, key); if (value.marker !== 'lifeos-vault-v1') throw new Error(); } catch { throw new Error(message); } }
  private async decryptDocument(doc: FirestoreDocument, uid: string): Promise<PasswordRecord> { const id = doc.name.split('/').at(-1) ?? ''; const f = doc.fields ?? {}; return this.crypto.decrypt<PasswordRecord>({ iv: f['iv']?.stringValue ?? '', cipherText: f['cipherText']?.stringValue ?? '' }, `password:${uid}:${id}`); }
}
