import '@angular/compiler';
import { computed, Injector, runInInjectionContext, signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { BudgetPlanned } from './budget-planned';
import { BudgetStore } from '../../shared/state/budget/budget.store';
import { BudgetPlan, BudgetTransaction, DEFAULT_CATEGORIES, debtPlanId } from '../../shared/state/budget/budget.model';

describe('Planning balance forecast', () => {
  it('subtracts category plans and debt payments once, preserves cents, and follows the selected month', () => {
    const transaction = (id: string, amount: number, type: BudgetTransaction['type'], extra = {}): BudgetTransaction => ({ id, amount, type, categoryId: 'salary', title: '', date: '2026-10-01', paymentMethod: 'Bank transfer', notes: '', receiptUrl: '', receiptPath: '', ...extra });
    const month = signal('2026-10');
    const transactions = signal([
      transaction('income', 1000.50, 'income'),
      transaction('spent', 200, 'expense'),
      transaction(debtPlanId('2026-10', 'loan'), 100.25, 'expense', { debtId: 'loan', categoryId: 'food', paymentStatus: 'planned' }),
      transaction('next-income', 500, 'income', { date: '2026-11-01' }),
    ]);
    const plans = signal<BudgetPlan[]>([
      { id: 'food', month: '2026-10', categoryId: 'food', amount: 300.10 },
      { id: 'savings', month: '2026-10', categoryId: 'savings', amount: 100.05 },
    ]);
    const store = { month, cycleStartDay: signal(1), transactions, plans, activeCategories: signal(DEFAULT_CATEGORIES), debts: signal([{ id: 'loan', name: 'Loan', type: 'loan' }]), monthly: computed(() => transactions().filter(t => t.date.startsWith(month()) && t.paymentStatus !== 'planned')) };
    const page = runInInjectionContext(Injector.create({ providers: [{ provide: BudgetStore, useValue: store }] }), () => new BudgetPlanned());
    expect(page.predictedBalance()).toBe(500.10);
    expect(page.outlook().afterPlans).toBe(300.10);
    expect(page.planned().find(item => item.id === 'food')?.actual).toBe(0);
    transactions.update(items => items.map(t => t.debtId ? { ...t, paymentStatus: 'paid' } : t));
    expect(page.predictedBalance()).toBe(500.10);
    expect(page.outlook().afterPlans).toBe(300.10);
    expect(page.planned().find(item => item.id === 'food')?.actual).toBe(0);
    plans.update(items => items.map(p => p.id === 'food' ? { ...p, amount: 900.30 } : p));
    expect(page.predictedBalance()).toBe(-100.10);
    month.set('2026-11');
    expect(page.predictedBalance()).toBe(500);
    month.set('2026-12');
    expect(page.predictedBalance()).toBe(0);
  });
});
