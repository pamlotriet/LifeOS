import {
  BudgetCategory,
  compatibleCategory,
  supportsPlan,
} from '@pages/budget/state/budget/budget.model';

import { BudgetDomain } from '@pages/budget/state/budget/budget-domain';

export class BudgetCategoriesState extends BudgetDomain {
  async saveCategory(category: BudgetCategory): Promise<void> {
    if (this.store.loading() || this.store.error())
      throw new Error('Load your budget before changing categories.');
    const existing = this.store.categories().find((x) => x.id === category.id);
    if (existing && existing.type !== category.type) {
      if (
        this.store
          .transactions()
          .some(
            (item) =>
              item.categoryId === category.id && !compatibleCategory(item.type, category.type),
          )
      )
        throw new Error(
          'This type does not match the existing transactions. Move those transactions to another category first. Expense and Bills can be switched without moving expense transactions.',
        );
      if (
        !supportsPlan(category.type) &&
        this.store.plans().some((plan) => plan.categoryId === category.id)
      )
        throw new Error(
          'This category has planned items. Remove them before changing it to Income.',
        );
    }
    if (
      !category.deleted &&
      this.store
        .activeCategories()
        .some(
          (x) =>
            x.id !== category.id &&
            x.type === category.type &&
            x.name.toLowerCase() === category.name.trim().toLowerCase(),
        )
    )
      throw new Error('A category with that name already exists.');
    const uid = this.auth.userId();
    const saved = await this.service.saveCategory(category);
    if (uid !== this.auth.userId())
      throw new Error('Your account changed. Reopen Budget to continue.');
    this.changed();
    this.store.loading.set(false);
    this.store.categories.update((items) => [...items.filter((x) => x.id !== saved.id), saved]);
  }
  async deleteCategory(category: BudgetCategory): Promise<void> {
    const saved = this.store.categories().find((item) => item.id === category.id);
    if (!saved) throw new Error('This category no longer exists. Reload your budget.');
    await this.store.saveCategory({ ...saved, deleted: true });
  }
}
