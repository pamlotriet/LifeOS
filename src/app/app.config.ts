import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  home,
  settings,
  add,
  statsChart,
  search,
  grid,
  ellipsisVertical,
  logoGoogle,
} from 'ionicons/icons';
import { routes } from './app.routes';

addIcons({ home, settings, add, statsChart, search, grid, ellipsisVertical, logoGoogle });

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideRouter(routes), provideIonicAngular()],
};
