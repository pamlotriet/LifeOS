import { Component } from '@angular/core';
import { FuelDashboard } from '@pages/fuel/fuel-dashboard/fuel-dashboard';
@Component({
  selector: 'app-insights',
  imports: [FuelDashboard],
  template: '<app-fuel-dashboard [insights]="true" />',
})
export class Insights {}
