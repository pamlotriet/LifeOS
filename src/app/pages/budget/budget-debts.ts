import { BudgetNumber } from '../../shared/directives/budget-number';
import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { AppDatePicker } from '../../shared/components/app-date-picker/app-date-picker';
import { BudgetStore } from '../../shared/state/budget/budget.store';
import { BudgetDebtInput, BudgetTransaction, debtSummary, localDate, money, TransactionInput } from '../../shared/state/budget/budget.model';

@Component({ selector: 'app-budget-debts', imports: [BudgetNumber, FormsModule, RouterLink, IonContent, IonIcon, AppDatePicker], templateUrl: './budget-debts.html', styleUrls: ['./budget.css', './budget-layout.css', './budget-debts.css'] })
export class BudgetDebts {
  @ViewChild(IonContent) private content?: IonContent;
  readonly store = inject(BudgetStore);
  readonly money = money;
  readonly editing = signal<string | null>(null);
  readonly paymentDebt = signal<string | null>(null);
  readonly paymentId = signal<string | undefined>(undefined);
  readonly expanded = signal<string | null>(null);
  readonly deleting = signal<BudgetTransaction | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly today = localDate();
  readonly categories = computed(() => this.store.activeCategories().filter(c => c.type === 'expense' || c.type === 'bills'));
  readonly rows = computed(() => this.store.debts().map(debt => {
    const payments = this.store.transactions().filter(p => p.debtId === debt.id && p.type === 'expense');
    return { debt, ...debtSummary(debt, payments, this.store.month(), this.store.cycleStartDay()),
      history: payments.filter(p => p.paymentStatus !== 'planned').sort((a, b) => b.date.localeCompare(a.date)),
      upcoming: payments.filter(p => p.paymentStatus === 'planned').sort((a, b) => a.date.localeCompare(b.date)) };
  }));
  readonly totals = computed(() => this.rows().reduce((sum, row) => ({ remaining: sum.remaining + row.closing, paid: sum.paid + row.paid, planned: sum.planned + row.planned }), { remaining: 0, paid: 0, planned: 0 }));
  model: BudgetDebtInput = this.blank();
  payment: TransactionInput = this.blankPayment('');
  blank(): BudgetDebtInput { return { name: '', type: 'loan', openingBalance: 0, annualInterestRate: 0, openingOverride: null }; }
  private blankPayment(debtId: string): TransactionInput {
    return { amount: null as unknown as number, type: 'expense', categoryId: '', title: '', date: localDate(), paymentMethod: 'Bank transfer', notes: '', receiptUrl: '', receiptPath: '', debtId, paymentStatus: 'paid' };
  }
  edit(id?: string): void {
    const debt = this.store.debts().find(item => item.id === id);
    this.model = debt ? { ...debt } : this.blank();
    this.paymentDebt.set(null); this.error.set(''); this.editing.set(id ?? 'new');
    void this.content?.scrollToTop(250);
  }
  editPayment(debtId: string, status: 'paid' | 'planned', item?: BudgetTransaction): void {
    const debt = this.store.debts().find(d => d.id === debtId);
    if (!debt) return;
    this.payment = item ? { ...item, paymentStatus: status } : { ...this.blankPayment(debtId), title: `Payment to ${debt.name}`, paymentStatus: status,
      categoryId: this.categories().find(c => c.id === 'other')?.id ?? this.categories()[0]?.id ?? '' };
    if (item?.paymentStatus === 'planned' && status === 'paid') this.payment.date = localDate();
    this.paymentId.set(item?.id); this.paymentDebt.set(debtId); this.editing.set(null); this.error.set(''); this.expanded.set(debtId);
    void this.content?.scrollToTop(250);
  }
  confirmDelete(item: BudgetTransaction): void { this.deleting.set(item); this.error.set(''); void this.content?.scrollToTop(250); }
  async save(): Promise<void> {
    const id = this.editing();
    if (!id || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try {
      await this.store.saveDebt({ ...this.model, openingBalance: Number(this.model.openingBalance), annualInterestRate: Number(this.model.annualInterestRate), openingOverride: this.model.openingOverride == null ? null : Number(this.model.openingOverride) }, id === 'new' ? undefined : id);
      this.editing.set(null);
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not save debt.'); }
    finally { this.busy.set(false); }
  }
  async savePayment(): Promise<void> {
    if (!this.paymentDebt() || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try {
      await this.store.saveTransaction({ ...this.payment, amount: Number(this.payment.amount), type: 'expense', debtId: this.paymentDebt()! }, this.paymentId());
      this.paymentDebt.set(null);
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not save payment.'); }
    finally { this.busy.set(false); }
  }
  async removePayment(): Promise<void> {
    const item = this.deleting();
    if (!item || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try { await this.store.deleteTransaction(item); this.deleting.set(null); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not delete payment.'); }
    finally { this.busy.set(false); }
  }
  date(value: string): string { return new Date(`${value}T12:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }); }
}
