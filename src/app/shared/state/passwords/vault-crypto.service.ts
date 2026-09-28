import { Injectable, signal } from '@angular/core';
import { EncryptedPayload } from './password.model';

const ITERATIONS = 600_000;
const encoder = new TextEncoder(); const decoder = new TextDecoder();
const base64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
const bytes = (value: string) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

@Injectable({ providedIn: 'root' })
export class VaultCryptoService {
  readonly unlocked = signal(false);
  readonly autoLockMinutes = signal(this.readNumber('lifeos.vault.autoLockMinutes', 5));
  readonly lockOnBackground = signal(this.readBoolean('lifeos.vault.lockOnBackground', true));
  private key: CryptoKey | null = null; private timer?: ReturnType<typeof setTimeout>;
  constructor() {
    if (typeof document !== 'undefined') {
      for (const event of ['pointerdown', 'keydown', 'touchstart']) document.addEventListener(event, () => this.touch(), { passive: true });
      document.addEventListener('visibilitychange', () => { if (document.hidden && this.lockOnBackground()) this.lock(); else if (!document.hidden) this.touch(); });
    }
  }
  randomSalt(): string { return base64(crypto.getRandomValues(new Uint8Array(16))); }
  async deriveBytes(passphrase: string, salt: string): Promise<Uint8Array> {
    const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveBits']);
    const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: bytes(salt), iterations: ITERATIONS, hash: 'SHA-256' }, material, 256);
    return new Uint8Array(derived);
  }
  async derive(passphrase: string, salt: string): Promise<CryptoKey> { return this.importKey(await this.deriveBytes(passphrase, salt)); }
  async importKey(raw: Uint8Array): Promise<CryptoKey> { const keyData = raw.slice().buffer as ArrayBuffer; return crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']); }
  encodeKey(raw: Uint8Array): string { return base64(raw); }
  decodeKey(encoded: string): Uint8Array { return bytes(encoded); }
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
  setAutoLockMinutes(minutes: number): void { const allowed = [1, 5, 15, 30]; const value = allowed.includes(minutes) ? minutes : 5; this.autoLockMinutes.set(value); this.writePreference('lifeos.vault.autoLockMinutes', String(value)); this.touch(); }
  setLockOnBackground(enabled: boolean): void { this.lockOnBackground.set(enabled); this.writePreference('lifeos.vault.lockOnBackground', String(enabled)); }
  touch(): void { if (!this.key) return; this.scheduleLock(this.autoLockMinutes() * 60_000); }
  private scheduleLock(delay: number): void { if (this.timer) clearTimeout(this.timer); this.timer = setTimeout(() => this.lock(), delay); }
  private readNumber(key: string, fallback: number): number { try { if (typeof localStorage === 'undefined') return fallback; const value = Number(localStorage.getItem(key)); return [1, 5, 15, 30].includes(value) ? value : fallback; } catch { return fallback; } }
  private readBoolean(key: string, fallback: boolean): boolean { try { if (typeof localStorage === 'undefined') return fallback; const value = localStorage.getItem(key); return value === null ? fallback : value === 'true'; } catch { return fallback; } }
  private writePreference(key: string, value: string): void { try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value); } catch { /* The vault still works when preference persistence is unavailable. */ } }
}
