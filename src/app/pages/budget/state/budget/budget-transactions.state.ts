import {
  BudgetTransaction,
  compatibleCategory,
  isSpendingCategory,
  TransactionInput,
} from '@pages/budget/state/budget/budget.model';

import { BudgetDomain } from '@pages/budget/state/budget/budget-domain';

export class BudgetTransactionsState extends BudgetDomain {
  async saveTransaction(input: TransactionInput, id?: string, receipt?: string): Promise<void> {
    if (this.store.loading() || this.store.error())
      throw new Error('Wait for your budget to load, or retry loading it first.');
    const category = this.store.activeCategories().find((x) => x.id === input.categoryId);
    const previous = this.store.transactions().find((item) => item.id === id);
    for (const field of ['fromAccount', 'toAccount'] as const) {
      const value = input[field];
      if (
        value &&
        !this.store.activeAccounts().some((account) => account.id === value) &&
        previous?.[field] !== value
      )
        throw new Error('Choose an active account.');
    }
    if (
      (input.account === 'savings' || input.account?.startsWith('custom-')) &&
      !this.store.activeAccounts().some((account) => account.id === input.account) &&
      previous?.account !== input.account
    )
      throw new Error('Choose an active account.');
    const accountTransfer = input.type === 'transfer' && !!input.fromAccount && !!input.toAccount;
    if (input.type === 'spending-transfer' && (!category || !isSpendingCategory(category)))
      throw new Error('Choose the Spending category for an account transfer.');
    if (!accountTransfer && (!category || !compatibleCategory(input.type, category.type)))
      throw new Error('Choose a category for this transaction type.');
    if (input.debtId && !this.store.debts().some((debt) => debt.id === input.debtId))
      throw new Error('Choose an existing debt account.');
    const uid = this.auth.userId();
    const old = this.store.transactions().find((x) => x.id === id);
    const saved = await this.service.saveTransaction(input, id, receipt);
    if (uid !== this.auth.userId())
      throw new Error('Your account changed. Reopen Budget to continue.');
    this.changed();
    this.store.loading.set(false);
    this.store.transactions.update((items) => [...items.filter((x) => x.id !== saved.id), saved]);
    if (old?.receiptPath && old.receiptPath !== saved.receiptPath)
      await this.cleanupReceipt(old.receiptPath);
  }
  async deleteTransaction(item: BudgetTransaction): Promise<void> {
    const uid = this.auth.userId();
    await this.service.deleteTransaction(item.id);
    if (uid !== this.auth.userId())
      throw new Error('Your account changed. Reopen Budget to continue.');
    this.changed();
    this.store.loading.set(false);
    this.store.transactions.update((items) => items.filter((x) => x.id !== item.id));
    if (item.receiptPath) await this.cleanupReceipt(item.receiptPath);
  }
  private async cleanupReceipt(path: string): Promise<void> {
    try {
      await this.service.removeReceipt(path);
    } catch {
      this.store.notice.set(
        'Your transaction was saved, but an old receipt could not be removed from storage.',
      );
    }
  }
}
