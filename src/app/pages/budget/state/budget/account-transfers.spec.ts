import { describe, expect, it } from 'vitest';
import { budgetSnapshot } from '@pages/budget/budget-snapshot';
import {
  BudgetAccount,
  BudgetTransaction,
  DEFAULT_CATEGORIES,
  savingsNet,
  summary,
  transferAccounts,
  transferNet,
  validateTransaction,
} from '@pages/budget/state/budget/budget.model';

const transfer = (
  fromAccount: BudgetAccount,
  toAccount: BudgetAccount,
  amount = 100.25,
): BudgetTransaction => ({
  id: `${fromAccount}-${toAccount}`,
  type: 'transfer',
  fromAccount,
  toAccount,
  amount,
  categoryId: fromAccount === 'savings' || toAccount === 'savings' ? 'savings' : 'spending',
  title: 'Transfer',
  date: '2026-10-10',
  paymentMethod: 'Bank transfer',
  notes: '',
  receiptUrl: '',
  receiptPath: '',
});

describe('Account-to-account transfers', () => {
  it.each([
    ['main', 'spending'],
    ['main', 'savings'],
    ['spending', 'main'],
    ['spending', 'savings'],
    ['savings', 'main'],
    ['savings', 'spending'],
  ] as [BudgetAccount, BudgetAccount][])(
    'moves cents from %s to %s without creating income or expenses',
    (from, to) => {
      const item = transfer(from, to);
      expect(() => validateTransaction(item)).not.toThrow();
      expect(transferNet([item], from)).toBe(-100.25);
      expect(transferNet([item], to)).toBe(100.25);
      expect(
        ['main', 'spending', 'savings'].reduce(
          (sum, account) => sum + transferNet([item], account as BudgetAccount),
          0,
        ),
      ).toBe(0);
      expect(summary([item], DEFAULT_CATEGORIES)).toMatchObject({ income: 0, expenses: 0 });
    },
  );

  it('rejects identical, missing or unknown accounts and transfer fields on an expense', () => {
    expect(() => validateTransaction(transfer('main', 'main'))).toThrow('different accounts');
    expect(() => validateTransaction({ ...transfer('main', 'savings'), toAccount: '' })).toThrow(
      'source and destination',
    );
    expect(() =>
      validateTransaction({
        ...transfer('main', 'savings'),
        fromAccount: 'unknown' as BudgetAccount,
      }),
    ).toThrow();
    expect(() =>
      validateTransaction({ ...transfer('main', 'savings'), type: 'expense' }),
    ).toThrow();
  });

  it('keeps legacy transfers readable and includes withdrawals in Savings', () => {
    const legacySavings = {
      ...transfer('main', 'savings', 500),
      fromAccount: undefined,
      toAccount: undefined,
    };
    const legacySpending = { ...legacySavings, type: 'spending-transfer' as const, amount: 200 };
    expect(transferAccounts(legacySavings)).toEqual({ from: 'main', to: 'savings' });
    expect(transferAccounts(legacySpending)).toEqual({ from: 'main', to: 'spending' });
    expect(
      savingsNet([
        legacySavings,
        legacySpending,
        transfer('savings', 'main', 125.25),
        transfer('savings', 'spending', 50),
      ]),
    ).toBe(324.75);
  });

  it('updates a confirmed Spending balance in both directions without recounting checkpoint transfers', () => {
    const legacy = {
      ...transfer('main', 'spending', 100),
      type: 'spending-transfer' as const,
      fromAccount: undefined,
      toAccount: undefined,
    };
    const items = [
      legacy,
      transfer('main', 'spending', 200),
      transfer('spending', 'savings', 50),
      transfer('savings', 'spending', 25),
      transfer('spending', 'main', 10),
    ];
    const checkpoint = [
      { id: '2026-10', balance: 1000, recordedSpending: 0, recordedFunding: 100 },
    ];
    const snapshot = (records: BudgetTransaction[]) =>
      budgetSnapshot(records, DEFAULT_CATEGORIES, [], '2026-10', 1, checkpoint);
    expect(snapshot(items).leftOver.actual).toBe(1165);
    expect(snapshot(items.slice(0, -1)).leftOver.actual).toBe(1175);
    expect(
      snapshot(items.map((item) => (item.id === 'spending-main' ? { ...item, amount: 20 } : item)))
        .leftOver.actual,
    ).toBe(1155);
    expect(
      snapshot([...items, { ...transfer('main', 'spending', 999), date: '2026-11-01' }]).leftOver
        .actual,
    ).toBe(1165);
  });

  it('ignores planned records and nets Savings plans after withdrawals', () => {
    const items = [
      transfer('main', 'savings', 200),
      transfer('savings', 'main', 50),
      { ...transfer('spending', 'savings', 80), paymentStatus: 'planned' as const },
    ];
    expect(savingsNet(items)).toBe(150);
    const snapshot = budgetSnapshot(
      items,
      DEFAULT_CATEGORIES,
      [{ id: 'p', categoryId: 'savings', amount: 300, month: '2026-10' }],
      '2026-10',
      1,
    );
    expect(snapshot.categoryCommitments).toBe(150);
  });
});
