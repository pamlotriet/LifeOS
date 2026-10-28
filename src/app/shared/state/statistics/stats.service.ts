import { buildBookStats, BookStatsDetail } from './book-stats';
import { cycleBounds } from '../budget/budget-cycle';
import { NutritionService } from '../nutrition/nutrition.service';
import { nutritionStats } from '../nutrition/nutrition.calculations';
import { budgetSpending } from '../../../pages/budget/budget-snapshot';
import { inject, Injectable, Injector, signal } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { BookStore } from '../books/book-store';
import { BudgetStore } from '../budget/budget.store';
import { localDate, money, summary } from '../budget/budget.model';
import { AuthService } from '../authentication/authentication.service';
import { RefuelService } from '../refuels/refuel.service';
import { calculateRefuels, RefuelEntry, refuelAverages } from '../refuels/refuel.model';
import { VehicleStore } from '../vehicles/vehicle-store';
import { statsAnchor, statsMonths, sumByMonth } from './stats.calculations';
import { debtStats } from './debt-stats';

export type StatsModule = 'fuel' | 'books' | 'budget' | 'nutrition';
export type StatsRange = '1M' | '3M' | '6M' | '1Y' | 'All';
export interface StatsModuleOption {
  id: StatsModule;
  label: string;
  icon: string;
}
export interface StatsKpi {
  label: string;
  value: string;
  icon: string;
  accent: string;
}
export interface StatsDashboard {
  books?: BookStatsDetail;
  spending?: Array<{
    id: string;
    name: string;
    colour: string;
    amount: number;
    percent: number;
    formatted: string;
  }>;
  debt?: {
    kpis: StatsKpi[];
    balances: ChartConfiguration;
    repayments: ChartConfiguration;
    empty: boolean;
    cycleLabel: string;
  };
  kpis: StatsKpi[];
  primary: ChartConfiguration;
  secondary: ChartConfiguration;
  primaryTitle: string;
  secondaryTitle: string;
  insight: string;
  empty: boolean;
  emptyTitle: string;
  emptyMessage: string;
  action?: string;
}

export const STATS_MODULES: StatsModuleOption[] = [
  { id: 'nutrition', label: 'Nutrition', icon: 'restaurant-outline' },
  { id: 'fuel', label: 'Fuel', icon: 'car-sport-outline' },
  { id: 'books', label: 'Books', icon: 'book' },
  { id: 'budget', label: 'Budget', icon: 'wallet' },
];

const chartOptions = (currency = false): ChartConfiguration['options'] => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: { labels: { color: '#b5cbe2', usePointStyle: true, boxWidth: 8 } },
    tooltip: {
      callbacks: {
        label: (c) =>
          `${c.dataset.label}: ${currency ? money(Number(c.raw)) : Number(c.raw).toFixed(1)}`,
      },
    },
  },
  scales: {
    x: { ticks: { color: '#b5cbe2' }, grid: { color: '#315b7e55' }, border: { color: '#315b7e' } },
    y: {
      beginAtZero: true,
      ticks: {
        color: '#b5cbe2',
        callback: currency ? (value) => `R${Number(value).toLocaleString('en-ZA')}` : undefined,
      },
      grid: { color: '#315b7e55' },
      border: { color: '#315b7e' },
    },
  },
});
const labels = (values: string[]) =>
  values.map((value) =>
    new Date(`${value}-01T12:00:00`).toLocaleDateString('en-ZA', { month: 'short' }),
  );
