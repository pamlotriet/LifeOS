import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthService } from '../authentication/authentication.service';
import { RefreshCoordinator } from '../refresh/refresh-coordinator.service';
import { BudgetService } from './budget.service';
import { BudgetCategory, BudgetDebt, BudgetDebtInput, BudgetPlan, BudgetTransaction, compatibleCategory, DEFAULT_CATEGORIES, localDate, TransactionInput } from './budget.model';

@Injectable({ providedIn: 'root' })
export class BudgetStore {
  private readonly service = inject(BudgetService);
  private readonly auth = inject(AuthService);
  private generation = 0;
  readonly transactions = signal<BudgetTransaction[]>([]);
  readonly categories = signal<BudgetCategory[]>(DEFAULT_CATEGORIES.map(x => ({ ...x })));
  readonly plans = signal<BudgetPlan[]>([]);
  readonly debts = signal<BudgetDebt[]>([]);
  readonly activeCategories = computed(() => this.categories().filter(x => !x.deleted).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)));
  readonly month = signal(localDate().slice(0, 7));
  readonly monthly = computed(() => this.transactions().filter(x => x.date.startsWith(this.month())).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title)));
  readonly loading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  constructor() {
    inject(RefreshCoordinator).register(() => this.reload());
    effect(() => {
      const uid = this.auth.userId();
      untracked(() => {
        ++this.generation;
        this.transactions.set([]);
        this.categories.set(DEFAULT_CATEGORIES.map(x => ({ ...x })));
        this.plans.set([]); this.debts.set([]);
        this.month.set(localDate().slice(0, 7));
        this.error.set(''); this.notice.set(''); this.loading.set(false);
        if (uid) void this.reload();
      });
    });
  }
  async reload(): Promise<void> {
    const version = ++this.generation;
    this.loading.set(true); this.error.set('');
    try {
      const data = await this.service.load();
      if (version !== this.generation) return;
      this.transactions.set(data.transactions);
      this.plans.set(data.plans);
      this.debts.set(data.debts);
      const categories = new Map(DEFAULT_CATEGORIES.map(x => [x.id, { ...x }]));
      data.categories.forEach(x => categories.set(x.id, x));
      this.categories.set([...categories.values()]);
    } catch (error) {
      if (version === this.generation) this.error.set(error instanceof Error ? error.message : 'Could not load your budget.');
    } finally { if (version === this.generation) this.loading.set(false); }
  }
  async saveTransaction(input: TransactionInput, id?: string, receipt?: string): Promise<void> {
    if (this.loading() || this.error()) throw new Error('Wait for your budget to load, or retry loading it first.');
    const category = this.activeCategories().find(x => x.id === input.categoryId);
    if (!category || !compatibleCategory(input.type, category.type)) throw new Error('Choose a category for this transaction type.');
    const uid = this.auth.userId();
    const old = this.transactions().find(x => x.id === id);
    const saved = await this.service.saveTransaction(input, id, receipt);
    if (uid !== this.auth.userId()) throw new Error('Your account changed. Reopen Budget to continue.');
    ++this.generation;
    this.loading.set(false);
    this.transactions.update(items => [...items.filter(x => x.id !== saved.id), saved]);
    if (old?.receiptPath && old.receiptPath !== saved.receiptPath) await this.cleanupReceipt(old.receiptPath);
  }
  async deleteTransaction(item: BudgetTransaction): Promise<void> {
    const uid = this.auth.userId();
    await this.service.deleteTransaction(item.id);
    if (uid !== this.auth.userId()) throw new Error('Your account changed. Reopen Budget to continue.');
    ++this.generation;
    this.loading.set(false);
    this.transactions.update(items => items.filter(x => x.id !== item.id));
    if (item.receiptPath) await this.cleanupReceipt(item.receiptPath);
  }
  async saveCategory(category: BudgetCategory): Promise<void> {
    if (this.loading() || this.error()) throw new Error('Load your budget before changing categories.');
    const existing = this.categories().find(x => x.id === category.id);
    if (existing && existing.type !== category.type && this.transactions().some(x => x.categoryId === category.id)) throw new Error('A category with transactions cannot change type.');
    if (this.activeCategories().some(x => x.id !== category.id && x.type === category.type && x.name.toLowerCase() === category.name.trim().toLowerCase())) throw new Error('A category with that name already exists.');
    const uid = this.auth.userId();
    const saved = await this.service.saveCategory(category);
    if (uid !== this.auth.userId()) throw new Error('Your account changed. Reopen Budget to continue.');
    ++this.generation;
    this.loading.set(false);
    this.categories.update(items => [...items.filter(x => x.id !== saved.id), saved]);
  }
  async savePlan(month: string, categoryId: string, amount: number): Promise<void> {
    const id = `${month}-${categoryId}`;
    const saved = await this.service.savePlan({ id, month, categoryId, amount });
    this.plans.update(items => [...items.filter(item => item.id !== id), saved]);
  }
  async saveDebt(input: BudgetDebtInput, id?: string): Promise<void> {
    const saved = await this.service.saveDebt(input, id);
    this.debts.update(items => [...items.filter(item => item.id !== saved.id), saved]);
  }
  async deleteDebt(id: string): Promise<void> {
    await this.service.deleteDebt(id);
    this.debts.update(items => items.filter(item => item.id !== id));
  }
  async deleteCategory(category: BudgetCategory): Promise<void> {
    if (this.transactions().some(x => x.categoryId === category.id)) throw new Error('Move or delete this category’s transactions before deleting it.');
    await this.saveCategory({ ...category, deleted: true });
  }
  private async cleanupReceipt(path: string): Promise<void> {
    try { await this.service.removeReceipt(path); }
    catch { this.notice.set('Your transaction was saved, but an old receipt could not be removed from storage.'); }
  }
}
