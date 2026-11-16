import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AppButton } from '@shared/components/app-button/app-button';
import { FuelChart } from '@pages/fuel/components/fuel-chart/fuel-chart';
import { fuelAnalytics } from '@pages/fuel/state/analytics/fuel-analytics';
import { RefuelEntry } from '@pages/fuel/state/refuel/refuel.model';

@Component({
  selector: 'app-fuel-consumption-chart',
  imports: [NgTemplateOutlet, FormsModule, TranslatePipe, AppButton, FuelChart],
  templateUrl: './fuel-consumption-chart.html',
  host: { class: 'block min-w-0' },
})
export class FuelConsumptionChart {
  readonly entries = input.required<RefuelEntry[]>();
  readonly limit = signal(12);
  readonly metric = signal<'consumption' | 'price'>('consumption');
  readonly analytics = computed(() => fuelAnalytics(this.entries(), this.limit()));
  readonly trend = computed(() => this.analytics()[this.metric()]);
  readonly hasTrend = computed(() => this.trend().some((point) => point.value !== null));
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
