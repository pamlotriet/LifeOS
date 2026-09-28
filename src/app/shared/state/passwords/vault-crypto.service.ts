import { Injectable, signal } from '@angular/core';
import { EncryptedPayload } from './password.model';

const ITERATIONS = 600_000;
const encoder = new TextEncoder(); const decoder = new TextDecoder();
const base64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
const bytes = (value: string) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

@Injectable({ providedIn: 'root' })
export class VaultCryptoService {
  readonly unlocked = signal(false); private key: CryptoKey | null = null; private timer?: ReturnType<typeof setTimeout>;
  constructor() {
    if (typeof document !== 'undefined') {
      for (const event of ['pointerdown', 'keydown', 'touchstart']) document.addEventListener(event, () => this.touch(), { passive: true });
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.scheduleLock(60_000); else this.touch(); });
    }
  }
  randomSalt(): string { return base64(crypto.getRandomValues(new Uint8Array(16))); }
  async derive(passphrase: string, salt: string): Promise<CryptoKey> {
    const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: bytes(salt), iterations: ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  setKey(key: CryptoKey): void { this.key = key; this.unlocked.set(true); this.touch(); }
  lock(): void { this.key = null; this.unlocked.set(false); if (this.timer) clearTimeout(this.timer); }
  async encrypt(value: unknown, context: string, key = this.requiredKey()): Promise<EncryptedPayload> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(context) }, key, encoder.encode(JSON.stringify(value)));
    return { iv: base64(iv), cipherText: base64(new Uint8Array(cipher)) };
  }
  async decrypt<T>(payload: EncryptedPayload, context: string, key = this.requiredKey()): Promise<T> {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(payload.iv), additionalData: encoder.encode(context) }, key, bytes(payload.cipherText));
    return JSON.parse(decoder.decode(plain)) as T;
  }
  requiredKey(): CryptoKey { if (!this.key) throw new Error('Unlock your vault first.'); return this.key; }
  touch(): void { if (!this.key) return; this.scheduleLock(5 * 60_000); }
  private scheduleLock(delay: number): void { if (this.timer) clearTimeout(this.timer); this.timer = setTimeout(() => this.lock(), delay); }
}
