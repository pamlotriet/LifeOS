import { computed, signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { budgetSnapshot } from './budget-snapshot';
import { BudgetTransaction, DEFAULT_CATEGORIES } from '../../shared/state/budget/budget.model';

describe('Left over category', () => {
  it('keeps planned left over stable while actual follows additions, edits and deletions', () => {
    const transaction = (id: string, amount: number, type: BudgetTransaction['type'], extra = {}): BudgetTransaction => ({ id, amount, type, date: '2026-01-25', categoryId: type === 'income' ? 'salary' : type === 'transfer' ? 'savings' : 'food', title: id, paymentMethod: 'Bank transfer', notes: '', receiptUrl: '', receiptPath: '', ...extra });
    const transactions = signal([transaction('salary', 2000.50, 'income')]);
    const month = signal('2026-02');
    const category = computed(() => budgetSnapshot(transactions(), DEFAULT_CATEGORIES, [
      { id: 'food-plan', month: '2026-02', categoryId: 'food', amount: 700 },
      { id: 'save-plan', month: '2026-02', categoryId: 'savings', amount: 300.25 },
    ], month(), 25).leftOver);
    expect(category()).toMatchObject({ name: 'Spending', planned: 1000.25, actual: 1000.25 });
    transactions.update(items => [...items, transaction('food', 100.25, 'expense'), transaction('saved', 300.25, 'transfer'), transaction('debt-plan-2026-02-loan', 200, 'expense', { debtId: 'loan', paymentStatus: 'planned' })]);
    expect(category()).toMatchObject({ planned: 800.25, actual: 800.25 });
    transactions.update(items => items.map(t => t.debtId ? { ...t, paymentStatus: 'paid' } : t));
    expect(category()).toMatchObject({ planned: 800.25, actual: 800.25 });
    transactions.update(items => items.map(t => t.id === 'food' ? { ...t, amount: 200.25 } : t));
    expect(category().actual).toBe(800.25);
    transactions.update(items => items.filter(t => t.id !== 'food'));
    expect(category().actual).toBe(800.25);
    transactions.update(items => [...items, transaction('overspend', 2000, 'expense', { categoryId: 'spending' })]);
    expect(category().actual).toBe(-1199.75);
    transactions.update(items => items.map(t => t.id === 'overspend' ? { ...t, amount: 100 } : t));
    expect(category().actual).toBe(700.25);
    transactions.update(items => items.filter(t => t.id !== 'overspend'));
    expect(category().actual).toBe(800.25);
    month.set('2026-03');
    expect(category()).toMatchObject({ planned: 0, actual: 0 });
  });
  it('uses the real account checkpoint without deducting existing spending or main-account bills again', () => {
    const entry = (id: string, categoryId: string, amount: number): BudgetTransaction => ({ id, categoryId, amount, type: 'expense', date: '2026-10-28', title: id, paymentMethod: 'Card', notes: '', receiptUrl: '', receiptPath: '' });
    const entries = [entry('existing-purchases', 'spending', 1378.36)];
    const checkpoint = [{ id: '2026-10', balance: 4537, recordedSpending: 1378.36 }];
    const value = () => budgetSnapshot(entries, DEFAULT_CATEGORIES, [], '2026-10', 1, checkpoint).leftOver;
    expect(value()).toMatchObject({ confirmed: true, actual: 4537 });
    entries.push(entry('subscription', 'subscriptions', 199), entry('petrol', 'transport', 500));
    expect(value().actual).toBe(4537);
    entries.push(entry('new-purchase', 'spending', 100));
    expect(value().actual).toBe(4437);
    entries[entries.length - 1].amount = 150;
    expect(value().actual).toBe(4387);
    entries.pop();
    expect(value().actual).toBe(4537);
    expect(budgetSnapshot(entries, DEFAULT_CATEGORIES, [], '2026-11', 1, checkpoint).leftOver).toMatchObject({ confirmed: true, actual: 4537 });
    entries.push({ ...entry('next-cycle-purchase', 'spending', 200), date: '2026-11-03' });
    expect(budgetSnapshot(entries, DEFAULT_CATEGORIES, [], '2026-11', 1, checkpoint).leftOver.actual).toBe(4337);
    expect(value().actual).toBe(4537);
  });

  it('carries balances over the year boundary and increases them only for actual transfers', () => {
    const entry = (id: string, date: string, amount: number, type: BudgetTransaction['type'], categoryId: string): BudgetTransaction => ({ id, date, amount, type, categoryId, title: id, paymentMethod: 'Card', notes: '', receiptUrl: '', receiptPath: '' });
    const entries = [
      entry('old-purchase', '2026-12-01', 100, 'expense', 'spending'),
      entry('salary', '2026-12-25', 10000, 'income', 'salary'),
      entry('purchase', '2027-01-03', 200, 'expense', 'spending'),
    ];
    const plans = [{ id: 'bills', month: '2027-01', categoryId: 'subscriptions', amount: 1500 }, { id: 'savings', month: '2027-01', categoryId: 'savings', amount: 3000 }];
    const checkpoint = [{ id: '2026-12', balance: 4537, recordedSpending: 100 }];
    const value = () => budgetSnapshot(entries, DEFAULT_CATEGORIES, plans, '2027-01', 25, checkpoint).leftOver.actual;
    expect(value()).toBe(4337); // Salary and plans do not move money into Spending.
    entries.push(entry('actual-transfer', '2026-12-25', 5500, 'spending-transfer', 'spending'));
    expect(value()).toBe(9837);
    entries.push(entry('bill-paid', '2027-01-04', 1500, 'expense', 'subscriptions'));
    entries.push(entry('savings-moved', '2027-01-04', 3000, 'transfer', 'savings'));
    expect(value()).toBe(9837);
    expect(budgetSnapshot(entries, DEFAULT_CATEGORIES, plans, '2027-02', 25, checkpoint).leftOver.actual).toBe(9837);
    plans[0].amount = 2000;
    expect(value()).toBe(9837); // Changing plans does not change the bank transfer.
    entries.find(t => t.id === 'actual-transfer')!.amount = 5000;
    expect(value()).toBe(9337);
    entries.splice(entries.findIndex(t => t.id === 'actual-transfer'), 1);
    expect(value()).toBe(4337);
  });

  it('does not count transfers already included in the starting balance as income or savings', () => {
    const transaction: BudgetTransaction = { id: 'fund', type: 'spending-transfer', categoryId: 'spending', amount: 6000, date: '2026-10-28', title: 'To Spending', paymentMethod: 'Bank transfer', notes: '', receiptUrl: '', receiptPath: '' };
    const result = budgetSnapshot([transaction], DEFAULT_CATEGORIES, [], '2026-10', 1, [{ id: '2026-10', balance: 4537, recordedFunding: 6000, recordedSpending: 0 }]);
    expect(result.leftOver.actual).toBe(4537);
    expect(result.income).toBe(0);
    expect(result.expenses).toBe(0);
    expect(result.savings).toBe(0);
  });

});
