import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PasswordStore } from '../../shared/state/passwords/password-store';
import { AuthService } from '../../shared/state/authentication/authentication.service';

@Component({
  selector: 'app-password-settings',
  imports: [IonContent, IonIcon, PageHeader],
  templateUrl: './password-settings.html',
})
export class PasswordSettings {
  readonly store = inject(PasswordStore);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly autoLockOptions = [1, 5, 15, 30];

  constructor() { void this.store.initialize(); }

  setAutoLock(minutes: number): void { this.store.vault.crypto.setAutoLockMinutes(minutes); }
  setBackgroundLock(enabled: boolean): void { this.store.vault.crypto.setLockOnBackground(enabled); }

  async disableBiometrics(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true); this.message.set('');
    try { await this.store.vault.disableBiometrics(); this.message.set('Biometric unlock has been removed from this device.'); }
    catch { this.message.set('Could not disable biometric unlock.'); }
    finally { this.busy.set(false); }
  }

  async configureBiometrics(): Promise<void> {
    this.store.lock();
    await this.router.navigateByUrl('/passwords', { replaceUrl: true });
  }

  async toggleAppBiometrics(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true); this.message.set('');
    try {
      if (this.auth.biometric.enrolled()) { await this.auth.disableBiometricLogin(); this.message.set('Biometric app unlock has been disabled.'); }
      else { await this.auth.enableBiometricLogin(); this.message.set(`LifeOS can now be unlocked with ${this.auth.biometric.kind()}.`); }
    } catch (error) { this.message.set(error instanceof Error ? error.message : 'Could not update biometric app unlock.'); }
    finally { this.busy.set(false); }
  }
}
