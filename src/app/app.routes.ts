import { Routes } from '@angular/router';
import { AddContent } from './shared/components/tab-pages/add-content/add-content';
import { Home } from './shared/components/tab-pages/home/home';
import { More } from './shared/components/tab-pages/more/more';
import { Search } from './shared/components/tab-pages/search/search';
import { Statistics } from './shared/components/tab-pages/statistics/statistics';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: Home },
  { path: 'stats', component: Statistics, canActivate: [authGuard] },
  { path: 'add', component: AddContent, canActivate: [authGuard] },
  { path: 'search', component: Search, canActivate: [authGuard] },
  { path: 'more', component: More, canActivate: [authGuard] },
  { path: '**', redirectTo: 'home', pathMatch: 'full' },
];
