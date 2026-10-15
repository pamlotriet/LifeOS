import '@angular/compiler';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BudgetDebts } from './budget-debts';
import { BudgetStore } from '../../shared/state/budget/budget.store';

const { save, createDebtPdf } = vi.hoisted(() => {
  const save = vi.fn();
  return { save, createDebtPdf: vi.fn(() => ({ save })) };
});
vi.mock('./debt-pdf', () => ({ createDebtPdf }));
afterEach(() => { vi.clearAllMocks(); });
describe('Debt export download', () => {
  const store = { debts: signal([{ id: 'loan', name: 'Home loan' }, { id: 'card', name: 'Credit card' }]), transactions: signal([]), month: signal('2026-10'), cycleStartDay: signal(1), loading: signal(false), error: signal('') };
  const create = () => runInInjectionContext(Injector.create({ providers: [{ provide: BudgetStore, useValue: store }] }), () => new BudgetDebts());
  it('saves a named PDF directly for the selected account', async () => {
    const page = create();
    await page.exportPdf('loan');
    expect(createDebtPdf).toHaveBeenCalledWith([store.debts()[0]], [], '2026-10', 1);
    expect(save).toHaveBeenCalledWith('LifeOS-Debt-Report-2026-10.pdf');
    expect(page.busy()).toBe(false);
    expect(page.error()).toBe('');
  });
  it('shows failed downloads and allows another attempt', async () => {
    const page = create();
    save.mockImplementationOnce(() => { throw new Error('Download failed'); });
    await page.exportPdf();
    expect(page.error()).toContain('Could not download');
    expect(page.busy()).toBe(false);
    await page.exportPdf();
    expect(save).toHaveBeenCalledTimes(2);
    expect(page.error()).toBe('');
  });
});
