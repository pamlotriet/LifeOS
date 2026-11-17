import { BudgetPage } from '@pages/budget/components/budget-page/budget-page';
import { BudgetAccounts } from '@pages/budget/components/budget-accounts/budget-accounts';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

import { AppButton } from '@shared/components/app-button/app-button';
import { AppInput } from '@shared/components/app-input/app-input';
import { AppMonthPicker } from '@shared/components/app-month-picker/app-month-picker';
import { BudgetNumber } from '@shared/directives/budget-number';
import { BackButton } from '@shared/components/back-button/back-button';
import { budgetSnapshot } from '@pages/budget/budget-snapshot';
import { cycleMonth } from '@pages/budget/state/cycle/budget-cycle';
import { BudgetNav } from '@pages/budget/components/budget-nav/budget-nav';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/ion-content';
import { IonIcon } from '@ionic/angular/ion-icon';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import {
  isTransfer,
  localDate,
  money,
  transferAccounts,
  mainAccountNet,
  customAccountNet,
} from '@pages/budget/state/budget/budget.model';
import { BudgetSummary } from '@pages/budget/components/budget-summary/budget-summary';
import { BudgetTransactions } from '@pages/budget/components/budget-transactions/budget-transactions';
import { AppSkeleton } from '@shared/components/app-skeleton/app-skeleton';
import { AppSearch } from '@shared/components/app-search/app-search';
import { AppSelect } from '@shared/components/app-select/app-select';

@Component({
  host: { class: 'budget-screen' },
  selector: 'app-budget-overview',
  imports: [
    BudgetPage,
    BudgetAccounts,
    TranslatePipe,
    AppInput,
    AppButton,
    AppMonthPicker,
    BudgetNumber,
    BackButton,
    BudgetNav,
    IonContent,
    IonIcon,
    FormsModule,
    RouterLink,
    BudgetSummary,
    BudgetTransactions,
    AppSkeleton,
    AppSearch,
    AppSelect,
  ],
  templateUrl: './budget-overview.html',
  styleUrls: ['./budget-overview.css'],
})
export class BudgetOverview {
  private readonly i18n = inject(TranslateService);

