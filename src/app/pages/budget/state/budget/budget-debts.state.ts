import { BudgetDebtInput, debtPlanId } from '@pages/budget/state/budget/budget.model';
import { cycleStart } from '@pages/budget/state/cycle/budget-cycle';

import { BudgetDomain } from '@pages/budget/state/budget/budget-domain';

export class BudgetDebtsState extends BudgetDomain {
  async saveDebt(input: BudgetDebtInput, id?: string): Promise<void> {
    if (this.store.loading() || this.store.error())
      throw new Error('Load your budget before changing debts.');
    const uid = this.auth.userId();
    const saved = await this.service.saveDebt(input, id);
    if (uid !== this.auth.userId())
      throw new Error('Your account changed. Reopen Budget to continue.');
    this.changed();
    this.store.debts.update((items) => [...items.filter((item) => item.id !== saved.id), saved]);
  }
  async saveDebtPlan(month: string, debtId: string, amount: number): Promise<void> {
    if (this.store.loading() || this.store.error())
      throw new Error('Load your budget before changing debt payments.');
    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      amount > 999999999
    )
      throw new Error('Enter a valid planned payment amount.');
    const debt = this.store.debts().find((item) => item.id === debtId);
    if (!debt) throw new Error('Choose an existing debt account.');
    const id = debtPlanId(month, debtId);
    const existing = this.store.transactions().find((item) => item.id === id);
    if (existing && existing.paymentStatus !== 'planned')
      throw new Error('This payment is already paid. Edit it in the debt payment history.');
    if (amount === 0) {
      if (existing) await this.store.deleteTransaction(existing);
      return;
    }
    const category =
      this.store
        .activeCategories()
        .find((item) => item.type === 'expense' && /debt|loan|credit/i.test(item.name)) ??
      this.store
        .activeCategories()
        .find((item) => item.type === 'expense' && item.id === 'other') ??
      this.store.activeCategories().find((item) => item.type === 'expense');
    if (!category) throw new Error('Add an expense category before planning debt payments.');
    await this.store.saveTransaction(
      {
        amount,
        type: 'expense',
        categoryId: existing?.categoryId ?? category.id,
        title: existing?.title ?? `Payment to ${debt.name}`,
        date: existing?.date ?? cycleStart(month, this.store.cycleStartDay()),
        paymentMethod: existing?.paymentMethod ?? 'Bank transfer',
        notes: existing?.notes ?? '',
        receiptUrl: existing?.receiptUrl ?? '',
        receiptPath: existing?.receiptPath ?? '',
        debtId,
        paymentStatus: 'planned',
      },
      id,
    );
  }
  async deleteDebt(id: string): Promise<void> {
    await this.service.deleteDebt(id);
    this.store.debts.update((items) => items.filter((item) => item.id !== id));
  }
}
