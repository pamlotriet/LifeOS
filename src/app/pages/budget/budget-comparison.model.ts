import { inCycle } from '../../shared/state/budget/budget-cycle';
import { BudgetCategory, BudgetPlan, BudgetTransaction, categoryPlanItems, debtPlanId, supportsPlan, total } from '../../shared/state/budget/budget.model';

export function compareBudgetCategories(categories: BudgetCategory[], plans: BudgetPlan[], transactions: BudgetTransaction[], month: string, startDay: number) {
  return categories.filter(category => supportsPlan(category.type)).map(category => {
    const plan = categoryPlanItems(plans, month, category.id);
    const debtPlans = transactions.filter(t => t.categoryId === category.id && t.type === 'expense' && t.debtId &&
      ((t.paymentStatus === 'planned' && inCycle(t.date, month, startDay)) || t.id === debtPlanId(month, t.debtId)));
    const planned = Math.round(plan.amount * 100 + debtPlans.reduce((sum,t) => sum + Math.round(t.amount * 100), 0)) / 100;
    const actual = total(transactions.filter(t => t.categoryId === category.id && inCycle(t.date, month, startDay) && (category.type === 'savings' ? t.type === 'transfer' : t.type === 'expense')));
    const hasPlan = plan.items.length > 0 || debtPlans.length > 0;
    const difference = Math.round((planned - actual) * 100) / 100;
    return { ...category, planned, actual, hasPlan, difference, usage: planned > 0 ? Math.min(100, Math.round(actual / planned * 100)) : actual > 0 ? 100 : 0,
      status: !hasPlan ? actual > 0 ? 'Unplanned' : 'No plan' : difference < 0 ? 'Over plan' : difference === 0 ? 'On plan' : 'Within plan' };
  }).filter(row => !row.deleted || row.hasPlan || row.actual > 0);
}
