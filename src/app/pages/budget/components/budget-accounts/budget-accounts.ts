import { budgetSnapshot } from '@pages/budget/budget-snapshot';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AppButton } from '@shared/components/app-button/app-button';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import {
  BUDGET_ACCOUNTS,
  BudgetAccountRecord,
  money,
  customAccountNet,
  mainAccountNet,
} from '@pages/budget/state/budget/budget.model';

@Component({
  selector: 'app-budget-accounts',
  imports: [RouterLink, TranslatePipe, AppButton],
  templateUrl: './budget-accounts.html',
  host: { class: 'mt-5 block' },
})
export class BudgetAccounts {
  readonly store = inject(BudgetStore);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly pendingDelete = signal<BudgetAccountRecord | null>(null);
  readonly money = money;
  builtIn(id: string): boolean {
    return BUDGET_ACCOUNTS.some((account) => account.value === id);
  }
  balance(id: string): number {
    if (id === 'savings') return this.store.savingsTotal();
    if (id === 'spending')
      return budgetSnapshot(
        this.store.transactions(),
        this.store.categories(),
        this.store.plans(),
        this.store.month(),
        this.store.cycleStartDay(),
        this.store.spendingBalances(),
      ).leftOver.actual;
    const account = this.store.accounts().find((item) => item.id === id);
    return (
      Math.round(
        ((account?.balance ?? 0) +
          (id === 'main'
            ? mainAccountNet(this.store.transactions(), this.store.categories())
            : customAccountNet(this.store.transactions(), id)) -
          (account?.recordedNet ?? 0)) *
          100,
      ) / 100
    );
  }
  async remove(): Promise<void> {
    const account = this.pendingDelete();
    if (!account || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.store.deleteAccount(account.id);
      this.pendingDelete.set(null);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not delete the account.');
    } finally {
      this.busy.set(false);
    }
  }
}
