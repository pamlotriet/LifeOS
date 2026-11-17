import { FieldFeedback } from '@shared/directives/field-feedback';
import { FormProtection } from '@core/forms/form-protection.service';
import { AppForm, AppDiscard } from '@shared/directives/app-form';
import { BudgetPage } from '@pages/budget/components/budget-page/budget-page';
import { TranslatePipe } from '@ngx-translate/core';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppInput } from '@shared/components/app-input/app-input';
import { AppMonthPicker } from '@shared/components/app-month-picker/app-month-picker';
import { budgetSnapshot } from '@pages/budget/budget-snapshot';
import { BackButton } from '@shared/components/back-button/back-button';
import { BudgetNav } from '@pages/budget/components/budget-nav/budget-nav';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/ion-content';
import { IonIcon } from '@ionic/angular/ion-icon';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import {
  BudgetCategory,
  CATEGORY_COLOURS,
  CATEGORY_ICONS,
  CATEGORY_TYPES,
  CategoryType,
  isSpendingCategory,
  money,
  total,
} from '@pages/budget/state/budget/budget.model';

@Component({
  host: { class: 'budget-screen' },
  selector: 'app-budget-categories',
  imports: [
    FieldFeedback,
    AppForm,
    AppDiscard,
    BudgetPage,
    TranslatePipe,
    AppInput,
    AppButton,
    AppMonthPicker,
    BackButton,
    BudgetNav,
    FormsModule,
    IonContent,
    IonIcon,
  ],
  templateUrl: './budget-categories.html',
  styleUrl: './budget-categories.css',
})
export class BudgetCategories {
  private readonly formProtection = inject(FormProtection);
  readonly store = inject(BudgetStore);
  readonly tab = signal<CategoryType>('expense');
  readonly types = CATEGORY_TYPES;
  readonly icons = CATEGORY_ICONS;
  readonly colours = CATEGORY_COLOURS;
  readonly money = money;
  readonly isSpending = isSpendingCategory;
  readonly leftOver = computed(
    () =>
      budgetSnapshot(
        this.store.transactions(),
        this.store.categories(),
        this.store.plans(),
        this.store.month(),
        this.store.cycleStartDay(),
        this.store.spendingBalances?.() ?? [],
      ).leftOver,
  );
  readonly editor = signal<BudgetCategory | null>(null);
  readonly isNew = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly confirming = signal(false);
  readonly rows = computed(() => {
    const categories = this.store.activeCategories().filter((x) => x.type === this.tab());
    const rows = categories.map((x) => ({
      ...x,
      amount: total(this.store.monthly().filter((t) => t.categoryId === x.id)),
    }));
    const sum = rows.reduce((a, b) => a + b.amount, 0);
    return rows.map((x) => ({ ...x, percent: sum ? Math.round((x.amount / sum) * 100) : 0 }));
  });
  label(type: CategoryType): string {
    return { expense: 'Expense', income: 'Income', bills: 'Bills', savings: 'Savings' }[type];
  }
  open(category?: BudgetCategory): void {
    if (!this.formProtection.canLeave()) return;
    this.isNew.set(!category);
    this.error.set('');
    this.confirming.set(false);
    this.editor.set(
      category
        ? { ...category }
        : {
            id: crypto.randomUUID(),
            name: '',
            type: this.tab(),
            icon: 'wallet',
            colour: this.colours[0],
            order: this.store.categories().length,
          },
    );
  }
  setMonth(value: string): void {
    if (!this.formProtection.canLeave()) return;
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) this.store.month.set(value);
  }
  async save(formUi?: AppForm): Promise<void> {
    const category = this.editor();
    if (!category || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.store.saveCategory(category);
      formUi?.markSaved();
      this.tab.set(category.type);
      this.editor.set(null);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not save category.');
    } finally {
      this.busy.set(false);
    }
  }
  async remove(): Promise<void> {
    const category = this.editor();
    if (!category || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.store.deleteCategory(category);
      this.editor.set(null);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not delete category.');
    } finally {
      this.busy.set(false);
    }
  }
}
