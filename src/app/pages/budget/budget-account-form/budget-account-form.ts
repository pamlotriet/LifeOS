import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import { BudgetPage } from '@pages/budget/components/budget-page/budget-page';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppInput } from '@shared/components/app-input/app-input';
import { BackButton } from '@shared/components/back-button/back-button';
import { BudgetNumber } from '@shared/directives/budget-number';

@Component({
  selector: 'app-budget-account-form',
  imports: [
    FormsModule,
    RouterLink,
    IonContent,
    TranslatePipe,
    BudgetPage,
    AppButton,
    AppInput,
    BackButton,
    BudgetNumber,
  ],
  templateUrl: './budget-account-form.html',
  styleUrls: ['../budget.css', '../budget-layout.css'],
})
export class BudgetAccountForm {
  readonly store = inject(BudgetStore);
  private readonly router = inject(Router);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  private readonly draftId = this.id ?? `custom-${crypto.randomUUID()}`;
  readonly name = signal('');
  readonly balanceInput = signal<number | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly loaded = signal(false);
  readonly account = computed(() =>
    this.store.activeAccounts().find((item) => item.id === this.id),
  );
  readonly ready = computed(
    () => !this.store.loading() && !this.store.error() && (!this.id || !!this.account()),
  );

  constructor() {
    effect(() => {
      const account = this.account();
      if (account && !this.store.loading() && !this.store.error() && !this.loaded()) {
        this.name.set(account.name);
        this.loaded.set(true);
      }
    });
  }

  async save(): Promise<void> {
    if (this.busy() || !this.ready()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.store.saveAccount(this.name(), this.draftId, this.balanceInput());
      await this.router.navigateByUrl('/budget');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not save the account.');
    } finally {
      this.busy.set(false);
    }
  }
}
