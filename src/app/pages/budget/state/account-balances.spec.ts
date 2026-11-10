import { describe, expect, it } from 'vitest';
import {
  BudgetDebt,
  BudgetTransaction,
  debtSummary,
  savingsNet,
  validateTransaction,
} from '@pages/budget/state/budget.model';
const tx = (amount: number, extra: Partial<BudgetTransaction> = {}): BudgetTransaction => ({
  id: 't',
  amount,
  type: 'expense',
  categoryId: 'food',
  title: 'Purchase',
  date: '2026-10-10',
  paymentMethod: 'Card',
  notes: '',
  receiptUrl: '',
  receiptPath: '',
  ...extra,
});
describe('Savings and credit card transactions', () => {
  it('nets deposits and savings purchases, excluding plans and other accounts', () => {
    expect(
      savingsNet([
        tx(500, { type: 'transfer' }),
        tx(125.25, { account: 'savings' }),
        tx(50),
        tx(20, { account: 'savings', paymentStatus: 'planned' }),
      ]),
    ).toBe(374.75);
  });
  it('adds previous and current card purchases while deducting repayments', () => {
    const card: BudgetDebt = {
      id: 'card',
      name: 'Card',
      type: 'credit-card',
      openingBalance: 1000,
      annualInterestRate: 0,
      openingOverride: null,
    };
    const transactions = [
      tx(200, { account: 'credit:card', date: '2026-09-01' }),
      tx(150.25, { account: 'credit:card' }),
      tx(100, { debtId: 'card' }),
      tx(99, { account: 'credit:other' }),
    ];
    expect(debtSummary(card, transactions, '2026-10')).toMatchObject({
      opening: 1200,
      monthPaid: 100,
      closing: 1250.25,
    });
    expect(
      debtSummary(
        card,
        transactions.filter((t) => t.amount !== 150.25),
        '2026-10',
      ).closing,
    ).toBe(1100);
  });
  it('rejects credit purchases marked as repayments or income', () => {
    expect(() => validateTransaction(tx(20, { account: 'credit:card', debtId: 'card' }))).toThrow();
    expect(() => validateTransaction(tx(20, { account: 'savings', type: 'income' }))).toThrow();
  });
});
