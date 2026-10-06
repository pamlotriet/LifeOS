import { describe, expect, it } from 'vitest';
import { BudgetDebt, BudgetTransaction } from '../budget/budget.model';
import { debtStats } from './debt-stats';

describe('Debt statistics', () => {
  const debts: BudgetDebt[] = [
    { id: 'credit', name: 'Card', type: 'credit-card', openingBalance: 1000, annualInterestRate: 12, openingOverride: null },
    { id: 'loan', name: 'Loan', type: 'loan', openingBalance: 2000, annualInterestRate: 0, openingOverride: null },
  ];
  const payment = (id: string, debtId: string, amount: number, date: string, paymentStatus: 'paid' | 'planned' = 'paid'): BudgetTransaction => ({ id, debtId, amount, date, paymentStatus, type: 'expense', categoryId: 'other', title: 'Payment', paymentMethod: 'Bank transfer', notes: '', receiptUrl: '', receiptPath: '' });
  it('uses all prior payments for balances and only selected paid repayments for the chart', () => {
    const result = debtStats(debts, [payment('prior','credit',100,'2026-09-01'), payment('paid','loan',200,'2026-10-01'), payment('planned','credit',500,'2026-10-10','planned'), payment('orphan','deleted',999,'2026-10-01')], ['2026-10'], false, '2026-10-06');
    expect(result.credit).toBe(909);
    expect(result.loans).toBe(1800);
    expect(result.outstanding).toBe(2709);
    expect(result.repaid).toBe(200);
    expect(result.monthly).toEqual([200]);
    expect(result.planned).toBe(500);
  });
  it('handles accounts with no payments and fully repaid accounts', () => {
    expect(debtStats(debts, [], ['2026-10'], false, '2026-10-06').outstanding).toBe(3010);
    expect(debtStats([debts[1]], [payment('paid','loan',2500,'2026-09-01')], ['2026-10'], true, '2026-10-06').outstanding).toBe(0);
    expect(debtStats([], [], ['2026-10'], false, '2026-10-06').monthly).toEqual([0]);
  });
});
