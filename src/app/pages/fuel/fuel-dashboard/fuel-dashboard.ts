import { NgTemplateOutlet } from '@angular/common';
import { AppButton } from '@shared/components/app-button/app-button';
import { TranslatePipe } from '@ngx-translate/core';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RefuelStore } from '@pages/fuel/state/refuel/refuel-store';
import { VehicleStore } from '@pages/fuel/vehicles/state/vehicle/vehicle-store';
import { FuelChart } from '@pages/fuel/components/fuel-chart/fuel-chart';
import { fuelAnalytics } from '@pages/fuel/state/analytics/fuel-analytics';
import { FuelLoading } from '@pages/fuel/components/fuel-loading/fuel-loading';
@Component({
  selector: 'app-fuel-dashboard',
  imports: [
    NgTemplateOutlet,
    AppButton,
    TranslatePipe,
    FormsModule,
    RouterLink,
    FuelChart,
    FuelLoading,
  ],
  templateUrl: './fuel-dashboard.html',
  host: { class: 'block min-w-0' },
})
export class FuelDashboard {
  readonly refuels = inject(RefuelStore);
  readonly vehicles = inject(VehicleStore);
  readonly limit = signal(12);
  readonly analytics = computed(() => fuelAnalytics(this.refuels.entries(), this.limit()));
  readonly metric = signal<'consumption' | 'price'>('consumption');
  readonly trend = computed(() => this.analytics()[this.metric()]);
  readonly hasTrend = computed(() => this.trend().some((p) => p.value !== null));
  private readonly currencyFormatter = new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  });
  readonly summaryCards = computed(() => {
    const { averages, rangeCount, costPerKm } = this.analytics();
    return [
      {
        label: 'Logged fuel spend',
        value: this.money(averages.totalSpent),
        unit: '',
        description: 'messages.count_fill_ups_all_records_95e2c5',
        params: { p0: this.refuels.entries().length },
      },
      {
        label: 'Average price / litre',
        value: this.money(averages.randPerLiter),
        unit: '',
        description: 'Weighted by litres purchased',
        params: {},
      },
      {
        label: 'Consumption',
        value: this.number(averages.litersPer100Km),
        unit: 'L/100 km',
        description: 'messages.count_fill_ups_with_distance_6738f1',
        params: { p0: rangeCount },
      },
      {
        label: 'Estimated cost / km',
        value: this.money(costPerKm),
        unit: '',
        description: 'For fill-ups with known distance',
        params: {},
      },
    ];
  });
  readonly priceChangeDescription = computed(() => {
    const change = this.analytics().priceChange;
    if (change === null) return '';
    return change === 0
      ? 'Unchanged'
      : this.number(Math.abs(change), 1) + '% ' + (change > 0 ? 'higher' : 'lower');
  });
  money(value: number | null): string {
    return value === null ? '\u2014' : this.currencyFormatter.format(value);
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
