import { protectFormRoutes } from '@core/forms/form-protection.service';
import { Routes } from '@angular/router';
import { authGuard } from '@core/authentication/guards/auth.guard';

export const gymRoutes: Routes = protectFormRoutes([
  {
    path: '',
    loadComponent: () => import('@pages/gym/gym').then((m) => m.Gym),
    canActivate: [authGuard],
  },
]);
