import { TranslatePipe } from '@ngx-translate/core';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RefuelStore } from '@pages/fuel/state/refuel/refuel-store';
import { VehicleStore } from '@pages/fuel/vehicles/state/vehicle/vehicle-store';
import { fuelAnalytics } from '@pages/fuel/state/analytics/fuel-analytics';
import { FuelLoading } from '@pages/fuel/components/fuel-loading/fuel-loading';
import { RecentFillUps } from '@pages/fuel/components/recent-fill-ups/recent-fill-ups';
import { FuelConsumptionChart } from '@pages/fuel/components/fuel-consumption-chart/fuel-consumption-chart';
import { FuelMonthlySpendChart } from '@pages/fuel/components/fuel-monthly-spend-chart/fuel-monthly-spend-chart';

interface FuelSummaryCard {
  label: string;
  value: string;
  unit: string;
  description: string;
  params: Record<string, string | number>;
}
@Component({
  selector: 'app-fuel-dashboard',
  imports: [
    TranslatePipe,
    FormsModule,
    RouterLink,
    FuelLoading,
    RecentFillUps,
    FuelConsumptionChart,
    FuelMonthlySpendChart,
  ],
  templateUrl: './fuel-dashboard.html',
  host: { class: 'block min-w-0' },
})
export class FuelDashboard {
  readonly refuels = inject(RefuelStore);
  readonly vehicles = inject(VehicleStore);
  readonly analytics = computed(() => fuelAnalytics(this.refuels.entries()));
  private readonly currencyFormatter = new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  });
  readonly summaryCards = computed((): FuelSummaryCard[] => {
    const { averages, rangeCount, costPerKm, latest, priceChange } = this.analytics();
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
      {
        label: 'Your latest fuel price',
        value: this.money(latest?.randPerLiter ?? null),
        unit: '/L',
        description:
          priceChange === null
            ? 'Add another fill-up to compare prices.'
            : 'messages.count_compared_with_the_previous_fill_up_ffe854',
        params: { p0: this.priceChangeDescription() },
      },
      {
        label: 'Distance & fuel',
        value: this.number(averages.totalRangeKm, 0),
        unit: 'km',
        description: 'messages.count_litres_purchased_across_all_records_weighted_975a7e',
        params: {
          p0: this.number(averages.totalLitres, 1),
          p1: this.number(averages.kmPerLiter),
        },
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
}
