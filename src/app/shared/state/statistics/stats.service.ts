import { inject, Injectable } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { BookStore } from '../books/book-store';
import { BudgetStore } from '../budget/budget.store';
import { money, summary } from '../budget/budget.model';
import { PlanningStore } from '../planning/planning-store';
import { RecipeStore } from '../recipes/recipe-store';
import { RefuelStore } from '../refuels/refuel-store';
import { refuelAverages } from '../refuels/refuel.model';
import { VehicleStore } from '../vehicles/vehicle-store';
import { statsMonths, sumByMonth } from './stats.calculations';

export type StatsModule = 'fuel' | 'books' | 'budget' | 'planning' | 'recipes' | 'vehicles';
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
  { id: 'planning', label: 'Planning', icon: 'calendar' },
  { id: 'recipes', label: 'Recipes', icon: 'restaurant-outline' },
  { id: 'vehicles', label: 'Vehicles', icon: 'car' },
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
  private readonly refuels = inject(RefuelStore);
  private readonly books = inject(BookStore);
  private readonly budget = inject(BudgetStore);
  private readonly planning = inject(PlanningStore);
  private readonly recipes = inject(RecipeStore);
  private readonly vehicles = inject(VehicleStore);

  dashboard(module: StatsModule, range: StatsRange): StatsDashboard {
    switch (module) {
      case 'fuel':
        return this.fuel(range);
      case 'books':
        return this.bookStats(range);
      case 'budget':
        return this.budgetStats(range);
      case 'planning':
        return this.planningStats(range);
      case 'recipes':
        return this.recipeStats(range);
      case 'vehicles':
        return this.vehicleStats(range);
    }
  }
  loading(module: StatsModule): boolean {
    return module === 'fuel'
      ? this.refuels.loading() || this.vehicles.loading()
      : module === 'books'
        ? this.books.loading()
        : module === 'budget'
          ? this.budget.loading()
          : module === 'planning'
            ? this.planning.loading()
            : module === 'recipes'
              ? this.recipes.loading()
              : this.vehicles.loading();
  }
  error(module: StatsModule): string {
    return module === 'fuel'
      ? this.refuels.error() || this.vehicles.error()
      : module === 'books'
        ? this.books.error()
        : module === 'budget'
          ? this.budget.error()
          : module === 'planning'
            ? this.planning.error()
            : module === 'recipes'
              ? this.recipes.error()
              : this.vehicles.error();
  }
  reload(module: StatsModule): void {
    if (module === 'fuel') {
      void this.vehicles.reload();
      void this.refuels.reload();
    } else if (module === 'books') void this.books.reload();
    else if (module === 'budget') void this.budget.reload();
    else if (module === 'planning') void this.planning.reload();
    else if (module === 'recipes') void this.recipes.reload();
    else void this.vehicles.reload();
  }
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
    const grouped = sumByMonth(
      entries,
      (x) => x.dop,
      (x) => x.amountPaid,
    );
    const monthly = [...grouped].sort().slice(-(range === 'All' ? 12 : statsMonths(range).length));
    const economy = entries.filter((x) => x.kmPerLiter !== null);
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
        this.kpi('Total refuels', String(entries.length), 'car-sport-outline', '#14ddea'),
      ],
      primaryTitle: 'Fuel efficiency trend',
      secondaryTitle: 'Monthly fuel spend',
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
          labels: labels(monthly.map((x) => x[0])),
          datasets: [
            {
              label: 'Spend',
              data: monthly.map((x) => x[1]),
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
    const allowed = new Set(statsMonths(range));
    const items =
      range === 'All'
        ? this.budget.transactions()
        : this.budget.transactions().filter((x) => allowed.has(x.date.slice(0, 7)));
    const values = summary(items, this.budget.categories());
    const grouped = statsMonths(range).map((month) => {
      const part = items.filter((x) => x.date.startsWith(month));
      const value = summary(part, this.budget.categories());
      return { month, income: value.income, expenses: value.expenses, remaining: value.remaining };
    });
    return {
      empty: !items.length,
      emptyTitle: 'No budget data yet',
      emptyMessage: 'Add income or expenses to see financial trends.',
      action: '/budget/transactions/add',
      kpis: [
        this.kpi('Net income', money(values.income), 'cash', '#20b875'),
        this.kpi('Actual spend', money(values.expenses), 'wallet', '#ef4f5f'),
        this.kpi('Left over', money(values.remaining), 'card-outline', '#2497ff'),
        this.kpi('Savings', money(values.savings), 'lock-closed', '#8c4bff'),
      ],
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
  private planningStats(range: StatsRange): StatsDashboard {
    const current = new Date();
    const month = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    const events = this.planning.events();
    const reminders = this.planning.reminders();
    const categories = this.count(events, (x) => x.category);
    return {
      empty: !events.length && !reminders.length && !this.planning.meals().length,
      emptyTitle: 'No planning stats yet',
      emptyMessage: 'Add events, reminders, or meals to see your planning activity.',
      action: '/planning',
      kpis: [
        this.kpi(
          'Events this month',
          String(events.filter((x) => x.date.startsWith(month)).length),
          'calendar',
          '#2497ff',
        ),
        this.kpi(
          'Completed reminders',
          String(reminders.filter((x) => x.completed).length),
          'checkmark',
          '#20b875',
        ),
        this.kpi(
          'Pending reminders',
          String(reminders.filter((x) => !x.completed).length),
          'notifications',
          '#efa62b',
        ),
        this.kpi(
          'Dinner plans',
          String(this.planning.meals().filter((x) => x.date.startsWith(month)).length),
          'restaurant-outline',
          '#c23cff',
        ),
      ],
      primaryTitle: 'Events per month',
      secondaryTitle: 'Events by category',
      primary: this.monthBars(
        events.map((x) => x.date),
        'Events',
        false,
      ),
      secondary: categoryChart('Events', categories),
      insight: `${reminders.filter((x) => x.completed).length} of ${reminders.length} reminders are complete.`,
    };
  }
  private recipeStats(range: StatsRange): StatsDashboard {
    const recipes = this.recipes.recipes();
    const categories = this.count(recipes, (x) => x.category);
    const favourite = recipes.filter((x) => x.favourite);
    const average = recipes.length
      ? recipes.reduce((sum, x) => sum + x.cookTime, 0) / recipes.length
      : 0;
    return {
      empty: !recipes.length,
      emptyTitle: 'No recipe stats yet',
      emptyMessage: 'Add recipes to build your cooking library.',
      action: '/recipes/add',
      kpis: [
        this.kpi('Total recipes', String(recipes.length), 'restaurant-outline', '#efa62b'),
        this.kpi('Favourites', String(favourite.length), 'heart', '#ef4f5f'),
        this.kpi(
          'Average cook time',
          recipes.length ? `${Math.round(average)} min` : '—',
          'flash',
          '#2497ff',
        ),
        this.kpi(
          'Dinner recipes',
          String(recipes.filter((x) => x.category === 'Dinner').length),
          'restaurant-outline',
          '#20b875',
        ),
      ],
      primaryTitle: 'Recipes by category',
      secondaryTitle: 'Recipes added over time',
      primary: categoryChart('Recipes', categories),
      secondary: this.monthBars(
        recipes.map((x) => x.createdAt.slice(0, 10)),
        'Recipes added',
        false,
      ),
      insight: favourite.length
        ? `${favourite.length} recipe${favourite.length === 1 ? '' : 's'} marked as favourites.`
        : 'Mark favourites to surface your go-to recipes.',
    };
  }
  private vehicleStats(range: StatsRange): StatsDashboard {
    const vehicles = this.vehicles.vehicles();
    return {
      empty: !vehicles.length,
      emptyTitle: 'No vehicles yet',
      emptyMessage: 'Add a vehicle to track its fuel use and maintenance.',
      action: '/fuel/vehicles',
      kpis: [
        this.kpi('Total vehicles', String(vehicles.length), 'car', '#2497ff'),
        this.kpi('Active vehicles', String(vehicles.length), 'car-sport-outline', '#20b875'),
        this.kpi(
          'Selected vehicle',
          this.refuels.selectedVehicle()?.name ?? '—',
          'speedometer-outline',
          '#14ddea',
        ),
        this.kpi(
          'Selected fuel spend',
          money(refuelAverages(this.refuels.entries()).totalSpent),
          'cash',
          '#8c4bff',
        ),
      ],
      primaryTitle: 'Vehicles by fuel type',
      secondaryTitle: 'Selected vehicle spend',
      primary: categoryChart(
        'Vehicles',
        this.count(vehicles, (x) => x.description.split(' · ').at(-1) ?? 'Other'),
      ),
      secondary: this.monthBars(
        this.refuels.entries().map((x) => x.dop),
        'Refuels',
        false,
      ),
      insight:
        vehicles.length > 1
          ? 'Choose a vehicle in Fuel to compare its refuelling activity.'
          : 'Add another vehicle to compare vehicle activity.',
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
