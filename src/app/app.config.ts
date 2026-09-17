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
  car,
  wallet,
  book,
  calendar,
  lockClosed,
  heart,
  chevronForward,
  chevronBack,
  build,
  camera,
} from 'ionicons/icons';
import { routes } from './app.routes';

addIcons({
  home,
  settings,
  add,
  statsChart,
  search,
  grid,
  ellipsisVertical,
  logoGoogle,
  car,
  wallet,
  book,
  calendar,
  lockClosed,
  heart,
  chevronForward,
  chevronBack,
  build,
  camera,
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideIonicAngular({ swipeBackEnabled: true }),
  ],
};
