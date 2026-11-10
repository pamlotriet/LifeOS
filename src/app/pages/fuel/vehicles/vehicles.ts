import { TranslatePipe } from '@ngx-translate/core';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { VehicleStore } from '@pages/fuel/vehicles/state/vehicle-store';
import { FuelLoading } from '@pages/fuel/components/fuel-loading/fuel-loading';

@Component({
  imports: [TranslatePipe, IonIcon, RouterLink, FuelLoading],
  selector: 'app-vehicles',
  styleUrl: './vehicles.css',
  templateUrl: './vehicles.html',
})
export class Vehicles {
  private readonly store = inject(VehicleStore);
  readonly vehicles = this.store.vehicles;
  readonly loading = this.store.loading;
  readonly error = this.store.error;

  reload(): void {
    void this.store.reload();
  }
}
