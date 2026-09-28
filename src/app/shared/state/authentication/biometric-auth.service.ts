import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { AccessControl, BiometricAuthError, BiometryType, NativeBiometric } from '@capgo/capacitor-native-biometric';

@Injectable({ providedIn: 'root' })
export class BiometricAuthService {
  readonly available = signal(false);
  readonly enrolled = signal(false);
  readonly kind = signal('biometrics');

  async refresh(uid: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) { this.available.set(false); this.enrolled.set(false); return; }
    try {
      const status = await NativeBiometric.isAvailable({ useFallback: false });
      this.available.set(status.isAvailable && status.strongBiometryIsAvailable);
      this.kind.set(this.label(status.biometryType));
      this.enrolled.set((await NativeBiometric.isDataSaved({ key: this.key(uid) })).isSaved);
    } catch { this.available.set(false); this.enrolled.set(false); }
  }

  async enable(uid: string): Promise<void> {
    await this.refresh(uid);
    if (!this.available()) throw new Error('Strong biometric authentication is not available on this device.');
    await NativeBiometric.setData({ key: this.key(uid), value: uid, accessControl: AccessControl.BIOMETRY_CURRENT_SET, authValidityDuration: 0, title: 'Enable biometric app unlock', negativeButtonText: 'Cancel' });
    if (Capacitor.getPlatform() === 'ios') {
      try { await this.unlock(uid); }
      catch (error) { await NativeBiometric.deleteData({ key: this.key(uid) }).catch(() => undefined); throw error; }
    }
    this.enrolled.set(true);
  }

  async unlock(uid: string): Promise<void> {
    try {
      const result = await NativeBiometric.getSecureData({ key: this.key(uid), reason: 'Unlock LifeOS', title: `Unlock with ${this.kind()}`, subtitle: 'LifeOS', description: 'Authenticate to open your LifeOS account.', negativeButtonText: 'Use Google sign-in' });
      if (result.value !== uid) throw new Error('Biometric account mismatch.');
    } catch (error) {
      if (error instanceof Error && error.message === 'Biometric account mismatch.') throw error;
      const code = Number((error as { code?: number | string })?.code);
      if (code === BiometricAuthError.NO_PROTECTED_CREDENTIALS_FOUND) this.enrolled.set(false);
      if (code === BiometricAuthError.USER_CANCEL || code === BiometricAuthError.APP_CANCEL || code === BiometricAuthError.SYSTEM_CANCEL) throw new Error('Biometric unlock was cancelled.');
      if (code === BiometricAuthError.USER_LOCKOUT || code === BiometricAuthError.USER_TEMPORARY_LOCKOUT) throw new Error('Biometrics are temporarily locked. Use Google sign-in.');
      this.enrolled.set(false);
      throw new Error('Biometric app unlock is unavailable. Use Google sign-in.');
    }
  }

  async disable(uid: string): Promise<void> { if (Capacitor.isNativePlatform()) await NativeBiometric.deleteData({ key: this.key(uid) }); this.enrolled.set(false); }
  private key(uid: string): string { return `lifeos.app-login.${uid}.v1`; }
  private label(type: BiometryType): string { if (type === BiometryType.FACE_ID || type === BiometryType.FACE_AUTHENTICATION) return 'Face ID'; if (type === BiometryType.TOUCH_ID) return 'Touch ID'; if (type === BiometryType.FINGERPRINT) return 'Fingerprint'; return 'biometrics'; }
}
