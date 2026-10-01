import { describe, expect, it } from 'vitest';
import { BudgetDebt, BudgetTransaction, compatibleCategory, debtSummary, DEFAULT_CATEGORIES, summary, total, TransactionInput, validateTransaction } from './budget.model';

const transaction = (amount: number, type: BudgetTransaction['type'], categoryId: string): BudgetTransaction => ({ id: crypto.randomUUID(), amount, type, categoryId, title: 'Test', date: '2026-09-01', paymentMethod: 'Card', notes: '', receiptUrl: '', receiptPath: '' });
describe('Budget calculations', () => {
  it('counts bills once within expenses and subtracts savings from available income', () => {
    const items = [transaction(28000, 'income', 'salary'), transaction(12250, 'expense', 'food'), transaction(6200, 'expense', 'utilities'), transaction(3000, 'transfer', 'savings')];
    expect(summary(items, DEFAULT_CATEGORIES)).toEqual({ income: 28000, expenses: 18450, bills: 6200, savings: 3000, remaining: 6550 });
  });
  it('preserves cents and negative balances', () => {
    expect(total([transaction(.1, 'expense', 'food'), transaction(.2, 'expense', 'food')])).toBe(.3);
    expect(summary([transaction(20.05, 'expense', 'food')], DEFAULT_CATEGORIES).remaining).toBe(-20.05);
  });
  it('returns zero totals for an empty month', () => {
    expect(summary([], DEFAULT_CATEGORIES)).toEqual({ income: 0, expenses: 0, bills: 0, savings: 0, remaining: 0 });
  });
  it('allows bills only as expenses and savings only as transfers', () => {
    expect(compatibleCategory('expense', 'bills')).toBe(true);
    expect(compatibleCategory('income', 'bills')).toBe(false);
    expect(compatibleCategory('transfer', 'savings')).toBe(true);
    expect(compatibleCategory('expense', 'savings')).toBe(false);
  });
});
describe('Budget validation', () => {
  const input: TransactionInput = transaction(45.5, 'expense', 'food');
  it.each([0, -1, NaN, Infinity, 1.001, 1000000000])('rejects invalid amount %s', amount => {
    expect(() => validateTransaction({ ...input, amount })).toThrow(/amount/);
  });
  it.each(['2026-02-30', '2026-13-01', '', 'not a date'])('rejects invalid date %s', date => {
    expect(() => validateTransaction({ ...input, date })).toThrow(/date/);
  });
  it('accepts leap days and validates required description and category', () => {
    expect(() => validateTransaction({ ...input, date: '2028-02-29' })).not.toThrow();
    expect(() => validateTransaction({ ...input, title: '  ' })).toThrow(/title/);
    expect(() => validateTransaction({ ...input, categoryId: '' })).toThrow(/category/);
  });
});

describe('Debt payments', () => {
  const debt: BudgetDebt = { id: 'loan', name: 'Oom Martin', type: 'loan', openingBalance: 170000, annualInterestRate: 0, openingOverride: null };
  const payment = (amount: number, date: string, paymentStatus?: 'paid' | 'planned'): BudgetTransaction => ({ ...transaction(amount, 'expense', 'other'), debtId: debt.id, date, paymentStatus });
  it('carries past payments forward and separates future plans from the actual balance', () => {
    const items = [payment(10000, '2026-08-01'), payment(5000, '2026-09-02', 'paid'), payment(2000, '2026-10-10', 'planned')];
    expect(debtSummary(debt, items, '2026-09')).toMatchObject({ opening: 160000, paid: 15000, monthPaid: 5000, closing: 155000, planned: 2000, projected: 153000 });
    expect(summary(items, DEFAULT_CATEGORIES).expenses).toBe(15000);
  });
  it('does not reduce a historical balance with later paid entries or another debt', () => {
    const items = [payment(1000, '2026-10-02', 'paid'), { ...payment(500, '2026-08-01'), debtId: 'other' }];
    expect(debtSummary(debt, items, '2026-09').closing).toBe(170000);
  });
  it('counts a planned payment once after it is marked paid', () => {
    const item = payment(500, '2026-09-01', 'planned');
    expect(debtSummary(debt, [item], '2026-09').closing).toBe(170000);
    expect(debtSummary(debt, [{ ...item, paymentStatus: 'paid' }], '2026-09')).toMatchObject({ closing: 169500, planned: 0, paid: 500 });
  });
  it('calculates current-month credit interest after previous payments and clamps overpayment', () => {
    expect(debtSummary({ ...debt, type: 'credit-card', annualInterestRate: 12 }, [payment(10000, '2026-08-01')], '2026-09').interest).toBe(1600);
    expect(debtSummary(debt, [payment(200000, '2026-09-01')], '2026-09').closing).toBe(0);
  });
  it('allows past payments and future plans but rejects future completed payments', () => {
    expect(() => validateTransaction(payment(500, '2020-01-01', 'paid'))).not.toThrow();
    expect(() => validateTransaction(payment(500, '2099-01-01', 'planned'))).not.toThrow();
    expect(() => validateTransaction(payment(500, '2099-01-01', 'paid'))).toThrow(/planned/);
    expect(() => validateTransaction({ ...payment(500, '2099-01-01', 'planned'), debtId: '' })).toThrow(/debt/);
  });
});
