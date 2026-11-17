import { TestBed } from '@angular/core/testing';
import { DebtOverviewCard } from '@pages/budget/components/debt-overview-card/debt-overview-card';
import {
  BudgetDebt,
  BudgetTransaction,
  debtSummary,
} from '@pages/budget/state/budget/budget.model';
import { DebtOverviewRow } from '@pages/budget/state/budget/debt-view.model';

describe('DebtOverviewCard', () => {
  it('keeps paid history separate from plans and forwards the original transaction when marking paid', async () => {
    const debt: BudgetDebt = {
      id: 'loan',
      name: 'Loan',
      type: 'loan',
      openingBalance: 1000,
      annualInterestRate: 0,
      openingOverride: null,
    };
    const paid: BudgetTransaction = {
      id: 'paid',
      amount: 100,
      type: 'expense',
      categoryId: 'other',
      title: 'Paid instalment',
      date: '2026-11-01',
      paymentMethod: 'Bank transfer',
      notes: '',
      receiptUrl: '',
      receiptPath: '',
      debtId: debt.id,
      paymentStatus: 'paid',
    };
    const planned: BudgetTransaction = {
      ...paid,
      id: 'planned',
      amount: 200,
      title: 'Planned instalment',
      date: '2026-11-10',
      paymentStatus: 'planned',
    };
    const row: DebtOverviewRow = {
      debt,
      ...debtSummary(debt, [paid, planned], '2026-11', 1),
      history: [paid],
      upcoming: [planned],
    };
    const fixture = TestBed.createComponent(DebtOverviewCard);
    fixture.componentRef.setInput('row', row);
    fixture.componentRef.setInput('today', '2026-11-17');
    fixture.componentRef.setInput('expanded', true);
    const payment = vi.fn();
    fixture.componentInstance.payment.subscribe(payment);
    await fixture.whenStable();
    const sections = fixture.nativeElement.querySelectorAll(
      '.payment-section',
    ) as NodeListOf<HTMLElement>;
    expect(sections[0].textContent).toContain('Planned instalment');
    expect(sections[0].textContent).not.toContain('Paid instalment');
    expect(sections[1].textContent).toContain('Paid instalment');
    expect(sections[1].querySelector('.payment-badge')).toBeNull();
    const markPaid = sections[0].querySelector('button') as HTMLButtonElement;
    markPaid.click();
    expect(payment).toHaveBeenCalledWith({ status: 'paid', item: planned });
    expect(row.closing).toBe(900);
    expect(row.projected).toBe(700);
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();
    expect(markPaid.disabled).toBe(true);
    expect(planned.paymentStatus).toBe('planned');
  });
});
