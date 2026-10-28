import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthService } from '../authentication/authentication.service';
import { RefreshCoordinator } from '../refresh/refresh-coordinator.service';
import { BudgetService } from './budget.service';
import { cycleBounds, cycleMonth, cycleStart, inCycle } from './budget-cycle';
import { SpendingBalanceCheckpoint, isSpendingCategory, total, BudgetCategory, BudgetDebt, BudgetDebtInput, BudgetPlan, BudgetTransaction, compatibleCategory, DEFAULT_CATEGORIES, debtPlanId, localDate, supportsPlan, TransactionInput } from './budget.model';

@Injectable({ providedIn: 'root' })
export class BudgetStore {
  private readonly service = inject(BudgetService);
  private readonly auth = inject(AuthService);
  private generation = 0;
  readonly transactions = signal<BudgetTransaction[]>([]);
  readonly categories = signal<BudgetCategory[]>(DEFAULT_CATEGORIES.map(x => ({ ...x })));
  readonly plans = signal<BudgetPlan[]>([]);
  readonly spendingBalances = signal<SpendingBalanceCheckpoint[]>([]);
  readonly debts = signal<BudgetDebt[]>([]);
  readonly activeCategories = computed(() => this.categories().filter(x => !x.deleted).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)));
  readonly month = signal(localDate().slice(0, 7));
  readonly cycleStartDay = signal(1);
  readonly cycle = computed(() => cycleBounds(this.month(), this.cycleStartDay()));
  readonly cycleLabel = computed(() => `${this.cycle().start} – ${this.cycle().end}`);
  inMonth(date: string, month = this.month()): boolean { return inCycle(date, month, this.cycleStartDay()); }
  monthForDate(date: string): string { return cycleMonth(date, this.cycleStartDay()); }
  readonly monthly = computed(() => this.transactions().filter(x => x.paymentStatus !== 'planned' && this.inMonth(x.date)).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title)));
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
        this.plans.set([]); this.debts.set([]); this.spendingBalances.set([]);
        this.month.set(localDate().slice(0, 7));
        this.cycleStartDay.set(1);
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
      this.spendingBalances.set(data.spendingBalances ?? []);
      const startDay = Number.isInteger(data.cycleStartDay) && data.cycleStartDay >= 1 && data.cycleStartDay <= 31 ? data.cycleStartDay : 1;
      if (startDay !== this.cycleStartDay()) this.month.set(cycleMonth(localDate(), startDay));
      this.cycleStartDay.set(startDay);
      const categories = new Map(DEFAULT_CATEGORIES.map(x => [x.id, { ...x }]));
      data.categories.forEach(x => categories.set(x.id, x));
      this.categories.set([...categories.values()]);
    } catch (error) {
      if (version === this.generation) this.error.set(error instanceof Error ? error.message : 'Could not load your budget.');
    } finally { if (version === this.generation) this.loading.set(false); }
  }
  async setSpendingBalance(balance: number): Promise<void> {
    if (this.loading() || this.error()) throw new Error('Wait for your budget to load first.');
    const uid = this.auth.userId();
    const month = this.month();
    const ids = new Set(this.categories().filter(isSpendingCategory).map(category => category.id));
    const recordedSpending = total(this.transactions().filter(t => t.type === 'expense' && !t.debtId && ids.has(t.categoryId) && this.inMonth(t.date, month)));
    const recordedFunding = total(this.transactions().filter(t => t.type === 'spending-transfer' && this.inMonth(t.date, month)));
    const checkpoint = { recordedFunding, id: month, balance: Math.round(balance * 100) / 100, recordedSpending };
    await this.service.saveSpendingBalance(checkpoint);
    if (uid !== this.auth.userId()) throw new Error('Your account changed. Reopen Budget.');
    ++this.generation;
    this.spendingBalances.update(items => [...items.filter(item => item.id !== month), checkpoint]);
  }
  async saveTransaction(input: TransactionInput, id?: string, receipt?: string): Promise<void> {
    if (this.loading() || this.error()) throw new Error('Wait for your budget to load, or retry loading it first.');
    const category = this.activeCategories().find(x => x.id === input.categoryId);
    if (input.type === 'spending-transfer' && (!category || !isSpendingCategory(category))) throw new Error('Choose the Spending category for an account transfer.');
    if (!category || !compatibleCategory(input.type, category.type)) throw new Error('Choose a category for this transaction type.');
    if (input.debtId && !this.debts().some(debt => debt.id === input.debtId)) throw new Error('Choose an existing debt account.');
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
    if (existing && existing.type !== category.type) {
      if (this.transactions().some(item => item.categoryId === category.id && !compatibleCategory(item.type, category.type))) throw new Error('This type does not match the existing transactions. Move those transactions to another category first. Expense and Bills can be switched without moving expense transactions.');
      if (!supportsPlan(category.type) && this.plans().some(plan => plan.categoryId === category.id)) throw new Error('This category has planned items. Remove them before changing it to Income.');
    }
    if (!category.deleted && this.activeCategories().some(x => x.id !== category.id && x.type === category.type && x.name.toLowerCase() === category.name.trim().toLowerCase())) throw new Error('A category with that name already exists.');
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
  async setCycleStartDay(day: number): Promise<void> {
    if (this.loading() || this.error()) throw new Error('Load your budget before changing its cycle.');
    const uid = this.auth.userId();
    await this.service.saveCycleStartDay(day);
    if (uid !== this.auth.userId()) throw new Error('Your account changed. Reopen Budget.');
    ++this.generation;
    this.cycleStartDay.set(day);
    this.month.set(cycleMonth(localDate(), day));
  }
  async savePlanItem(month: string, categoryId: string, name: string, amount: number, id: string = crypto.randomUUID()): Promise<void> {
    if (this.loading() || this.error()) throw new Error('Load your budget before changing planned items.');
    if (!this.activeCategories().some(category => category.id === categoryId && supportsPlan(category.type))) throw new Error('Choose an expense, bills or savings category.');
    const uid = this.auth.userId();
    const saved = await this.service.savePlan({ id, month, categoryId, name, amount });
    if (uid !== this.auth.userId()) throw new Error('Your account changed. Reopen Budget to continue.');
    ++this.generation;
    this.plans.update(items => [...items.filter(item => item.id !== id), saved]);
  }
  async deletePlanItem(id: string): Promise<void> {
    if (this.loading() || this.error()) throw new Error('Load your budget before changing planned items.');
    const uid = this.auth.userId();
    await this.service.deletePlan(id);
    if (uid !== this.auth.userId()) throw new Error('Your account changed. Reopen Budget to continue.');
    ++this.generation;
    this.plans.update(items => items.filter(item => item.id !== id));
  }
  async markSavingsMoved(planId: string, date: string): Promise<void> {
    const plan = this.plans().find(item => item.id === planId);
    if (!plan || !this.activeCategories().some(category => category.id === plan.categoryId && category.type === 'savings')) throw new Error('Choose an existing savings plan.');
    if (!this.inMonth(date, plan.month) || date > localDate()) throw new Error('Choose a transfer date within this budget cycle, on or before today.');
    const id = `savings-plan-${plan.id}`;
    if (this.transactions().some(item => item.id === id)) return;
    await this.saveTransaction({ amount: plan.amount, type: 'transfer', categoryId: plan.categoryId,
      title: plan.name || 'Savings moved', date, paymentMethod: 'Bank transfer',
      notes: '', receiptUrl: '', receiptPath: '', paymentStatus: 'paid' }, id);
  }
  async undoSavingsMoved(planId: string): Promise<void> {
    if (this.loading() || this.error()) throw new Error('Load your budget before changing savings.');
    const transaction = this.transactions().find(item => item.id === `savings-plan-${planId}` && item.type === 'transfer');
    if (transaction) await this.deleteTransaction(transaction);
  }
  async copyPlansToNextMonth(month: string, categoryId?: string): Promise<{ copied: number; skipped: number; month: string }> {
    if (this.loading() || this.error()) throw new Error('Load your budget before copying planned items.');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Choose a valid budget month.');
    const date = new Date(`${month}-01T12:00:00`);
    date.setMonth(date.getMonth() + 1);
    const nextMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const categories = new Set(this.activeCategories().filter(category => supportsPlan(category.type)).map(category => category.id));
    const source = this.plans().filter(plan => plan.month === month && categories.has(plan.categoryId) && (!categoryId || plan.categoryId === categoryId));
    const uid = this.auth.userId();
    let copied = 0, skipped = 0;
    for (const plan of source) {
      if (uid !== this.auth.userId()) throw new Error('Your account changed. Reopen Budget to continue.');
      // A stable destination ID makes retries safe without overwriting edited copies.
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plan.id));
      const key = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      const id = `${nextMonth}-copy-${key}`;
      if (this.plans().some(item => item.id === id)) { skipped++; continue; }
      await this.savePlanItem(nextMonth, plan.categoryId, plan.name || 'Existing plan', plan.amount, id);
      copied++;
    }
    return { copied, skipped, month: nextMonth };
  }
  async saveDebt(input: BudgetDebtInput, id?: string): Promise<void> {
    if (this.loading() || this.error()) throw new Error('Load your budget before changing debts.');
    const uid = this.auth.userId();
    const saved = await this.service.saveDebt(input, id);
    if (uid !== this.auth.userId()) throw new Error('Your account changed. Reopen Budget to continue.');
    ++this.generation;
    this.debts.update(items => [...items.filter(item => item.id !== saved.id), saved]);
  }
  async saveDebtPlan(month: string, debtId: string, amount: number): Promise<void> {
    if (this.loading() || this.error()) throw new Error('Load your budget before changing debt payments.');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !Number.isFinite(amount) || amount < 0 || amount > 999999999) throw new Error('Enter a valid planned payment amount.');
    const debt = this.debts().find(item => item.id === debtId);
    if (!debt) throw new Error('Choose an existing debt account.');
    const id = debtPlanId(month, debtId);
    const existing = this.transactions().find(item => item.id === id);
    if (existing && existing.paymentStatus !== 'planned') throw new Error('This payment is already paid. Edit it in the debt payment history.');
    if (amount === 0) {
      if (existing) await this.deleteTransaction(existing);
      return;
    }
    const category = this.activeCategories().find(item => item.type === 'expense' && /debt|loan|credit/i.test(item.name))
      ?? this.activeCategories().find(item => item.type === 'expense' && item.id === 'other')
      ?? this.activeCategories().find(item => item.type === 'expense');
    if (!category) throw new Error('Add an expense category before planning debt payments.');
    await this.saveTransaction({
      amount, type: 'expense', categoryId: existing?.categoryId ?? category.id,
      title: existing?.title ?? `Payment to ${debt.name}`, date: existing?.date ?? cycleStart(month, this.cycleStartDay()),
      paymentMethod: existing?.paymentMethod ?? 'Bank transfer', notes: existing?.notes ?? '',
      receiptUrl: existing?.receiptUrl ?? '', receiptPath: existing?.receiptPath ?? '', debtId,
      paymentStatus: 'planned',
    }, id);
  }
  async deleteDebt(id: string): Promise<void> {
    await this.service.deleteDebt(id);
    this.debts.update(items => items.filter(item => item.id !== id));
  }
  async deleteCategory(category: BudgetCategory): Promise<void> {
    const saved = this.categories().find(item => item.id === category.id);
    if (!saved) throw new Error('This category no longer exists. Reload your budget.');
    await this.saveCategory({ ...saved, deleted: true });
  }
  private async cleanupReceipt(path: string): Promise<void> {
    try { await this.service.removeReceipt(path); }
    catch { this.notice.set('Your transaction was saved, but an old receipt could not be removed from storage.'); }
  }
}
