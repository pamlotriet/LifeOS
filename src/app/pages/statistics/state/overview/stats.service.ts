import { inject, Injectable, Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BookStore } from '@pages/books/state/book/book-store';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import { VehicleStore } from '@pages/fuel/vehicles/state/vehicle/vehicle-store';
import { BooksStats } from '@pages/statistics/state/overview/books-stats';
import { BudgetStats } from '@pages/statistics/state/overview/budget-stats';
import { FuelStats } from '@pages/statistics/state/overview/fuel-stats';
import type {
  StatsDashboard,
  StatsModule,
  StatsRange,
} from '@pages/statistics/state/overview/stats.model';
export * from '@pages/statistics/state/overview/stats.model';

/** Public routing facade; feature stores remain resolved only when requested. */
@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly injector = inject(Injector);
  private readonly i18n = inject(TranslateService);
  private readonly fuel = new FuelStats(this.injector, this.i18n);
  private readonly books = new BooksStats(this.injector, this.i18n);
  private readonly budget = new BudgetStats(this.injector);
  readonly selectedVehicleId = this.fuel.selectedVehicleId;
  dashboard(module: StatsModule, range: StatsRange, selectedMonth?: string): StatsDashboard {
    return this[module].dashboard(range, selectedMonth);
  }
  loading(module: StatsModule): boolean {
    return module === 'fuel'
      ? this.fuel.loading() || this.injector.get(VehicleStore).loading()
      : module === 'books'
        ? this.injector.get(BookStore).loading()
        : this.injector.get(BudgetStore).loading();
  }
  error(module: StatsModule): string {
    return module === 'fuel'
      ? this.fuel.error() || this.injector.get(VehicleStore).error()
      : module === 'books'
        ? this.injector.get(BookStore).error()
        : this.injector.get(BudgetStore).error();
  }
  reload(module: StatsModule): void {
    if (module === 'fuel') {
      void this.injector.get(VehicleStore).reload();
      void this.ensureFuelLoaded();
    } else if (module === 'books') void this.injector.get(BookStore).reload();
    else void this.injector.get(BudgetStore).reload();
  }
  ensureFuelLoaded(): Promise<void> {
    return this.fuel.ensureFuelLoaded();
  }
  vehicleOptions() {
    return this.fuel.vehicleOptions();
  }
  selectVehicle(id: string): void {
    this.fuel.selectVehicle(id);
  }
  budgetReportCycle(range?: StatsRange, selectedMonth?: string): string {
    return this.budget.budgetReportCycle(range, selectedMonth);
  }
}
