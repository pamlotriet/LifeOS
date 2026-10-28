import '@angular/compiler';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { BudgetStore } from './budget.store';
import { BudgetTransaction, DEFAULT_CATEGORIES, TransactionInput } from './budget.model';
import { budgetSnapshot } from '../../../pages/budget/budget-snapshot';

function fixture() {
  const store = Object.create(BudgetStore.prototype) as BudgetStore;
  const saveTransaction = vi.fn(async (input: TransactionInput, id: string) => ({ ...input, id }));
  Object.assign(store, {
    service: { saveTransaction, deleteTransaction: vi.fn(async () => {}) },
    auth: { userId: () => 'user' }, generation: 0,
    loading: signal(false), error: signal(''), cycleStartDay: signal(25),
    activeCategories: () => DEFAULT_CATEGORIES,
    plans: signal([{ id: 'emergency', month: '2026-02', categoryId: 'savings', name: 'Emergency fund', amount: 500.25 }]),
    transactions: signal<BudgetTransaction[]>([{ id: 'income', type: 'income', amount: 2000, categoryId: 'salary', title: 'Salary', date: '2026-01-25', paymentMethod: 'Bank transfer', notes: '', receiptUrl: '', receiptPath: '' }]),
  });
  return { store, saveTransaction };
}

describe('Move planned savings', () => {
  it('deducts the actual balance once, clears the commitment, persists a transfer, and supports undo', async () => {
    const { store, saveTransaction } = fixture();
    const snapshot = () => budgetSnapshot(store.transactions(), DEFAULT_CATEGORIES, store.plans(), '2026-02', 25);
    expect(snapshot().remaining).toBe(2000);
    expect(snapshot().afterPlans).toBe(1499.75);
    await store.markSavingsMoved('emergency', '2026-01-26');
    await store.markSavingsMoved('emergency', '2026-01-26');
    expect(saveTransaction).toHaveBeenCalledTimes(1);
    expect(store.transactions()[1]).toMatchObject({ type: 'transfer', amount: 500.25, paymentStatus: 'paid', categoryId: 'savings' });
    expect(snapshot().remaining).toBe(1499.75);
    expect(snapshot().categoryCommitments).toBe(0);
    expect(snapshot().afterPlans).toBe(1499.75);
    await store.undoSavingsMoved('emergency');
    expect(snapshot().remaining).toBe(2000);
    expect(snapshot().categoryCommitments).toBe(500.25);
  });
  it('rejects a date outside the selected cycle and keeps balances unchanged on save failure', async () => {
    const { store, saveTransaction } = fixture();
    await expect(store.markSavingsMoved('emergency', '2026-02-25')).rejects.toThrow('within this budget cycle');
    saveTransaction.mockRejectedValueOnce(new Error('Offline'));
    await expect(store.markSavingsMoved('emergency', '2026-01-26')).rejects.toThrow('Offline');
    expect(store.transactions()).toHaveLength(1);
  });
});
