import { Routes } from '@angular/router';
import { authGuard } from '@core/authentication/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'today/customise', redirectTo: 'planning', pathMatch: 'full' },
  { path: 'today', redirectTo: 'planning', pathMatch: 'full' },
  { path: 'planning/meals', redirectTo: 'planning', pathMatch: 'full' },
  {
    path: '',
    loadChildren: () => import('@core/layout/tabs-shell/tabs.routes').then((m) => m.tabsRoutes),
  },
  { path: 'nutrition/ingredients', redirectTo: 'planning/ingredients', pathMatch: 'full' },
  {
    path: 'nutrition',
    loadChildren: () => import('@pages/nutrition/nutrition.routes').then((m) => m.nutritionRoutes),
  },
  {
    path: 'gym',
    loadChildren: () => import('@pages/gym/gym.routes').then((m) => m.gymRoutes),
  },
  {
    path: 'budget',
    loadChildren: () => import('@pages/budget/budget.routes').then((m) => m.budgetRoutes),
  },
  {
    path: 'fuel',
    loadChildren: () => import('@pages/fuel/fuel.routes').then((m) => m.fuelRoutes),
  },
  { path: 'add/car', redirectTo: 'fuel/add-car' },
  { path: 'vehicles', redirectTo: 'fuel/vehicles' },
  {
    path: 'books',
    loadChildren: () => import('@pages/books/books.routes').then((m) => m.booksRoutes),
  },
  {
    path: 'recipes',
    loadChildren: () => import('@pages/recipes/recipes.routes').then((m) => m.recipesRoutes),
  },
  {
    path: 'passwords',
    loadChildren: () => import('@pages/passwords/passwords.routes').then((m) => m.passwordsRoutes),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('@pages/passwords/password-settings/password-settings').then(
        (m) => m.PasswordSettings,
      ),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'home', pathMatch: 'full' },
];
