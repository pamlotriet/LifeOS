import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthService } from '@core/authentication/authentication.service';
import { RefreshCoordinator } from '@core/refresh/refresh-coordinator.service';
import { BudgetAccountsState } from '@pages/budget/state/budget/budget-accounts.state';
import { BudgetCategoriesState } from '@pages/budget/state/budget/budget-categories.state';
import { BudgetDebtsState } from '@pages/budget/state/budget/budget-debts.state';
import { BudgetPlanningState } from '@pages/budget/state/budget/budget-planning.state';
import { BudgetTransactionsState } from '@pages/budget/state/budget/budget-transactions.state';
import {
  BUDGET_ACCOUNTS,
  BudgetAccountRecord,
  BudgetCategory,
  BudgetDebt,
  BudgetDebtInput,
  BudgetPlan,
  BudgetTransaction,
  DEFAULT_CATEGORIES,
  localDate,
  SavingsBalance,
  savingsNet,
  SpendingBalanceCheckpoint,
  TransactionInput,
} from '@pages/budget/state/budget/budget.model';
import { BudgetService } from '@pages/budget/state/budget/budget.service';
import { cycleBounds, cycleMonth, inCycle } from '@pages/budget/state/cycle/budget-cycle';

@Injectable({ providedIn: 'root' })
export class BudgetStore {
  private readonly service = inject(BudgetService);
  private readonly auth = inject(AuthService);
  private generation = 0;
  private _accountsState?: BudgetAccountsState;
  private get accountsState(): BudgetAccountsState {
    return (this._accountsState ??= new BudgetAccountsState(this, this.service, this.auth, () => {
      ++this.generation;
    }));
  }
  private _transactionsState?: BudgetTransactionsState;
  private get transactionsState(): BudgetTransactionsState {
    return (this._transactionsState ??= new BudgetTransactionsState(
      this,
      this.service,
      this.auth,
      () => {
        ++this.generation;
      },
    ));
  }
  private _planningState?: BudgetPlanningState;
  private get planningState(): BudgetPlanningState {
    return (this._planningState ??= new BudgetPlanningState(this, this.service, this.auth, () => {
      ++this.generation;
    }));
  }
  private _debtsState?: BudgetDebtsState;
  private get debtsState(): BudgetDebtsState {
    return (this._debtsState ??= new BudgetDebtsState(this, this.service, this.auth, () => {
      ++this.generation;
    }));
  }
  private _categoriesState?: BudgetCategoriesState;
  private get categoriesState(): BudgetCategoriesState {
    return (this._categoriesState ??= new BudgetCategoriesState(
      this,
      this.service,
      this.auth,
      () => {
        ++this.generation;
      },
    ));
  }

