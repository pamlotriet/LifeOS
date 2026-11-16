import { TestBed } from '@angular/core/testing';
import { BudgetAccounts } from '@pages/budget/components/budget-accounts/budget-accounts';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';

describe('Account editor', () => {
  function create() {
    const store = {
      saveAccount: vi.fn().mockResolvedValue(undefined),
      deleteAccount: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({ providers: [{ provide: BudgetStore, useValue: store }] });
    return { store, editor: TestBed.runInInjectionContext(() => new BudgetAccounts()) };
  }

  it('waits for deletion confirmation and retains it on failure', async () => {
    const { store, editor } = create();
    const account = { id: 'custom-travel', name: 'Travel' };
    editor.pendingDelete.set(account);
    expect(store.deleteAccount).not.toHaveBeenCalled();
    store.deleteAccount.mockRejectedValueOnce(new Error('Offline'));
    await editor.remove();
    expect(editor.pendingDelete()).toBe(account);
    expect(editor.busy()).toBe(false);
    await editor.remove();
    expect(editor.pendingDelete()).toBeNull();
  });
});
