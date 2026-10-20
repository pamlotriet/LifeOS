import { Routes } from '@angular/router';
import { Home } from './shared/components/tab-pages/home/home';
import { More } from './shared/components/tab-pages/more/more';
import { authGuard } from './shared/guards/auth.guard';
import { AddCar } from './pages/add-car/add-car';
import { Vehicles } from './pages/vehicles/vehicles';
import { Fuel } from './pages/fuel/fuel';
import { TabsShell } from './shared/components/tabs-shell/tabs-shell';
import { FuelHistory } from './pages/fuel-history/fuel-history';
import { RefuelForm } from './pages/refuel-form/refuel-form';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'today/customise', redirectTo: 'planning', pathMatch: 'full' },
  { path: 'today', redirectTo: 'planning', pathMatch: 'full' },
  { path: 'planning/meals', redirectTo: 'planning', pathMatch: 'full' },
  {
    path: '',
    component: TabsShell,
    children: [
      { path: 'home', component: Home },
      {
        path: 'stats',
        loadComponent: () =>
          import('./shared/components/tab-pages/statistics/statistics').then((m) => m.Statistics),
        canActivate: [authGuard],
      },
      {
        path: 'planning/ingredients',
        loadComponent: () => import('./pages/planning/ingredients').then((m) => m.Ingredients),
        canActivate: [authGuard],
      },
      {
        path: 'planning',
        pathMatch: 'full',
        loadComponent: () => import('./pages/planning/planning-meals').then((m) => m.PlanningMeals),
        canActivate: [authGuard],
      },
      {
        path: 'wheel',
        loadComponent: () =>
          import('./shared/components/tab-pages/reading-wheel/reading-wheel').then(
            (m) => m.ReadingWheel,
          ),
        canActivate: [authGuard],
      },
      { path: 'search', redirectTo: 'wheel' },

      { path: 'more', component: More, canActivate: [authGuard] },
    ],
  },
  { path: 'nutrition/ingredients', redirectTo: 'planning/ingredients', pathMatch: 'full' },

  {
    path: 'nutrition',
    loadComponent: () => import('./pages/nutrition/nutrition').then((m) => m.Nutrition),
    canActivate: [authGuard],
  },
  {
    path: 'gym',
    loadComponent: () => import('./pages/gym/gym').then((m) => m.Gym),
    canActivate: [authGuard],
  },
  {
    path: 'budget',
    loadComponent: () => import('./pages/budget/budget-overview').then((m) => m.BudgetOverview),
    canActivate: [authGuard],
  },

  {
    path: 'fuel',
    component: Fuel,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/fuel-consumptions/fuel-consumptions').then((m) => m.FuelConsumptions),
        pathMatch: 'full',
      },
      { path: 'vehicles', component: Vehicles },
      { path: 'add-car', component: AddCar },
      { path: 'edit-car/:id', component: AddCar },
      {
        path: 'insights',
        loadComponent: () => import('./pages/insights/insights').then((m) => m.Insights),
      },
      { path: 'history', component: FuelHistory },
      { path: 'refuels/add', component: RefuelForm },
      { path: 'refuels/:vehicleId/:id/edit', component: RefuelForm },
    ],
  },
  { path: 'add/car', redirectTo: 'fuel/add-car' },
  {
    path: 'budget/month',
    loadComponent: () => import('./pages/budget/budget-overview').then((m) => m.BudgetOverview),
    data: { monthly: true },
    canActivate: [authGuard],
  },
  {
    path: 'budget/transactions/add',
    loadComponent: () =>
      import('./pages/budget/budget-transaction-form').then((m) => m.BudgetTransactionForm),
    canActivate: [authGuard],
  },
  {
    path: 'budget/transactions/:id/edit',
    loadComponent: () =>
      import('./pages/budget/budget-transaction-form').then((m) => m.BudgetTransactionForm),
    canActivate: [authGuard],
  },
  {
    path: 'budget/planned',
    loadComponent: () => import('./pages/budget/budget-planned').then((m) => m.BudgetPlanned),
    canActivate: [authGuard],
  },
  {
    path: 'budget/comparison',
    loadComponent: () => import('./pages/budget/budget-comparison').then((m) => m.BudgetComparison),
    canActivate: [authGuard],
  },
  {
    path: 'budget/categories',
    loadComponent: () => import('./pages/budget/budget-categories').then((m) => m.BudgetCategories),
    canActivate: [authGuard],
  },
  {
    path: 'budget/debts',
    loadComponent: () => import('./pages/budget/budget-debts').then((m) => m.BudgetDebts),
    canActivate: [authGuard],
  },
  {
    path: 'budget/insights',
    loadComponent: () => import('./pages/budget/budget-insights').then((m) => m.BudgetInsights),
    canActivate: [authGuard],
  },
  { path: 'vehicles', redirectTo: 'fuel/vehicles' },
  {
    path: 'books',
    loadComponent: () => import('./pages/books/books-library').then((m) => m.BooksLibrary),
    canActivate: [authGuard],
  },
  {
    path: 'books/transfer',
    loadComponent: () => import('./pages/books/book-transfer').then((m) => m.BookTransfer),
    canActivate: [authGuard],
  },
  {
    path: 'books/shelf',
    loadComponent: () => import('./pages/books/books-shelf').then((m) => m.BooksShelf),
    canActivate: [authGuard],
  },
  {
    path: 'books/finished',
    loadComponent: () => import('./pages/books/finished-books').then((m) => m.FinishedBooks),
    canActivate: [authGuard],
  },
  {
    path: 'books/scan',
    loadComponent: () => import('./pages/books/book-form').then((m) => m.BookForm),
    data: { scan: true },
    canActivate: [authGuard],
  },
  {
    path: 'books/add',
    loadComponent: () => import('./pages/books/book-form').then((m) => m.BookForm),
    canActivate: [authGuard],
  },
  {
    path: 'books/:id/edit',
    loadComponent: () => import('./pages/books/book-form').then((m) => m.BookForm),
    canActivate: [authGuard],
  },
  {
    path: 'books/tags',
    loadComponent: () => import('./pages/books/book-tags').then((m) => m.BookTags),
    canActivate: [authGuard],
  },
  {
    path: 'recipes',
    loadComponent: () => import('./pages/recipes/recipes').then((m) => m.Recipes),
    canActivate: [authGuard],
  },
  {
    path: 'recipes/add',
    loadComponent: () => import('./pages/recipes/recipe-form').then((m) => m.RecipeForm),
    canActivate: [authGuard],
  },
  {
    path: 'recipes/:id/edit',
    loadComponent: () => import('./pages/recipes/recipe-form').then((m) => m.RecipeForm),
    canActivate: [authGuard],
  },
  {
    path: 'recipes/:id',
    loadComponent: () => import('./pages/recipes/recipe-detail').then((m) => m.RecipeDetail),
    canActivate: [authGuard],
  },

  {
    path: 'passwords',
    loadComponent: () => import('./pages/passwords/passwords').then((m) => m.Passwords),
    canActivate: [authGuard],
  },
  {
    path: 'passwords/settings',
    loadComponent: () =>
      import('./pages/passwords/password-settings').then((m) => m.PasswordSettings),
    canActivate: [authGuard],
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/passwords/password-settings').then((m) => m.PasswordSettings),
    canActivate: [authGuard],
  },
  {
    path: 'passwords/add',
    loadComponent: () => import('./pages/passwords/password-form').then((m) => m.PasswordForm),
    canActivate: [authGuard],
  },
  {
    path: 'passwords/:id/edit',
    loadComponent: () => import('./pages/passwords/password-form').then((m) => m.PasswordForm),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'home', pathMatch: 'full' },
];
