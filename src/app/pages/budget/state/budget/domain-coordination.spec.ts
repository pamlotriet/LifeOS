import { computed, signal } from '@angular/core';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import type { BudgetService } from '@pages/budget/state/budget/budget.service';
import {
  BudgetAccountRecord,
  BudgetTransaction,
  DEFAULT_CATEGORIES,
} from '@pages/budget/state/budget/budget.model';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('Budget domain coordination', () => {
  it('keeps an account saved while an older reload snapshot is pending', async () => {
    const write = deferred<BudgetAccountRecord>();
    const load = deferred<Awaited<ReturnType<BudgetService['load']>>>();
    const accounts = signal<BudgetAccountRecord[]>([]);
    const store = Object.create(BudgetStore.prototype) as BudgetStore;
    Object.assign(store, {
      accounts,
      activeAccounts: computed(() => accounts()),
      loading: signal(false),
      error: signal(''),
      generation: 0,
      auth: { userId: () => 'owner' },
      service: { saveAccount: () => write.promise, load: () => load.promise },
    });
    const saving = store.saveAccount('Travel', 'custom-travel');
    const reloading = store.reload();
    write.resolve({ id: 'custom-travel', name: 'Travel' });
    await saving;
    load.resolve({
      transactions: [],
      categories: [],
      plans: [],
      debts: [],
      accounts: [],
      spendingBalances: [],
      cycleStartDay: 1,
    });
    await reloading;
    expect(store.accounts()).toEqual([{ id: 'custom-travel', name: 'Travel' }]);
    expect(store.error()).toBe('');
  });

  it('routes planned debt through transaction validation and preserves paid history', async () => {
    const saveTransaction = vi.fn(async (input, id) => ({ ...input, id }));
    const transactions = signal<BudgetTransaction[]>([]);
    const store = Object.create(BudgetStore.prototype) as BudgetStore;
    Object.assign(store, {
      transactions,
      loading: signal(false),
      error: signal(''),
      generation: 0,
      activeAccounts: () => [],
      activeCategories: () => DEFAULT_CATEGORIES,
      debts: signal([{ id: 'loan', name: 'Loan' }]),
      cycleStartDay: () => 25,
      auth: { userId: () => 'owner' },
      service: { saveTransaction },
    });
    await store.saveDebtPlan('2026-11', 'loan', 200);
    const planned = transactions()[0];
    expect(planned).toMatchObject({
      amount: 200,
      debtId: 'loan',
      paymentStatus: 'planned',
      date: '2026-10-25',
    });
    transactions.set([{ ...planned, paymentStatus: 'paid' }]);
    await expect(store.saveDebtPlan('2026-11', 'loan', 0)).rejects.toThrow('already paid');
    expect(saveTransaction).toHaveBeenCalledTimes(1);
    expect(transactions()[0].paymentStatus).toBe('paid');
  });
});
