import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { BudgetStore } from '../../shared/state/budget/budget.store';
import { BudgetDebtInput, debtSummary, money } from '../../shared/state/budget/budget.model';

@Component({ selector: 'app-budget-debts', imports: [FormsModule, RouterLink, IonContent, IonIcon], templateUrl: './budget-debts.html', styleUrl: './budget.css' })
export class BudgetDebts {
  readonly store = inject(BudgetStore); readonly money = money; readonly editing = signal<string | null>(null);
  readonly rows = computed(() => this.store.debts().map(debt => ({ debt, ...debtSummary(debt, this.store.monthly()) })));
  model: BudgetDebtInput = this.blank();
  blank(): BudgetDebtInput { return { name: '', type: 'credit-card', openingBalance: 0, annualInterestRate: 0, openingOverride: null }; }
  edit(id?: string): void { const debt = this.store.debts().find(item => item.id === id); this.model = debt ? { ...debt } : this.blank(); this.editing.set(id ?? 'new'); }
  async save(): Promise<void> { const id = this.editing(); if (!id) return; await this.store.saveDebt({ ...this.model, openingBalance: Number(this.model.openingBalance), annualInterestRate: Number(this.model.annualInterestRate), openingOverride: this.model.openingOverride === null ? null : Number(this.model.openingOverride) }, id === 'new' ? undefined : id); this.editing.set(null); }
}
