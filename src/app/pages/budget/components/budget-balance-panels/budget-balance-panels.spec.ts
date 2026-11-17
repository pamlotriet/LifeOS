import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BudgetBalancePanels } from '@pages/budget/components/budget-balance-panels/budget-balance-panels';

describe('Extracted balance editor forms', () => {
  it('retains decimal parsing, validation and the successful-save form boundary', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const view = TestBed.createComponent(BudgetBalancePanels);
    view.componentRef.setInput('spending', { actual: 100, confirmed: true });
    view.componentRef.setInput('savingsTotal', 800);
    view.detectChanges();
    await view.whenStable();
    const save = vi.fn();
    view.componentInstance.spendingSave.subscribe(save);
    const form = view.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(save).not.toHaveBeenCalled();
    const input = form.querySelector('input')!;
    input.value = '500,25';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    view.detectChanges();
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(view.componentInstance.balanceInput()).toBe(500.25);
    expect(view.componentInstance.savingsInput()).toBeNull();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].markSaved).toBeTypeOf('function');
  });
  it('does not render deleted account panels', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const view = TestBed.createComponent(BudgetBalancePanels);
    view.componentRef.setInput('spending', { actual: 100, confirmed: true });
    view.componentRef.setInput('savingsTotal', 800);
    view.componentRef.setInput('hasSpending', false);
    view.componentRef.setInput('hasSavings', false);
    view.detectChanges();
    expect(view.nativeElement.querySelector('form')).toBeNull();
  });
});
