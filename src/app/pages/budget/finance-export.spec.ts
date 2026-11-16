import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import {
  createFinanceExport,
  financeCsv,
  financeExportData,
  FinanceExportInput,
} from '@pages/budget/finance-export';
import { BudgetTransaction } from '@pages/budget/state/budget/budget.model';

const entry = (
  id: string,
  date: string,
  amount: number,
  extra: Partial<BudgetTransaction> = {},
): BudgetTransaction => ({
  id,
  date,
  amount,
  title: id,
  type: 'expense',
  categoryId: 'other',
  paymentMethod: 'Cash',
  notes: '',
  receiptUrl: '',
  receiptPath: '',
  ...extra,
});
const input = (): FinanceExportInput => ({
  month: '2026-12',
  startDay: 28,
  categories: [],
  checkpoints: [],
  accounts: [],
  plans: [
    { id: 'p', month: '2026-12', categoryId: 'other', amount: 50 },
    { id: 'old', month: '2026-11', categoryId: 'other', amount: 500 },
  ],
  debts: [
    {
      id: 'loan',
      name: 'Loan',
      type: 'loan',
      openingBalance: 1000,
      openingOverride: null,
      annualInterestRate: 0,
    },
  ],
  transactions: [
    entry('before', '2026-11-27', 100, { debtId: 'loan' }),
    entry('start', '2026-11-28', 1000, { type: 'income' }),
    entry('paid', '2026-12-01', 50, { debtId: 'loan' }),
    entry('transfer', '2026-12-02', 200, {
      type: 'transfer',
      fromAccount: 'main',
      toAccount: 'spending',
    }),
    entry('end', '2026-12-27', 25, { debtId: 'loan', paymentStatus: 'planned' }),
    entry('after', '2026-12-28', 999, { debtId: 'loan', paymentStatus: 'planned' }),
  ],
});
describe('Cycle financial export', () => {
  it('uses inclusive cycle bounds, excludes other cycles, and separates paid, planned and transfers', () => {
    const data = financeExportData(input());
    expect(data.entries.map((t) => t.id)).toEqual(['start', 'paid', 'transfer', 'end']);
    expect(data.snapshot.income).toBe(1000);
    expect(data.snapshot.expenses).toBe(50);
    expect(data.transferTotal).toBe(200);
    expect(data.plans.map((p) => p.id)).toEqual(['p']);
    expect(data.debtBalances[0]).toMatchObject({
      opening: 900,
      paid: 50,
      closing: 850,
      planned: 25,
    });
  });
  it('downloads a real PDF and lossless spreadsheet / JSON data in one ZIP', () => {
    const source = input();
    source.transactions[1].notes = 'Comma, quote " and\nnew line';
    const files = unzipSync(createFinanceExport(source));
    expect(strFromU8(files['Finances.pdf'])).toMatch(/^%PDF-/);
    expect(strFromU8(files['Finances.pdf'])).toContain('Debt balances at cycle end');
    const data = JSON.parse(strFromU8(files['Cycle-data.json']));
    expect(data.entries).toHaveLength(4);
    expect(data.entries[0].notes).toBe(source.transactions[1].notes);
    expect(strFromU8(files['Transactions.csv'])).toContain('Comma, quote "" and\nnew line');
    expect(source.transactions).toHaveLength(6);
  });
  it('escapes spreadsheet formulas while retaining negative numeric amounts', () => {
    expect(financeCsv([['=1+2', '  @SUM(A1)', 'Text "quoted"', -25]])).toBe(
      '\uFEFF"\'=1+2","\'  @SUM(A1)","Text ""quoted""","-25"',
    );
  });
  it('exports empty cycles successfully', () => {
    expect(
      unzipSync(createFinanceExport({ ...input(), transactions: [], plans: [], debts: [] }))[
        'Finances.pdf'
      ].length,
    ).toBeGreaterThan(100);
  });
});
