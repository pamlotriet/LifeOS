import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { VehicleStore } from '../../shared/state/vehicles/vehicle-store';
import { FuelLoading } from '../fuel/fuel-loading';

@Component({
  imports: [IonIcon, RouterLink, FuelLoading],
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
