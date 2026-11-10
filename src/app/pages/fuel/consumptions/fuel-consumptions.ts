import { Component } from '@angular/core';
import { FuelDashboard } from '@pages/fuel/fuel-dashboard/fuel-dashboard';
@Component({
  selector: 'app-fuel-consumptions',
  imports: [FuelDashboard],
  template: '<app-fuel-dashboard />',
})
export class FuelConsumptions {}
