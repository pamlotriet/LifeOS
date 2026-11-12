import { Routes } from '@angular/router';
import { authGuard } from '@core/authentication/guards/auth.guard';

export const passwordsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('@pages/passwords/passwords').then((m) => m.Passwords),
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
    path: 'add',
    loadComponent: () =>
      import('@pages/passwords/password-form/password-form').then((m) => m.PasswordForm),
    canActivate: [authGuard],
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('@pages/passwords/password-form/password-form').then((m) => m.PasswordForm),
    canActivate: [authGuard],
  },
];
