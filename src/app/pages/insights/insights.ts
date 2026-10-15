import { Component } from '@angular/core';
import { FuelDashboard } from '../fuel/fuel-dashboard';
@Component({selector:'app-insights',imports:[FuelDashboard],template:'<app-fuel-dashboard [insights]="true" />'})
export class Insights {}
