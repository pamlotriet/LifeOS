import '@angular/compiler';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetDebts } from './budget-debts';
import { BudgetStore } from '../../shared/state/budget/budget.store';
import { BudgetTransaction, DEFAULT_CATEGORIES, localDate } from '../../shared/state/budget/budget.model';

describe('Debt payment workflow', () => {
  const saveTransaction = vi.fn();
  const deleteTransaction = vi.fn();
  const planned: BudgetTransaction = { id: 'payment-1', amount: 500, type: 'expense', categoryId: 'other', title: 'Payment to Oom Martin', date: '2099-01-01', paymentMethod: 'Bank transfer', notes: 'First instalment', receiptUrl: '', receiptPath: '', debtId: 'loan', paymentStatus: 'planned' };
  const store = { debts: signal([{ id: 'loan', name: 'Oom Martin', type: 'loan', openingBalance: 170000, annualInterestRate: 0, openingOverride: null }]), transactions: signal<BudgetTransaction[]>([]), activeCategories: signal(DEFAULT_CATEGORIES), saveTransaction, deleteTransaction };
  const create = () => runInInjectionContext(Injector.create({ providers: [{ provide: BudgetStore, useValue: store }] }), () => new BudgetDebts());
  beforeEach(() => { vi.resetAllMocks(); store.transactions.set([]); saveTransaction.mockResolvedValue(undefined); });
  it('records a historical payment with the debt and original date', async () => {
    const page = create();
    page.editPayment('loan', 'paid');
    page.payment.amount = 1000; page.payment.date = '2020-05-10';
    await page.savePayment();
    expect(saveTransaction).toHaveBeenCalledWith(expect.objectContaining({ debtId: 'loan', date: '2020-05-10', paymentStatus: 'paid', amount: 1000 }), undefined);
    expect(page.paymentDebt()).toBeNull();
  });
  it('marks a plan paid by editing its existing id with a confirmable actual date', async () => {
    const page = create();
    page.editPayment('loan', 'paid', planned);
    expect(page.payment.date).toBe(localDate());
    expect(saveTransaction).not.toHaveBeenCalled();
    page.payment.date = '2020-05-10';
    await page.savePayment();
    expect(saveTransaction).toHaveBeenCalledWith(expect.objectContaining({ paymentStatus: 'paid', date: '2020-05-10', notes: 'First instalment' }), 'payment-1');
  });
  it('keeps failed edits open with an error and prevents duplicate submissions', async () => {
    const page = create();
    page.editPayment('loan', 'planned');
    saveTransaction.mockRejectedValue(new Error('Connection failed'));
    await page.savePayment();
    expect(page.error()).toBe('Connection failed');
    expect(page.paymentDebt()).toBe('loan');
    expect(page.busy()).toBe(false);
    page.busy.set(true);
    await page.savePayment();
    expect(saveTransaction).toHaveBeenCalledTimes(1);
  });
  it('shows old paid entries and future plans in separate lists', () => {
    store.transactions.set([planned, { ...planned, id: 'paid-1', date: '2020-01-01', paymentStatus: 'paid' }]);
    const page = create();
    expect(page.rows()[0].history.map(p => p.id)).toEqual(['paid-1']);
    expect(page.rows()[0].upcoming.map(p => p.id)).toEqual(['payment-1']);
    expect(page.totals()).toEqual({ remaining: 169500, paid: 500, planned: 500 });
  });
});
