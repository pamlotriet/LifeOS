import { TranslatePipe } from '@ngx-translate/core';
import { FuelDashboard } from '@pages/fuel/fuel-dashboard/fuel-dashboard';
import { Vehicles } from '@pages/fuel/vehicles/vehicles';
import { BackButton } from '@shared/components/back-button/back-button';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { IonContent } from '@ionic/angular/ion-content';
import { filter, map } from 'rxjs';
@Component({
  selector: 'app-fuel',
  imports: [
    TranslatePipe,
    FuelDashboard,
    Vehicles,
    BackButton,
    IonContent,
    RouterLink,
    RouterOutlet,
  ],
  templateUrl: './fuel.html',
  host: { class: 'block min-w-0' },
})
export class Fuel {
  private readonly router = inject(Router);

  isEditor(): boolean {
    return /\/(add-car|edit-car|refuels)(\/|$)/.test(this.selected());
  }

  readonly sections = [
    { route: '/fuel', label: 'Overview' },
    { route: '/fuel/vehicles', label: 'Vehicles' },
    { route: '/fuel/history', label: 'Fill-up history' },
  ];

  readonly selected = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url.split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );
}
