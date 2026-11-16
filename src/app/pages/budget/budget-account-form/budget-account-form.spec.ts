import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BudgetAccountForm } from '@pages/budget/budget-account-form/budget-account-form';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';

describe('BudgetAccountForm', () => {
  function create(id?: string) {
    const store = {
      activeAccounts: signal([
        { id: 'main', name: 'Main' },
        { id: 'custom-travel', name: 'Travel' },
      ]),
      loading: signal(false),
      error: signal(''),
      saveAccount: vi.fn().mockResolvedValue(undefined),
    };
    const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
    TestBed.configureTestingModule({
      providers: [
        { provide: BudgetStore, useValue: store },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
        },
      ],
    });
    const form = TestBed.runInInjectionContext(() => new BudgetAccountForm());
    TestBed.tick();
    return { form, store, router };
  }

  it('keeps the draft ID and values after a failed create, then returns to Budget', async () => {
    const { form, store, router } = create();
    form.name.set('Travel');
    form.balanceInput.set(500);
    store.saveAccount.mockRejectedValueOnce(new Error('Offline'));
    await form.save();
    const id = store.saveAccount.mock.calls[0][1];
    expect(id).toMatch(/^custom-/);
    expect(form.name()).toBe('Travel');
    expect(form.balanceInput()).toBe(500);
    expect(form.error()).toBe('Offline');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    await form.save();
    expect(store.saveAccount).toHaveBeenLastCalledWith('Travel', id, 500);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/budget');
  });

  it('loads an existing account and preserves its balance when left blank', async () => {
    const { form, store } = create('custom-travel');
    expect(form.name()).toBe('Travel');
    form.name.set('Holiday');
    await form.save();
    expect(store.saveAccount).toHaveBeenCalledWith('Holiday', 'custom-travel', null);
  });

  it('saves built-in account balances and blocks missing accounts', async () => {
    const { form, store } = create('main');
    form.balanceInput.set(100);
    await form.save();
    expect(store.saveAccount).toHaveBeenCalledWith('Main', 'main', 100);
    store.activeAccounts.set([]);
    expect(form.ready()).toBe(false);
    await form.save();
    expect(store.saveAccount).toHaveBeenCalledTimes(1);
  });
});
