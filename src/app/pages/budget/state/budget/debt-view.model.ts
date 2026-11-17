import {
  BudgetDebt,
  BudgetTransaction,
  debtSummary,
} from '@pages/budget/state/budget/budget.model';
export type DebtOverviewRow = ReturnType<typeof debtSummary> & {
  debt: BudgetDebt;
  history: BudgetTransaction[];
  upcoming: BudgetTransaction[];
};
