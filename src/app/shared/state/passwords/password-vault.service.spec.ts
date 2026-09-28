import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { FirestoreService } from '../../../core/firebase/firestore.service';
import { AuthService } from '../authentication/authentication.service';
import { BiometricVaultService } from './biometric-vault.service';
import { PasswordVaultService } from './password-vault.service';
import { VaultCryptoService } from './vault-crypto.service';

describe('PasswordVaultService', () => {
  it('writes only encrypted password content to Firestore', async () => {
    const createDocument = vi.fn(); const cryptoService = new VaultCryptoService();
    cryptoService.setKey(await cryptoService.derive('a long unique master password', cryptoService.randomSalt()));
    const service = runInInjectionContext(Injector.create({ providers: [
      { provide: AuthService, useValue: { getSession: vi.fn().mockResolvedValue({ uid: 'user-1', token: 'token' }) } },
      { provide: FirestoreService, useValue: { createDocument } },
      { provide: VaultCryptoService, useValue: cryptoService },
      { provide: BiometricVaultService, useValue: {} },
    ] }), () => new PasswordVaultService());

    await service.save({ name: 'Bank', username: 'me@example.com', password: 'VerySecret!', website: '', category: 'Finance', tags: [], notes: '', favourite: false });

    const fields = createDocument.mock.calls[0][2]; const serialized = JSON.stringify(fields);
    expect(fields).toEqual(expect.objectContaining({ iv: { stringValue: expect.any(String) }, cipherText: { stringValue: expect.any(String) } }));
    expect(serialized).not.toContain('Bank'); expect(serialized).not.toContain('me@example.com'); expect(serialized).not.toContain('VerySecret!');
  });

  it('rejects a biometric key unless it passes the user-bound vault verifier', async () => {
    const cryptoService = new VaultCryptoService(); const salt = cryptoService.randomSalt();
    const correctBytes = await cryptoService.deriveBytes('the correct long master password', salt);
    const wrongBytes = await cryptoService.deriveBytes('a different long master password', salt);
    const correctKey = await cryptoService.importKey(correctBytes);
    const verifier = await cryptoService.encrypt({ marker: 'lifeos-vault-v1' }, 'vault:user-1', correctKey);
    const service = runInInjectionContext(Injector.create({ providers: [
      { provide: AuthService, useValue: { getSession: vi.fn().mockResolvedValue({ uid: 'user-1', token: 'token' }) } },
      { provide: FirestoreService, useValue: { getDocument: vi.fn().mockResolvedValue({ fields: { verifierIv: { stringValue: verifier.iv }, verifierCipher: { stringValue: verifier.cipherText } } }) } },
      { provide: VaultCryptoService, useValue: cryptoService },
      { provide: BiometricVaultService, useValue: { unlock: vi.fn().mockResolvedValue(cryptoService.encodeKey(wrongBytes)) } },
    ] }), () => new PasswordVaultService());

    await expect(service.unlockWithBiometrics()).rejects.toThrow('biometric vault key is no longer valid');
    expect(cryptoService.unlocked()).toBe(false);
  });
});
