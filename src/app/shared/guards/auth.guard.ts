import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../state/authentication/authentication.service';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated() || router.createUrlTree(['/']);
};
