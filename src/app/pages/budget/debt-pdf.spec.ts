import { describe, expect, it } from 'vitest';
import { createDebtPdf } from './debt-pdf';
import { BudgetDebt, BudgetTransaction } from '../../shared/state/budget/budget.model';

const debt: BudgetDebt = { id: 'loan', name: 'Home loan', type: 'loan', openingBalance: 10000, openingOverride: null, annualInterestRate: 0 };
describe('Downloadable debt PDF', () => {
  it('creates a real PDF with balances and paid and planned payment tables', () => {
    const payment: BudgetTransaction = { id: 'p', debtId: 'loan', type: 'expense', categoryId: 'other', amount: 500, date: '2026-10-01', title: 'Recorded instalment', paymentMethod: 'Bank transfer', notes: 'Reference: HOME-001', receiptUrl: '', receiptPath: '' };
    const doc = createDebtPdf([debt], [payment, { ...payment, id: 'plan', date: '2026-11-01', title: 'Next instalment', paymentStatus: 'planned' }], '2026-10', 1);
    const pdf = doc.output();
    expect(pdf.startsWith('%PDF-')).toBe(true);
    expect(pdf).toContain('Home loan');
    expect(pdf).toContain('Recorded instalment');
    expect(pdf).toContain('Next instalment');
    expect(pdf).toContain('R 9 500');
    expect(pdf).toContain('R 9 000');
    expect(doc.output('blob').type).toBe('application/pdf');
  });
  it('paginates long histories and includes the last payment and page numbers', () => {
    const payments = Array.from({ length: 100 }, (_, i): BudgetTransaction => ({ id: String(i), debtId: 'loan', type: 'expense', categoryId: 'other', amount: 10, date: '2026-10-01', title: `Instalment ${i}`, paymentMethod: 'Bank transfer', notes: 'Payment details '.repeat(12), receiptUrl: '', receiptPath: '' }));
    const doc = createDebtPdf([debt], payments, '2026-10', 1);
    expect(doc.getNumberOfPages()).toBeGreaterThan(3);
    expect(doc.output()).toContain('Instalment 99');
    expect(doc.output()).toContain(`Page ${doc.getNumberOfPages()} of ${doc.getNumberOfPages()}`);
  });
});
