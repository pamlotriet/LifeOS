import { cycleBounds, inCycle } from '../../shared/state/budget/budget-cycle';
import { BudgetCategory, BudgetDebt, BudgetPlan, BudgetTransaction, categoryPlanItems, debtPlanId, debtSummary, money, summary, supportsPlan, total } from '../../shared/state/budget/budget.model';

export interface BudgetInsight { id: string; title: string; value: string; detail: string; tone: 'neutral' | 'good' | 'attention'; action: string; route: string; }
const round = (value: number) => Math.round(value * 100) / 100;
const dayNumber = (value: string) => Math.round(Date.parse(`${value}T00:00:00Z`) / 86400000);
export function budgetInsights(transactions: BudgetTransaction[], categories: BudgetCategory[], plans: BudgetPlan[], debts: BudgetDebt[], month: string, startDay: number, today: string): BudgetInsight[] {
  const cycle = cycleBounds(month, startDay);
  const current = today >= cycle.start && today < cycle.endExclusive;
  const monthly = transactions.filter(item => inCycle(item.date, month, startDay) && item.paymentStatus !== 'planned');
  const values = summary(monthly, categories);
  const cards: BudgetInsight[] = [];
  const add = (id: string, title: string, value: string, detail: string, tone: BudgetInsight['tone'], action: string, route: string) => cards.push({ id, title, value, detail, tone, action, route });
  if (!debts.length && !monthly.length && !plans.some(p => p.month === month) && !transactions.some(t => t.paymentStatus === 'planned' && inCycle(t.date, month, startDay))) {
    add('start', 'Build your first insights', 'Add your figures', 'Record income and expenses or add category plans for this cycle to get insights based on your own budget.', 'neutral', 'Record a transaction', '/budget/transactions/add');
    return cards;
  }
  const planned = categories.filter(c => !c.deleted && supportsPlan(c.type)).map(category => ({ category, ...categoryPlanItems(plans, month, category.id), actual: total(monthly.filter(t => t.categoryId === category.id && !t.debtId && (category.type === 'savings' ? t.type === 'transfer' : t.type === 'expense'))) }));
  const debtPlans = debts.reduce((sum, debt) => sum + (transactions.find(t => t.id === debtPlanId(month, debt.id))?.amount ?? 0), 0);
  const plannedTotal = round(planned.reduce((sum, item) => sum + item.amount, 0) + debtPlans);
  if (planned.some(p => p.items.length) || debtPlans) {
    const left = round(values.income - plannedTotal);
    add('plan', 'Balance after your plan', money(left), `${money(values.income)} recorded income minus ${money(plannedTotal)} category plans and scheduled debt payments. Actual spending is not subtracted again.`, left < 0 ? 'attention' : 'good', 'Review planned payments', '/budget/planned');
  }
  if (!values.income) add('income', 'Income is missing', 'Record income', 'There is no recorded income for this cycle. Balance forecasts use zero until you add it.', 'attention', 'Add income', '/budget/transactions/add');
  const pendingDebt = transactions.filter(t => t.type === 'expense' && t.debtId && t.paymentStatus === 'planned' && inCycle(t.date, month, startDay));
  const outstanding = round(planned.reduce((sum, p) => sum + Math.max(0, p.amount - p.actual), 0) + pendingDebt.reduce((sum, t) => sum + t.amount, 0));
  const available = round(values.remaining - outstanding);
  if (values.income > 0) {
    add('available', 'After remaining commitments', money(available), `${money(values.remaining)} actual balance less ${money(outstanding)} unspent category plans and unpaid debt payments in this cycle. Unplanned future costs are excluded.`, available < 0 ? 'attention' : 'neutral', 'Review your plan', '/budget/planned');
    if (current) {
      const days = dayNumber(cycle.endExclusive) - dayNumber(today);
      add('daily', 'Daily spending room', money(Math.max(0, round(available / days))), `Across ${days} days including today, after remaining planned commitments. Assumes no more income or unplanned costs.${available < 0 ? ` Cover the ${money(-available)} shortfall first.` : ''}`, available < 0 ? 'attention' : 'neutral', 'Adjust your plan', '/budget/planned');
    }
    add('savings', 'Income moved to savings', `${Math.round(values.savings / values.income * 100)}%`, `${money(values.savings)} in recorded savings transfers from ${money(values.income)} income. Savings transfers are separate from expenses.`, values.savings > 0 ? 'good' : 'neutral', 'Plan your savings', '/budget/planned');
  }
  const over = planned.filter(p => p.items.length && p.actual > p.amount).sort((a,b) => (b.actual-b.amount)-(a.actual-a.amount));
  if (over.length) {
    const first = over[0];
    add('over', `${first.category.name} is over plan`, money(round(first.actual-first.amount)), `${money(first.actual)} recorded against ${money(first.amount)} planned.${over.length > 1 ? ` ${over.length - 1} other categories are also over plan.` : ''} Review the items before adding more spending.`, 'attention', 'Review category plans', '/budget/planned');
  }
  const spending = categories.map(c => ({ ...c, amount: total(monthly.filter(t => t.type === 'expense' && t.categoryId === c.id)) })).filter(c => c.amount > 0).sort((a,b) => b.amount-a.amount);
  if (spending.length) add('largest', 'Largest spending category', spending[0].name, `${money(spending[0].amount)} accounts for ${Math.round(spending[0].amount / values.expenses * 100)}% of recorded expenses this cycle. Start here when looking for costs to review.`, 'neutral', 'View transactions', '/budget/month');
  if (today >= cycle.start) {
    const previousDate = new Date(`${month}-01T12:00:00`); previousDate.setMonth(previousDate.getMonth()-1);
    const previousMonth = `${previousDate.getFullYear()}-${String(previousDate.getMonth()+1).padStart(2,'0')}`;
    const previous = cycleBounds(previousMonth,startDay);
    const elapsed = current ? dayNumber(today)-dayNumber(cycle.start)+1 : Infinity;
    const prior = transactions.filter(t => inCycle(t.date,previousMonth,startDay) && dayNumber(t.date)-dayNumber(previous.start) < elapsed);
    const priorExpense = total(prior.filter(t => t.type === 'expense'));
    const nowExpense = total(monthly.filter(t => t.type === 'expense' && (!current || t.date <= today)));
    if (priorExpense > 0) {
      const delta = round(nowExpense-priorExpense);
      add('change', current ? 'Spending pace vs previous cycle' : 'Spending vs previous cycle', `${delta >= 0 ? '+' : '-'}${Math.round(Math.abs(delta)/priorExpense*100)}%`, `${money(nowExpense)} versus ${money(priorExpense)}${current ? ' over the same number of cycle days where available' : ''}. ${money(Math.abs(delta))} ${delta >= 0 ? 'more' : 'less'} recorded; missing transactions can affect this comparison.`, delta > 0 ? 'attention' : 'good', 'Review transactions', '/budget/month');
    }
  }
  if (debts.length) {
    const rows = debts.map(d => ({ debt:d, ...debtSummary(d,transactions,month,startDay) }));
    const remaining = round(rows.reduce((sum,r)=>sum+r.closing,0));
    const projected = round(rows.reduce((sum,r)=>sum+r.projected,0));
    add('debt', 'Debt after planned payments', money(projected), `${money(remaining)} remaining at cycle end. All pending debt plans across all dates would reduce this by ${money(round(remaining-projected))}, before future interest and fees.`, 'neutral', 'Manage debt', '/budget/debts');
    if (current) {
      const due = transactions.filter(t => t.type === 'expense' && debts.some(d=>d.id===t.debtId) && t.paymentStatus==='planned' && dayNumber(t.date) <= dayNumber(today)+7);
      if (due.length) add('due', 'Debt payments needing attention', money(round(due.reduce((sum,t)=>sum+t.amount,0))), `${due.length} unpaid planned payment${due.length===1?'':'s'} overdue or due within the next 7 days. Mark payments already made as paid to keep your figures accurate.`, 'attention', 'Review debt payments', '/budget/debts');
    }
    const interest = rows.filter(r=>r.interest>0).sort((a,b)=>b.interest-a.interest)[0];
    if (interest) add('interest', 'Largest estimated card interest', money(interest.interest), `${interest.debt.name}: ${interest.debt.annualInterestRate}% annual rate applied to the cycle opening balance. This is a cycle estimate; prior interest and lender fees are excluded.`, 'attention', 'Review debt account', '/budget/debts');
  }
  return cards;
}
