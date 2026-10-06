import { Component, inject } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PasswordStore } from '../../shared/state/passwords/password-store';
import { ThemeService } from '../../shared/state/theme/theme.service';

@Component({
  selector: 'app-password-settings',
  imports: [IonContent, IonIcon, PageHeader],
  templateUrl: './password-settings.html',
})
export class PasswordSettings {
  readonly store = inject(PasswordStore);
  readonly theme = inject(ThemeService);
  readonly autoLockOptions = [1, 5, 15, 30];

  constructor() { void this.store.initialize(); }

  setAutoLock(minutes: number): void { this.store.vault.crypto.setAutoLockMinutes(minutes); }
  setBackgroundLock(enabled: boolean): void { this.store.vault.crypto.setLockOnBackground(enabled); }
}
