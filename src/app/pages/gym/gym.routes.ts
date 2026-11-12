import { Routes } from '@angular/router';
import { authGuard } from '@core/authentication/guards/auth.guard';

export const gymRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('@pages/gym/gym').then((m) => m.Gym),
    canActivate: [authGuard],
  },
];
