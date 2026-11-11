import translationTestProviders from '@src/test-providers';
import '@angular/compiler';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetDebts } from '@pages/budget/budget-debts/budget-debts';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';

const { save, pdfs } = vi.hoisted(() => ({
  save: vi.fn(),
  pdfs: [] as Array<{ output(): string }>,
}));
vi.mock('jspdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jspdf')>();
  return Object.assign({}, actual, {
    jsPDF: class extends actual.jsPDF {
      constructor(options: ConstructorParameters<typeof actual.jsPDF>[0]) {
        super(options);
        this.save = save;
        pdfs.push(this);
      }
    },
  });
});

beforeEach(() => {
  save.mockReset();
  pdfs.length = 0;
});

describe('Debt export download', () => {
  const store = {
    debts: signal([
      {
        id: 'loan',
        name: 'Home loan',
        type: 'loan',
        openingBalance: 10000,
        openingOverride: null,
        annualInterestRate: 0,
      },
      {
        id: 'card',
        name: 'Everyday Visa account',
        type: 'credit-card',
        openingBalance: 2000,
        openingOverride: null,
        annualInterestRate: 0,
      },
    ]),
    transactions: signal([]),
    month: signal('2026-10'),
    cycleStartDay: signal(1),
    loading: signal(false),
    error: signal(''),
  };
  const create = () =>
    runInInjectionContext(
      Injector.create({
        providers: [...translationTestProviders, { provide: BudgetStore, useValue: store }],
      }),
      () => new BudgetDebts(),
    );
  it('saves a named PDF directly for the selected account', async () => {
    const page = create();
    await page.exportPdf('loan');
    expect(pdfs).toHaveLength(1);
    expect(pdfs[0].output()).toContain('Home loan');
    expect(pdfs[0].output()).not.toContain('Everyday Visa account');
    expect(save).toHaveBeenCalledWith('LifeOS-Debt-Report-2026-10.pdf');
    expect(page.busy()).toBe(false);
    expect(page.error()).toBe('');
  });
  it('shows failed downloads and allows another attempt', async () => {
    const page = create();
    save.mockImplementationOnce(() => {
      throw new Error('Download failed');
    });
    await page.exportPdf();
    expect(page.error()).toContain('Could not download');
    expect(page.busy()).toBe(false);
    await page.exportPdf();
    expect(save).toHaveBeenCalledTimes(2);
    expect(page.error()).toBe('');
  });
});
