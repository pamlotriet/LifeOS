import { localDate, supportsPlan } from '@pages/budget/state/budget/budget.model';

import { BudgetDomain } from '@pages/budget/state/budget/budget-domain';

export class BudgetPlanningState extends BudgetDomain {
  async savePlan(month: string, categoryId: string, amount: number): Promise<void> {
    const id = `${month}-${categoryId}`;
    const saved = await this.service.savePlan({ id, month, categoryId, amount });
    this.store.plans.update((items) => [...items.filter((item) => item.id !== id), saved]);
  }
  async savePlanItem(
    month: string,
    categoryId: string,
    name: string,
    amount: number,
    id: string = crypto.randomUUID(),
  ): Promise<void> {
    if (this.store.loading() || this.store.error())
      throw new Error('Load your budget before changing planned items.');
    if (
      !this.store
        .activeCategories()
        .some((category) => category.id === categoryId && supportsPlan(category.type))
    )
      throw new Error('Choose an expense, bills or savings category.');
    const uid = this.auth.userId();
    const saved = await this.service.savePlan({ id, month, categoryId, name, amount });
    if (uid !== this.auth.userId())
      throw new Error('Your account changed. Reopen Budget to continue.');
    this.changed();
    this.store.plans.update((items) => [...items.filter((item) => item.id !== id), saved]);
  }
  async deletePlanItem(id: string): Promise<void> {
    if (this.store.loading() || this.store.error())
      throw new Error('Load your budget before changing planned items.');
    const uid = this.auth.userId();
    await this.service.deletePlan(id);
    if (uid !== this.auth.userId())
      throw new Error('Your account changed. Reopen Budget to continue.');
    this.changed();
    this.store.plans.update((items) => items.filter((item) => item.id !== id));
  }
  async markSavingsMoved(planId: string, date: string): Promise<void> {
    const plan = this.store.plans().find((item) => item.id === planId);
    if (
      !plan ||
      !this.store
        .activeCategories()
        .some((category) => category.id === plan.categoryId && category.type === 'savings')
    )
      throw new Error('Choose an existing savings plan.');
    if (!this.store.inMonth(date, plan.month) || date > localDate())
      throw new Error('Choose a transfer date within this budget cycle, on or before today.');
    const id = `savings-plan-${plan.id}`;
    if (this.store.transactions().some((item) => item.id === id)) return;
    await this.store.saveTransaction(
      {
        amount: plan.amount,
        type: 'transfer',
        categoryId: plan.categoryId,
        title: plan.name || 'Savings moved',
        date,
        paymentMethod: 'Bank transfer',
        notes: '',
        receiptUrl: '',
        receiptPath: '',
        paymentStatus: 'paid',
      },
      id,
    );
  }
  async undoSavingsMoved(planId: string): Promise<void> {
    if (this.store.loading() || this.store.error())
      throw new Error('Load your budget before changing savings.');
    const transaction = this.store
      .transactions()
      .find((item) => item.id === `savings-plan-${planId}` && item.type === 'transfer');
    if (transaction) await this.store.deleteTransaction(transaction);
  }
  async copyPlansToNextMonth(
    month: string,
    categoryId?: string,
  ): Promise<{ copied: number; skipped: number; month: string }> {
    if (this.store.loading() || this.store.error())
      throw new Error('Load your budget before copying planned items.');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Choose a valid budget month.');
    const date = new Date(`${month}-01T12:00:00`);
    date.setMonth(date.getMonth() + 1);
    const nextMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const categories = new Set(
      this.store
        .activeCategories()
        .filter((category) => supportsPlan(category.type))
        .map((category) => category.id),
    );
    const source = this.store
      .plans()
      .filter(
        (plan) =>
          plan.month === month &&
          categories.has(plan.categoryId) &&
          (!categoryId || plan.categoryId === categoryId),
      );
    const uid = this.auth.userId();
    let copied = 0,
      skipped = 0;
    for (const plan of source) {
      if (uid !== this.auth.userId())
        throw new Error('Your account changed. Reopen Budget to continue.');
      // A stable destination ID makes retries safe without overwriting edited copies.
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plan.id));
      const key = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('');
      const id = `${nextMonth}-copy-${key}`;
      if (this.store.plans().some((item) => item.id === id)) {
        skipped++;
        continue;
      }
      await this.store.savePlanItem(
        nextMonth,
        plan.categoryId,
        plan.name || 'Existing plan',
        plan.amount,
        id,
      );
      copied++;
    }
    return { copied, skipped, month: nextMonth };
  }
}
