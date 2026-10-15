import { describe, expect, it } from 'vitest';
import { BudgetDebt, BudgetTransaction, money } from '../../shared/state/budget/budget.model';
import { debtReportHtml } from './debt-report';

const debt: BudgetDebt = { id: 'loan', name: 'Home loan', type: 'loan', openingBalance: 10000, openingOverride: null, annualInterestRate: 0 };
const payment = (id: string, amount: number, date: string, paymentStatus: 'paid' | 'planned' = 'paid'): BudgetTransaction => ({ id, amount, date, paymentStatus, debtId: 'loan', type: 'expense', categoryId: 'other', title: id, paymentMethod: 'Bank transfer', notes: '', receiptUrl: '', receiptPath: '' });

describe('Debt PDF report', () => {
  it('uses cycle balances, includes past payments and all plans, and excludes later paid entries', () => {
    const html = debtReportHtml([debt], [payment('previous-payment', 1000, '2026-09-20'), payment('cycle-payment', 500.25, '2026-10-20'), payment('next-payment', 400, '2026-11-20'), payment('future-plan', 200, '2026-12-01', 'planned'), payment('overdue-plan', 100, '2026-09-01', 'planned')], '2026-11', 15);
    expect(html).toContain('15 Oct 2026');
    expect(html).toContain('14 Nov 2026');
    expect(html).toContain(money(8499.75));
    expect(html).toContain(money(8199.75));
    expect(html).toContain('previous-payment');
    expect(html).toContain('cycle-payment');
    expect(html).not.toContain('next-payment');
    expect(html.indexOf('overdue-plan')).toBeLessThan(html.indexOf('future-plan'));
  });
  it('escapes user names, descriptions, methods, and multiline notes', () => {
    const html = debtReportHtml([{ ...debt, name: '<script>bad()</script>' }], [{ ...payment('p', 50, '2026-10-01'), title: '<img onerror="bad()">', notes: 'First line\n</td><script>bad()</script>', paymentMethod: 'Cash & card' }], '2026-10', 1);
    expect(html).not.toContain('<script>bad()');
    expect(html).not.toContain('<img onerror');
    expect(html).toContain('&lt;script&gt;bad()&lt;/script&gt;');
    expect(html).toContain('Cash &amp; card');
    expect(html).toContain('First line\n&lt;/td&gt;');
  });
  it('shows explicit empty payment sections', () => {
    const html = debtReportHtml([debt], [], '2026-10', 1);
    expect(html).toContain('No recorded payments through this cycle.');
    expect(html).toContain('No planned payments.');
    expect(html).toContain(money(10000));
  });
});
