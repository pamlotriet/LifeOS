import { Injector, signal } from '@angular/core';
import { AuthService } from '@core/authentication/authentication.service';
import { TranslateService } from '@ngx-translate/core';
import { money } from '@pages/budget/state/budget/budget.model';
import {
  calculateRefuels,
  refuelAverages,
  RefuelEntry,
} from '@pages/fuel/state/refuel/refuel.model';
import { RefuelService } from '@pages/fuel/state/refuel/refuel.service';
import { VehicleStore } from '@pages/fuel/vehicles/state/vehicle/vehicle-store';
import {
  statsAnchor,
  statsMonths,
  sumByMonth,
} from '@pages/statistics/state/overview/stats.calculations';

import { chartOptions, kpi, labels } from '@pages/statistics/state/overview/stats-charts';
import type { StatsDashboard, StatsRange } from '@pages/statistics/state/overview/stats.model';
export class FuelStats {
  constructor(
    private readonly injector: Injector,
    private readonly i18n: TranslateService,
  ) {}
  private readonly fuelEntries = signal<RefuelEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  private fuelVersion = 0;
  readonly selectedVehicleId = signal('all');
  private get vehicles(): VehicleStore {
    return this.injector.get(VehicleStore);
  }
  async ensureFuelLoaded(): Promise<void> {
    const uid = this.injector.get(AuthService).userId();
    const options = this.vehicles.vehicles();
    const version = ++this.fuelVersion;
    this.fuelEntries.set([]);
    this.error.set('');
    this.loading.set(!!uid && !!options.length);
    if (!uid || !options.length) return;
    try {
      const service = this.injector.get(RefuelService);
      const groups = await Promise.all(
        options.map(async (vehicle) => calculateRefuels(await service.list(vehicle.id))),
      );
      if (version === this.fuelVersion && this.injector.get(AuthService).userId() === uid)
        this.fuelEntries.set(groups.flat());
    } catch {
      if (version === this.fuelVersion)
        this.error.set('Could not load vehicle statistics. Please try again.');
    } finally {
      if (version === this.fuelVersion) this.loading.set(false);
    }
  }
  vehicleOptions() {
    return this.vehicles.vehicles();
  }
  selectVehicle(id: string): void {
    if (id === 'all' || this.vehicleOptions().some((vehicle) => vehicle.id === id))
      this.selectedVehicleId.set(id);
  }
  dashboard(range: StatsRange, selectedMonth?: string): StatsDashboard {
    const all = this.fuelEntries().filter(
      (entry) => this.selectedVehicleId() === 'all' || entry.vehicleId === this.selectedVehicleId(),
    );
    const allowed = new Set(statsMonths(range, statsAnchor(range, selectedMonth)));
    const entries = range === 'All' ? all : all.filter((x) => allowed.has(x.dop.slice(0, 7)));
    const averages = refuelAverages(entries);
    const spendByMonth = sumByMonth(
      entries,
      (x) => x.dop,
      (x) => x.amountPaid,
    );
    const spendMonths = statsMonths(range, statsAnchor(range, selectedMonth));
    const economy = entries
      .filter((x) => x.kmPerLiter !== null)
      .sort((a, b) => a.dop.localeCompare(b.dop) || a.odometer - b.odometer);
    const labelsFor = economy.map((x) =>
      new Date(`${x.dop}T12:00:00`).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }),
    );
    return {
      empty: !entries.length,
      emptyTitle: 'No refuels in this period',
      emptyMessage: 'Choose another period or vehicle, or log a refuel to see your statistics.',
      action: '/fuel/history',
      kpis: [
        kpi('Fuel spend', money(averages.totalSpent), 'cash', '#9e7eb5'),
        kpi(
          'Distance tracked',
          this.i18n.instant('{{p0}} km', {
            p0: Math.round(averages.totalRangeKm).toLocaleString('en-ZA'),
          }),
          'speedometer-outline',
          '#20b875',
        ),
        kpi(
          'Average consumption',
          averages.litersPer100Km
            ? this.i18n.instant('{{p0}} L/100 km', { p0: averages.litersPer100Km.toFixed(1) })
            : 'N/A',
          'water-outline',
          '#9e7eb5',
        ),
        kpi(
          'Fuel cost / km',
          averages.totalRangeKm > 0
            ? this.i18n.instant('{{p0}} / km', {
                p0: money(
                  entries
                    .filter((x) => x.rangeKm !== null)
                    .reduce((sum, x) => sum + x.amountPaid, 0) / averages.totalRangeKm,
                ),
              })
            : 'N/A',
          'cash',
          '#9e7eb5',
        ),
        kpi('Fuel purchased', `${averages.totalLitres.toFixed(1)} L`, 'water-outline', '#9e7eb5'),
        kpi(
          'Average fuel price',
          averages.randPerLiter !== null ? `${money(averages.randPerLiter)} / L` : 'N/A',
          'cash',
          '#20b875',
        ),
        kpi('Refuels', String(entries.length), 'car-sport-outline', '#c4a4da'),
        kpi(
          'Average refill cost',
          entries.length ? money(averages.totalSpent / entries.length) : 'N/A',
          'cash',
          '#9e7eb5',
        ),
      ],
      primaryTitle: 'Fuel efficiency by vehicle (km/L)',
      secondaryTitle: 'Monthly fuel spend',
      primary: {
        type: 'line',
        data: {
          labels: labelsFor,
          datasets: this.vehicleOptions()
            .filter(
              (vehicle) =>
                this.selectedVehicleId() === 'all' || vehicle.id === this.selectedVehicleId(),
            )
            .map((vehicle, index) => ({
              label: `${vehicle.name} (${vehicle.registration})`,
              data: economy.map((entry) =>
                entry.vehicleId === vehicle.id ? entry.kmPerLiter : null,
              ),
              borderColor: ['#c4a4da', '#9e7eb5', '#7f5d99', '#4c2365'][index % 4],
              tension: 0.25,
              spanGaps: true,
            })),
        },
        options: chartOptions(),
      },
      secondary: {
        type: 'bar',
        data: {
          labels: labels(spendMonths),
          datasets: [
            {
              label: 'Spend',
              data: spendMonths.map((month) => spendByMonth.get(month) ?? 0),
              backgroundColor: '#9e7eb5',
              borderRadius: 6,
            },
          ],
        },
        options: chartOptions(true),
      },
      insight: this.i18n.instant(
        'All figures follow the selected vehicle and period. Consumption and fuel cost/km use only refuels with a known distance ({{p0}} of {{p1}}). Distances are calculated separately for each car before filtering by refuel date; intervals may start before the period. Economy uses total distance and litres, based on recorded refills, and assumes consistent filling. {{p2}}',
        {
          p0: economy.length,
          p1: entries.length,
          p2:
            range === 'All'
              ? 'Spending chart shows the latest 24 months; totals include all records.'
              : '',
        },
      ),
    };
  }
}
