import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FuelChart } from '@pages/fuel/components/fuel-chart/fuel-chart';
import { fuelAnalytics } from '@pages/fuel/state/analytics/fuel-analytics';
import { RefuelEntry } from '@pages/fuel/state/refuel/refuel.model';

@Component({
  selector: 'app-fuel-monthly-spend-chart',
  imports: [NgTemplateOutlet, TranslatePipe, FuelChart],
  templateUrl: './fuel-monthly-spend-chart.html',
  host: { class: 'block min-w-0' },
})
export class FuelMonthlySpendChart {
  readonly entries = input.required<RefuelEntry[]>();
  readonly analytics = computed(() => fuelAnalytics(this.entries()));
  private readonly currencyFormatter = new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  });

  money(value: number | null): string {
    return value === null ? '\u2014' : this.currencyFormatter.format(value);
  }

  number(value: number | null, digits = 1): string {
    return value === null
      ? '\u2014'
      : value.toLocaleString('en-ZA', { maximumFractionDigits: digits });
  }
}