const categoryChart = (
  title: string,
  rows: Array<{ label: string; value: number }>,
): ChartConfiguration => ({
  type: 'doughnut',
  data: {
    labels: rows.map((x) => x.label),
    datasets: [
      {
        label: title,
        data: rows.map((x) => x.value),
        backgroundColor: ['#14ddea', '#2497ff', '#7b3cff', '#c23cff', '#20b875', '#efa62b'],
        borderWidth: 0,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { labels: { color: '#b5cbe2', usePointStyle: true, boxWidth: 8 } },
      tooltip: {
        callbacks: { label: (c) => `${c.label}: ${Number(c.raw).toLocaleString('en-ZA')}` },
      },
    },
  },
});

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly injector = inject(Injector);
  private readonly fuelEntries = signal<RefuelEntry[]>([]);
  private readonly fuelLoading = signal(false);
  private readonly fuelError = signal('');
  private fuelVersion = 0;
  readonly selectedVehicleId = signal('all');
  /** Stores are resolved on demand so opening Fuel Stats does not load every LifeOS module. */
  private get nutrition(): NutritionService {
    return this.injector.get(NutritionService);
  }
  private get books(): BookStore {
    return this.injector.get(BookStore);
  }
  private get budget(): BudgetStore {
    return this.injector.get(BudgetStore);
  }
  private get vehicles(): VehicleStore {
    return this.injector.get(VehicleStore);
  }

  dashboard(module: StatsModule, range: StatsRange, selectedMonth?: string): StatsDashboard {
    switch (module) {
      case 'nutrition':
        return this.nutritionDashboard(range, selectedMonth);
      case 'fuel':
        return this.fuel(range, selectedMonth);
      case 'books':
        return this.bookStats(range, selectedMonth);
      case 'budget':
        return this.budgetStats(range, selectedMonth);
    }
  }
  loading(module: StatsModule): boolean {
    if (module === 'nutrition') return this.nutrition.loading();
    return module === 'fuel'
      ? this.fuelLoading() || this.vehicles.loading()
      : module === 'books'
        ? this.books.loading()
        : this.budget.loading();
  }
  error(module: StatsModule): string {
    if (module === 'nutrition') return this.nutrition.error();
    return module === 'fuel'
      ? this.fuelError() || this.vehicles.error()
      : module === 'books'
        ? this.books.error()
        : this.budget.error();
  }
  reload(module: StatsModule): void {
    if (module === 'nutrition') {
      void this.nutrition.reload();
      return;
    }
    if (module === 'fuel') {
      void this.vehicles.reload();
      void this.ensureFuelLoaded();
    } else if (module === 'books') void this.books.reload();
    else void this.budget.reload();
  }
  async ensureFuelLoaded(): Promise<void> {
    const uid = this.injector.get(AuthService).userId();
    const options = this.vehicles.vehicles();
    const version = ++this.fuelVersion;
    this.fuelEntries.set([]);
    this.fuelError.set('');
    this.fuelLoading.set(!!uid && !!options.length);
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
        this.fuelError.set('Could not load vehicle statistics. Please try again.');
    } finally {
      if (version === this.fuelVersion) this.fuelLoading.set(false);
    }
  }
  vehicleOptions() {
    return this.vehicles.vehicles();
  }
  selectVehicle(id: string): void {
    if (id === 'all' || this.vehicleOptions().some((vehicle) => vehicle.id === id))
      this.selectedVehicleId.set(id);
  }

  nutritionStart = '';
  nutritionEnd = '';
  private nutritionDashboard(range: StatsRange, selectedMonth?: string): StatsDashboard {
    const months = new Set(statsMonths(range, statsAnchor(range, selectedMonth)));
    const logs = this.nutrition
      .logs()
      .filter(
        (l) =>
          (range === 'All' || months.has(l.date.slice(0, 7))) &&
          (range === '1M' || !this.nutritionStart || l.date >= this.nutritionStart) &&
          (range === '1M' || !this.nutritionEnd || l.date <= this.nutritionEnd),
      );
    const stats = nutritionStats(logs);
    const weekTotals = new Map<string, number>();
    for (const d of stats.daily) {
      const date = new Date(`${d.date}T12:00:00`);
      date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      weekTotals.set(key, (weekTotals.get(key) ?? 0) + d.nutrition.calories);
    }
    const kpi = (label: string, value: string): StatsKpi => ({
      label,
      value,
      icon: 'restaurant-outline',
      accent: '#14ddea',
    });
    const target = this.nutrition.profile().targets;
    return {
      empty: !stats.daily.length,
      emptyTitle: 'No consumption recorded',
      emptyMessage: 'Log food eaten to see nutrition trends. Planned meals are excluded.',
      action: '/nutrition',
      kpis: [
        kpi('Total consumed', `${Math.round(stats.total.calories)} kcal`),
        kpi('Average calories / logged day', `${Math.round(stats.average.calories)} kcal`),
        ...(['protein', 'carbs', 'fat'] as const).map((key) =>
          kpi(
            `Average ${key}`,
            `${stats.average[key].toFixed(1)} g${target[key] > 0 ? ` | ${((stats.average[key] / target[key]) * 100).toFixed(0)}% current goal` : ''}`,
          ),
        ),
        kpi('Days within recorded calorie goal', String(stats.daysMeetingGoal)),
      ],
      primaryTitle: 'Daily calorie consumption',
      secondaryTitle: 'Weekly calories (week starting Monday)',
      primary: {
        type: 'bar',
        data: {
          labels: stats.daily.slice(-31).map((d) => d.date.slice(5)),
          datasets: [
            {
              label: 'Consumed kcal',
              data: stats.daily.slice(-31).map((d) => d.nutrition.calories),
              backgroundColor: '#14ddea',
            },
            {
              label: 'Recorded goal',
              data: stats.daily.slice(-31).map((d) => d.goal?.calories ?? null),
              backgroundColor: '#7b3cff',
            },
          ],
        },
        options: chartOptions(),
      },
      secondary: {
        type: 'bar',
        data: {
          labels: [...weekTotals.keys()].slice(-16),
          datasets: [
            {
              label: 'Consumed kcal',
              data: [...weekTotals.values()].slice(-16),
              backgroundColor: '#2497ff',
            },
          ],
        },
        options: chartOptions(),
      },
      insight: `${stats.daily.length} logged days. Averages exclude days without logs. Days within goal means consumed calories at or below that day's recorded goal; older entries without goal snapshots are excluded from goal comparisons. Charts show the latest 31 logged days and 16 weeks in the selected range.`,
    };
  }
  private fuel(range: StatsRange, selectedMonth?: string): StatsDashboard {
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
        this.kpi('Fuel spend', money(averages.totalSpent), 'cash', '#8c4bff'),
        this.kpi(
          'Distance tracked',
          `${Math.round(averages.totalRangeKm).toLocaleString('en-ZA')} km`,
          'speedometer-outline',
          '#20b875',
        ),
        this.kpi(
          'Average consumption',
          averages.litersPer100Km ? `${averages.litersPer100Km.toFixed(1)} L/100 km` : 'N/A',
          'water-outline',
          '#2497ff',
        ),
        this.kpi(
          'Fuel cost / km',
          averages.totalRangeKm > 0
            ? `${money(entries.filter((x) => x.rangeKm !== null).reduce((sum, x) => sum + x.amountPaid, 0) / averages.totalRangeKm)} / km`
            : 'N/A',
          'cash',
          '#8c4bff',
        ),
        this.kpi(
          'Fuel purchased',
          `${averages.totalLitres.toFixed(1)} L`,
          'water-outline',
          '#2497ff',
        ),
        this.kpi(
          'Average fuel price',
          averages.randPerLiter !== null ? `${money(averages.randPerLiter)} / L` : 'N/A',
          'cash',
          '#20b875',
        ),
        this.kpi('Refuels', String(entries.length), 'car-sport-outline', '#14ddea'),
        this.kpi(
          'Average refill cost',
          entries.length ? money(averages.totalSpent / entries.length) : 'N/A',
          'cash',
          '#8c4bff',
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
              borderColor: ['#14ddea', '#2497ff', '#efa62b', '#c23cff', '#20b875'][index % 5],
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
              backgroundColor: '#2497ff',
              borderRadius: 6,
            },
          ],
        },
        options: chartOptions(true),
      },
      insight: `All figures follow the selected vehicle and period. Consumption and fuel cost/km use only refuels with a known distance (${economy.length} of ${entries.length}). Distances are calculated separately for each car before filtering by refuel date; intervals may start before the period. Economy uses total distance and litres, based on recorded refills, and assumes consistent filling. ${range === 'All' ? 'Spending chart shows the latest 24 months; totals include all records.' : ''}`,
    };
  }
  private bookStats(range: StatsRange, selectedMonth?: string): StatsDashboard {
    return buildBookStats(this.books.books(), range, selectedMonth);
  }

  budgetReportCycle(range?: StatsRange, selectedMonth?: string): string {
    if (range === '1M') {
      const month = statsMonths(range, statsAnchor(range, selectedMonth))[0];
      const bounds = cycleBounds(month, this.budget.cycleStartDay());
      return `${bounds.start} - ${bounds.end}`;
    }
    return this.budget.cycleLabel();
  }
  private budgetStats(range: StatsRange, selectedMonth?: string): StatsDashboard {
    const months = statsMonths(
      range,
      range === '1M'
        ? statsAnchor(range, selectedMonth)
        : new Date(this.budget.month() + '-01T12:00:00'),
    );
    const reportMonth = range === '1M' ? months[0] : this.budget.month();
    const allowed = new Set(months);
    const items =
      range === 'All'
        ? this.budget.transactions()
        : this.budget.transactions().filter((x) => allowed.has(this.budget.monthForDate(x.date)));
    const values = summary(items, this.budget.categories());
    const debt = debtStats(
      this.budget.debts(),
      this.budget.transactions(),
      months,
      range === 'All',
      localDate(),
      this.budget.cycleStartDay(),
      reportMonth,
    );
    const grouped = months.map((month) => {
      const part = items.filter((x) => this.budget.inMonth(x.date, month));
      const value = summary(part, this.budget.categories());
      return {
        month,
        income: value.income,
        expenses: value.expenses,
        savings: value.savings,
        remaining: value.remaining,
      };
    });
    return {
      empty: !items.some((x) => x.paymentStatus !== 'planned') && !this.budget.debts().length,
      emptyTitle: 'No budget data yet',
      emptyMessage: 'Add income or expenses to see financial trends.',
      action: '/budget/transactions/add',
      spending: budgetSpending(items, this.budget.categories()).map((row) => ({
        ...row,
        formatted: money(row.amount),
      })),
      kpis: [
        this.kpi('Recorded income', money(values.income), 'cash', '#20b875'),
        this.kpi('Actual spending', money(values.expenses), 'wallet', '#ef4f5f'),
        this.kpi('Savings transfers', money(values.savings), 'lock-closed', '#8c4bff'),
        this.kpi('Balance from records', money(values.remaining), 'card-outline', '#2497ff'),
      ],
      debt: {
        cycleLabel: this.budgetReportCycle(range, selectedMonth),
        empty: !this.budget.debts().length,
        kpis: [
          this.kpi('Total outstanding', money(debt.outstanding), 'wallet', '#4774b6'),
          this.kpi('Credit opening', money(debt.creditOpening), 'card-outline', '#7093c4'),
          this.kpi('Credit payments this cycle', money(debt.creditPaid), 'checkmark', '#438c75'),
          this.kpi(
            'Estimated credit interest',
            money(debt.creditInterest),
            'document-text',
            '#617085',
          ),
          this.kpi('Credit remaining', money(debt.credit), 'card-outline', '#7093c4'),
          this.kpi('Loans', money(debt.loans), 'cash', '#8a7ca8'),
          this.kpi('Other debt', money(debt.other), 'document-text', '#617085'),
          this.kpi('Paid in selected period', money(debt.repaid), 'checkmark', '#438c75'),
          this.kpi('Planned payments', money(debt.planned), 'calendar', '#bd934d'),
        ],
        balances: {
          type: 'bar',
          data: {
            labels: debt.rows.map((row) => row.name),
            datasets: [
              {
                label: 'Outstanding',
                data: debt.rows.map((row) => row.closing),
                backgroundColor: '#7093c4',
                borderRadius: 5,
              },
            ],
          },
          options: chartOptions(true),
        },
        repayments: {
          type: 'bar',
          data: {
            labels: labels(months),
            datasets: [
              { label: 'Paid', data: debt.monthly, backgroundColor: '#438c75', borderRadius: 5 },
            ],
          },
          options: chartOptions(true),
        },
      },
      primaryTitle: 'Income, spending & savings',
      secondaryTitle: 'Balance from records by cycle',
      primary: {
        type: 'bar',
        data: {
          labels: grouped.map((x) =>
            new Date(x.month + '-01T12:00:00').toLocaleDateString('en-ZA', {
              month: 'short',
              year: '2-digit',
            }),
          ),
          datasets: [
            {
              label: 'Income',
              data: grouped.map((x) => x.income),
              backgroundColor: '#20b875',
              borderRadius: 5,
            },
            {
              label: 'Actual spending',
              data: grouped.map((x) => x.expenses),
              backgroundColor: '#ef4f5f',
              borderRadius: 5,
            },
            {
              label: 'Savings transfers',
              data: grouped.map((x) => x.savings),
              backgroundColor: '#8a7ca8',
              borderRadius: 5,
            },
          ],
        },
        options: chartOptions(true),
      },
      secondary: {
        type: 'line',
        data: {
          labels: grouped.map((x) =>
            new Date(x.month + '-01T12:00:00').toLocaleDateString('en-ZA', {
              month: 'short',
              year: '2-digit',
            }),
          ),
          datasets: [
            {
              label: 'Balance from records',
              data: grouped.map((x) => x.remaining),
              borderColor: '#8a7ca8',
              backgroundColor: '#8a7ca822',
              fill: true,
              tension: 0.35,
            },
          ],
        },
        options: chartOptions(true),
      },
      insight: `Balance from records = income minus spending minus savings transfers. Spending includes bills and paid debt payments. Unpaid plans are excluded. Each point is a cycle total, not a cumulative bank balance.`,
    };
  }
  private kpi(label: string, value: string, icon: string, accent: string): StatsKpi {
    return { label, value, icon, accent };
  }
  private group<T>(
    items: T[],
    key: (item: T) => string,
    value: (item: T) => number,
  ): Map<string, number> {
    const result = new Map<string, number>();
    for (const item of items) result.set(key(item), (result.get(key(item)) ?? 0) + value(item));
    return result;
  }
  private count<T>(
    items: T[],
    value: (item: T) => string,
  ): Array<{ label: string; value: number }> {
    return [...this.group(items, value, () => 1)]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, count]) => ({ label: label || 'Other', value: count }));
  }
  private monthBars(
    dates: string[],
    label: string,
    currency: boolean,
    months?: string[],
  ): ChartConfiguration {
    const values = months ?? statsMonths('1Y');
    const grouped = sumByMonth(
      dates.filter(Boolean),
      (date) => date,
      () => 1,
    );
    return {
      type: 'bar',
      data: {
        labels: labels(values),
        datasets: [
          {
            label,
            data: values.map((month) => grouped.get(month) ?? 0),
            backgroundColor: '#2497ff',
            borderRadius: 6,
          },
        ],
      },
      options: chartOptions(currency),
    };
  }
}
