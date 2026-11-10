import { TranslatePipe } from '@ngx-translate/core';
import { Component, computed, inject, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RefuelStore } from '../state/refuel-store';
import { VehicleStore } from '../vehicles/state/vehicle-store';
import { FuelChart } from '../components/fuel-chart/fuel-chart';
import { fuelAnalytics } from '../fuel-analytics';
import { FuelLoading } from '../components/fuel-loading/fuel-loading';
@Component({
  selector: 'app-fuel-dashboard',
  imports: [TranslatePipe, FormsModule, RouterLink, FuelChart, FuelLoading],
  templateUrl: './fuel-dashboard.html',
  styleUrl: './fuel-dashboard.css',
})
export class FuelDashboard {
  @Input() insights = false;
  readonly refuels = inject(RefuelStore);
  readonly vehicles = inject(VehicleStore);
  readonly limit = signal(12);
  readonly analytics = computed(() => fuelAnalytics(this.refuels.entries(), this.limit()));
  readonly metric = signal<'consumption' | 'price'>('consumption');
  readonly trend = computed(() => this.analytics()[this.metric()]);
  readonly hasTrend = computed(() => this.trend().some((p) => p.value !== null));
  money(value: number | null): string {
    return value === null
      ? '—'
      : new Intl.NumberFormat('en-ZA', {
          style: 'currency',
          currency: 'ZAR',
          minimumFractionDigits: 2,
        }).format(value);
  }
  number(value: number | null, digits = 1): string {
    return value === null ? '—' : value.toLocaleString('en-ZA', { maximumFractionDigits: digits });
  }
  date(value: string): string {
    return new Date(`${value}T12:00:00`).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
