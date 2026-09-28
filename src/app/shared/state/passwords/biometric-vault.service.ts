import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  AccessControl,
  BiometricAuthError,
  BiometryType,
  NativeBiometric,
} from '@capgo/capacitor-native-biometric';

export type BiometricKind = 'Face ID' | 'Touch ID' | 'Fingerprint' | 'biometrics';

@Injectable({ providedIn: 'root' })
export class BiometricVaultService {
  readonly available = signal(false);
  readonly enrolled = signal(false);
  readonly kind = signal<BiometricKind>('biometrics');

  async refresh(uid: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      this.available.set(false);
      this.enrolled.set(false);
      return;
    }

    try {
      const availability = await NativeBiometric.isAvailable({ useFallback: false });
      this.available.set(availability.isAvailable && availability.strongBiometryIsAvailable);
      this.kind.set(this.label(availability.biometryType));
      const saved = await NativeBiometric.isDataSaved({ key: this.storageKey(uid) });
      this.enrolled.set(saved.isSaved);
    } catch {
      this.available.set(false);
      this.enrolled.set(false);
    }
  }

  async enable(uid: string, encodedKey: string): Promise<void> {
    if (!this.available()) throw new Error('Strong biometric authentication is not available on this device.');
    await NativeBiometric.setData({
      key: this.storageKey(uid),
      value: encodedKey,
      accessControl: AccessControl.BIOMETRY_CURRENT_SET,
      authValidityDuration: 0,
      title: 'Enable biometric vault unlock',
      negativeButtonText: 'Cancel',
    });
    if (Capacitor.getPlatform() === 'ios') {
      try {
        const stored = await this.unlock(uid);
        if (stored !== encodedKey) throw new Error('The saved biometric vault key could not be verified.');
      } catch (error) {
        await NativeBiometric.deleteData({ key: this.storageKey(uid) }).catch(() => undefined);
        throw error;
      }
    }
    this.enrolled.set(true);
  }

  async unlock(uid: string): Promise<string> {
    try {
      const result = await NativeBiometric.getSecureData({
        key: this.storageKey(uid),
        reason: 'Unlock your LifeOS password vault',
        title: `Unlock with ${this.kind()}`,
        subtitle: 'LifeOS Passwords',
        description: 'Authenticate to decrypt your password vault.',
        negativeButtonText: 'Use master password',
      });
      return result.value;
    } catch (error) {
      const code = Number((error as { code?: number | string })?.code);
      if (code === BiometricAuthError.NO_PROTECTED_CREDENTIALS_FOUND) this.enrolled.set(false);
      if (code === BiometricAuthError.USER_CANCEL || code === BiometricAuthError.APP_CANCEL || code === BiometricAuthError.SYSTEM_CANCEL) {
        throw new Error('Biometric unlock was cancelled.');
      }
      if (code === BiometricAuthError.USER_LOCKOUT || code === BiometricAuthError.USER_TEMPORARY_LOCKOUT) {
        throw new Error('Biometrics are temporarily locked. Use your master password.');
      }
      throw new Error('Biometric unlock is unavailable. Use your master password and enable it again.');
    }
  }

  async disable(uid: string): Promise<void> {
    if (Capacitor.isNativePlatform()) await NativeBiometric.deleteData({ key: this.storageKey(uid) });
    this.enrolled.set(false);
  }

  private storageKey(uid: string): string { return `lifeos.password-vault.${uid}.v1`; }
  private label(type: BiometryType): BiometricKind {
    if (type === BiometryType.FACE_ID || type === BiometryType.FACE_AUTHENTICATION) return 'Face ID';
    if (type === BiometryType.TOUCH_ID) return 'Touch ID';
    if (type === BiometryType.FINGERPRINT) return 'Fingerprint';
    return 'biometrics';
  }
}
