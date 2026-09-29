import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Camera, MediaTypeSelection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { IonContent, IonIcon } from '@ionic/angular';
import { BudgetStore } from '../../shared/state/budget/budget.store';
import { compatibleCategory, localDate, TransactionInput, TransactionType } from '../../shared/state/budget/budget.model';

@Component({ selector: 'app-budget-transaction-form', imports: [IonContent, IonIcon, FormsModule, RouterLink], templateUrl: './budget-transaction-form.html', styleUrl: './budget.css' })
export class BudgetTransactionForm {
  readonly store = inject(BudgetStore);
  private readonly router = inject(Router);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  readonly busy = signal(false); readonly error = signal(''); readonly loaded = signal(false);
  readonly confirmDelete = signal(false); readonly localReceipt = signal('');
  readonly native = Capacitor.isNativePlatform();
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
      }
    });
  }
  ionViewWillEnter(): void {
    if (!this.id) {
      this.model = { amount: null as unknown as number, type: 'expense', categoryId: this.store.activeCategories().find(x => x.type === 'expense')?.id ?? '', title: '', date: localDate(), paymentMethod: 'Card', notes: '', receiptUrl: '', receiptPath: '', debtId: '' };
      this.type.set('expense'); this.localReceipt.set(''); this.error.set(''); this.confirmDelete.set(false);
    }
  }
  changeType(type: TransactionType): void { this.type.set(type); this.model.type = type; if (!this.categories().some(x => x.id === this.model.categoryId)) this.model.categoryId = this.categories()[0]?.id ?? ''; }
  async pickNative(camera: boolean): Promise<void> {
    this.error.set('');
    try {
      const result = camera ? await Camera.takePhoto({ quality: 85 }) : (await Camera.chooseFromGallery({ mediaType: MediaTypeSelection.Photo, allowMultipleSelection: false })).results[0];
      if (result?.webPath) this.localReceipt.set(result.webPath);
    } catch (error) { if (!/cancel/i.test(String(error))) this.error.set('Could not open your photos or camera. Check permission and try again.'); }
  }
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
      await this.store.saveTransaction({ ...this.model, type: this.type(), amount: Number(this.model.amount) }, this.id ?? undefined, this.localReceipt() || undefined);
      this.store.month.set(this.model.date.slice(0, 7));
      await this.router.navigateByUrl('/budget/month', { replaceUrl: true });
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
