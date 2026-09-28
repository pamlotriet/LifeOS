import { describe, expect, it } from 'vitest';
import { VaultCryptoService } from './vault-crypto.service';

describe('VaultCryptoService', () => {
  it('encrypts and decrypts vault data with its context bound by AES-GCM', async () => {
    const vault = new VaultCryptoService(); const key = await vault.derive('a long unique master password', vault.randomSalt());
    const encrypted = await vault.encrypt({ password: 'secret' }, 'password:user:one', key);
    expect(encrypted.cipherText).not.toContain('secret');
    await expect(vault.decrypt(encrypted, 'password:user:one', key)).resolves.toEqual({ password: 'secret' });
    await expect(vault.decrypt(encrypted, 'password:user:two', key)).rejects.toBeDefined();
  });
});