  readonly transactions = signal<BudgetTransaction[]>([]);
  readonly accounts = signal<BudgetAccountRecord[]>(
    BUDGET_ACCOUNTS.map((account) => ({ id: account.value, name: account.label })),
  );
  readonly activeAccounts = computed(() => this.accounts().filter((account) => !account.deleted));
  readonly accountOptions = computed(() =>
    this.activeAccounts().map((account) => ({ value: account.id, label: account.name })),
  );
  accountName(id: string): string {
    return this.accountsState.accountName(id);
  }
  async saveAccount(
    name: string,
    id = `custom-${crypto.randomUUID()}`,
    balance: number | null = null,
  ): Promise<void> {
    return this.accountsState.saveAccount(name, id, balance);
  }
  async deleteAccount(id: string): Promise<void> {
    return this.accountsState.deleteAccount(id);
  }
  readonly categories = signal<BudgetCategory[]>(DEFAULT_CATEGORIES.map((x) => ({ ...x })));
  readonly plans = signal<BudgetPlan[]>([]);
  readonly spendingBalances = signal<SpendingBalanceCheckpoint[]>([]);
  readonly savingsBalance = signal<SavingsBalance | undefined>(undefined);
  readonly savingsTotal = computed(
    () =>
      Math.round(
        ((this.savingsBalance()?.balance ?? 0) +
          savingsNet(this.transactions()) -
          (this.savingsBalance()?.recordedNet ?? 0)) *
          100,
      ) / 100,
  );
  async setSavingsBalance(balance: number): Promise<void> {
    return this.accountsState.setSavingsBalance(balance);
  }
  readonly debts = signal<BudgetDebt[]>([]);
  readonly activeCategories = computed(() =>
    this.categories()
      .filter((x) => !x.deleted)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
  );
  readonly month = signal(localDate().slice(0, 7));
  readonly cycleStartDay = signal(1);
  readonly cycle = computed(() => cycleBounds(this.month(), this.cycleStartDay()));
  readonly cycleLabel = computed(() => `${this.cycle().start} – ${this.cycle().end}`);
  inMonth(date: string, month = this.month()): boolean {
    return inCycle(date, month, this.cycleStartDay());
  }
  monthForDate(date: string): string {
    return cycleMonth(date, this.cycleStartDay());
  }
  readonly monthly = computed(() =>
    this.transactions()
      .filter((x) => x.paymentStatus !== 'planned' && this.inMonth(x.date))
      .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title)),
  );
  readonly loading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  constructor() {
    inject(RefreshCoordinator).register(() => this.reload());
    effect(() => {
      const uid = this.auth.userId();
      untracked(() => {
        ++this.generation;
        this.transactions.set([]);
        this.accounts.set(
          BUDGET_ACCOUNTS.map((account) => ({ id: account.value, name: account.label })),
        );
        this.categories.set(DEFAULT_CATEGORIES.map((x) => ({ ...x })));
        this.savingsBalance.set(undefined);
        this.plans.set([]);
        this.debts.set([]);
        this.spendingBalances.set([]);
        this.month.set(localDate().slice(0, 7));
        this.cycleStartDay.set(1);
        this.error.set('');
        this.notice.set('');
        this.loading.set(false);
        if (uid) void this.reload();
      });
    });
  }
  async reload(): Promise<void> {
    const version = ++this.generation;
    this.loading.set(true);
    this.error.set('');
    try {
      const data = await this.service.load();
      if (version !== this.generation) return;
      this.transactions.set(data.transactions);
      const accounts = new Map(
        BUDGET_ACCOUNTS.map((account) => [
          account.value,
          { id: account.value, name: account.label } as BudgetAccountRecord,
        ]),
      );
      (data.accounts ?? []).forEach((account) => accounts.set(account.id, account));
      this.accounts.set([...accounts.values()]);
      this.plans.set(data.plans);
      this.debts.set(data.debts);
      this.savingsBalance.set(data.savingsBalance);
      this.spendingBalances.set(data.spendingBalances ?? []);
      const startDay =
        Number.isInteger(data.cycleStartDay) && data.cycleStartDay >= 1 && data.cycleStartDay <= 31
          ? data.cycleStartDay
          : 1;
      if (startDay !== this.cycleStartDay()) this.month.set(cycleMonth(localDate(), startDay));
      this.cycleStartDay.set(startDay);
      const categories = new Map(DEFAULT_CATEGORIES.map((x) => [x.id, { ...x }]));
      data.categories.forEach((x) => categories.set(x.id, x));
      this.categories.set([...categories.values()]);
    } catch (error) {
      if (version === this.generation)
        this.error.set(error instanceof Error ? error.message : 'Could not load your budget.');
    } finally {
      if (version === this.generation) this.loading.set(false);
    }
  }
  async setSpendingBalance(balance: number): Promise<void> {
    return this.accountsState.setSpendingBalance(balance);
  }
  async saveTransaction(input: TransactionInput, id?: string, receipt?: string): Promise<void> {
    return this.transactionsState.saveTransaction(input, id, receipt);
  }
  async deleteTransaction(item: BudgetTransaction): Promise<void> {
    return this.transactionsState.deleteTransaction(item);
  }
  async saveCategory(category: BudgetCategory): Promise<void> {
    return this.categoriesState.saveCategory(category);
  }
  async savePlan(month: string, categoryId: string, amount: number): Promise<void> {
    return this.planningState.savePlan(month, categoryId, amount);
  }
  async setCycleStartDay(day: number): Promise<void> {
    if (this.loading() || this.error())
      throw new Error('Load your budget before changing its cycle.');
    const uid = this.auth.userId();
    await this.service.saveCycleStartDay(day);
    if (uid !== this.auth.userId()) throw new Error('Your account changed. Reopen Budget.');
    ++this.generation;
    this.cycleStartDay.set(day);
    this.month.set(cycleMonth(localDate(), day));
  }
  async savePlanItem(
    month: string,
    categoryId: string,
    name: string,
    amount: number,
    id: string = crypto.randomUUID(),
  ): Promise<void> {
    return this.planningState.savePlanItem(month, categoryId, name, amount, id);
  }
  async deletePlanItem(id: string): Promise<void> {
    return this.planningState.deletePlanItem(id);
  }
  async markSavingsMoved(planId: string, date: string): Promise<void> {
    return this.planningState.markSavingsMoved(planId, date);
  }
  async undoSavingsMoved(planId: string): Promise<void> {
    return this.planningState.undoSavingsMoved(planId);
  }
  async copyPlansToNextMonth(
    month: string,
    categoryId?: string,
  ): Promise<{ copied: number; skipped: number; month: string }> {
    return this.planningState.copyPlansToNextMonth(month, categoryId);
  }
  async saveDebt(input: BudgetDebtInput, id?: string): Promise<void> {
    return this.debtsState.saveDebt(input, id);
  }
  async saveDebtPlan(month: string, debtId: string, amount: number): Promise<void> {
    return this.debtsState.saveDebtPlan(month, debtId, amount);
  }
  async deleteDebt(id: string): Promise<void> {
    return this.debtsState.deleteDebt(id);
  }
  async deleteCategory(category: BudgetCategory): Promise<void> {
    return this.categoriesState.deleteCategory(category);
  }
}
