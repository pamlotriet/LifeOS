import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { VehicleStore } from '../../shared/state/vehicles/vehicle-store';

@Component({
  imports: [IonIcon, RouterLink],
  selector: 'app-vehicles',
  styleUrl: './vehicles.css',
  templateUrl: './vehicles.html',
})
export class Vehicles {
  readonly vehicles = inject(VehicleStore).vehicles;
}
