import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BudgetTransactionForm } from '@pages/budget/budget-transaction-form/budget-transaction-form';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import { BUDGET_ACCOUNTS } from '@pages/budget/state/budget/budget.model';

describe('Budget account shortcuts', () => {
  function create(params: Record<string, string>) {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigateByUrl: vi.fn().mockResolvedValue(true) } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({}), queryParamMap: convertToParamMap(params) },
          },
        },
        {
          provide: BudgetStore,
          useValue: {
            activeAccounts: signal(
              BUDGET_ACCOUNTS.map((account) => ({ id: account.value, name: account.label })),
            ),
            accountOptions: signal(BUDGET_ACCOUNTS),
            accountName: (id: string) =>
              BUDGET_ACCOUNTS.find((account) => account.value === id)?.label ?? id,
            activeCategories: signal([
              { id: 'food', type: 'expense' },
              { id: 'salary', type: 'income' },
              { id: 'savings', type: 'savings' },
            ]),
            transactions: signal([]),
            loading: signal(false),
            error: signal(''),
            inMonth: () => true,
            saveTransaction: vi.fn().mockResolvedValue(undefined),
            month: signal('2026-11'),
            monthForDate: () => '2026-11',
          },
        },
      ],
    });
    const form = TestBed.runInInjectionContext(() => new BudgetTransactionForm());
    form.ionViewWillEnter();
    return form;
  }

  it('preselects Savings for a purchase started from the savings account', () => {
    const form = create({ type: 'expense', account: 'savings' });
    expect(form.model.account).toBe('savings');
    expect(form.type()).toBe('expense');
    form.changeType('income');
    expect(form.model.account).toBe('');
    expect(form.model.categoryId).toBe('salary');
  });

  it('keeps income and transfers separate from purchases paid out of Savings', () => {
    const form = create({ type: 'transfer', account: 'savings' });
    expect(form.type()).toBe('transfer');
    expect(form.model.categoryId).toBe('savings');
    expect(form.model.account).toBe('');
    expect(form.model.paymentMethod).toBe('Bank transfer');
  });

  it('defaults to Main and saves a withdrawal with its source and destination', async () => {
    const form = create({ type: 'transfer' });
    expect(form.model.fromAccount).toBe('main');
    form.model.fromAccount = 'savings';
    form.model.toAccount = 'main';
    form.model.amount = 75.25;
    await form.save();
    expect(TestBed.inject(BudgetStore).saveTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transfer',
        fromAccount: 'savings',
        toAccount: 'main',
        amount: 75.25,
        title: 'Savings → Main',
      }),
      undefined,
      undefined,
    );
    form.changeType('expense');
    expect(form.model.fromAccount).toBe('');
    expect(form.model.toAccount).toBe('');
  });

  it('keeps the old Spending shortcut working and blocks missing transfer accounts', async () => {
    const form = create({ type: 'spending-transfer' });
    expect(form.type()).toBe('transfer');
    expect(form.model.toAccount).toBe('spending');
    form.model.toAccount = '';
    await form.save();
    expect(TestBed.inject(BudgetStore).saveTransaction).not.toHaveBeenCalled();
    expect(form.error()).toBe('Choose a source and destination account.');
  });
});
