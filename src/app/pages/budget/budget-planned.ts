import { BudgetNumber, parseBudgetNumber } from '../../shared/directives/budget-number';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { BudgetStore } from '../../shared/state/budget/budget.store';
import { BudgetPlan, categoryPlanItems, compatibleCategory, debtPlanId, money, supportsPlan, total } from '../../shared/state/budget/budget.model';
import { BudgetTransactions } from './budget-ui';

@Component({ selector: 'app-budget-planned', imports: [BudgetNumber, IonContent, IonIcon, FormsModule, RouterLink, BudgetTransactions], templateUrl: './budget-planned.html', styleUrls: ['./budget.css', './budget-layout.css'] })
export class BudgetPlanned {
  readonly store = inject(BudgetStore);
  readonly money = money;
  readonly parseNumber = (value: string): number => parseBudgetNumber(value) ?? NaN;
  readonly selectedDate = signal('');
  readonly monthLabel = computed(() => new Date(`${this.store.month()}-01T12:00:00`).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }));
  shiftMonth(delta: number): void {
    const date = new Date(`${this.store.month()}-01T12:00:00`);
    date.setMonth(date.getMonth() + delta);
    this.setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  readonly pending = computed(() => this.store.transactions().filter(item => item.paymentStatus === 'planned' && item.date.startsWith(this.store.month())).sort((a,b) => a.date.localeCompare(b.date)));
  readonly debtPlanError = signal('');
  readonly savingDebtPlan = signal(false);
  readonly savingPlanItem = signal(false);
  readonly planItemError = signal('');
  readonly debtPlans = computed(() => this.store.debts().map(debt => {
    const transaction = this.store.transactions().find(item => item.id === debtPlanId(this.store.month(), debt.id));
    return { ...debt, planned: transaction?.amount ?? 0, paid: !!transaction && transaction.paymentStatus !== 'planned', actual: total(this.store.monthly().filter(item => item.type === 'expense' && item.debtId === debt.id)) };
  }));
  readonly planned = computed(() => this.store.activeCategories().filter(category => supportsPlan(category.type)).map(category => {
    const plan = categoryPlanItems(this.store.plans(), this.store.month(), category.id);
    const actual = total(this.store.monthly().filter(item => compatibleCategory(item.type, category.type) && item.categoryId === category.id));
    return { ...category, planned: plan.amount, items: plan.items, actual };
  }));
  readonly plannedTotal = computed(() => this.planned().reduce((sum, item) => sum + item.planned, 0) + this.debtPlans().reduce((sum, item) => sum + item.planned, 0));
  setMonth(value: string): void { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) { this.store.month.set(value); this.selectedDate.set(''); } }
  async saveItem(categoryId: string, name: string, amount: number, id?: string): Promise<void> {
    if (this.savingPlanItem()) return;
    this.savingPlanItem.set(true); this.planItemError.set('');
    try { await this.store.savePlanItem(this.store.month(), categoryId, name, amount, id); }
    catch (error) { this.planItemError.set(error instanceof Error ? error.message : 'Could not save planned item.'); }
    finally { this.savingPlanItem.set(false); }
  }
  async removeItem(item: BudgetPlan): Promise<void> {
    if (this.savingPlanItem()) return;
    this.savingPlanItem.set(true); this.planItemError.set('');
    try { await this.store.deletePlanItem(item.id); }
    catch (error) { this.planItemError.set(error instanceof Error ? error.message : 'Could not remove planned item.'); }
    finally { this.savingPlanItem.set(false); }
  }
  async saveDebtPlan(debtId: string, amount: number): Promise<void> {
    if (this.savingDebtPlan()) return;
    this.savingDebtPlan.set(true); this.debtPlanError.set('');
    try { await this.store.saveDebtPlan(this.store.month(), debtId, amount); }
    catch (error) { this.debtPlanError.set(error instanceof Error ? error.message : 'Could not save the debt payment.'); }
    finally { this.savingDebtPlan.set(false); }
  }
}
