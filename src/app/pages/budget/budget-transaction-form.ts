import { BudgetNumber } from '../../shared/directives/budget-number';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { BudgetStore } from '../../shared/state/budget/budget.store';
import { compatibleCategory, localDate, TransactionInput, TransactionType } from '../../shared/state/budget/budget.model';

@Component({ selector: 'app-budget-transaction-form', imports: [BudgetNumber, IonContent, IonIcon, FormsModule, RouterLink], templateUrl: './budget-transaction-form.html', styleUrls: ['./budget.css', './budget-layout.css'] })
export class BudgetTransactionForm {
  readonly store = inject(BudgetStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly id = this.route.snapshot.paramMap.get('id');
  readonly busy = signal(false); readonly error = signal(''); readonly loaded = signal(false);
  readonly confirmDelete = signal(false); readonly localReceipt = signal('');
  readonly type = signal<TransactionType>('expense');
  readonly types: TransactionType[] = ['expense', 'income', 'transfer'];
  readonly categories = computed(() => this.store.activeCategories().filter(x => compatibleCategory(this.type(), x.type)));
  model: TransactionInput = { amount: null as unknown as number, type: 'expense', categoryId: 'food', title: '', date: localDate(), paymentMethod: 'Card', notes: '', receiptUrl: '', receiptPath: '', debtId: '' };
  constructor() {
    effect(() => {
      const transactions = this.store.transactions();
      if (this.id && !this.loaded() && !this.store.loading() && !this.store.error()) {
        const item = transactions.find(x => x.id === this.id);
        if (item) { const { id, ...input } = item; this.model = { ...input }; this.type.set(item.type); this.loaded.set(true); }
      } else if (!this.id && !this.store.loading()) {
        const categories = this.categories();
        if (!categories.some(category => category.id === this.model.categoryId)) this.model.categoryId = categories[0]?.id ?? '';
      }
    });
  }
  ionViewWillEnter(): void {
    if (!this.id) {
      const requested = this.route.snapshot.queryParamMap.get('type');
      const type: TransactionType = requested === 'income' || requested === 'transfer' ? requested : 'expense';
      const today = localDate();
      const date = this.store.inMonth(today) ? today : this.store.cycle().start;
      this.model = { amount: null as unknown as number, type, categoryId: this.store.activeCategories().find(x => compatibleCategory(type, x.type))?.id ?? '', title: '', date, paymentMethod: type === 'income' ? 'Bank transfer' : 'Card', notes: '', receiptUrl: '', receiptPath: '', debtId: '' };
      this.type.set(type); this.localReceipt.set(''); this.error.set(''); this.confirmDelete.set(false);
    }
  }
  changeType(type: TransactionType): void { this.type.set(type); this.model.type = type; if (type !== 'expense') { this.model.debtId = ''; this.model.paymentStatus = 'paid'; } if (!this.categories().some(x => x.id === this.model.categoryId)) this.model.categoryId = this.categories()[0]?.id ?? ''; }
  async pickFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error.set('');
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) || !file.size || file.size > 5 * 1024 * 1024) { this.error.set('Choose a JPG, PNG, WEBP or HEIC photo smaller than 5 MB.'); input.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => this.localReceipt.set(String(reader.result));
    reader.onerror = () => this.error.set('Could not read the photo. Please try again.');
    reader.readAsDataURL(file); input.value = '';
  }
  removeReceipt(): void { this.localReceipt.set(''); this.model.receiptUrl = ''; this.model.receiptPath = ''; }
  async save(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    try {
      const paymentStatus = this.model.debtId ? this.model.paymentStatus : 'paid';
      await this.store.saveTransaction({ ...this.model, paymentStatus, type: this.type(), amount: Number(this.model.amount) }, this.id ?? undefined, this.localReceipt() || undefined);
      this.store.month.set(this.store.monthForDate(this.model.date));
      await this.router.navigateByUrl(paymentStatus === 'planned' ? '/budget/debts' : '/budget/month', { replaceUrl: true });
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not save transaction.'); }
    finally { this.busy.set(false); }
  }
  async remove(): Promise<void> {
    const item = this.store.transactions().find(x => x.id === this.id);
    if (!item || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try { await this.store.deleteTransaction(item); await this.router.navigateByUrl('/budget/month', { replaceUrl: true }); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not delete transaction.'); }
    finally { this.busy.set(false); }
  }
}