  readonly store = inject(BudgetStore);
  readonly exporting = signal(false);
  readonly exportError = signal('');
  async exportCycle(): Promise<void> {
    if (this.exporting() || this.store.loading() || this.store.error()) return;
    this.exporting.set(true);
    this.exportError.set('');
    try {
      // Capture the selection and data before loading the PDF library.
      const transactions = this.store.transactions();
      const categories = this.store.categories();
      const input = {
        month: this.store.month(),
        startDay: this.store.cycleStartDay(),
        transactions,
        categories,
        plans: this.store.plans(),
        debts: this.store.debts(),
        checkpoints: this.store.spendingBalances(),
        accounts: this.store.accounts().map((a) => ({
          id: a.id,
          name: a.name + (a.deleted ? ' (deleted)' : ''),
          balance:
            a.id === 'spending'
              ? this.snapshot().leftOver.actual
              : a.id === 'savings'
                ? this.store.savingsTotal()
                : Math.round(
                    ((a.balance ?? 0) +
                      (a.id === 'main'
                        ? mainAccountNet(transactions, categories)
                        : customAccountNet(transactions, a.id)) -
                      (a.recordedNet ?? 0)) *
                      100,
                  ) / 100,
          basis: a.id === 'spending' ? 'Selected cycle calculation' : 'Current balance at export',
        })),
      };
      const { createFinanceExport } = await import('@pages/budget/finance-export');
      const bytes = createFinanceExport(input);
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes).buffer], { type: 'application/zip' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `LifeOS-Finances-${input.month}.zip`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      this.exportError.set('Could not export this cycle. Please try again.');
    } finally {
      this.exporting.set(false);
    }
  }
  hasAccount(id: string): boolean {
    return this.store.activeAccounts().some((account) => account.id === id);
  }
  readonly monthlyView = !!inject(ActivatedRoute).snapshot.data['monthly'];
  readonly transfersView = !!inject(ActivatedRoute).snapshot.data['transfers'];
  readonly selectedDate = signal('');
  readonly search = signal('');
  readonly transactionType = signal(this.transfersView ? 'transfer' : 'all');
  readonly transactionTypes = [
    { value: 'all', label: 'All transactions' },
    { value: 'expense', label: 'Expenses' },
    { value: 'income', label: 'Income' },
    { value: 'transfer', label: 'Transfers' },
  ];
  readonly money = money;
  readonly balanceInput = signal<number | null>(null);
  readonly balanceSaved = signal(false);
  readonly savingBalance = signal(false);
  readonly balanceError = signal('');
  async saveSpendingBalance(): Promise<void> {
    if (this.savingBalance()) return;
    this.savingBalance.set(true);
    this.balanceError.set('');
    this.balanceSaved.set(false);
    try {
      const amount = this.balanceInput();
      if (amount === null || !Number.isFinite(amount))
        throw new Error('Enter the balance currently in your Spending account.');
      await this.store.setSpendingBalance(amount);
      this.balanceInput.set(null);
      this.balanceSaved.set(true);
    } catch (error) {
      this.balanceError.set(error instanceof Error ? error.message : 'Could not save balance.');
    } finally {
      this.savingBalance.set(false);
    }
  }
  readonly savingsInput = signal<number | null>(null);
  readonly savingsBusy = signal(false);
  readonly savingsMessage = signal('');
  async saveSavingsBalance(): Promise<void> {
    if (this.savingsBusy()) return;
    this.savingsBusy.set(true);
    this.savingsMessage.set('');
    try {
      const value = this.savingsInput();
      if (value === null || !Number.isFinite(value) || value < 0)
        throw new Error('Enter your current total savings.');
      await this.store.setSavingsBalance(value);
      this.savingsInput.set(null);
      this.savingsMessage.set('Savings balance saved.');
    } catch (error) {
      this.savingsMessage.set(error instanceof Error ? error.message : 'Could not save savings.');
    } finally {
      this.savingsBusy.set(false);
    }
  }
  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const type = this.transactionType();
    return this.store
      .monthly()
      .filter(
        (item) =>
          (!this.selectedDate() || item.date === this.selectedDate()) &&
          (!this.transfersView || isTransfer(item)) &&
          (type === 'all' || (type === 'transfer' ? isTransfer(item) : item.type === type)) &&
          (!query ||
            [
              item.title,
              item.notes,
              transferAccounts(item)?.from,
              transferAccounts(item)?.to,
              transferAccounts(item)?.from
                ? this.store.accountName(transferAccounts(item)!.from)
                : undefined,
              transferAccounts(item)?.to
                ? this.store.accountName(transferAccounts(item)!.to)
                : undefined,
              this.store.categories().find((category) => category.id === item.categoryId)?.name,
            ].some((value) => value?.toLowerCase().includes(query))),
      );
  });
  readonly snapshot = computed(() =>
    budgetSnapshot(
      this.store.transactions(),
      this.store.categories(),
      this.store.plans(),
      this.store.month(),
      this.store.cycleStartDay(),
      this.store.spendingBalances?.() ?? [],
    ),
  );
  readonly transactionDates = computed(() =>
    [...new Set(this.store.monthly().map((item) => item.date))]
      .sort()
      .reverse()
      .map((value) => ({
        value,
        label: new Date(`${value}T12:00:00`).toLocaleDateString('en-ZA', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
      })),
  );
  readonly dateOptions = computed(() => [
    { value: '', label: 'All dates in this cycle' },
    ...this.transactionDates(),
  ]);
  readonly cycleDates = computed(() => {
    const format = (date: string) =>
      new Date(`${date}T12:00:00`).toLocaleDateString('en-ZA', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    return this.i18n.instant('{{p0}} to {{p1}}', {
      p0: format(this.store.cycle().start),
      p1: format(this.store.cycle().end),
    });
  });
  openCyclePicker(input: HTMLInputElement): void {
    try {
      input.showPicker?.();
    } catch {
      input.focus();
    }
  }
  goToCurrentCycle(): void {
    this.setMonth(cycleMonth(localDate(), this.store.cycleStartDay()));
  }
  setMonth(value: string): void {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
      this.store.month.set(value);
      this.selectedDate.set('');
    }
  }
  shiftMonth(delta: number): void {
    const date = new Date(`${this.store.month()}-01T12:00:00`);
    date.setMonth(date.getMonth() + delta);
    this.setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
}
