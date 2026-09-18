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
  carSportOutline,
  cameraOutline,
  pricetagOutline,
  calendarOutline,
  chevronDownOutline,
  cardOutline,
  batteryChargingOutline,
  waterOutline,
  speedometerOutline,
  informationCircleOutline,
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
  carSportOutline,
  cameraOutline,
  pricetagOutline,
  calendarOutline,
  chevronDownOutline,
  cardOutline,
  batteryChargingOutline,
  waterOutline,
  speedometerOutline,
  informationCircleOutline,
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideIonicAngular({ swipeBackEnabled: true }),
  ],
};
