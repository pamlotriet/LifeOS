import { Routes } from '@angular/router';
import { Home } from '@pages/home/home';
import { More } from '@pages/more/more';
import { authGuard } from '@core/authentication/guards/auth.guard';
import { TabsShell } from '@core/layout/tabs-shell/tabs-shell';

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
        loadComponent: () => import('@pages/statistics/statistics').then((m) => m.Statistics),
        canActivate: [authGuard],
      },
      {
        path: 'planning/ingredients',
        loadComponent: () =>
          import('@pages/planning/ingredients/ingredients').then((m) => m.Ingredients),
        canActivate: [authGuard],
      },
      {
        path: 'planning',
        pathMatch: 'full',
        loadComponent: () =>
          import('@pages/planning/planning-meals/planning-meals').then((m) => m.PlanningMeals),
        canActivate: [authGuard],
      },
      {
        path: 'wheel',
        loadComponent: () =>
          import('@pages/books/reading-wheel/reading-wheel').then((m) => m.ReadingWheel),
        canActivate: [authGuard],
      },
      { path: 'search', redirectTo: 'wheel' },

      { path: 'more', component: More, canActivate: [authGuard] },
    ],
  },
  { path: 'nutrition/ingredients', redirectTo: 'planning/ingredients', pathMatch: 'full' },

  {
    path: 'nutrition/profile',
    loadComponent: () =>
      import('@pages/nutrition/nutrition-profile/nutrition-profile').then(
        (m) => m.NutritionProfile,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'nutrition',
    loadComponent: () => import('@pages/nutrition/nutrition').then((m) => m.Nutrition),
    canActivate: [authGuard],
  },
  {
    path: 'gym',
    loadComponent: () => import('@pages/gym/gym').then((m) => m.Gym),
    canActivate: [authGuard],
  },
  {
    path: 'budget',
    loadComponent: () =>
      import('@pages/budget/budget-overview/budget-overview').then((m) => m.BudgetOverview),
    canActivate: [authGuard],
  },

  {
    path: 'fuel',
    loadComponent: () => import('@pages/fuel/fuel').then((m) => m.Fuel),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@pages/fuel/consumptions/fuel-consumptions').then((m) => m.FuelConsumptions),
        pathMatch: 'full',
      },
      {
        path: 'vehicles',
        loadComponent: () => import('@pages/fuel/vehicles/vehicles').then((m) => m.Vehicles),
      },
      {
        path: 'add-car',
        loadComponent: () => import('@pages/fuel/add-car/add-car').then((m) => m.AddCar),
      },
      {
        path: 'edit-car/:id',
        loadComponent: () => import('@pages/fuel/add-car/add-car').then((m) => m.AddCar),
      },
      {
        path: 'insights',
        loadComponent: () => import('@pages/fuel/insights/insights').then((m) => m.Insights),
      },
      {
        path: 'history',
        loadComponent: () => import('@pages/fuel/history/fuel-history').then((m) => m.FuelHistory),
      },
      {
        path: 'refuels/add',
        loadComponent: () =>
          import('@pages/fuel/refuel-form/refuel-form').then((m) => m.RefuelForm),
      },
      {
        path: 'refuels/:vehicleId/:id/edit',
        loadComponent: () =>
          import('@pages/fuel/refuel-form/refuel-form').then((m) => m.RefuelForm),
      },
    ],
  },
  { path: 'add/car', redirectTo: 'fuel/add-car' },
  {
    path: 'budget/month',
    loadComponent: () =>
      import('@pages/budget/budget-overview/budget-overview').then((m) => m.BudgetOverview),
    data: { monthly: true },
    canActivate: [authGuard],
  },
  {
    path: 'budget/transactions/add',
    loadComponent: () =>
      import('@pages/budget/budget-transaction-form/budget-transaction-form').then(
        (m) => m.BudgetTransactionForm,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'budget/transactions/:id/edit',
    loadComponent: () =>
      import('@pages/budget/budget-transaction-form/budget-transaction-form').then(
        (m) => m.BudgetTransactionForm,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'budget/planned',
    loadComponent: () =>
      import('@pages/budget/budget-planned/budget-planned').then((m) => m.BudgetPlanned),
    canActivate: [authGuard],
  },
  {
    path: 'budget/comparison',
    loadComponent: () =>
      import('@pages/budget/budget-comparison/budget-comparison').then((m) => m.BudgetComparison),
    canActivate: [authGuard],
  },
  {
    path: 'budget/categories',
    loadComponent: () =>
      import('@pages/budget/budget-categories/budget-categories').then((m) => m.BudgetCategories),
    canActivate: [authGuard],
  },
  {
    path: 'budget/debts',
    loadComponent: () =>
      import('@pages/budget/budget-debts/budget-debts').then((m) => m.BudgetDebts),
    canActivate: [authGuard],
  },
  {
    path: 'budget/insights',
    loadComponent: () =>
      import('@pages/budget/budget-insights/budget-insights').then((m) => m.BudgetInsights),
    canActivate: [authGuard],
  },
  { path: 'vehicles', redirectTo: 'fuel/vehicles' },
  {
    path: 'books',
    loadComponent: () =>
      import('@pages/books/books-library/books-library').then((m) => m.BooksLibrary),
    canActivate: [authGuard],
  },
  {
    path: 'books/transfer',
    loadComponent: () =>
      import('@pages/books/book-transfer/book-transfer').then((m) => m.BookTransfer),
    canActivate: [authGuard],
  },
  {
    path: 'books/shelf',
    loadComponent: () => import('@pages/books/books-shelf/books-shelf').then((m) => m.BooksShelf),
    canActivate: [authGuard],
  },
  {
    path: 'books/finished',
    loadComponent: () =>
      import('@pages/books/finished-books/finished-books').then((m) => m.FinishedBooks),
    canActivate: [authGuard],
  },
  {
    path: 'books/scan',
    loadComponent: () => import('@pages/books/book-form/book-form').then((m) => m.BookForm),
    data: { scan: true },
    canActivate: [authGuard],
  },
  {
    path: 'books/add',
    loadComponent: () => import('@pages/books/book-form/book-form').then((m) => m.BookForm),
    canActivate: [authGuard],
  },
  {
    path: 'books/:id/edit',
    loadComponent: () => import('@pages/books/book-form/book-form').then((m) => m.BookForm),
    canActivate: [authGuard],
  },
  {
    path: 'books/tags',
    loadComponent: () => import('@pages/books/book-tags/book-tags').then((m) => m.BookTags),
    canActivate: [authGuard],
  },
  {
    path: 'recipes',
    loadComponent: () => import('@pages/recipes/recipes').then((m) => m.Recipes),
    canActivate: [authGuard],
  },
  {
    path: 'recipes/add',
    loadComponent: () => import('@pages/recipes/recipe-form/recipe-form').then((m) => m.RecipeForm),
    canActivate: [authGuard],
  },
  {
    path: 'recipes/:id/edit',
    loadComponent: () => import('@pages/recipes/recipe-form/recipe-form').then((m) => m.RecipeForm),
    canActivate: [authGuard],
  },
  {
    path: 'recipes/:id',
    loadComponent: () =>
      import('@pages/recipes/recipe-detail/recipe-detail').then((m) => m.RecipeDetail),
    canActivate: [authGuard],
  },

  {
    path: 'passwords',
    loadComponent: () => import('@pages/passwords/passwords').then((m) => m.Passwords),
    canActivate: [authGuard],
  },
  {
    path: 'passwords/settings',
    loadComponent: () =>
      import('@pages/passwords/password-settings/password-settings').then(
        (m) => m.PasswordSettings,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('@pages/passwords/password-settings/password-settings').then(
        (m) => m.PasswordSettings,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'passwords/add',
    loadComponent: () =>
      import('@pages/passwords/password-form/password-form').then((m) => m.PasswordForm),
    canActivate: [authGuard],
  },
  {
    path: 'passwords/:id/edit',
    loadComponent: () =>
      import('@pages/passwords/password-form/password-form').then((m) => m.PasswordForm),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'home', pathMatch: 'full' },
];
