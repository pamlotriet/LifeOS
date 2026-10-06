import { Component, inject, signal } from '@angular/core';
import { BudgetStore } from '../../shared/state/budget/budget.store';
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
  readonly budget = inject(BudgetStore);
  readonly cycleDays = Array.from({ length: 31 }, (_, index) => index + 1);
  readonly savingCycle = signal(false);
  readonly cycleMessage = signal('');
  readonly cycleError = signal('');
  async saveCycle(value: string): Promise<void> {
    if (this.savingCycle()) return;
    this.savingCycle.set(true); this.cycleMessage.set(''); this.cycleError.set('');
    try { await this.budget.setCycleStartDay(Number(value)); this.cycleMessage.set('Budget cycle saved to your account.'); }
    catch (error) { this.cycleError.set(error instanceof Error ? error.message : 'Could not save your budget cycle.'); }
    finally { this.savingCycle.set(false); }
  }
  readonly autoLockOptions = [1, 5, 15, 30];

  constructor() { void this.store.initialize(); }

  setAutoLock(minutes: number): void { this.store.vault.crypto.setAutoLockMinutes(minutes); }
  setBackgroundLock(enabled: boolean): void { this.store.vault.crypto.setLockOnBackground(enabled); }
}
