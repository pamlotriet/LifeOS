import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { BudgetStore } from '../../shared/state/budget/budget.store';
import { BudgetCategory, CATEGORY_COLOURS, CATEGORY_ICONS, CATEGORY_TYPES, CategoryType, money, total } from '../../shared/state/budget/budget.model';

@Component({ selector: 'app-budget-categories', imports: [FormsModule, RouterLink, IonContent, IonIcon], templateUrl: './budget-categories.html', styleUrl: './budget.css' })
export class BudgetCategories {
  readonly store = inject(BudgetStore);
  readonly tab = signal<CategoryType>('expense');
  readonly types = CATEGORY_TYPES; readonly icons = CATEGORY_ICONS; readonly colours = CATEGORY_COLOURS;
  readonly money = money;
  readonly editor = signal<BudgetCategory | null>(null);
  readonly isNew = signal(false); readonly busy = signal(false); readonly error = signal(''); readonly confirming = signal(false);
  readonly rows = computed(() => {
    const categories = this.store.activeCategories().filter(x => x.type === this.tab());
    const rows = categories.map(x => ({ ...x, amount: total(this.store.monthly().filter(t => t.categoryId === x.id)) }));
    const sum = rows.reduce((a, b) => a + b.amount, 0);
    return rows.map(x => ({ ...x, percent: sum ? Math.round(x.amount / sum * 100) : 0 }));
  });
  label(type: CategoryType): string { return ({ expense: 'Expense', income: 'Income', bills: 'Bills', savings: 'Savings' })[type]; }
  open(category?: BudgetCategory): void {
    this.isNew.set(!category); this.error.set(''); this.confirming.set(false);
    this.editor.set(category ? { ...category } : { id: crypto.randomUUID(), name: '', type: this.tab(), icon: 'wallet', colour: this.colours[0], order: this.store.categories().length });
  }
  setMonth(value: string): void { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) this.store.month.set(value); }
  async save(): Promise<void> {
    const category = this.editor(); if (!category || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try { await this.store.saveCategory(category); this.tab.set(category.type); this.editor.set(null); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not save category.'); }
    finally { this.busy.set(false); }
  }
  async remove(): Promise<void> {
    const category = this.editor(); if (!category || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try { await this.store.deleteCategory(category); this.editor.set(null); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not delete category.'); }
    finally { this.busy.set(false); }
  }
}
