import { FieldFeedback } from '@shared/directives/field-feedback';
import { AppForm } from '@shared/directives/app-form';
import { BudgetPage } from '@pages/budget/components/budget-page/budget-page';
import { TranslatePipe } from '@ngx-translate/core';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppInput } from '@shared/components/app-input/app-input';
import { AppDatePicker } from '@shared/components/app-date-picker/app-date-picker';
import { AppSelect } from '@shared/components/app-select/app-select';
import { BackButton } from '@shared/components/back-button/back-button';
import { BudgetNumber } from '@shared/directives/budget-number';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/ion-content';
import { IonIcon } from '@ionic/angular/ion-icon';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import {
  compatibleCategory,
  isSpendingCategory,
  localDate,
  TransactionInput,
  TransactionType,
  transferAccounts,
} from '@pages/budget/state/budget/budget.model';

@Component({
  host: { class: 'budget-screen' },
  selector: 'app-budget-transaction-form',
  imports: [
    FieldFeedback,
    AppForm,
    BudgetPage,
    AppSelect,
    TranslatePipe,
    AppInput,
    AppButton,
    AppDatePicker,
    BackButton,
    BudgetNumber,
    IonContent,
    IonIcon,
    FormsModule,
    RouterLink,
  ],
  templateUrl: './budget-transaction-form.html',
})
export class BudgetTransactionForm {
  readonly store = inject(BudgetStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly id = this.route.snapshot.paramMap.get('id');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly loaded = signal(false);
  readonly confirmDelete = signal(false);
  readonly localReceipt = signal('');
  readonly type = signal<TransactionType>('expense');
  readonly types: TransactionType[] = ['expense', 'income', 'transfer'];
  readonly accounts = computed(() => {
    const options = [...this.store.accountOptions()];
    const previous = this.store.transactions().find((item) => item.id === this.id);
    for (const id of [previous?.fromAccount, previous?.toAccount]) {
      if (id && !options.some((option) => option.value === id))
        options.push({ value: id, label: this.store.accountName(id) + ' (deleted)' });
    }
    return options;
  });
  readonly archivedPurchaseAccount = computed(() => {
    const id = this.store.transactions().find((item) => item.id === this.id)?.account;
    return (id === 'savings' || id?.startsWith('custom-')) &&
      !this.store.activeAccounts().some((account) => account.id === id)
      ? { id, name: this.store.accountName(id) }
      : null;
  });
  readonly categories = computed(() =>
    this.store
      .activeCategories()
      .filter((x) =>
        this.type() === 'spending-transfer'
          ? isSpendingCategory(x)
          : compatibleCategory(this.type(), x.type),
      ),
  );
  model: TransactionInput = {
    amount: null as unknown as number,
    type: 'expense',
    categoryId: 'food',
    title: '',
    date: localDate(),
    paymentMethod: 'Card',
    notes: '',
    receiptUrl: '',
    receiptPath: '',
    debtId: '',
  };
  constructor() {
    effect(() => {
      const transactions = this.store.transactions();
      if (this.id && !this.loaded() && !this.store.loading() && !this.store.error()) {
        const item = transactions.find((x) => x.id === this.id);
        if (item) {
          const { id, ...input } = item;
          this.model = { ...input };
          const route = transferAccounts(item);
          this.type.set(route ? 'transfer' : item.type);
          if (route) {
            this.model.type = 'transfer';
            this.model.fromAccount = route.from;
            this.model.toAccount = route.to;
          }
          this.loaded.set(true);
        }
      } else if (!this.id && !this.store.loading()) {
        const categories = this.categories();
        if (!categories.some((category) => category.id === this.model.categoryId))
          this.model.categoryId = categories[0]?.id ?? '';
      }
    });
  }
  ionViewWillEnter(): void {
    if (!this.id) {
      const requested = this.route.snapshot.queryParamMap.get('type');
      const type: TransactionType =
        requested === 'income' || requested === 'transfer' || requested === 'spending-transfer'
          ? requested === 'spending-transfer'
            ? 'transfer'
            : requested
          : 'expense';
      const today = localDate();
      const date = this.store.inMonth(today) ? today : this.store.cycle().start;
      this.model = {
        amount: null as unknown as number,
        type,
        categoryId:
          this.store.activeCategories().find((x) => compatibleCategory(type, x.type))?.id ?? '',
        title: '',
        date,
        paymentMethod: type !== 'expense' ? 'Bank transfer' : 'Card',
        notes: '',
        receiptUrl: '',
        receiptPath: '',
        debtId: '',
        fromAccount:
          type === 'transfer'
            ? (this.store
                .activeAccounts()
                .find((account) => account.id === this.route.snapshot.queryParamMap.get('from'))
                ?.id ?? 'main')
            : '',
        toAccount:
          type === 'transfer'
            ? (this.store
                .activeAccounts()
                .find((account) => account.id === this.route.snapshot.queryParamMap.get('to'))
                ?.id ??
              this.defaultDestination(requested === 'spending-transfer' ? 'spending' : 'savings'))
            : '',
        account:
          type === 'expense' &&
          this.route.snapshot.queryParamMap.get('account') === 'savings' &&
          this.store.activeAccounts().some((account) => account.id === 'savings')
            ? 'savings'
            : '',
      };
      this.type.set(type);
      this.localReceipt.set('');
      this.error.set('');
      this.confirmDelete.set(false);
    }
  }
  private defaultDestination(preferred = 'savings'): string {
    const accounts = this.store.activeAccounts();
    return (
      accounts.find((account) => account.id === preferred)?.id ??
      accounts.find((account) => account.id !== 'main')?.id ??
      ''
    );
  }
  changeType(type: TransactionType): void {
    this.type.set(type);
    this.model.type = type;
    this.model.fromAccount = type === 'transfer' ? 'main' : '';
    this.model.toAccount = type === 'transfer' ? this.defaultDestination() : '';
    if (type === 'transfer') this.model.paymentMethod = 'Bank transfer';
    if (type !== 'expense') {
      this.model.account = '';
      this.model.debtId = '';
      this.model.paymentStatus = 'paid';
    }
    if (!this.categories().some((x) => x.id === this.model.categoryId))
      this.model.categoryId = this.categories()[0]?.id ?? '';
  }
  async pickFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error.set('');
    if (
      !/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) ||
      !file.size ||
      file.size > 5 * 1024 * 1024
    ) {
      this.error.set('Choose a JPG, PNG, WEBP or HEIC photo smaller than 5 MB.');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => this.localReceipt.set(String(reader.result));
    reader.onerror = () => this.error.set('Could not read the photo. Please try again.');
    reader.readAsDataURL(file);
    input.value = '';
  }
  removeReceipt(): void {
    this.localReceipt.set('');
    this.model.receiptUrl = '';
    this.model.receiptPath = '';
  }
  async save(formUi?: AppForm): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.type() === 'transfer') {
        if (!this.model.fromAccount || !this.model.toAccount)
          throw new Error('Choose a source and destination account.');
        const route = transferAccounts(this.model);
        const savings = route?.from === 'savings' || route?.to === 'savings';
        this.model.categoryId =
          this.store
            .activeCategories()
            .find((category) =>
              savings ? category.type === 'savings' : isSpendingCategory(category),
            )?.id ?? 'account-transfer';
        if (!this.model.title.trim()) {
          const label = (account: string | undefined) => this.store.accountName(account ?? '');
          this.model.title = `${label(this.model.fromAccount)} → ${label(this.model.toAccount)}`;
        }
      }
      const paymentStatus = this.model.debtId ? this.model.paymentStatus : 'paid';
      await this.store.saveTransaction(
        { ...this.model, paymentStatus, type: this.type(), amount: Number(this.model.amount) },
        this.id ?? undefined,
        this.localReceipt() || undefined,
      );
      formUi?.markSaved();
      this.store.month.set(this.store.monthForDate(this.model.date));
      await this.router.navigateByUrl(
        paymentStatus === 'planned'
          ? '/budget/debts'
          : this.type() === 'transfer'
            ? '/budget/transfers'
            : '/budget/month',
        { replaceUrl: true },
      );
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not save transaction.');
    } finally {
      this.busy.set(false);
    }
  }
  async remove(): Promise<void> {
    const item = this.store.transactions().find((x) => x.id === this.id);
    if (!item || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.store.deleteTransaction(item);
      await this.router.navigateByUrl(
        this.type() === 'transfer' ? '/budget/transfers' : '/budget/month',
        { replaceUrl: true },
      );
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not delete transaction.');
    } finally {
      this.busy.set(false);
    }
  }
}
