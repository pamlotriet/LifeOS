import { Routes } from '@angular/router';
import { authGuard } from '@core/authentication/guards/auth.guard';

export const fuelRoutes: Routes = [
  {
    path: '',
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
];
