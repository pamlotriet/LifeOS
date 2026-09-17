import { Routes } from '@angular/router';
import { AddContent } from './shared/components/tab-pages/add-content/add-content';
import { Home } from './shared/components/tab-pages/home/home';
import { More } from './shared/components/tab-pages/more/more';
import { Search } from './shared/components/tab-pages/search/search';
import { Statistics } from './shared/components/tab-pages/statistics/statistics';
import { authGuard } from './shared/guards/auth.guard';
import { AddCar } from './pages/add-car/add-car';
import { Vehicles } from './pages/vehicles/vehicles';
import { FuelConsumptions } from './pages/fuel-consumptions/fuel-consumptions';
import { Fuel } from './pages/fuel/fuel';
import { Insights } from './pages/insights/insights';
import { TabsShell } from './shared/components/tabs-shell/tabs-shell';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: '',
    component: TabsShell,
    children: [
      { path: 'home', component: Home },
      { path: 'stats', component: Statistics, canActivate: [authGuard] },
      { path: 'add', component: AddContent, canActivate: [authGuard] },
      { path: 'search', component: Search, canActivate: [authGuard] },
      { path: 'more', component: More, canActivate: [authGuard] },
    ],
  },
  {
    path: 'fuel',
    component: Fuel,
    canActivate: [authGuard],
    children: [
      { path: '', component: FuelConsumptions, pathMatch: 'full' },
      { path: 'vehicles', component: Vehicles },
      { path: 'insights', component: Insights },
    ],
  },
  { path: 'add/car', component: AddCar, canActivate: [authGuard] },
  { path: 'vehicles', redirectTo: 'fuel/vehicles' },
  { path: '**', redirectTo: 'home', pathMatch: 'full' },
];
