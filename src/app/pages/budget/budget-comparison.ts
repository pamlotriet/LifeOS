import { AppMonthPicker } from '../../shared/components/app-month-picker/app-month-picker';
import { budgetSnapshot } from './budget-snapshot';
import { BackButton } from '../../shared/components/back-button/back-button';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { BudgetStore } from '../../shared/state/budget/budget.store';
import { categoryPlanItems, compatibleCategory, isSpendingCategory, money } from '../../shared/state/budget/budget.model';
import { BudgetNav } from './budget-nav';
import { compareBudgetCategories } from './budget-comparison.model';

@Component({ selector: 'app-budget-comparison', imports:[AppMonthPicker, BackButton,FormsModule, RouterLink, IonContent, BudgetNav], templateUrl: './budget-comparison.html', styleUrls: ['./budget.css', './budget-layout.css', './budget-comparison.css'] })
export class BudgetComparison {
  readonly store = inject(BudgetStore);
  readonly money = money;
  readonly leftOver = computed(() => budgetSnapshot(this.store.transactions(), this.store.categories(), this.store.plans(), this.store.month(), this.store.cycleStartDay(), this.store.spendingBalances?.() ?? []).leftOver);
  readonly filter = signal('all');
  readonly search = signal('');
  readonly sort = signal('category');
  readonly expanded = signal<string | null>(null);
  readonly details = computed(() => {
    const row = this.rows().find(row => row.id === this.expanded());
    return { plans: row ? categoryPlanItems(this.store.plans(), this.store.month(), row.id).items : [],
      payments: row ? this.store.monthly().filter(t => t.categoryId === row.id && compatibleCategory(t.type, row.type)).sort((a,b) => b.date.localeCompare(a.date)) : [] };
  });
  toggleCategory(id: string): void { this.expanded.set(this.expanded() === id ? null : id); }
  shiftMonth(delta: number): void {
    const date = new Date(`${this.store.month()}-01T12:00:00`); date.setMonth(date.getMonth()+delta);
    this.setMonth(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`);
  }
  readonly rows = computed(() => compareBudgetCategories(this.store.categories(), this.store.plans(), this.store.transactions(), this.store.month(), this.store.cycleStartDay()));
  readonly totals = computed(() => {
    const cents = this.rows().filter(r => r.type !== 'savings').reduce((sum,row) => ({ planned: sum.planned + Math.round(row.planned*100), actual: sum.actual + Math.round(row.actual*100) }), { planned:0, actual:0 });
    return { planned:cents.planned/100, actual:cents.actual/100 };
  });
  readonly groups = computed(() => [
    { title: 'Expenses & bills', savings: false, rows: this.rows().filter(r => r.type !== 'savings' && !isSpendingCategory(r)) },
    { title: 'Savings transfers', savings: true, rows: this.rows().filter(r => r.type === 'savings') },
  ].map(group => ({ ...group, rows: group.rows.filter(row => row.name.toLowerCase().includes(this.search().trim().toLowerCase()) && (this.filter() === 'all' || (this.filter() === 'over' ? row.hasPlan && row.difference < 0 : !row.hasPlan && row.actual > 0))).sort((a,b) => this.sort() === 'spent' ? b.actual-a.actual : this.sort() === 'difference' ? a.difference-b.difference : a.name.localeCompare(b.name)) })));
  setMonth(value: string): void { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) { this.store.month.set(value); this.expanded.set(null); } }
}
