import {
  BUDGET_ACCOUNTS,
  customAccountNet,
  isSpendingCategory,
  mainAccountNet,
  savingsNet,
  total,
  transferNet,
} from '@pages/budget/state/budget/budget.model';

import { BudgetDomain } from '@pages/budget/state/budget/budget-domain';

export class BudgetAccountsState extends BudgetDomain {
  accountName(id: string): string {
    return (
      this.store.accounts().find((account) => account.id === id)?.name ??
      BUDGET_ACCOUNTS.find((account) => account.value === id)?.label ??
      'Deleted account'
    );
  }
  async saveAccount(
    name: string,
    id = `custom-${crypto.randomUUID()}`,
    balance: number | null = null,
  ): Promise<void> {
    if (this.store.loading() || this.store.error())
      throw new Error('Wait for your budget to load first.');
    if (
      this.store
        .activeAccounts()
        .some(
          (account) =>
            account.id !== id && account.name.toLowerCase() === name.trim().toLowerCase(),
        )
    )
      throw new Error('An account with this name already exists.');
    if (balance !== null && (!Number.isFinite(balance) || balance < 0 || balance > 999999999))
      throw new Error('Enter a valid current account balance.');
    const existing = this.store.accounts().find((account) => account.id === id);
    if (existing?.deleted) throw new Error('This account has been deleted.');
    const uid = this.auth.userId();
    const saved = await this.service.saveAccount({
      ...existing,
      id,
      name,
      deleted: false,
      ...(balance !== null && id !== 'savings' && id !== 'spending'
        ? {
            balance,
            recordedNet:
              id === 'main'
                ? mainAccountNet(this.store.transactions(), this.store.categories())
                : customAccountNet(this.store.transactions(), id),
          }
        : {}),
    });
    if (uid !== this.auth.userId()) throw new Error('Your account changed. Reopen Budget.');
    this.changed();
    this.store.accounts.update((items) => [...items.filter((account) => account.id !== id), saved]);
    if (balance !== null && id === 'savings') await this.store.setSavingsBalance(balance);
    if (balance !== null && id === 'spending') await this.store.setSpendingBalance(balance);
  }
  async deleteAccount(id: string): Promise<void> {
    if (this.store.loading() || this.store.error())
      throw new Error('Wait for your budget to load first.');
    if (id === 'main') throw new Error('The Main account cannot be deleted.');
    const account = this.store.accounts().find((item) => item.id === id && !item.deleted);
    if (!account) throw new Error('This account no longer exists.');
    const uid = this.auth.userId();
    const saved = await this.service.saveAccount({ ...account, deleted: true });
    if (uid !== this.auth.userId()) throw new Error('Your account changed. Reopen Budget.');
    this.changed();
    this.store.accounts.update((items) => items.map((item) => (item.id === id ? saved : item)));
  }
  async setSavingsBalance(balance: number): Promise<void> {
    if (this.store.loading() || this.store.error()) throw new Error('Load your budget first.');
    const uid = this.auth.userId();
    const checkpoint = {
      balance: Math.round(balance * 100) / 100,
      recordedNet: savingsNet(this.store.transactions()),
    };
    await this.service.saveSavingsBalance(checkpoint);
    if (uid !== this.auth.userId()) throw new Error('Your account changed. Reopen Budget.');
    this.changed();
    this.store.savingsBalance.set(checkpoint);
  }
  async setSpendingBalance(balance: number): Promise<void> {
    if (this.store.loading() || this.store.error())
      throw new Error('Wait for your budget to load first.');
    const uid = this.auth.userId();
    const month = this.store.month();
    const ids = new Set(
      this.store
        .categories()
        .filter(isSpendingCategory)
        .map((category) => category.id),
    );
    const recordedSpending = total(
      this.store
        .transactions()
        .filter(
          (t) =>
            t.type === 'expense' &&
            !t.debtId &&
            !t.account &&
            ids.has(t.categoryId) &&
            this.store.inMonth(t.date, month),
        ),
    );
    const recordedFunding = transferNet(
      this.store.transactions().filter((t) => this.store.inMonth(t.date, month)),
      'spending',
    );
    const checkpoint = {
      recordedFunding,
      id: month,
      balance: Math.round(balance * 100) / 100,
      recordedSpending,
    };
    await this.service.saveSpendingBalance(checkpoint);
    if (uid !== this.auth.userId()) throw new Error('Your account changed. Reopen Budget.');
    this.changed();
    this.store.spendingBalances.update((items) => [
      ...items.filter((item) => item.id !== month),
      checkpoint,
    ]);
  }
}
