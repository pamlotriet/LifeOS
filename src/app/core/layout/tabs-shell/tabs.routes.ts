import { Routes } from '@angular/router';
import { authGuard } from '@core/authentication/guards/auth.guard';

export const tabsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('@core/layout/tabs-shell/tabs-shell').then((m) => m.TabsShell),
    children: [
      { path: 'home', loadComponent: () => import('@pages/home/home').then((m) => m.Home) },
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

      {
        path: 'more',
        loadComponent: () => import('@pages/more/more').then((m) => m.More),
        canActivate: [authGuard],
      },
    ],
  },
];
