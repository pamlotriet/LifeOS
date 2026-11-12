import { Routes } from '@angular/router';
import { authGuard } from '@core/authentication/guards/auth.guard';

export const recipesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('@pages/recipes/recipes').then((m) => m.Recipes),
    canActivate: [authGuard],
  },
  {
    path: 'add',
    loadComponent: () => import('@pages/recipes/recipe-form/recipe-form').then((m) => m.RecipeForm),
    canActivate: [authGuard],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('@pages/recipes/recipe-form/recipe-form').then((m) => m.RecipeForm),
    canActivate: [authGuard],
  },
  {
    path: ':id',
    loadComponent: () =>
      import('@pages/recipes/recipe-detail/recipe-detail').then((m) => m.RecipeDetail),
    canActivate: [authGuard],
  },
];
