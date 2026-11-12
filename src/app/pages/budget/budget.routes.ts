import { Routes } from '@angular/router';
import { authGuard } from '@core/authentication/guards/auth.guard';

export const budgetRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@pages/budget/budget-overview/budget-overview').then((m) => m.BudgetOverview),
    canActivate: [authGuard],
  },
  {
    path: 'month',
    loadComponent: () =>
      import('@pages/budget/budget-overview/budget-overview').then((m) => m.BudgetOverview),
    data: { monthly: true },
    canActivate: [authGuard],
  },
  {
    path: 'transactions/add',
    loadComponent: () =>
      import('@pages/budget/budget-transaction-form/budget-transaction-form').then(
        (m) => m.BudgetTransactionForm,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'transactions/:id/edit',
    loadComponent: () =>
      import('@pages/budget/budget-transaction-form/budget-transaction-form').then(
        (m) => m.BudgetTransactionForm,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'planned',
    loadComponent: () =>
      import('@pages/budget/budget-planned/budget-planned').then((m) => m.BudgetPlanned),
    canActivate: [authGuard],
  },
  {
    path: 'comparison',
    loadComponent: () =>
      import('@pages/budget/budget-comparison/budget-comparison').then((m) => m.BudgetComparison),
    canActivate: [authGuard],
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('@pages/budget/budget-categories/budget-categories').then((m) => m.BudgetCategories),
    canActivate: [authGuard],
  },
  {
    path: 'debts',
    loadComponent: () =>
      import('@pages/budget/budget-debts/budget-debts').then((m) => m.BudgetDebts),
    canActivate: [authGuard],
  },
  {
    path: 'insights',
    loadComponent: () =>
      import('@pages/budget/budget-insights/budget-insights').then((m) => m.BudgetInsights),
    canActivate: [authGuard],
  },
];
