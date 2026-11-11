import { TranslatePipe } from '@ngx-translate/core';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeader } from '@shared/components/page-header/page-header';
import { PasswordStore } from '@pages/passwords/state/vault/password-store';
import { ThemeService } from '@core/theme/theme.service';

@Component({
  selector: 'app-password-settings',
  imports: [TranslatePipe, FormsModule, IonContent, IonIcon, PageHeader],
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
  async saveCycle(value: number): Promise<void> {
    if (this.savingCycle()) return;
    this.savingCycle.set(true);
    this.cycleMessage.set('');
    this.cycleError.set('');
    try {
      await this.budget.setCycleStartDay(Number(value));
      this.cycleMessage.set('Budget cycle saved to your account.');
    } catch (error) {
      this.cycleError.set(
        error instanceof Error ? error.message : 'Could not save your budget cycle.',
      );
    } finally {
      this.savingCycle.set(false);
    }
  }
  readonly autoLockOptions = [1, 5, 15, 30];

  constructor() {
    void this.store.initialize();
  }

  setAutoLock(minutes: number): void {
    this.store.vault.crypto.setAutoLockMinutes(minutes);
  }
  setBackgroundLock(enabled: boolean): void {
    this.store.vault.crypto.setLockOnBackground(enabled);
  }
}
