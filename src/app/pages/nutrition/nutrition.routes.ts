import { Routes } from '@angular/router';
import { authGuard } from '@core/authentication/guards/auth.guard';

export const nutritionRoutes: Routes = [
  {
    path: 'profile',
    loadComponent: () =>
      import('@pages/nutrition/nutrition-profile/nutrition-profile').then(
        (m) => m.NutritionProfile,
      ),
    canActivate: [authGuard],
  },
  {
    path: '',
    loadComponent: () => import('@pages/nutrition/nutrition').then((m) => m.Nutrition),
    canActivate: [authGuard],
  },
];
