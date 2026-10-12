import { inject, Injectable, Injector } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { BookStore } from '../books/book-store';
import { BudgetStore } from '../budget/budget.store';
import { localDate, money, summary } from '../budget/budget.model';
import { RefuelStore } from '../refuels/refuel-store';
import { refuelAverages } from '../refuels/refuel.model';
import { VehicleStore } from '../vehicles/vehicle-store';
import { statsMonths, sumByMonth } from './stats.calculations';
import { debtStats } from './debt-stats';

export type StatsModule = 'fuel' | 'books' | 'budget';
export type StatsRange = '3M' | '6M' | '1Y' | 'All';
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
  debt?: { kpis: StatsKpi[]; balances: ChartConfiguration; repayments: ChartConfiguration; empty: boolean; cycleLabel: string };
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
  /** Stores are resolved on demand so opening Fuel Stats does not load every LifeOS module. */
  private get refuels(): RefuelStore { return this.injector.get(RefuelStore); }
  private get books(): BookStore { return this.injector.get(BookStore); }
  private get budget(): BudgetStore { return this.injector.get(BudgetStore); }
  private get vehicles(): VehicleStore { return this.injector.get(VehicleStore); }

  dashboard(module: StatsModule, range: StatsRange): StatsDashboard {
    switch (module) {
      case 'fuel':
        return this.fuel(range);
      case 'books':
        return this.bookStats(range);
      case 'budget':
        return this.budgetStats(range);
    }
  }
  loading(module: StatsModule): boolean {
    return module === 'fuel'
      ? this.refuels.loading() || this.vehicles.loading()
      : module === 'books'
        ? this.books.loading()
        : this.budget.loading();
  }
  error(module: StatsModule): string {
    return module === 'fuel'
      ? this.refuels.error() || this.vehicles.error()
      : module === 'books'
        ? this.books.error()
        : this.budget.error();
  }
  reload(module: StatsModule): void {
    if (module === 'fuel') {
      void this.vehicles.reload();
      void this.refuels.reload();
    } else if (module === 'books') void this.books.reload();
    else void this.budget.reload();
  }
  /** Refuels depend on the vehicle-selection signal, so only reload after it exists. */
  ensureFuelLoaded(): void { void this.refuels.reload(); }
  vehicleOptions() {
    return this.refuels.vehicleOptions();
  }
  selectedVehicleId(): string | null {
    return this.refuels.selectedVehicleId();
  }
  selectVehicle(id: string): void {
    this.refuels.selectVehicle(id);
  }

  private fuel(range: StatsRange): StatsDashboard {
    const all = this.refuels.entries();
    const allowed = new Set(statsMonths(range));
    const entries = range === 'All' ? all : all.filter((x) => allowed.has(x.dop.slice(0, 7)));
    const averages = refuelAverages(entries);
    const spendByMonth = sumByMonth(
      all,
      (x) => x.dop,
      (x) => x.amountPaid,
    );
    const spendMonths = statsMonths('1Y');
    const economy = entries
      .filter((x) => x.kmPerLiter !== null)
      .sort((a, b) => a.dop.localeCompare(b.dop) || a.odometer - b.odometer);
    const labelsFor = economy.map((x) =>
      new Date(`${x.dop}T12:00:00`).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }),
    );
    return {
      empty: !all.length,
      emptyTitle: 'No fuel data yet',
      emptyMessage: 'Log your first refuel to start seeing fuel trends.',
      action: '/fuel/history',
      kpis: [
        this.kpi('Lifetime spend', money(refuelAverages(all).totalSpent), 'cash', '#8c4bff'),
        this.kpi(
          'Range tracked',
          `${Math.round(refuelAverages(all).totalRangeKm).toLocaleString('en-ZA')} km`,
          'speedometer-outline',
          '#20b875',
        ),
        this.kpi(
          'Average L/100 km',
          averages.litersPer100Km ? `${averages.litersPer100Km.toFixed(1)} L/100km` : '—',
          'water-outline',
          '#2497ff',
        ),
        this.kpi('Total refuels', String(all.length), 'car-sport-outline', '#14ddea'),
      ],
      primaryTitle: 'Fuel efficiency trend',
      secondaryTitle: 'Monthly fuel spend · 12 months',
      primary: {
        type: 'line',
        data: {
          labels: labelsFor,
          datasets: [
            {
              label: 'km/L',
              data: economy.map((x) => x.kmPerLiter),
              borderColor: '#14ddea',
              backgroundColor: '#14ddea33',
              pointBackgroundColor: '#14ddea',
              tension: 0.35,
              fill: true,
            },
          ],
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
      insight:
        entries.length > 1 && averages.kmPerLiter
          ? `Your average economy for this period is ${averages.kmPerLiter.toFixed(1)} km/L.`
          : 'Add at least two refuels with odometer readings to calculate economy.',
    };
  }
  private bookStats(range: StatsRange): StatsDashboard {
    const books = this.books.books();
    const year = new Date().getFullYear();
    const finished = books.filter((x) => x.status === 'Finished' && x.yearRead === year);
    const byCategory = this.count(books, (x) => x.category);
    return {
      empty: !books.length,
      emptyTitle: 'No reading stats yet',
      emptyMessage: 'Add books and update their reading status to see your trends.',
      action: '/books/add',
      kpis: [
        this.kpi('Total books', String(books.length), 'book', '#2497ff'),
        this.kpi('Read this year', String(finished.length), 'checkmark', '#20b875'),
        this.kpi(
          'Currently reading',
          String(books.filter((x) => x.status === 'Reading').length),
          'book',
          '#14ddea',
        ),
        this.kpi('Favourites', String(books.filter((x) => x.favourite).length), 'heart', '#c23cff'),
      ],
      primaryTitle: 'Books read by month',
      secondaryTitle: 'Books by category',
      primary: this.monthBars(
        finished.map((x) => x.finishDate || `${year}-01-01`),
        'Books read',
        false,
      ),
      secondary: categoryChart('Books', byCategory),
      insight: finished.length
        ? `${finished.length} book${finished.length === 1 ? '' : 's'} finished in ${year}.`
        : `No completed books recorded for ${year}.`,
    };
  }
  private budgetStats(range: StatsRange): StatsDashboard {
    const months = statsMonths(range, new Date(this.budget.month() + '-01T12:00:00'));
    const allowed = new Set(months);
    const items =
      range === 'All'
        ? this.budget.transactions()
        : this.budget.transactions().filter((x) => allowed.has(this.budget.monthForDate(x.date)));
    const values = summary(items, this.budget.categories());
    const debt = debtStats(this.budget.debts(), this.budget.transactions(), months, range === 'All', localDate(), this.budget.cycleStartDay(), this.budget.month());
    const grouped = months.map((month) => {
      const part = items.filter((x) => this.budget.inMonth(x.date, month));
      const value = summary(part, this.budget.categories());
      return { month, income: value.income, expenses: value.expenses, remaining: value.remaining };
    });
    return {
      empty: !items.length && !this.budget.debts().length,
      emptyTitle: 'No budget data yet',
      emptyMessage: 'Add income or expenses to see financial trends.',
      action: '/budget/transactions/add',
      kpis: [
        this.kpi('Net income', money(values.income), 'cash', '#20b875'),
        this.kpi('Actual spend', money(values.expenses), 'wallet', '#ef4f5f'),
        this.kpi('Left over', money(values.remaining), 'card-outline', '#2497ff'),
        this.kpi('Savings', money(values.savings), 'lock-closed', '#8c4bff'),
      ],
      debt: {
        cycleLabel: this.budget.cycleLabel(),
        empty: !this.budget.debts().length,
        kpis: [
          this.kpi('Total outstanding', money(debt.outstanding), 'wallet', '#4774b6'),
          this.kpi('Credit opening', money(debt.creditOpening), 'card-outline', '#7093c4'),
          this.kpi('Credit payments this cycle', money(debt.creditPaid), 'checkmark', '#438c75'),
          this.kpi('Estimated credit interest', money(debt.creditInterest), 'document-text', '#617085'),
          this.kpi('Credit remaining', money(debt.credit), 'card-outline', '#7093c4'),
          this.kpi('Loans', money(debt.loans), 'cash', '#8a7ca8'),
          this.kpi('Other debt', money(debt.other), 'document-text', '#617085'),
          this.kpi('Paid in selected period', money(debt.repaid), 'checkmark', '#438c75'),
          this.kpi('Planned payments', money(debt.planned), 'calendar', '#bd934d'),
        ],
        balances: {
          type: 'bar',
          data: { labels: debt.rows.map(row => row.name), datasets: [{ label: 'Outstanding', data: debt.rows.map(row => row.closing), backgroundColor: '#7093c4', borderRadius: 5 }] },
          options: chartOptions(true),
        },
        repayments: {
          type: 'bar',
          data: { labels: labels(months), datasets: [{ label: 'Paid', data: debt.monthly, backgroundColor: '#438c75', borderRadius: 5 }] },
          options: chartOptions(true),
        },
      },
      primaryTitle: 'Income vs expenses',
      secondaryTitle: 'Left over trend',
      primary: {
        type: 'bar',
        data: {
          labels: labels(grouped.map((x) => x.month)),
          datasets: [
            {
              label: 'Income',
              data: grouped.map((x) => x.income),
              backgroundColor: '#20b875',
              borderRadius: 5,
            },
            {
              label: 'Expenses',
              data: grouped.map((x) => x.expenses),
              backgroundColor: '#ef4f5f',
              borderRadius: 5,
            },
          ],
        },
        options: chartOptions(true),
      },
      secondary: {
        type: 'line',
        data: {
          labels: labels(grouped.map((x) => x.month)),
          datasets: [
            {
              label: 'Left over',
              data: grouped.map((x) => x.remaining),
              borderColor: '#7b3cff',
              backgroundColor: '#7b3cff22',
              fill: true,
              tension: 0.35,
            },
          ],
        },
        options: chartOptions(true),
      },
      insight: `Savings transfers are excluded from expenses to avoid double-counting.`,
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
  private monthBars(dates: string[], label: string, currency: boolean): ChartConfiguration {
    const values = statsMonths('1Y');
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
