import { englishText, TranslateText } from '@core/i18n/translation-text';
import { cycleBounds, inCycle } from '@pages/budget/state/budget-cycle';
import {
  BudgetCategory,
  BudgetDebt,
  BudgetPlan,
  BudgetTransaction,
  categoryPlanItems,
  debtPlanId,
  debtSummary,
  money,
  summary,
  supportsPlan,
  total,
} from '@pages/budget/state/budget.model';

export interface BudgetInsight {
  id: string;
  title: string;
  value: string;
  detail: string;
  tone: 'neutral' | 'good' | 'attention';
  action: string;
  route: string;
}
const round = (value: number) => Math.round(value * 100) / 100;
const dayNumber = (value: string) => Math.round(Date.parse(`${value}T00:00:00Z`) / 86400000);
export function budgetInsights(
  transactions: BudgetTransaction[],
  categories: BudgetCategory[],
  plans: BudgetPlan[],
  debts: BudgetDebt[],
  month: string,
  startDay: number,
  today: string,
  translate: TranslateText = englishText,
): BudgetInsight[] {
  const cycle = cycleBounds(month, startDay);
  const current = today >= cycle.start && today < cycle.endExclusive;
  const monthly = transactions.filter(
    (item) => inCycle(item.date, month, startDay) && item.paymentStatus !== 'planned',
  );
  const values = summary(monthly, categories);
  const cards: BudgetInsight[] = [];
  const add = (
    id: string,
    title: string,
    value: string,
    detail: string,
    tone: BudgetInsight['tone'],
    action: string,
    route: string,
  ) => cards.push({ id, title, value, detail, tone, action, route });
  if (
    !debts.length &&
    !monthly.length &&
    !plans.some((p) => p.month === month) &&
    !transactions.some((t) => t.paymentStatus === 'planned' && inCycle(t.date, month, startDay))
  ) {
    add(
      'start',
      'Build your first insights',
      'Add your figures',
      'Record income and expenses or add category plans for this cycle to get insights based on your own budget.',
      'neutral',
      'Record a transaction',
      '/budget/transactions/add',
    );
    return cards;
  }
  const planned = categories
    .filter((c) => !c.deleted && supportsPlan(c.type))
    .map((category) => ({
      category,
      ...categoryPlanItems(plans, month, category.id),
      actual: total(
        monthly.filter(
          (t) =>
            t.categoryId === category.id &&
            !t.debtId &&
            (category.type === 'savings' ? t.type === 'transfer' : t.type === 'expense'),
        ),
      ),
    }));
  const debtPlans = debts.reduce(
    (sum, debt) =>
      sum + (transactions.find((t) => t.id === debtPlanId(month, debt.id))?.amount ?? 0),
    0,
  );
  const plannedTotal = round(planned.reduce((sum, item) => sum + item.amount, 0) + debtPlans);
  if (planned.some((p) => p.items.length) || debtPlans) {
    const left = round(values.income - plannedTotal);
    add(
      'plan',
      'Balance after your plan',
      money(left),
      translate(
        '{{p0}} recorded income minus {{p1}} category plans and scheduled debt payments. Actual spending is not subtracted again.',
        { p0: money(values.income), p1: money(plannedTotal) },
      ),
      left < 0 ? 'attention' : 'good',
      'Review planned payments',
      '/budget/planned',
    );
  }
  if (!values.income)
    add(
      'income',
      'Income is missing',
      'Record income',
      'There is no recorded income for this cycle. Balance forecasts use zero until you add it.',
      'attention',
      'Add income',
      '/budget/transactions/add',
    );
  const pendingDebt = transactions.filter(
    (t) =>
      t.type === 'expense' &&
      t.debtId &&
      t.paymentStatus === 'planned' &&
      inCycle(t.date, month, startDay),
  );
  const outstanding = round(
    planned.reduce((sum, p) => sum + Math.max(0, p.amount - p.actual), 0) +
      pendingDebt.reduce((sum, t) => sum + t.amount, 0),
  );
  const available = round(values.remaining - outstanding);
  if (values.income > 0) {
    add(
      'available',
      'After remaining commitments',
      money(available),
      translate(
        '{{p0}} actual balance less {{p1}} unspent category plans and unpaid debt payments in this cycle. Unplanned future costs are excluded.',
        { p0: money(values.remaining), p1: money(outstanding) },
      ),
      available < 0 ? 'attention' : 'neutral',
      'Review your plan',
      '/budget/planned',
    );
    if (current) {
      const days = dayNumber(cycle.endExclusive) - dayNumber(today);
      add(
        'daily',
        'Daily spending room',
        money(Math.max(0, round(available / days))),
        translate(
          'Across {{p0}} days including today, after remaining planned commitments. Assumes no more income or unplanned costs.{{p1}}',
          {
            p0: days,
            p1:
              available < 0
                ? translate(' Cover the {{p0}} shortfall first.', { p0: money(-available) })
                : '',
          },
        ),
        available < 0 ? 'attention' : 'neutral',
        'Adjust your plan',
        '/budget/planned',
      );
    }
    add(
      'savings',
      'Income moved to savings',
      `${Math.round((values.savings / values.income) * 100)}%`,
      translate(
        '{{p0}} in recorded savings transfers from {{p1}} income. Savings transfers are separate from expenses.',
        { p0: money(values.savings), p1: money(values.income) },
      ),
      values.savings > 0 ? 'good' : 'neutral',
      'Plan your savings',
      '/budget/planned',
    );
  }
  const over = planned
    .filter((p) => p.items.length && p.actual > p.amount)
    .sort((a, b) => b.actual - b.amount - (a.actual - a.amount));
  if (over.length) {
    const first = over[0];
    add(
      'over',
      translate('{{p0}} is over plan', { p0: first.category.name }),
      money(round(first.actual - first.amount)),
      translate(
        '{{p0}} recorded against {{p1}} planned.{{p2}} Review the items before adding more spending.',
        {
          p0: money(first.actual),
          p1: money(first.amount),
          p2:
            over.length > 1
              ? translate(' {{p0}} other categories are also over plan.', { p0: over.length - 1 })
              : '',
        },
      ),
      'attention',
      'Review category plans',
      '/budget/planned',
    );
  }
  const spending = categories
    .map((c) => ({
      ...c,
      amount: total(monthly.filter((t) => t.type === 'expense' && t.categoryId === c.id)),
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  if (spending.length)
    add(
      'largest',
      'Largest spending category',
      spending[0].name,
      translate(
        '{{p0}} accounts for {{p1}}% of recorded expenses this cycle. Start here when looking for costs to review.',
        {
          p0: money(spending[0].amount),
          p1: Math.round((spending[0].amount / values.expenses) * 100),
        },
      ),
      'neutral',
      'View transactions',
      '/budget/month',
    );
  if (today >= cycle.start) {
    const previousDate = new Date(`${month}-01T12:00:00`);
    previousDate.setMonth(previousDate.getMonth() - 1);
    const previousMonth = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;
    const previous = cycleBounds(previousMonth, startDay);
    const elapsed = current ? dayNumber(today) - dayNumber(cycle.start) + 1 : Infinity;
    const prior = transactions.filter(
      (t) =>
        inCycle(t.date, previousMonth, startDay) &&
        dayNumber(t.date) - dayNumber(previous.start) < elapsed,
    );
    const priorExpense = total(prior.filter((t) => t.type === 'expense'));
    const nowExpense = total(
      monthly.filter((t) => t.type === 'expense' && (!current || t.date <= today)),
    );
    if (priorExpense > 0) {
      const delta = round(nowExpense - priorExpense);
      add(
        'change',
        current ? 'Spending pace vs previous cycle' : 'Spending vs previous cycle',
        `${delta >= 0 ? '+' : '-'}${Math.round((Math.abs(delta) / priorExpense) * 100)}%`,
        translate(
          '{{p0}} versus {{p1}}{{p2}}. {{p3}} {{p4}} recorded; missing transactions can affect this comparison.',
          {
            p0: money(nowExpense),
            p1: money(priorExpense),
            p2: current ? ' over the same number of cycle days where available' : '',
            p3: money(Math.abs(delta)),
            p4: delta >= 0 ? 'more' : 'less',
          },
        ),
        delta > 0 ? 'attention' : 'good',
        'Review transactions',
        '/budget/month',
      );
    }
  }
  if (debts.length) {
    const rows = debts.map((d) => ({ debt: d, ...debtSummary(d, transactions, month, startDay) }));
    const remaining = round(rows.reduce((sum, r) => sum + r.closing, 0));
    const projected = round(rows.reduce((sum, r) => sum + r.projected, 0));
    add(
      'debt',
      'Debt after planned payments',
      money(projected),
      translate(
        '{{p0}} remaining at cycle end. All pending debt plans across all dates would reduce this by {{p1}}, before future interest and fees.',
        { p0: money(remaining), p1: money(round(remaining - projected)) },
      ),
      'neutral',
      'Manage debt',
      '/budget/debts',
    );
    if (current) {
      const due = transactions.filter(
        (t) =>
          t.type === 'expense' &&
          debts.some((d) => d.id === t.debtId) &&
          t.paymentStatus === 'planned' &&
          dayNumber(t.date) <= dayNumber(today) + 7,
      );
      if (due.length)
        add(
          'due',
          'Debt payments needing attention',
          money(round(due.reduce((sum, t) => sum + t.amount, 0))),
          translate(
            '{{p0}} unpaid planned payment{{p1}} overdue or due within the next 7 days. Mark payments already made as paid to keep your figures accurate.',
            { p0: due.length, p1: due.length === 1 ? '' : 's' },
          ),
          'attention',
          'Review debt payments',
          '/budget/debts',
        );
    }
    const interest = rows.filter((r) => r.interest > 0).sort((a, b) => b.interest - a.interest)[0];
    if (interest)
      add(
        'interest',
        'Largest estimated card interest',
        money(interest.interest),
        translate(
          '{{p0}}: {{p1}}% annual rate applied to the cycle opening balance. This is a cycle estimate; prior interest and lender fees are excluded.',
          { p0: interest.debt.name, p1: interest.debt.annualInterestRate },
        ),
        'attention',
        'Review debt account',
        '/budget/debts',
      );
  }
  return cards;
}
