import translationTestProviders from '@src/test-providers';
import '@angular/compiler';
import { computed, Injector, runInInjectionContext, signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { BudgetPlanned } from '@pages/budget/budget-planned/budget-planned';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import {
  BudgetPlan,
  BudgetTransaction,
  DEFAULT_CATEGORIES,
  debtPlanId,
} from '@pages/budget/state/budget/budget.model';

describe('Planning balance forecast', () => {
  it('subtracts category plans and debt payments once, preserves cents, and follows the selected month', () => {
    const transaction = (
      id: string,
      amount: number,
      type: BudgetTransaction['type'],
      extra = {},
    ): BudgetTransaction => ({
      id,
      amount,
      type,
      categoryId: 'salary',
      title: '',
      date: '2026-10-01',
      paymentMethod: 'Bank transfer',
      notes: '',
      receiptUrl: '',
      receiptPath: '',
      ...extra,
    });
    const month = signal('2026-10');
    const transactions = signal([
      transaction('income', 1000.5, 'income'),
      transaction('spent', 200, 'expense'),
      transaction(debtPlanId('2026-10', 'loan'), 100.25, 'expense', {
        debtId: 'loan',
        categoryId: 'food',
        paymentStatus: 'planned',
      }),
      transaction('next-income', 500, 'income', { date: '2026-11-01' }),
    ]);
    const plans = signal<BudgetPlan[]>([
      { id: 'food', month: '2026-10', categoryId: 'food', amount: 300.1 },
      { id: 'savings', month: '2026-10', categoryId: 'savings', amount: 100.05 },
    ]);
    const store = {
      month,
      cycleStartDay: signal(1),
      transactions,
      plans,
      activeCategories: signal(DEFAULT_CATEGORIES),
      debts: signal([{ id: 'loan', name: 'Loan', type: 'loan' }]),
      monthly: computed(() =>
        transactions().filter((t) => t.date.startsWith(month()) && t.paymentStatus !== 'planned'),
      ),
    };
    const page = runInInjectionContext(
      Injector.create({
        providers: [...translationTestProviders, { provide: BudgetStore, useValue: store }],
      }),
      () => new BudgetPlanned(),
    );
    expect(page.predictedBalance()).toBe(500.1);
    expect(page.outlook().afterPlans).toBe(300.1);
    expect(page.planned().find((item) => item.id === 'food')?.actual).toBe(0);
    transactions.update((items) =>
      items.map((t) => (t.debtId ? { ...t, paymentStatus: 'paid' } : t)),
    );
    expect(page.predictedBalance()).toBe(500.1);
    expect(page.outlook().afterPlans).toBe(300.1);
    expect(page.planned().find((item) => item.id === 'food')?.actual).toBe(0);
    plans.update((items) => items.map((p) => (p.id === 'food' ? { ...p, amount: 900.3 } : p)));
    expect(page.predictedBalance()).toBe(-100.1);
    month.set('2026-11');
    expect(page.predictedBalance()).toBe(500);
    month.set('2026-12');
    expect(page.predictedBalance()).toBe(0);
  });
});

describe('Planned payment editor', () => {
  function create() {
    const store = { month: signal('2026-11'), savePlanItem: vi.fn().mockResolvedValue(undefined) };
    const page = runInInjectionContext(
      Injector.create({
        providers: [...translationTestProviders, { provide: BudgetStore, useValue: store }],
      }),
      () => new BudgetPlanned(),
    );
    return { page, store };
  }

  it('creates no placeholder and saves the name and amount together', async () => {
    const { page, store } = create();
    page.editItem('bills');
    expect(store.savePlanItem).not.toHaveBeenCalled();
    page.draftName.set('  Internet  ');
    page.draftAmount.set(599.95);
    await page.saveDraft();
    expect(store.savePlanItem).toHaveBeenCalledWith(
      '2026-11',
      'bills',
      'Internet',
      599.95,
      undefined,
    );
    expect(page.editorCategoryId()).toBeNull();
  });

  it('rejects missing amounts and keeps an unsuccessful edit for retry', async () => {
    const { page, store } = create();
    const item: BudgetPlan = {
      id: 'bill-1',
      month: '2026-11',
      categoryId: 'bills',
      name: 'Internet',
      amount: 500,
    };
    Object.assign(store, { transactions: signal([]) });
    page.editItem('bills', item);
    page.draftAmount.set(null);
    await page.saveDraft();
    expect(store.savePlanItem).not.toHaveBeenCalled();
    page.draftName.set('Fibre');
    page.draftAmount.set(600);
    store.savePlanItem.mockRejectedValueOnce(new Error('Offline'));
    await page.saveDraft();
    expect(page.planItemError()).toBe('Offline');
    expect(page.draftName()).toBe('Fibre');
    expect(page.draftAmount()).toBe(600);
    expect(page.editingId()).toBe('bill-1');
    expect(item.amount).toBe(500);
    await page.saveDraft();
    expect(store.savePlanItem).toHaveBeenLastCalledWith('2026-11', 'bills', 'Fibre', 600, 'bill-1');
    expect(page.editorCategoryId()).toBeNull();
  });

  it('cancels without writing and starts the next item with empty fields', () => {
    const { page, store } = create();
    page.editItem('bills');
    page.draftName.set('Internet');
    page.draftAmount.set(500);
    page.cancelEdit();
    expect(store.savePlanItem).not.toHaveBeenCalled();
    expect(page.editorCategoryId()).toBeNull();
    page.editItem('savings');
    expect(page.draftName()).toBe('');
    expect(page.draftAmount()).toBeNull();
  });

  it('prevents duplicate submissions and changing cycle during a save', async () => {
    const { page, store } = create();
    let finish!: () => void;
    store.savePlanItem.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    page.editItem('bills');
    page.draftName.set('Internet');
    page.draftAmount.set(500);
    const pending = page.saveDraft();
    await page.saveDraft();
    page.setMonth('2026-12');
    expect(store.month()).toBe('2026-11');
    expect(store.savePlanItem).toHaveBeenCalledTimes(1);
    finish();
    await pending;
    expect(page.savingPlanItem()).toBe(false);
  });
});
