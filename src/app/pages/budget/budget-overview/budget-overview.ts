import { TranslateService, TranslatePipe } from '@ngx-translate/core';

import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppInput } from '../../../shared/components/app-input/app-input';
import { AppMonthPicker } from '../../../shared/components/app-month-picker/app-month-picker';
import { BudgetNumber } from '../../../shared/directives/budget-number';
import { BackButton } from '../../../shared/components/back-button/back-button';
import { budgetSnapshot, budgetSpending } from '../budget-snapshot';
import { cycleMonth } from '../state/budget-cycle';
import { BudgetNav } from '../components/budget-nav/budget-nav';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { ChartConfiguration } from 'chart.js';
import { BudgetStore } from '../state/budget.store';
import { localDate, money, summary } from '../state/budget.model';
import { AppChart } from '../../../shared/components/app-chart/app-chart';
import { BudgetSummary } from '../components/budget-summary/budget-summary';
import { BudgetTransactions } from '../components/budget-transactions/budget-transactions';
import { AppSkeleton } from '../../../shared/components/app-skeleton/app-skeleton';

@Component({
  selector: 'app-budget-overview',
  imports: [
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
    AppChart,
    BudgetSummary,
    BudgetTransactions,
    AppSkeleton,
  ],
  templateUrl: './budget-overview.html',
  styleUrls: ['../budget.css', '../budget-layout.css', './budget-overview.css'],
})
export class BudgetOverview {
  private readonly i18n = inject(TranslateService);

  readonly store = inject(BudgetStore);
  readonly monthlyView = !!inject(ActivatedRoute).snapshot.data['monthly'];
  readonly selectedDate = signal('');
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
  readonly totals = computed(() => summary(this.store.monthly(), this.store.categories()));
  readonly filtered = computed(() =>
    this.store.monthly().filter((x) => !this.selectedDate() || x.date === this.selectedDate()),
  );
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
  readonly spending = computed(() => budgetSpending(this.store.monthly(), this.store.categories()));
  readonly donut = computed<ChartConfiguration>(() => ({
    type: 'doughnut',
    data: {
      labels: this.spending().map((x) => x.name),
      datasets: [
        {
          data: this.spending().map((x) => x.amount),
          backgroundColor: this.spending().map((x) => x.colour),
          borderWidth: 0,
          hoverOffset: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (context) => `${context.label}: ${money(Number(context.raw))}` },
        },
      },
    },
  }));
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
