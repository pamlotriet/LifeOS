import { BudgetDebt, BudgetTransaction, debtSummary, localDate } from '../budget/budget.model';

export function debtStats(debts: BudgetDebt[], transactions: BudgetTransaction[], months: string[], all = false, today = localDate()) {
  const ids = new Set(debts.map(debt => debt.id));
  const paid = transactions.filter(item => item.type === 'expense' && ids.has(item.debtId ?? '') && item.paymentStatus !== 'planned' && item.date <= today);
  const rows = debts.map(debt => ({ ...debt, ...debtSummary(debt, transactions, today.slice(0, 7)) }));
  const sum = (values: number[]) => Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100;
  const repayments = paid.filter(item => all || months.includes(item.date.slice(0, 7)));
  return {
    rows,
    outstanding: sum(rows.map(row => row.closing)),
    credit: sum(rows.filter(row => row.type === 'credit-card').map(row => row.closing)),
    loans: sum(rows.filter(row => row.type === 'loan').map(row => row.closing)),
    other: sum(rows.filter(row => row.type === 'other').map(row => row.closing)),
    repaid: sum(repayments.map(item => item.amount)),
    planned: sum(rows.map(row => row.planned)),
    monthly: months.map(month => sum(paid.filter(item => item.date.startsWith(month)).map(item => item.amount))),
  };
}
