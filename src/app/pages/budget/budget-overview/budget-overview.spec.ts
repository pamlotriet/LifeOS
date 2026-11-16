import translationTestProviders from '@src/test-providers';
import '@angular/compiler';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import { BudgetOverview } from '@pages/budget/budget-overview/budget-overview';
import { BudgetTransaction } from '@pages/budget/state/budget/budget.model';

describe('Budget cycle navigation', () => {
  const create = (data = {}) => {
    const store = { month: signal('2026-01'), cycleStartDay: signal(25), accountName: (id: string) => id };
    const page = runInInjectionContext(
      Injector.create({
        providers: [
          ...translationTestProviders,
          { provide: BudgetStore, useValue: store },
          { provide: ActivatedRoute, useValue: { snapshot: { data } } },
        ],
      }),
      () => new BudgetOverview(),
    );
    return { page, store };
  };
  it('opens the native month picker on the first click', () => {
    const { page } = create();
    const showPicker = vi.fn();
    page.openCyclePicker({ showPicker } as unknown as HTMLInputElement);
    expect(showPicker).toHaveBeenCalledOnce();
  });
  it('moves across year boundaries and clears the date filter', () => {
    const { page, store } = create();
    page.selectedDate.set('2025-12-28');
    page.shiftMonth(-1);
    expect(store.month()).toBe('2025-12');
    expect(page.selectedDate()).toBe('');
    page.shiftMonth(1);
    expect(store.month()).toBe('2026-01');
  });
  it('preserves the cycle when a month selection is cleared or invalid', () => {
    const { page, store } = create();
    page.setMonth('');
    page.setMonth('2026-13');
    expect(store.month()).toBe('2026-01');
  });
  it('keeps the field usable when a browser refuses to open the picker', () => {
    const { page } = create();
    const focus = vi.fn();
    page.openCyclePicker({
      showPicker: () => {
        throw new Error('Unsupported');
      },
      focus,
    } as unknown as HTMLInputElement);
    expect(focus).toHaveBeenCalledOnce();
  });
  it('confirms numeric values emitted by the amount field, including zero', async () => {
    const { page, store } = create();
    const setSpendingBalance = vi.fn().mockResolvedValue(undefined);
    Object.assign(store, { setSpendingBalance });
    page.balanceInput.set(4537);
    await page.saveSpendingBalance();
    expect(setSpendingBalance).toHaveBeenCalledWith(4537);
    expect(page.balanceError()).toBe('');
    expect(page.balanceSaved()).toBe(true);
    expect(page.balanceInput()).toBeNull();
    page.balanceInput.set(0);
    await page.saveSpendingBalance();
    expect(setSpendingBalance).toHaveBeenLastCalledWith(0);
    expect(page.savingBalance()).toBe(false);
  });
  it('shows validation and save errors and allows retrying', async () => {
    const { page, store } = create();
    const setSpendingBalance = vi
      .fn()
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValue(undefined);
    Object.assign(store, { setSpendingBalance });
    page.balanceInput.set(NaN);
    await page.saveSpendingBalance();
    expect(setSpendingBalance).not.toHaveBeenCalled();
    expect(page.balanceSaved()).toBe(false);
    page.balanceInput.set(4537);
    await page.saveSpendingBalance();
    expect(page.balanceError()).toBe('Offline');
    expect(page.balanceInput()).toBe(4537);
    expect(page.savingBalance()).toBe(false);
    await page.saveSpendingBalance();
    expect(page.balanceSaved()).toBe(true);
  });

  it('combines transaction search, type and date without changing the records', () => {
    const { page, store } = create();
    const transactions = [
      {
        id: '1',
        title: 'Groceries',
        type: 'expense',
        date: '2026-01-26',
        categoryId: 'food',
        notes: '',
      },
      {
        id: '2',
        title: 'Salary',
        type: 'income',
        date: '2026-01-26',
        categoryId: 'salary',
        notes: '',
      },
      {
        id: '3',
        title: 'Lunch',
        type: 'expense',
        date: '2026-01-27',
        categoryId: 'food',
        notes: 'Work meal',
      },
      {
        id: '4',
        title: 'Savings',
        type: 'transfer',
        date: '2026-01-27',
        categoryId: 'savings',
        notes: '',
      },
    ] as BudgetTransaction[];
    Object.assign(store, {
      monthly: signal(transactions),
      categories: signal([{ id: 'food', name: 'Food & dining' }]),
    });
    page.search.set('  FOOD  ');
    expect(page.filtered().map((item) => item.id)).toEqual(['1', '3']);
    page.transactionType.set('expense');
    page.selectedDate.set('2026-01-27');
    expect(page.filtered().map((item) => item.id)).toEqual(['3']);
    page.search.set('work');
    expect(page.filtered().map((item) => item.id)).toEqual(['3']);
    page.transactionType.set('income');
    expect(page.filtered()).toEqual([]);
    page.search.set('');
    page.selectedDate.set('');
    page.transactionType.set('all');
    expect(page.filtered()).toEqual(transactions);
  });

  it('keeps the Transfers screen limited to transfers, including legacy records', () => {
    const { page, store } = create({ monthly: true, transfers: true });
    Object.assign(store, {
      monthly: signal([
        { id: '1', type: 'income', title: 'Salary' },
        { id: '2', type: 'spending-transfer', title: 'Old transfer' },
        {
          id: '3',
          type: 'transfer',
          fromAccount: 'savings',
          toAccount: 'main',
          title: 'Withdrawal',
        },
      ]),
      categories: signal([]),
    });
    expect(page.filtered().map((item) => item.id)).toEqual(['2', '3']);
    page.transactionType.set('all');
    expect(page.filtered().map((item) => item.id)).toEqual(['2', '3']);
    page.search.set('main');
    expect(page.filtered().map((item) => item.id)).toEqual(['2', '3']);
    page.search.set('savings');
    expect(page.filtered().map((item) => item.id)).toEqual(['3']);
  });
});
