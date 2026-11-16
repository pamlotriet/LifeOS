import { computed, signal } from '@angular/core';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import {
  BUDGET_ACCOUNTS,
  BudgetAccountRecord,
  BudgetTransaction,
  DEFAULT_CATEGORIES,
  TransactionInput,
  customAccountNet,
  validateTransaction,
} from '@pages/budget/state/budget/budget.model';

function fixture() {
  const accounts = signal<BudgetAccountRecord[]>(
    BUDGET_ACCOUNTS.map((account) => ({ id: account.value, name: account.label })),
  );
  const saveAccount = vi.fn(async (account: BudgetAccountRecord) => ({
    ...account,
    name: account.name.trim(),
  }));
  const store = Object.create(BudgetStore.prototype) as BudgetStore;
  Object.assign(store, {
    accounts,
    activeAccounts: computed(() => accounts().filter((account) => !account.deleted)),
    loading: signal(false),
    error: signal(''),
    generation: 0,
    transactions: signal<BudgetTransaction[]>([]),
    activeCategories: () => DEFAULT_CATEGORIES,
    debts: signal([]),
    auth: { userId: () => 'owner' },
    service: {
      saveAccount,
      saveTransaction: vi.fn(async (input: TransactionInput, id?: string) => {
        validateTransaction(input);
        return { ...input, id: id ?? 't' };
      }),
    },
  });
  return { store, saveAccount };
}
const transfer: BudgetTransaction = {
  id: 't',
  type: 'transfer',
  fromAccount: 'main',
  toAccount: 'custom-travel',
  amount: 100,
  categoryId: 'account-transfer',
  title: 'Travel money',
  date: '2026-11-01',
  paymentMethod: 'Bank transfer',
  notes: '',
  receiptUrl: '',
  receiptPath: '',
};

describe('Budget account management', () => {
  it('adds and renames an account with a stable ID and preserves its balance checkpoint', async () => {
    const { store } = fixture();
    store.transactions.set([transfer]);
    await store.saveAccount(' Travel ', 'custom-travel', 500);
    expect(store.accounts().find((account) => account.id === 'custom-travel')).toMatchObject({
      name: 'Travel',
      balance: 500,
      recordedNet: 100,
    });
    await store.saveAccount('Holiday fund', 'custom-travel');
    const account = store.accounts().find((item) => item.id === 'custom-travel')!;
    expect(account).toMatchObject({ name: 'Holiday fund', balance: 500, recordedNet: 100 });
    expect(store.transactions()[0].toAccount).toBe('custom-travel');
    store.transactions.update((items) => [...items, { ...transfer, id: 't2', amount: 25 }]);
    expect(
      account.balance! + customAccountNet(store.transactions(), account.id) - account.recordedNet!,
    ).toBe(525);
  });

  it('deletes from new-entry choices while retaining names and past transactions', async () => {
    const { store } = fixture();
    await store.saveAccount('Travel', 'custom-travel');
    store.transactions.set([transfer]);
    await store.deleteAccount('custom-travel');
    expect(store.activeAccounts().some((account) => account.id === 'custom-travel')).toBe(false);
    expect(store.accountName('custom-travel')).toBe('Travel');
    expect(store.transactions()).toEqual([transfer]);
    await expect(store.saveTransaction(transfer)).rejects.toThrow('active account');
    await expect(store.saveTransaction({ ...transfer, amount: 75 }, 't')).resolves.toBeUndefined();
  });

  it('allows renaming built-ins but protects their special balance tracking from deletion', async () => {
    const { store } = fixture();
    await store.saveAccount('Everyday bank', 'main');
    expect(store.accountName('main')).toBe('Everyday bank');
    await expect(store.deleteAccount('main')).rejects.toThrow('built-in');
  });

  it('rejects duplicate names and keeps local accounts unchanged on failed writes', async () => {
    const { store, saveAccount } = fixture();
    await expect(store.saveAccount(' main ', 'custom-test')).rejects.toThrow('already exists');
    saveAccount.mockRejectedValueOnce(new Error('Offline'));
    await expect(store.saveAccount('Travel', 'custom-travel')).rejects.toThrow('Offline');
    expect(store.accounts()).toHaveLength(3);
  });

  it('accepts custom-account purchases and debits their recorded balance', async () => {
    const { store } = fixture();
    await store.saveAccount('Travel', 'custom-travel');
    await store.saveTransaction({
      ...transfer,
      type: 'expense',
      categoryId: 'food',
      fromAccount: '',
      toAccount: '',
      account: 'custom-travel',
      amount: 25,
    });
    expect(customAccountNet(store.transactions(), 'custom-travel')).toBe(-25);
  });
});
