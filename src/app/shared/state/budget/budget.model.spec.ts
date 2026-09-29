import { describe, expect, it } from 'vitest';
import { BudgetTransaction, compatibleCategory, DEFAULT_CATEGORIES, summary, total, TransactionInput, validateTransaction } from './budget.model';

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
